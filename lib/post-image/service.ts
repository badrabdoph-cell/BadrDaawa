import { randomUUID } from "node:crypto";

import { prisma } from "../db";
import { getPublishedSiteSettings } from "../site-settings";
import { deleteUploadFile, writeUploadFile } from "../storage-provider";
import { isPostImageFeatureEnabled } from "./feature-flag";
import { generatePostImageSet } from "./generator";
import { getPostImageSize, getPostImageTemplate } from "./registry";
import { createPostImageSignature } from "./signature";
import { DEFAULT_POST_IMAGE_SIZE_ID, DEFAULT_POST_IMAGE_TEMPLATE_ID, type PostImageStatus } from "./types";

type ExistingPostImageState = {
  postImageStatus?: string | null;
  postImageSignature?: string | null;
  postImageOgSignature?: string | null;
  postImageUrl?: string | null;
  postImageOgUrl?: string | null;
};

type EnsurePostImageInput = {
  code: string;
  publicUrl: string;
  force?: boolean;
  templateId?: string | null;
  sizeId?: string | null;
};

type EnsurePostImageResult = {
  ok: boolean;
  generated: boolean;
  skipped: boolean;
  status: PostImageStatus;
  url?: string;
  ogUrl?: string;
  error?: string;
};

function parseGallery(value: unknown): string[] {
  if (Array.isArray(value)) return value.filter((item): item is string => typeof item === "string" && Boolean(item.trim()));
  if (typeof value === "string") {
    try {
      return parseGallery(JSON.parse(value) as unknown);
    } catch {
      return [];
    }
  }
  return [];
}

export function selectPostImageCoverUrl(input: { heroPhoto?: string | null; gallery?: string[] | null }) {
  return input.heroPhoto?.trim() || input.gallery?.find((item) => item.trim())?.trim() || "";
}

export function shouldSkipPostImageGeneration(existing: ExistingPostImageState, nextSignature: string, force = false, nextOgSignature?: string) {
  return (
    !force &&
    existing.postImageStatus === "GENERATED" &&
    Boolean(existing.postImageUrl) &&
    (!nextOgSignature || Boolean(existing.postImageOgUrl)) &&
    Boolean(nextSignature) &&
    existing.postImageSignature === nextSignature &&
    (!nextOgSignature || existing.postImageOgSignature === nextOgSignature)
  );
}

function hasFreshGenerationLock(input: { postImageStatus?: string | null; postImageGenerationStartedAt?: Date | null }) {
  if (input.postImageStatus !== "GENERATING" || !input.postImageGenerationStartedAt) return false;
  return Date.now() - input.postImageGenerationStartedAt.getTime() < 2 * 60 * 1000;
}

export async function markPostImageNeedsRegeneration(code: string, error?: string) {
  if (!prisma) return;
  const settings = await getPublishedSiteSettings().catch(() => null);
  if (!isPostImageFeatureEnabled(settings)) return;
  await prisma.invitation.updateMany({
    where: { code, deletedAt: null },
    data: {
      postImageStatus: "NEEDS_REGENERATION",
      postImageError: error?.slice(0, 1000) || null,
    },
  });
}

