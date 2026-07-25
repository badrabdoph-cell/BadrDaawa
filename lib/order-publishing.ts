import { cleanPlayableAudioUrl, saveAudioDataUrl } from "./audio-files";
import { resolveOrCreateCustomerForInvitation } from "./customer-identity";
import { prisma } from "./db";
import { fallbackInvitationGallery, saveInvitationGalleryImages } from "./invitation-images";
import { cleanInvitationHeroVideoUrl, invitationTextsWithHeroVideo } from "./invitation-media";
import { normalizeInvitationTexts } from "./invitation-texts";
import { extractCoordinatesFromUrl } from "./map-url";
import { buildTrialWindow } from "./order-trial-policy";
import { getPrePublishValidationReport } from "./pre-publish-validation";
import { buildInvitationBaseSlug, makeNumberedInvitationSlug } from "./slug";
import {
  getPublicPublishedTemplateWithSettings,
  getTemplateSortOrderWithSettings,
  getTemplateWithSettings,
} from "./template-settings";
import type { Invitation, OrderRequest } from "./types";
import { normalizeInternalAssetUrl } from "./utils";
import { validateOrderUpdate } from "./validation-enhanced";

export type OrderPublishMode = "AUTO_TRIAL" | "MANUAL_TRIAL" | "FINAL";

export type AdminOrderOverrides = {
  groomName?: string;
  brideName?: string;
  phone?: string;
  weddingDate?: string;
  weddingTime?: string;
  venue?: string;
  mapUrl?: string;
  notes?: string;
  templateSlug?: string;
  imageUrls?: string[];
  postImageTemplateId?: string;
  heroVideoUrl?: string;
  musicEnabled?: boolean;
  musicChoice?: "default" | "library" | "upload" | "video" | "url";
  musicUrl?: string;
  musicDataUrl?: string;
  texts?: Invitation["texts"];
  photographer?: Invitation["photographer"];
};

export type PublishOrderInput = {
  orderId: string;
  mode: OrderPublishMode;
  templateVisibility: "published" | "admin";
  trialDays?: number;
  overrides?: AdminOrderOverrides;
  now?: Date;
};

export type PublishOrderResult = {
  code: string;
  invitationId: string;
  customerId: string;
  trialDays: number | null;
  trialEndsAt: Date | null;
  reused: boolean;
};

function cleanText(value: unknown, fallback = "", limit = 500) {
  return typeof value === "string" && value.trim() ? value.trim().slice(0, limit) : fallback;
}

function cleanOptionalUrl(value: unknown) {
  const text = cleanText(value, "", 500);
  if (!text) return "";
  if (text.startsWith("/uploads/") || text.startsWith("/assets/")) return normalizeInternalAssetUrl(text) || "";
  try {
    const url = new URL(text);
    return url.protocol === "http:" || url.protocol === "https:" ? url.toString() : "";
  } catch {
    return "";
  }
}

function cleanDate(value: unknown) {
  const date = new Date(cleanText(value, "", 40));
  return Number.isNaN(date.getTime()) ? null : date;
}

function dateToString(value: Date | string | null | undefined) {
  if (!value) return "";
  return value instanceof Date ? value.toISOString() : value;
}

function normalizeMusicChoice(value: unknown, fallback: AdminOrderOverrides["musicChoice"] = "default") {
  return value === "default" || value === "library" || value === "upload" || value === "video" || value === "url" ? value : fallback;
}

function parseStoredImageUrls(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value
      .filter((item): item is string => typeof item === "string")
      .map((item) => normalizeInternalAssetUrl(item) || item)
      .filter(Boolean)
      .slice(0, 3);
  }
  if (typeof value === "string") {
    try {
      return parseStoredImageUrls(JSON.parse(value) as unknown);
    } catch {
      return [];
    }
  }
  return [];
}

function cleanImageList(value: unknown) {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.map(cleanOptionalUrl).filter(Boolean))].slice(0, 3);
}

