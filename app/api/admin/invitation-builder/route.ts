import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { ADMIN_SESSION_COOKIE, verifyAdminSessionCookie } from "@/lib/admin-session";
import { getAuditActorFromAdminRequest, recordAuditLog } from "@/lib/audit-log";
import { cleanPlayableAudioUrl, saveAudioDataUrl } from "@/lib/audio-files";
import { resolveCustomInvitationSlug } from "@/lib/custom-invitation-url";
import { prisma } from "@/lib/db";
import { createFileInvitation, getFileInvitationByCode, setFileInvitationActive, updateFileInvitation } from "@/lib/file-store";
import { queueGitHubSync } from "@/lib/github-sync-queue";
import { fallbackInvitationGallery, saveInvitationGalleryImages } from "@/lib/invitation-images";
import { cleanInvitationHeroVideoUrl, invitationTextsWithHeroVideo } from "@/lib/invitation-media";
import { getInvitationManagePath } from "@/lib/invitation-manage-token";
import { normalizeInvitationTexts } from "@/lib/invitation-texts";
import { hashPassword } from "@/lib/password";
import { getPrePublishValidationReport } from "@/lib/pre-publish-validation";
import { buildInvitationBaseSlug, getCustomerAdminPath, makeNumberedInvitationSlug } from "@/lib/slug";
import { getTemplateSortOrderWithSettings, getTemplateWithSettings } from "@/lib/template-settings";
import type { Invitation } from "@/lib/types";
import { getPublicSiteUrl } from "@/lib/utils";

export const runtime = "nodejs";

type BuilderPayload = {
  action?: "draft" | "publish";
  code?: string;
  customSlug?: string;
  language?: "ar" | "en";
  templateSlug?: string;
  groomName?: string;
  brideName?: string;
  weddingDate?: string;
  weddingTime?: string;
  venue?: string;
  city?: string;
  mapUrl?: string;
  gallery?: string[];
  heroVideoUrl?: string;
  musicEnabled?: boolean;
  musicChoice?: "default" | "library" | "upload" | "video" | "url";
  musicUrl?: string;
  musicLibraryTrackId?: string;
  musicDataUrl?: string;
  texts?: Invitation["texts"];
  photographer?: {
    enabled?: boolean;
    name?: string;
    logoUrl?: string;
    logoDataUrl?: string;
    facebookUrl?: string;
    instagramUrl?: string;
    whatsappUrl?: string;
  };
};

async function isAdmin(request: NextRequest) {
  return verifyAdminSessionCookie(request.cookies.get(ADMIN_SESSION_COOKIE)?.value);
}

function cleanText(value: unknown, fallback = "") {
  return typeof value === "string" && value.trim() ? value.trim().slice(0, 160) : fallback;
}

function cleanUrl(value: unknown) {
  const clean = cleanText(value);
  if (!clean) return "";
  try {
    const url = new URL(clean);
    return url.protocol === "http:" || url.protocol === "https:" ? url.toString() : "";
  } catch {
    return "";
  }
}

function normalizeDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

async function resolveMusic(payload: BuilderPayload) {
  if (!payload.musicEnabled) return "";
  if (payload.musicChoice === "default") return "";
  const uploaded = payload.musicDataUrl ? await saveAudioDataUrl(payload.musicDataUrl) : "";
  if (uploaded) return uploaded;
  return cleanPlayableAudioUrl(payload.musicUrl || "");
}

async function resolvePhotographer(payload: BuilderPayload) {
  const input = payload.photographer;
  if (!input?.enabled) return { enabled: false, name: "", logoUrl: "", facebookUrl: "", instagramUrl: "" };
  const logoGallery = input.logoDataUrl ? await saveInvitationGalleryImages([input.logoDataUrl]) : [];
  return {
    enabled: true,
    name: cleanText(input.name, "المصور الفوتوغرافي"),
    logoUrl: logoGallery[0] || cleanText(input.logoUrl),
    facebookUrl: cleanUrl(input.facebookUrl) || "https://www.facebook.com/",
    instagramUrl: cleanUrl(input.instagramUrl) || "https://www.instagram.com/",
    whatsappUrl: cleanUrl(input.whatsappUrl) || "",
  };
}

