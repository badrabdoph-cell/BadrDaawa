"use server";

import crypto from "crypto";
import QRCode from "qrcode";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClientMessage } from "@/lib/client-messages";
import { prisma } from "@/lib/db";
import { saveInvitationGalleryImages } from "@/lib/invitation-images";
import { buildShortReferralUrl, normalizePromoCode, normalizeReferralSlug } from "@/lib/partner-promo";
import { getPublishedSiteSettings } from "@/lib/site-settings";
import { slugifyInvitationName } from "@/lib/slug";
import { getShareableSiteUrl } from "@/lib/utils";

type PartnerTypeInput = "PHOTOGRAPHER" | "VIDEOGRAPHER" | "HALL" | "PLANNER" | "DJ" | "MAKEUP_ARTIST" | "DECORATOR" | "OTHER";
type PartnerTierInput = "FREE" | "SILVER" | "GOLD" | "PLATINUM";
type PartnerStatusInput = "DRAFT" | "ACTIVE" | "PAUSED" | "EXPIRED" | "ARCHIVED";
type DiscountTypeInput = "NONE" | "PERCENTAGE" | "FIXED_AMOUNT" | "FREE_INVITATION";

const partnerTypes = new Set<PartnerTypeInput>(["PHOTOGRAPHER", "VIDEOGRAPHER", "HALL", "PLANNER", "DJ", "MAKEUP_ARTIST", "DECORATOR", "OTHER"]);
const partnerTiers = new Set<PartnerTierInput>(["FREE", "SILVER", "GOLD", "PLATINUM"]);
const partnerStatuses = new Set<PartnerStatusInput>(["DRAFT", "ACTIVE", "PAUSED", "EXPIRED", "ARCHIVED"]);
const discountTypes = new Set<DiscountTypeInput>(["NONE", "PERCENTAGE", "FIXED_AMOUNT", "FREE_INVITATION"]);

function formString(formData: FormData, key: string) {
  return String(formData.get(key) || "").trim();
}

function fallbackSlug(value: string) {
  return slugifyInvitationName(value) || `partner-${Date.now().toString(36)}`;
}

async function uniquePartnerSlug(displayName: string) {
  const base = fallbackSlug(displayName);
  let slug = base;
  let suffix = 2;
  while (await prisma?.partner.findUnique({ where: { slug }, select: { id: true } })) {
    slug = `${base}-${suffix}`;
    suffix += 1;
  }
  return slug;
}

async function uniquePromoCode(displayName: string, requestedCode: string, ignorePromoId?: string) {
  const base = normalizePromoCode(requestedCode || displayName.replace(/[^\p{L}\p{N}]+/gu, "")) || `PARTNER${crypto.randomBytes(2).toString("hex").toUpperCase()}`;
  let code = base.slice(0, 40);
  let suffix = 2;
  let existing = await prisma?.partnerPromoCode.findUnique({ where: { code }, select: { id: true } });
  while (existing && existing.id !== ignorePromoId) {
    code = `${base}${suffix}`.slice(0, 48);
    suffix += 1;
    existing = await prisma?.partnerPromoCode.findUnique({ where: { code }, select: { id: true } });
  }
  return code;
}

function randomReferralSlug(length = 6) {
  return crypto.randomBytes(6).toString("base64url").replace(/[-_]/g, "").slice(0, length).toUpperCase();
}

async function uniqueReferralSlug(code: string, ignorePromoId?: string) {
  const base = normalizeReferralSlug(code) || randomReferralSlug();
  let slug = base;
  let suffix = 2;
  let existing = await prisma?.partnerPromoCode.findUnique({ where: { referralSlug: slug }, select: { id: true } });
  while (existing && existing.id !== ignorePromoId) {
    const suffixText = String(suffix);
    slug = `${base.slice(0, 32 - suffixText.length)}${suffixText}`;
    suffix += 1;
    existing = await prisma?.partnerPromoCode.findUnique({ where: { referralSlug: slug }, select: { id: true } });
  }
  return slug;
}

async function resolvePartnerLogoUrl(formData: FormData, fallbackLogoUrl?: string | null) {
  const logoFile = formData.get("logoFile");
  if (logoFile instanceof File && logoFile.size > 0) {
    const saved = await saveInvitationGalleryImages([logoFile]);
    if (saved[0]) return saved[0];
  }
  if (fallbackLogoUrl !== undefined) return fallbackLogoUrl || "";
  const settings = await getPublishedSiteSettings();
  return settings.logoUrl || "/assets/admin/branding/site-logo-1781536656977-9910afd2.webp";
}