function cleanPhotographer(value: unknown): Invitation["photographer"] | undefined {
  if (!value || typeof value !== "object") {
    return { enabled: false, name: "", description: "", facebookUrl: "", instagramUrl: "", whatsappUrl: "" };
  }
  const input = value as Record<string, unknown>;
  const enabled = input.enabled === true;
  return {
    enabled,
    name: enabled ? cleanText(input.name, "المصور الفوتوغرافي", 120) : "",
    description: enabled ? cleanText(input.description, "", 500) : "",
    logoUrl: enabled ? cleanOptionalUrl(input.logoUrl) || undefined : undefined,
    facebookUrl: enabled ? cleanOptionalUrl(input.facebookUrl) || "https://www.facebook.com/" : "",
    instagramUrl: enabled ? cleanOptionalUrl(input.instagramUrl) || "https://www.instagram.com/" : "",
    whatsappUrl: enabled ? cleanOptionalUrl(input.whatsappUrl) || undefined : undefined,
    lockedByPromo: enabled && input.lockedByPromo === true,
    promoCode: enabled ? cleanText(input.promoCode, "", 80) || undefined : undefined,
  };
}

function readSnapshotText(source: Record<string, unknown>, key: string) {
  const value = source[key];
  return typeof value === "string" ? value.trim() : "";
}

function cleanPartnerSnapshotPhotographer(
  partnerSnapshot: unknown,
  current?: Invitation["photographer"],
  promoSnapshot?: unknown,
): Invitation["photographer"] | undefined {
  if (!partnerSnapshot || typeof partnerSnapshot !== "object") return current;
  const partner = partnerSnapshot as Record<string, unknown>;
  const displayName = readSnapshotText(partner, "displayName");
  if (!displayName) return current;
  const promo = promoSnapshot && typeof promoSnapshot === "object" ? (promoSnapshot as Record<string, unknown>) : {};
  return {
    enabled: true,
    name: displayName,
    description: current?.description || "تمت إضافة بيانات الشريك بواسطة البروموكود.",
    logoUrl: cleanOptionalUrl(readSnapshotText(partner, "logoUrl")) || current?.logoUrl,
    facebookUrl: cleanOptionalUrl(readSnapshotText(partner, "facebookUrl")) || current?.facebookUrl || "https://www.facebook.com/",
    instagramUrl: cleanOptionalUrl(readSnapshotText(partner, "instagramUrl")) || current?.instagramUrl || "https://www.instagram.com/",
    whatsappUrl: current?.whatsappUrl,
    lockedByPromo: true,
    promoCode: readSnapshotText(promo, "code") || current?.promoCode,
  };
}

function buildExistingOrder(order: {
  groomName: string;
  brideName: string;
  phone: string;
  weddingDate: Date;
  weddingTime: string;
  venue: string;
  mapUrl: string | null;
  notes: string | null;
  imageUrls: unknown;
  musicEnabled: boolean;
  musicChoice: string | null;
  musicUrl: string | null;
  texts: unknown;
  photographer: unknown;
  partnerSnapshot: unknown;
  discountSnapshot: unknown;
  postImageTemplateId: string | null;
  template: { slug: string } | null;
}): Partial<OrderRequest> {
  return {
    groomName: order.groomName,
    brideName: order.brideName,
    phone: order.phone,
    weddingDate: dateToString(order.weddingDate),
    weddingTime: order.weddingTime,
    venue: order.venue,
    mapUrl: order.mapUrl || undefined,
    notes: order.notes || undefined,
    imageUrls: parseStoredImageUrls(order.imageUrls),
    musicEnabled: order.musicEnabled,
    musicChoice: normalizeMusicChoice(order.musicChoice),
    musicUrl: order.musicUrl || undefined,
    texts: normalizeInvitationTexts(order.texts),
    photographer: cleanPartnerSnapshotPhotographer(order.partnerSnapshot, cleanPhotographer(order.photographer), order.discountSnapshot),
    templateSlug: order.template?.slug || "featured-1",
    postImageTemplateId: order.postImageTemplateId || undefined,
  };
}