async function responseLinks(request: NextRequest, code: string, customSlug?: string) {
  const siteUrl = getPublicSiteUrl(request.headers).replace(/\/$/, "");
  const managePath = await getInvitationManagePath(code);
  return {
    publicUrl: `${siteUrl}/${customSlug || code}`,
    adminUrl: `${siteUrl}${managePath}`,
  };
}

async function getBuilderAuditSnapshot(code: string) {
  if (!code) return null;
  if (prisma) {
    const invitation = await prisma.invitation
      .findUnique({
        where: { code },
        select: {
          code: true,
          customSlug: true,
          status: true,
          groomName: true,
          brideName: true,
          weddingDate: true,
          weddingTime: true,
          venue: true,
          city: true,
          mapUrl: true,
          gallery: true,
          musicEnabled: true,
          musicUrl: true,
          template: { select: { slug: true, arabicName: true } },
        },
      })
      .catch(() => null);
    if (invitation) {
      return {
        ...invitation,
        templateSlug: invitation.template?.slug || "",
        templateName: invitation.template?.arabicName || "",
      };
    }
  }
  const fileInvitation = await getFileInvitationByCode(code).catch(() => null);
  if (!fileInvitation) return null;
  return {
    code: fileInvitation.code,
    customSlug: fileInvitation.customSlug,
    isActive: fileInvitation.isActive,
    templateSlug: fileInvitation.templateSlug,
    groomName: fileInvitation.groomName,
    brideName: fileInvitation.brideName,
    weddingDate: fileInvitation.weddingDate,
    weddingTime: fileInvitation.weddingTime,
    venue: fileInvitation.venue,
    city: fileInvitation.city,
    mapUrl: fileInvitation.mapUrl,
    gallery: fileInvitation.gallery,
    musicEnabled: fileInvitation.musicEnabled,
    musicUrl: fileInvitation.musicUrl,
  };
}

