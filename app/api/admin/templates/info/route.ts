import { revalidatePath } from "next/cache";
import { NextRequest, NextResponse } from "next/server";
import crypto from "node:crypto";
import { ADMIN_SESSION_COOKIE, verifyAdminSessionCookie } from "@/lib/admin-session";
import { getAuditActorFromAdminRequest, recordAuditLog } from "@/lib/audit-log";
import { normalizeImageForDisplay } from "@/lib/display-images";
import { queueGitHubSync } from "@/lib/github-sync-queue";
import {
  imageExtensionForUpload,
  imageExtensionFromBytes,
  imageExtensionFromDataMime,
  imageExtensionFromName,
  isBrowserDisplayImageUrl,
  isSupportedImageFile,
} from "@/lib/image-formats";
import { writeProjectAssetFile } from "@/lib/project-assets";
import { getTemplatePreviewInfo, updateTemplatePreviewInfo } from "@/lib/template-preview-info";
import { getTemplatesWithSettings } from "@/lib/template-settings";
import { getRedirectUrl, normalizeInternalAssetUrl } from "@/lib/utils";

async function isAdmin(request: NextRequest) {
  return verifyAdminSessionCookie(request.cookies.get(ADMIN_SESSION_COOKIE)?.value);
}

function text(formData: FormData, key: string) {
  return String(formData.get(key) || "").trim();
}

async function saveTemplateContentImage(image: string | File | null, label: string) {
  async function saveBytes(bytes: Buffer, extension: string, sourceLabel: string) {
    const normalized = await normalizeImageForDisplay(bytes, extension, sourceLabel);
    if (!normalized) return "";
    const fileName = `content-${Date.now()}-${crypto.randomBytes(4).toString("hex")}.${normalized.extension}`;
    const saved = await writeProjectAssetFile(`template-content/${fileName}`, normalized.bytes);
    return saved.url;
  }

  if (image instanceof File) {
    if (!image.size) return "";
    if (!isSupportedImageFile(image) || image.size > 80 * 1024 * 1024) return "";
    const bytes = Buffer.from(await image.arrayBuffer());
    const extension = imageExtensionForUpload(image.type, image.name, imageExtensionFromBytes(bytes) || "jpg");
    return saveBytes(bytes, extension, `template-preview-info:${label}:${image.name || image.type}`);
  }

  const value = String(image || "").trim();
  if (!value) return "";
  const normalized = normalizeInternalAssetUrl(value) || value;
  if (isBrowserDisplayImageUrl(normalized)) return normalized;

  const match = normalized.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,([a-zA-Z0-9+/=]+)$/);
  if (!match) return "";
  const bytes = Buffer.from(match[2], "base64");
  if (!bytes.length || bytes.length > 12 * 1024 * 1024) return "";
  const extension = imageExtensionFromDataMime(match[1]) || imageExtensionFromName(label) || "jpg";
  return saveBytes(bytes, extension, `template-preview-info:${label}`);
}

async function resolveImageField(formData: FormData, valueKey: string, fileKey: string) {
  const file = formData.get(fileKey);
  if (file instanceof File && file.size) {
    const saved = await saveTemplateContentImage(file, fileKey);
    if (saved) return saved;
  }
  return saveTemplateContentImage(text(formData, valueKey), valueKey);
}

async function saveTemplateContentVideo(file: File | null) {
  if (!(file instanceof File) || !file.size) return "";
  if (file.size > 45 * 1024 * 1024) return "";
  const extension = (file.name.match(/\.(mp4|webm|mov|m4v)$/i)?.[1] || "").toLowerCase() || (file.type === "video/webm" ? "webm" : file.type === "video/quicktime" ? "mov" : file.type === "video/mp4" ? "mp4" : "");
  if (!extension) return "";
  const contentType = file.type || (extension === "webm" ? "video/webm" : extension === "mov" ? "video/quicktime" : "video/mp4");
  const bytes = Buffer.from(await file.arrayBuffer());
  if (!bytes.length || bytes.length > 45 * 1024 * 1024) return "";
  const fileName = `content-video-${Date.now()}-${crypto.randomBytes(4).toString("hex")}.${extension}`;
  const saved = await writeProjectAssetFile(`template-content/${fileName}`, bytes);
  console.log(`[Template Video] Saved ${contentType} ${file.name || "video"} (${bytes.length} bytes) as ${saved.url}.`);
  return saved.url;
}