function getOrderDraft(payload: AdminOrderOverrides, existing: Partial<OrderRequest>) {
  const groomName = cleanText(payload.groomName, existing.groomName || "", 120);
  const brideName = cleanText(payload.brideName, existing.brideName || "", 120);
  const phone = cleanText(payload.phone, existing.phone || "", 60);
  const weddingDateText = cleanText(payload.weddingDate, existing.weddingDate || "", 60);
  const weddingTime = cleanText(payload.weddingTime, existing.weddingTime || "07:00 مساءً", 80);
  const venue = cleanText(payload.venue, existing.venue || "يحدد لاحقًا", 240);
  const mapUrl = cleanOptionalUrl(payload.mapUrl ?? existing.mapUrl ?? "");
  const imageUrls = cleanImageList(payload.imageUrls);
  const existingTexts = existing.texts && typeof existing.texts === "object" ? (existing.texts as Record<string, unknown>) : {};
  const heroVideoUrl = typeof payload.heroVideoUrl === "string" ? cleanInvitationHeroVideoUrl(payload.heroVideoUrl) : cleanInvitationHeroVideoUrl(existingTexts.heroVideoUrl);
  const existingPhotographer = cleanPhotographer(existing.photographer);
  return {
    groomName,
    brideName,
    phone,
    weddingDateText,
    weddingDate: cleanDate(weddingDateText),
    weddingTime,
    venue,
    mapUrl,
    notes: cleanText(payload.notes, existing.notes || "", 1500),
    templateSlug: cleanText(payload.templateSlug, existing.templateSlug || "featured-1", 140),
    postImageTemplateId: cleanText(payload.postImageTemplateId, existing.postImageTemplateId || "breaking-news-v1", 120),
    imageUrls: (imageUrls.length ? imageUrls : existing.imageUrls || []).slice(0, 3),
    musicEnabled: payload.musicEnabled ?? existing.musicEnabled ?? false,
    musicChoice: normalizeMusicChoice(payload.musicChoice, normalizeMusicChoice(existing.musicChoice)),
    musicUrl: cleanText(payload.musicUrl, existing.musicUrl || "", 500),
    musicDataUrl: payload.musicDataUrl,
    texts: invitationTextsWithHeroVideo(normalizeInvitationTexts(payload.texts ?? existing.texts), heroVideoUrl),
    photographer: existingPhotographer?.lockedByPromo ? existingPhotographer : cleanPhotographer(payload.photographer ?? existing.photographer),
  };
}

function validateDraft(draft: ReturnType<typeof getOrderDraft>) {
  const validation = validateOrderUpdate({
    groomName: draft.groomName,
    brideName: draft.brideName,
    phone: draft.phone,
    weddingDate: draft.weddingDateText,
    venue: draft.venue,
    mapUrl: draft.mapUrl,
    notes: draft.notes,
    templateSlug: draft.templateSlug,
  });
  if (!validation.success) return validation.error;
  if (!draft.weddingDate) return "تاريخ المناسبة غير صالح.";
  const report = getPrePublishValidationReport({
    groomName: draft.groomName,
    brideName: draft.brideName,
    weddingDate: draft.weddingDateText,
    weddingTime: draft.weddingTime,
    venue: draft.venue,
    mapUrl: draft.mapUrl,
    templateSlug: draft.templateSlug,
    images: draft.imageUrls.length ? draft.imageUrls : fallbackInvitationGallery,
  });
  return report.canPublish ? "" : `لا يمكن نشر الدعوة قبل إكمال: ${report.blockingItems.map((item) => item.label).join("، ")}.`;
}

async function resolveMusic(draft: ReturnType<typeof getOrderDraft>, existingUrl?: string | null, existingEnabled = false) {
  const musicEnabled = draft.musicEnabled ?? existingEnabled;
  if (!musicEnabled || draft.musicChoice === "default") return "";
  if (draft.musicDataUrl) {
    const uploaded = await saveAudioDataUrl(draft.musicDataUrl, existingUrl);
    if (uploaded) return uploaded;
  }
  return cleanPlayableAudioUrl(draft.musicUrl || existingUrl || "");
}