export async function POST(request: NextRequest) {
  if (!(await isAdmin(request))) {
    return NextResponse.json({ error: "انتهت جلسة الأدمن. سجل الدخول مرة أخرى." }, { status: 401 });
  }

  const payload = (await request.json().catch(() => null)) as BuilderPayload | null;
  if (!payload) return NextResponse.json({ error: "بيانات غير صالحة." }, { status: 400 });
  const input = payload;

  const action = input.action === "draft" ? "draft" : "publish";
  const groomName = cleanText(input.groomName);
  const brideName = cleanText(input.brideName);
  const weddingDate = cleanText(input.weddingDate);
  const rawWeddingTime = cleanText(input.weddingTime);
  const venue = cleanText(input.venue);
  const templateSlug = cleanText(input.templateSlug, "featured-1");
  const parsedDate = normalizeDate(weddingDate);
  const galleryInput = Array.isArray(input.gallery) ? input.gallery.filter((item): item is string => typeof item === "string" && Boolean(item.trim())).slice(0, 3) : [];
  const prePublishReport = getPrePublishValidationReport({
    groomName,
    brideName,
    weddingDate,
    weddingTime: rawWeddingTime,
    venue,
    mapUrl: cleanText(input.mapUrl),
    templateSlug,
    gallery: galleryInput,
  });

  if (action === "publish" && !prePublishReport.canPublish) {
    return NextResponse.json(
      {
        error: `لا يمكن نشر الدعوة قبل إكمال: ${prePublishReport.blockingItems.map((item) => item.label).join("، ")}.`,
        validation: prePublishReport,
      },
      { status: 400 },
    );
  }

  if (!groomName || !brideName || !parsedDate || !venue) {
    return NextResponse.json({ error: "اكتب اسم العريس واسم العروسة والتاريخ والعنوان قبل الحفظ." }, { status: 400 });
  }

  const selectedTemplate = await getTemplateWithSettings(templateSlug);
  if (!selectedTemplate) return NextResponse.json({ error: "القالب المختار غير موجود." }, { status: 400 });
  const templateDefinition = selectedTemplate;
  const safeWeddingDate: Date = parsedDate;

  const savedGallery = await saveInvitationGalleryImages(galleryInput);
  const gallery = savedGallery.length ? savedGallery : fallbackInvitationGallery;
  const musicUrl = await resolveMusic(input);
  if (input.musicEnabled && (input.musicDataUrl || input.musicUrl) && !musicUrl) {
    return NextResponse.json({ error: "ملف أو رابط الموسيقى غير قابل للتشغيل." }, { status: 400 });
  }
  const effectiveMusicEnabled = Boolean(input.musicEnabled && (input.musicChoice === "default" || musicUrl));
  const effectiveMusicChoice = effectiveMusicEnabled ? input.musicChoice || "default" : "default";
  const photographer = await resolvePhotographer(input);
  const language = input.language === "en" ? "en" : "ar";
  const heroVideoUrl = cleanInvitationHeroVideoUrl(input.heroVideoUrl);
  const texts = invitationTextsWithHeroVideo(normalizeInvitationTexts(input.texts, language), heroVideoUrl);
  const status: "ACTIVE" | "DRAFT" = action === "publish" ? "ACTIVE" : "DRAFT";
  const isActive = status === "ACTIVE";
  const baseSlug = buildInvitationBaseSlug(groomName, brideName);
  const existingCode = cleanText(input.code);
  const customSlugResult = await resolveCustomInvitationSlug(input.customSlug, existingCode);
  if (customSlugResult.error) {
    return NextResponse.json({ error: customSlugResult.error }, { status: 400 });
  }
  const customSlug = customSlugResult.slug || "";
  const oldValues = existingCode ? await getBuilderAuditSnapshot(existingCode) : null;

  async function createOrUpdateFileInvitation() {
    if (existingCode && (await getFileInvitationByCode(existingCode))) {
      await updateFileInvitation(existingCode, {
        templateSlug: templateDefinition.slug,
        customSlug: customSlug || undefined,
        language,
        groomName,
        brideName,
        weddingDate,
        weddingTime: cleanText(input.weddingTime, "07:00 مساءً"),
        venue,
        city: cleanText(input.city),
        mapUrl: cleanText(input.mapUrl),
        gallery,
        heroPhoto: gallery[0],
        heroVideoUrl,
        musicUrl,
        musicEnabled: effectiveMusicEnabled,
        texts,
        photographer,
        isActive,
      });
      return existingCode;
    }

    const storeInvitation = await createFileInvitation({
      baseSlug,
      templateSlug: templateDefinition.slug,
      language,
      groomName,
      brideName,
      phone: "",
      username: `client_${Date.now().toString(36)}`,
      password: `bd-${Date.now().toString(36)}`,
      weddingDate,
      weddingTime: cleanText(input.weddingTime, "07:00 مساءً"),
      venue,
      city: cleanText(input.city),
      mapUrl: cleanText(input.mapUrl),
      gallery,
      heroVideoUrl,
      musicUrl,
      musicEnabled: effectiveMusicEnabled,
      texts,
      photographer,
      customSlug: customSlug || undefined,
    });
    if (!isActive) await setFileInvitationActive(storeInvitation.code, false);
    return storeInvitation.code;
  }

  async function createOrUpdatePrismaInvitation() {
    if (!prisma) return null;
    const template = await prisma.weddingTemplate.upsert({
      where: { slug: templateDefinition.slug },
      update: {
        name: templateDefinition.name,
        arabicName: templateDefinition.arabicName,
        category: templateDefinition.category,
        style: templateDefinition.style,
        concept: templateDefinition.concept,
        opening: templateDefinition.opening,
        layout: templateDefinition.layout,
        typography: templateDefinition.typography,
        palette: templateDefinition.palette,
        previewUrl: templateDefinition.previewImage,
        enabled: templateDefinition.enabled,
        sortOrder: await getTemplateSortOrderWithSettings(templateDefinition.slug),
      },
      create: {
        slug: templateDefinition.slug,
        name: templateDefinition.name,
        arabicName: templateDefinition.arabicName,
        category: templateDefinition.category,
        style: templateDefinition.style,
        concept: templateDefinition.concept,
        opening: templateDefinition.opening,
        layout: templateDefinition.layout,
        typography: templateDefinition.typography,
        palette: templateDefinition.palette,
        previewUrl: templateDefinition.previewImage,
        enabled: templateDefinition.enabled,
        sortOrder: await getTemplateSortOrderWithSettings(templateDefinition.slug),
      },
    });

    const existing = existingCode
      ? await prisma.invitation.findUnique({ where: { code: existingCode }, select: { code: true, customerId: true } }).catch(() => null)
      : null;
    const code =
      existing?.code ||
      makeNumberedInvitationSlug(
        baseSlug,
        (await prisma.invitation.findMany({ where: { code: { startsWith: baseSlug } }, select: { code: true } })).map((item) => item.code),
      );

    const username = `client_${code.replace(/[^a-z0-9]+/gi, "_")}`;
    const customer = await prisma.customer.upsert({
      where: { username },
      update: {
        name: `${groomName} و ${brideName}`,
        phone: "",
        passwordHash: hashPassword(`${code}-admin`),
        isActive: true,
      },
      create: {
        name: `${groomName} و ${brideName}`,
        phone: "",
        username,
        passwordHash: hashPassword(`${code}-admin`),
        isActive: true,
      },
    });

    const data = {
      status,
      customSlug: customSlug || null,
      language,
      groomName,
      brideName,
      weddingDate: safeWeddingDate,
      weddingTime: cleanText(input.weddingTime, "07:00 مساءً"),
      venue,
      city: cleanText(input.city),
      mapUrl: cleanText(input.mapUrl),
      heroPhoto: gallery[0],
      gallery,
      musicUrl,
      musicEnabled: effectiveMusicEnabled,
      texts,
      photographer,
      customerId: customer.id,
      templateId: template.id,
    };

    if (existing?.code) {
      await prisma.invitation.update({ where: { code: existing.code }, data });
      return existing.code;
    }

    await prisma.invitation.create({ data: { code, ...data } });
    return code;
  }

  const code = (await createOrUpdatePrismaInvitation()) || (await createOrUpdateFileInvitation());
  const managePath = await getInvitationManagePath(code);
  revalidatePath(`/${code}`);
  if (customSlug) revalidatePath(`/${customSlug}`);
  revalidatePath(getCustomerAdminPath(code));
  revalidatePath(managePath);
  revalidatePath("/admin/invitations");
  queueGitHubSync(`Invitation builder ${action}: ${code}.`, { createSnapshot: true });
  const actor = await getAuditActorFromAdminRequest(request);
  const newValues = {
    code,
    customSlug,
    status,
    templateSlug: templateDefinition.slug,
    groomName,
    brideName,
    weddingDate,
    weddingTime: cleanText(input.weddingTime, "07:00 مساءً"),
    venue,
    city: cleanText(input.city),
    mapUrl: cleanText(input.mapUrl),
    gallery,
    musicEnabled: effectiveMusicEnabled,
    musicChoice: effectiveMusicChoice,
    musicUrl,
    heroVideoUrl,
    texts,
    photographer,
  };
  await recordAuditLog({
    actor,
    action: oldValues ? "invitation.update" : "invitation.create",
    entity: { type: "Invitation", id: code, label: `${groomName} و ${brideName}` },
    oldValues,
    newValues,
    metadata: { source: "invitation-builder", builderAction: action },
  });
  if (savedGallery.length && galleryInput.length) {
    await recordAuditLog({
      actor,
      action: "media.image.upload",
      entity: { type: "Media", id: savedGallery[0], label: savedGallery.length > 1 ? `${savedGallery.length} invitation images` : savedGallery[0] },
      newValues: { imageUrls: savedGallery },
      metadata: { invitationCode: code, source: "invitation-builder" },
    });
  }

  if (oldValues && "templateSlug" in oldValues && oldValues.templateSlug && oldValues.templateSlug !== templateDefinition.slug) {
    await recordAuditLog({
      actor,
      action: "template.change",
      entity: { type: "Template", id: templateDefinition.slug, label: `${oldValues.templateSlug} -> ${templateDefinition.slug}` },
      oldValues: { templateSlug: oldValues.templateSlug },
      newValues: { templateSlug: templateDefinition.slug },
      metadata: { invitationCode: code },
    });
  }

  return NextResponse.json({
    ok: true,
    status,
    code,
    customSlug,
    validation: prePublishReport,
    ...(await responseLinks(request, code, customSlug)),
  });
}