function auditId() {
  return `audit-${Date.now().toString(36)}-${crypto.randomBytes(4).toString("hex")}`;
}

function safeReturnPath(value: string, fallback = "/admin/partners") {
  return value.startsWith("/") && !value.startsWith("//") ? value : fallback;
}

function withReturnParam(path: string, key: string, value: string) {
  const separator = path.includes("?") ? "&" : "?";
  return `${path}${separator}${encodeURIComponent(key)}=${encodeURIComponent(value)}`;
}

function cleanExternalUrl(value: string) {
  if (!value) return "";
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:" ? url.toString() : "";
  } catch {
    return "";
  }
}

async function getPartnerPromoSiteUrl() {
  return getShareableSiteUrl(await headers()).replace(/\/$/, "");
}

export async function createPartnerAction(formData: FormData) {
  if (!prisma) redirect("/admin/partners/new?error=database");

  const displayName = formString(formData, "displayName");
  if (displayName.length < 2) redirect("/admin/partners/new?error=invalid");

  const partnerTypeValue = formString(formData, "partnerType") as PartnerTypeInput;
  const tierValue = formString(formData, "tier") as PartnerTierInput;
  const statusValue = formString(formData, "status") as PartnerStatusInput;
  const discountTypeValue = formString(formData, "discountType") as DiscountTypeInput;
  const partnerType = partnerTypes.has(partnerTypeValue) ? partnerTypeValue : "PHOTOGRAPHER";
  const tier = partnerTiers.has(tierValue) ? tierValue : "FREE";
  const status = partnerStatuses.has(statusValue) ? statusValue : "ACTIVE";
  const discountType = discountTypes.has(discountTypeValue) ? discountTypeValue : "NONE";
  const discountValueRaw = Number(formString(formData, "discountValue"));
  const discountValue = Number.isFinite(discountValueRaw) && discountType !== "NONE" && discountType !== "FREE_INVITATION" ? discountValueRaw : null;
  const code = await uniquePromoCode(displayName, formString(formData, "promoCode"));
  const slug = await uniquePartnerSlug(displayName);
  const referralSlug = await uniqueReferralSlug(code);
  const siteUrl = await getPartnerPromoSiteUrl();
  const referralUrl = buildShortReferralUrl(siteUrl, referralSlug);
  const qrCodeUrl = await QRCode.toDataURL(referralUrl).catch(() => "");
  const logoUrl = await resolvePartnerLogoUrl(formData);

  const partner = await prisma.$transaction(async (tx) => {
    const created = await tx.partner.create({
      data: {
        displayName,
        slug,
        partnerType,
        tier,
        status,
        subscriptionStatus: status === "ACTIVE" ? "ACTIVE" : "TRIAL",
        logoUrl,
        facebookUrl: cleanExternalUrl(formString(formData, "facebookUrl")) || null,
        instagramUrl: cleanExternalUrl(formString(formData, "instagramUrl")) || null,
        internalNotes: formString(formData, "internalNotes") || null,
        showPartnerCard: formData.get("showPartnerCard") === "on",
        createdBy: "admin",
        promoCodes: {
          create: {
            code,
            referralSlug,
            qrCodeUrl,
            status,
            discountType,
            discountValue,
            createdBy: "admin",
          },
        },
        subscriptions: {
          create: {
            status: status === "ACTIVE" ? "ACTIVE" : "TRIAL",
            plan: tier,
            autoRenew: false,
          },
        },
      },
      include: { promoCodes: true },
    });
    await tx.partnerActivityLog.create({
      data: {
        partnerId: created.id,
        action: "partner.created",
        performedBy: "admin",
        newValue: { displayName, partnerType, tier, status, promoCode: code },
      },
    });
    await tx.auditLog.create({
      data: {
        id: auditId(),
        actorType: "admin",
        actorId: "admin",
        actorLabel: "Admin",
        action: "partner.create",
        entityType: "Partner",
        entityId: created.id,
        entityLabel: created.displayName,
        newValues: { displayName, partnerType, tier, status, promoCode: code },
        metadata: { source: "partner-promo-center" },
      },
    });
    return created;
  });

  redirect(`/admin/partners/${partner.id}?created=1`);
}