function resolveVideoField(formData: FormData, valueKey: string, fileKey: string) {
  const file = formData.get(fileKey);
  return file instanceof File && file.size ? saveTemplateContentVideo(file) : Promise.resolve(text(formData, valueKey));
}

function storyItem(formData: FormData, index: number, imageUrl = "") {
  return {
    id: `template-preview-story-${index}`,
    title: text(formData, `story${index}Title`),
    description: text(formData, `story${index}Description`),
    date: text(formData, `story${index}Date`),
    imageUrl,
  };
}

function galleryStoryItem(formData: FormData, index: number) {
  return {
    title: text(formData, `galleryStory${index}Title`),
    description: text(formData, `galleryStory${index}Description`),
  };
}

export async function POST(request: NextRequest) {
  if (!(await isAdmin(request))) {
    return NextResponse.redirect(getRedirectUrl("/admin/login", request.headers, request.nextUrl.origin), 303);
  }

  const formData = await request.formData();
  const oldValues = await getTemplatePreviewInfo().catch(() => null);
  const [gallery1, gallery2, gallery3, heroVideoUrl, photographerLogoUrl, story1ImageUrl, story2ImageUrl, story3ImageUrl] = await Promise.all([
    resolveImageField(formData, "gallery1", "gallery1File"),
    resolveImageField(formData, "gallery2", "gallery2File"),
    resolveImageField(formData, "gallery3", "gallery3File"),
    resolveVideoField(formData, "heroVideoUrl", "heroVideoFile"),
    resolveImageField(formData, "photographerLogoUrl", "photographerLogoFile"),
    resolveImageField(formData, "story1ImageUrl", "story1ImageFile"),
    resolveImageField(formData, "story2ImageUrl", "story2ImageFile"),
    resolveImageField(formData, "story3ImageUrl", "story3ImageFile"),
  ]);
  const next = await updateTemplatePreviewInfo({
    language: text(formData, "language") === "en" ? "en" : "ar",
    groomName: text(formData, "groomName"),
    brideName: text(formData, "brideName"),
    weddingDate: text(formData, "weddingDate"),
    weddingTime: text(formData, "weddingTime"),
    venue: text(formData, "venue"),
    city: text(formData, "city"),
    mapUrl: text(formData, "mapUrl"),
    heroVideoUrl,
    gallery: [gallery1, gallery2, gallery3],
    texts: {
      openingText: text(formData, "openingText"),
      inviteMessage: text(formData, "inviteMessage"),
      inviteMessageSecondary: text(formData, "inviteMessageSecondary"),
      rsvpQuestion: text(formData, "rsvpQuestion"),
      rsvpDeclinedMessage: text(formData, "rsvpDeclinedMessage"),
      rsvpConfirmedSuccessMessage: text(formData, "rsvpConfirmedSuccessMessage"),
      rsvpDeclinedSuccessMessage: text(formData, "rsvpDeclinedSuccessMessage"),
      galleryStories: [galleryStoryItem(formData, 1), galleryStoryItem(formData, 2), galleryStoryItem(formData, 3)],
      story: [storyItem(formData, 1, story1ImageUrl), storyItem(formData, 2, story2ImageUrl), storyItem(formData, 3, story3ImageUrl)],
    },
    photographer: {
      enabled: formData.get("photographerEnabled") === "on",
      name: text(formData, "photographerName"),
      logoUrl: photographerLogoUrl,
      instagramUrl: text(formData, "photographerInstagramUrl"),
      facebookUrl: text(formData, "photographerFacebookUrl"),
    },
  });

  const templates = await getTemplatesWithSettings();
  revalidatePath("/admin/templates");
  revalidatePath("/templates");
  for (const template of templates) revalidatePath(`/templates/${template.slug}/preview`);
  queueGitHubSync("Templates preview information updated from admin.", { uploadProjectFiles: true, changeType: "project" });

  const actor = await getAuditActorFromAdminRequest(request);
  await recordAuditLog({
    actor,
    action: "template.change",
    entity: { type: "Template", id: "global-preview-info", label: "معلومات القوالب" },
    oldValues,
    newValues: next,
    metadata: { source: "admin-template-preview-info", templates: templates.length },
  });

  const url = getRedirectUrl("/admin/templates", request.headers, request.nextUrl.origin);
  url.searchParams.set("saved", "template-info");
  url.hash = "template-preview-info";
  return NextResponse.redirect(url, 303);
}