async function upsertTemplate(templateSlug: string, visibility: PublishOrderInput["templateVisibility"]) {
  if (!prisma) throw new Error("قاعدة البيانات غير متاحة حالياً.");
  const selectedTemplate = visibility === "published"
    ? await getPublicPublishedTemplateWithSettings(templateSlug)
    : await getTemplateWithSettings(templateSlug);
  if (!selectedTemplate) throw new Error("القالب المختار غير متاح للنشر.");
  return prisma.weddingTemplate.upsert({
    where: { slug: selectedTemplate.slug },
    update: {
      name: selectedTemplate.name,
      arabicName: selectedTemplate.arabicName,
      category: selectedTemplate.category,
      style: selectedTemplate.style,
      concept: selectedTemplate.concept,
      opening: selectedTemplate.opening,
      layout: selectedTemplate.layout,
      typography: selectedTemplate.typography,
      palette: selectedTemplate.palette,
      previewUrl: selectedTemplate.previewImage,
      enabled: selectedTemplate.enabled,
      sortOrder: await getTemplateSortOrderWithSettings(selectedTemplate.slug),
    },
    create: {
      slug: selectedTemplate.slug,
      name: selectedTemplate.name,
      arabicName: selectedTemplate.arabicName,
      category: selectedTemplate.category,
      style: selectedTemplate.style,
      concept: selectedTemplate.concept,
      opening: selectedTemplate.opening,
      layout: selectedTemplate.layout,
      typography: selectedTemplate.typography,
      palette: selectedTemplate.palette,
      previewUrl: selectedTemplate.previewImage,
      enabled: selectedTemplate.enabled,
      sortOrder: await getTemplateSortOrderWithSettings(selectedTemplate.slug),
    },
    select: { id: true },
  });
}