export async function updatePartnerStatusAction(formData: FormData) {
  if (!prisma) redirect("/admin/partners?error=database");
  const id = formString(formData, "id");
  const returnTo = safeReturnPath(formString(formData, "returnTo"), id ? `/admin/partners/${id}` : "/admin/partners");
  const statusValue = formString(formData, "status") as PartnerStatusInput;
  const status = partnerStatuses.has(statusValue) ? statusValue : "PAUSED";
  if (!id) redirect("/admin/partners?error=invalid");

  await prisma.$transaction(async (tx) => {
    const partner = await tx.partner.update({
      where: { id },
      data: {
        status,
        archivedAt: status === "ARCHIVED" ? new Date() : null,
        promoCodes: {
          updateMany: {
            where: { deletedAt: null },
            data: { status: status === "ACTIVE" ? "ACTIVE" : status },
          },
        },
      },
      select: { id: true, displayName: true },
    });
    await tx.partnerActivityLog.create({
      data: {
        partnerId: partner.id,
        action: `partner.${status.toLowerCase()}`,
        performedBy: "admin",
        newValue: { status },
      },
    });
  });

  redirect(withReturnParam(returnTo, "status", "updated"));
}

export async function updatePartnerAction(formData: FormData) {
  if (!prisma) redirect("/admin/partners?error=database");

  const id = formString(formData, "id");
  if (!id) redirect("/admin/partners?error=invalid");

  const existing = await prisma.partner.findUnique({
    where: { id },
    include: { promoCodes: { where: { deletedAt: null }, orderBy: { createdAt: "desc" }, take: 1 } },
  });
  if (!existing) redirect("/admin/partners?error=missing");

  const displayName = formString(formData, "displayName");
  if (displayName.length < 2) redirect(`/admin/partners/${id}/edit?error=invalid`);

  const partnerTypeValue = formString(formData, "partnerType") as PartnerTypeInput;
  const tierValue = formString(formData, "tier") as PartnerTierInput;
  const statusValue = formString(formData, "status") as PartnerStatusInput;
  const discountTypeValue = formString(formData, "discountType") as DiscountTypeInput;
  const partnerType = partnerTypes.has(partnerTypeValue) ? partnerTypeValue : existing.partnerType;
  const tier = partnerTiers.has(tierValue) ? tierValue : existing.tier;
  const status = partnerStatuses.has(statusValue) ? statusValue : existing.status;
  const discountType = discountTypes.has(discountTypeValue) ? discountTypeValue : "NONE";
  const discountValueRaw = Number(formString(formData, "discountValue"));
  const discountValue = Number.isFinite(discountValueRaw) && discountType !== "NONE" && discountType !== "FREE_INVITATION" ? discountValueRaw : null;
  const logoUrl = await resolvePartnerLogoUrl(formData, existing.logoUrl);
  const primaryPromo = existing.promoCodes[0];
  const code = await uniquePromoCode(displayName, formString(formData, "promoCode") || primaryPromo?.code || "", primaryPromo?.id);
  const referralSlug = primaryPromo ? await uniqueReferralSlug(code, primaryPromo.id) : await uniqueReferralSlug(code);
  const siteUrl = await getPartnerPromoSiteUrl();
  const qrCodeUrl = await QRCode.toDataURL(buildShortReferralUrl(siteUrl, referralSlug)).catch(() => primaryPromo?.qrCodeUrl || "");

  await prisma.$transaction(async (tx) => {
    const partner = await tx.partner.update({
      where: { id },
      data: {
        displayName,
        partnerType,
        tier,
        status,
        subscriptionStatus: status === "ACTIVE" ? "ACTIVE" : existing.subscriptionStatus,
        logoUrl,
        facebookUrl: cleanExternalUrl(formString(formData, "facebookUrl")) || null,
        instagramUrl: cleanExternalUrl(formString(formData, "instagramUrl")) || null,
        internalNotes: formString(formData, "internalNotes") || null,
        showPartnerCard: formData.get("showPartnerCard") === "on",
        updatedBy: "admin",
        archivedAt: status === "ARCHIVED" ? existing.archivedAt || new Date() : null,
      },
      select: { id: true, displayName: true },
    });

    if (primaryPromo) {
      await tx.partnerPromoCode.update({
        where: { id: primaryPromo.id },
        data: {
          code,
          referralSlug,
          qrCodeUrl,
          status,
          discountType,
          discountValue,
          archivedAt: status === "ARCHIVED" ? primaryPromo.archivedAt || new Date() : null,
        },
      });
    } else {
      await tx.partnerPromoCode.create({
        data: {
          partnerId: id,
          code,
          referralSlug,
          qrCodeUrl,
          status,
          discountType,
          discountValue,
          createdBy: "admin",
        },
      });
    }

    await tx.partnerActivityLog.create({
      data: {
        partnerId: id,
        action: "partner.updated",
        performedBy: "admin",
        newValue: { displayName, partnerType, tier, status, promoCode: code, referralSlug },
      },
    });
    await tx.auditLog.create({
      data: {
        id: auditId(),
        actorType: "admin",
        actorId: "admin",
        actorLabel: "Admin",
        action: "partner.update",
        entityType: "Partner",
        entityId: id,
        entityLabel: partner.displayName,
        newValues: { displayName, partnerType, tier, status, promoCode: code, referralSlug },
        metadata: { source: "partner-promo-center" },
      },
    });
  });

  redirect(`/admin/partners/${id}?status=updated`);
}