export async function ensureInvitationPostImage(input: EnsurePostImageInput): Promise<EnsurePostImageResult> {
  const settings = await getPublishedSiteSettings().catch(() => null);
  if (!isPostImageFeatureEnabled(settings)) {
    return { ok: true, generated: false, skipped: true, status: "DISABLED" };
  }

  if (!prisma) {
    return { ok: false, generated: false, skipped: false, status: "FAILED", error: "DATABASE_URL is not configured." };
  }

  const invitation = await prisma.invitation.findFirst({
    where: { code: input.code, deletedAt: null },
    select: {
      id: true,
      code: true,
      customSlug: true,
      groomName: true,
      brideName: true,
      weddingDate: true,
      heroPhoto: true,
      gallery: true,
      postImageUrl: true,
      postImageOgUrl: true,
      postImageTemplateId: true,
      postImageStatus: true,
      postImageSignature: true,
      postImageOgSignature: true,
      postImageGenerationStartedAt: true,
    },
  });

  if (!invitation) {
    return { ok: false, generated: false, skipped: false, status: "FAILED", error: "Invitation not found." };
  }

  const template = getPostImageTemplate(input.templateId || invitation.postImageTemplateId || DEFAULT_POST_IMAGE_TEMPLATE_ID);
  const size = getPostImageSize(template.id, DEFAULT_POST_IMAGE_SIZE_ID);
  const ogSize = getPostImageSize(template.id, "open-graph");
  const coverImageUrl = selectPostImageCoverUrl({
    heroPhoto: invitation.heroPhoto,
    gallery: parseGallery(invitation.gallery),
  });
  const signature = createPostImageSignature({
    templateId: template.id,
    size,
    groomName: invitation.groomName,
    brideName: invitation.brideName,
    weddingDate: invitation.weddingDate,
    coverImageUrl,
    invitationUrl: input.publicUrl,
  });
  const ogSignature = createPostImageSignature({
    templateId: template.id,
    size: ogSize,
    groomName: invitation.groomName,
    brideName: invitation.brideName,
    weddingDate: invitation.weddingDate,
    coverImageUrl,
    invitationUrl: input.publicUrl,
  });

  if (shouldSkipPostImageGeneration(invitation, signature, input.force, ogSignature)) {
    return {
      ok: true,
      generated: false,
      skipped: true,
      status: "GENERATED",
      url: invitation.postImageUrl || undefined,
      ogUrl: invitation.postImageOgUrl || undefined,
    };
  }

  if (!input.force && hasFreshGenerationLock(invitation)) {
    return {
      ok: true,
      generated: false,
      skipped: true,
      status: "GENERATING",
      url: invitation.postImageUrl || undefined,
      ogUrl: invitation.postImageOgUrl || undefined,
    };
  }

  const generationToken = randomUUID();
  await prisma.invitation.update({
    where: { id: invitation.id },
    data: {
      postImageTemplateId: template.id,
      postImageStatus: "GENERATING",
      postImageError: null,
      postImageGenerationToken: generationToken,
      postImageGenerationStartedAt: new Date(),
    },
  });

  try {
    const generated = await generatePostImageSet({
      templateId: template.id,
      groomName: invitation.groomName,
      brideName: invitation.brideName,
      weddingDate: invitation.weddingDate,
      coverImageUrl,
      invitationUrl: input.publicUrl,
    });
    const portraitFileName = `${template.id}-${size.width}x${size.height}-${generated.portrait.signature.slice(0, 12)}.png`;
    const ogFileName = `${template.id}-${ogSize.width}x${ogSize.height}-${generated.openGraph.signature.slice(0, 12)}.png`;
    const saved = await writeUploadFile(`client-invitations/post-images/${invitation.code}/${portraitFileName}`, generated.portrait.bytes, generated.portrait.contentType);
    const savedOg = await writeUploadFile(`client-invitations/post-images/${invitation.code}/${ogFileName}`, generated.openGraph.bytes, generated.openGraph.contentType);
    const oldUrl = invitation.postImageUrl;
    const oldOgUrl = invitation.postImageOgUrl;

    await prisma.invitation.update({
      where: { id: invitation.id },
      data: {
        qrCodeUrl: generated.portrait.qrCodeDataUrl,
        postImageUrl: saved.url,
        postImageOgUrl: savedOg.url,
        postImageTemplateId: template.id,
        postImageStatus: "GENERATED",
        postImageSignature: generated.portrait.signature,
        postImageOgSignature: generated.openGraph.signature,
        postImageGeneratedAt: new Date(),
        postImageError: null,
        postImageWidth: generated.portrait.width,
        postImageHeight: generated.portrait.height,
        postImageOgWidth: generated.openGraph.width,
        postImageOgHeight: generated.openGraph.height,
        postImageGenerationToken: null,
        postImageGenerationStartedAt: null,
      },
    });

    if (oldUrl && oldUrl !== saved.url) {
      await deleteUploadFile(oldUrl).catch((error) => {
        console.error("[post-image] Failed to delete old post image", error);
      });
    }
    if (oldOgUrl && oldOgUrl !== savedOg.url) {
      await deleteUploadFile(oldOgUrl).catch((error) => {
        console.error("[post-image] Failed to delete old Open Graph post image", error);
      });
    }

    return {
      ok: true,
      generated: true,
      skipped: false,
      status: "GENERATED",
      url: saved.url,
      ogUrl: savedOg.url,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Post image generation failed.";
    console.error("[post-image] Failed to generate post image", error);
    await prisma.invitation.update({
      where: { id: invitation.id },
      data: {
        postImageStatus: "FAILED",
        postImageSignature: signature,
        postImageOgSignature: ogSignature,
        postImageError: message.slice(0, 1000),
        postImageGenerationToken: null,
        postImageGenerationStartedAt: null,
      },
    });
    return {
      ok: false,
      generated: false,
      skipped: false,
      status: "FAILED",
      error: message,
    };
  }
}

export async function regenerateInvitationPostImage(input: Omit<EnsurePostImageInput, "force">) {
  return ensureInvitationPostImage({ ...input, force: true });
}