export async function publishOrder(input: PublishOrderInput): Promise<PublishOrderResult> {
  if (!prisma) throw new Error("قاعدة البيانات غير متاحة حالياً.");
  const order = await prisma.orderRequest.findFirst({
    where: { id: input.orderId, deletedAt: null },
    include: { template: { select: { slug: true } } },
  });
  if (!order) throw new Error("لم يتم العثور على الطلب.");

  const publishedCode = order.publishedInvitationCode || "";
  const foundInvitation = publishedCode
    ? await prisma.invitation.findUnique({
        where: { code: publishedCode },
        select: { id: true, code: true, customerId: true, templateId: true, trialDays: true, trialEndsAt: true, deletedAt: true },
      })
    : null;
  const existingInvitation = foundInvitation && !foundInvitation.deletedAt ? foundInvitation : null;

  if (existingInvitation && input.mode === "AUTO_TRIAL") {
    if (order.status !== "PUBLISHED" || order.customerId !== existingInvitation.customerId) {
      await prisma.orderRequest.update({
        where: { id: order.id },
        data: {
          status: "PUBLISHED",
          publishedInvitationCode: existingInvitation.code,
          customerId: existingInvitation.customerId,
          templateId: existingInvitation.templateId,
          rejectionReason: null,
        },
      });
    }
    return {
      code: existingInvitation.code,
      invitationId: existingInvitation.id,
      customerId: existingInvitation.customerId,
      trialDays: existingInvitation.trialDays,
      trialEndsAt: existingInvitation.trialEndsAt,
      reused: true,
    };
  }

  const existingOrder = buildExistingOrder(order);
  const draft = getOrderDraft(input.overrides || {}, existingOrder);
  const validationError = validateDraft(draft);
  if (validationError) throw new Error(validationError);
  const template = await upsertTemplate(draft.templateSlug, input.templateVisibility);

  const gallery = (await saveInvitationGalleryImages(draft.imageUrls)).slice(0, 3);
  const finalGallery = gallery.length ? gallery : fallbackInvitationGallery;
  const musicUrl = await resolveMusic(draft, order.musicUrl, order.musicEnabled);
  const musicEnabled = Boolean(draft.musicEnabled && (draft.musicChoice === "default" || musicUrl));
  const musicChoice = musicEnabled ? draft.musicChoice : "default";
  const baseSlug = buildInvitationBaseSlug(draft.groomName, draft.brideName);
  const existingCodes = publishedCode
    ? []
    : await prisma.invitation.findMany({
        where: { OR: [{ code: { startsWith: baseSlug } }, { customSlug: { startsWith: baseSlug } }] },
        select: { code: true, customSlug: true },
      });
  const code = publishedCode || makeNumberedInvitationSlug(
    baseSlug,
    existingCodes.flatMap((item) => [item.code, item.customSlug || ""]).filter(Boolean),
  );
  const trial = input.mode === "FINAL"
    ? { trialDays: null, trialEndsAt: null }
    : buildTrialWindow(input.trialDays, input.now);
  const mapCoordinates = extractCoordinatesFromUrl(draft.mapUrl);
  const now = input.now || new Date();

  return prisma.$transaction(async (tx) => {
    const customer = await resolveOrCreateCustomerForInvitation(tx, {
      existingCustomerId: order.customerId || existingInvitation?.customerId || null,
      code,
      name: `${draft.groomName} و ${draft.brideName}`,
      phone: draft.phone,
    });
    const lifecycleData = input.mode === "FINAL"
      ? {
          trialDays: null,
          trialEndsAt: null,
          disabledAt: null,
          disabledReason: null,
          disabledBy: null,
          status: "ACTIVE" as const,
        }
      : {
          ...trial,
          disabledAt: null,
          disabledReason: null,
          disabledBy: null,
          status: "ACTIVE" as const,
        };
    const invitationData = {
      ...lifecycleData,
      language: order.language,
      groomName: draft.groomName,
      brideName: draft.brideName,
      weddingDate: draft.weddingDate || now,
      weddingTime: draft.weddingTime || "07:00 مساءً",
      venue: draft.venue,
      city: "",
      mapUrl: draft.mapUrl,
      latitude: mapCoordinates?.lat ?? null,
      longitude: mapCoordinates?.lng ?? null,
      heroPhoto: finalGallery[0],
      gallery: finalGallery,
      musicUrl: musicUrl || null,
      musicEnabled,
      manageToken: order.manageToken || null,
      manageTokenExpiresAt: order.manageTokenExpiresAt || null,
      texts: draft.texts,
      photographer: draft.photographer,
      partnerSnapshot: order.partnerSnapshot || undefined,
      promoSnapshot: order.discountSnapshot || undefined,
      partnerPublishedAt: order.partnerSnapshot ? now : undefined,
      customerId: customer.id,
      templateId: template.id,
      postImageTemplateId: draft.postImageTemplateId,
    };
    const invitation = existingInvitation
      ? await tx.invitation.update({ where: { id: existingInvitation.id }, data: invitationData as never, select: { id: true } })
      : await tx.invitation.create({ data: { code, ...invitationData } as never, select: { id: true } });
    await tx.orderRequest.update({
      where: { id: order.id },
      data: {
        groomName: draft.groomName,
        brideName: draft.brideName,
        phone: draft.phone,
        weddingDate: draft.weddingDate || now,
        weddingTime: draft.weddingTime || "07:00 مساءً",
        venue: draft.venue,
        mapUrl: draft.mapUrl,
        notes: draft.notes,
        imageUrls: finalGallery,
        musicEnabled,
        musicChoice,
        musicUrl,
        texts: draft.texts as never,
        photographer: draft.photographer as never,
        status: "PUBLISHED",
        publishedInvitationCode: code,
        rejectionReason: null,
        customerId: customer.id,
        templateId: template.id,
        postImageTemplateId: draft.postImageTemplateId,
      },
    });
    return {
      code,
      invitationId: invitation.id,
      customerId: customer.id,
      trialDays: trial.trialDays,
      trialEndsAt: trial.trialEndsAt,
      reused: Boolean(existingInvitation),
    };
  });
}