function partnerMessageExpiry(duration: string) {
  const now = Date.now();
  if (duration === "24h") return new Date(now + 24 * 60 * 60 * 1000);
  if (duration === "3d") return new Date(now + 3 * 24 * 60 * 60 * 1000);
  if (duration === "7d") return new Date(now + 7 * 24 * 60 * 60 * 1000);
  if (duration === "30d") return new Date(now + 30 * 24 * 60 * 60 * 1000);
  return null;
}

export async function createPartnerMessageAction(formData: FormData) {
  if (!prisma) redirect("/admin/partners?error=database");

  const partnerId = formString(formData, "partnerId");
  const returnTo = safeReturnPath(formString(formData, "returnTo"), partnerId ? `/admin/partners/${partnerId}?tab=messages` : "/admin/partners");
  const title = formString(formData, "title") || "رسالة من الإدارة";
  const body = formString(formData, "body");
  const duration = formString(formData, "duration") || "always";
  const target = formString(formData, "target") || "all";
  const selectedCodes = formData.getAll("invitationCodes").map((value) => String(value).trim()).filter(Boolean);

  if (!partnerId || !body) redirect(withReturnParam(returnTo, "error", "message"));

  const partner = await prisma.partner.findUnique({
    where: { id: partnerId },
    include: {
      orders: {
        where: { publishedInvitationCode: { not: null } },
        select: { publishedInvitationCode: true, status: true },
      },
    },
  });
  if (!partner) redirect("/admin/partners?error=missing");

  const relatedCodes = partner.orders
    .filter((order) => {
      if (!order.publishedInvitationCode) return false;
      if (target === "published") return order.status === "PUBLISHED" || order.status === "CONVERTED";
      if (target === "pending") return order.status !== "PUBLISHED" && order.status !== "CONVERTED";
      if (target === "selected") return selectedCodes.includes(order.publishedInvitationCode);
      return true;
    })
    .map((order) => order.publishedInvitationCode)
    .filter((code): code is string => Boolean(code));

  const expiryDate = partnerMessageExpiry(duration);
  const message = await prisma.partnerMessage.create({
    data: {
      partnerId,
      title: title.slice(0, 120),
      body: body.slice(0, 3000),
      target: target === "selected" ? "SPECIFIC_INVITATIONS" : target === "published" ? "PUBLISHED_INVITATIONS" : target === "pending" ? "PENDING_INVITATIONS" : "ALL_INVITATIONS",
      showEveryVisit: duration === "always",
      startDate: new Date(),
      expiryDate,
      createdBy: "admin",
    },
  });

  const invitations = relatedCodes.length
    ? await prisma.invitation.findMany({
        where: { code: { in: relatedCodes } },
        select: { id: true, code: true },
      })
    : [];

  if (invitations.length) {
    await prisma.partnerMessageRecipient.createMany({
      data: invitations.map((invitation) => ({ messageId: message.id, invitationId: invitation.id })),
      skipDuplicates: true,
    });
  }

  await Promise.all(relatedCodes.map((code) => createClientMessage({ invitationCode: code, title, body, scope: "single" })));

  await prisma.partnerActivityLog.create({
    data: {
      partnerId,
      action: "partner.message.sent",
      performedBy: "admin",
      newValue: { messageId: message.id, title, duration, target, recipients: relatedCodes.length },
    },
  });

  redirect(withReturnParam(returnTo, "message", "sent"));
}
