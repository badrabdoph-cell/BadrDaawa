"use server";

import crypto from "crypto";
import QRCode from "qrcode";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { saveInvitationGalleryImages } from "@/lib/invitation-images";
import { buildShortReferralUrl, normalizePromoCode, normalizeReferralSlug } from "@/lib/partner-promo";
import { getPublishedSiteSettings } from "@/lib/site-settings";
import { slugifyInvitationName } from "@/lib/slug";
import { getShareableSiteUrl } from "@/lib/utils";

type DiscountTypeInput = "NONE" | "PERCENTAGE" | "FIXED_AMOUNT" | "FREE_INVITATION";
type PromoStatusInput = "ACTIVE" | "PAUSED" | "EXPIRED" | "ARCHIVED";

const discountTypes = new Set<DiscountTypeInput>(["NONE", "PERCENTAGE", "FIXED_AMOUNT", "FREE_INVITATION"]);
const promoStatuses = new Set<PromoStatusInput>(["ACTIVE", "PAUSED", "EXPIRED", "ARCHIVED"]);

function formString(formData: FormData, key: string) {
  return String(formData.get(key) || "").trim();
}

function randomCode(length = 6) {
  return crypto.randomBytes(6).toString("base64url").replace(/[-_]/g, "").slice(0, length).toUpperCase();
}

async function uniquePartnerSlug(displayName: string) {
  const base = slugifyInvitationName(displayName) || `partner-${Date.now().toString(36)}`;
  let slug = base;
  let suffix = 2;
  while (await prisma?.partner.findUnique({ where: { slug }, select: { id: true } })) {
    slug = `${base}-${suffix}`;
    suffix += 1;
  }
  return slug;
}

async function uniquePromoCode(displayName: string, requestedCode: string) {
  const base = normalizePromoCode(requestedCode || displayName.replace(/[^\p{L}\p{N}]+/gu, "")) || randomCode();
  let code = base.slice(0, 32);
  let suffix = 2;
  while (await prisma?.partnerPromoCode.findUnique({ where: { code }, select: { id: true } })) {
    const suffixText = String(suffix);
    code = `${base.slice(0, 32 - suffixText.length)}${suffixText}`;
    suffix += 1;
  }
  return code;
}

async function uniqueDiscountPromoCode(requestedCode: string, internalName: string) {
  const base = normalizePromoCode(requestedCode || internalName.replace(/[^\p{L}\p{N}]+/gu, "")) || randomCode();
  let code = base.slice(0, 32);
  let suffix = 2;
  while (await prisma?.discountPromoCode.findUnique({ where: { code }, select: { id: true } })) {
    const suffixText = String(suffix);
    code = `${base.slice(0, 32 - suffixText.length)}${suffixText}`;
    suffix += 1;
  }
  return code;
}

async function uniqueReferralSlug(code: string) {
  const base = normalizeReferralSlug(code) || randomCode();
  let referralSlug = base;
  let suffix = 2;
  while (await prisma?.partnerPromoCode.findUnique({ where: { referralSlug }, select: { id: true } })) {
    const suffixText = String(suffix);
    referralSlug = `${base.slice(0, 32 - suffixText.length)}${suffixText}`;
    suffix += 1;
  }
  return referralSlug;
}

async function resolveLogoUrl(formData: FormData) {
  const logoFile = formData.get("logoFile");
  if (logoFile instanceof File && logoFile.size > 0) {
    const saved = await saveInvitationGalleryImages([logoFile]);
    if (saved[0]) return saved[0];
  }

  const settings = await getPublishedSiteSettings();
  return settings.logoUrl || "/assets/admin/branding/site-logo-1781536656977-9910afd2.webp";
}

function auditId() {
  return `audit-${Date.now().toString(36)}-${crypto.randomBytes(4).toString("hex")}`;
}

function safeReturnPath(value: string, fallback = "/admin/promo-codes/partners") {
  return value.startsWith("/") && !value.startsWith("//") ? value : fallback;
}

export async function createQuickPromoCodeAction(formData: FormData) {
  if (!prisma) redirect("/admin/promo-codes?error=database");

  const displayName = formString(formData, "displayName");
  if (displayName.length < 2) redirect("/admin/promo-codes?error=name");

  const discountTypeValue = formString(formData, "discountType") as DiscountTypeInput;
  const discountType = discountTypes.has(discountTypeValue) ? discountTypeValue : "NONE";
  const discountValueRaw = Number(formString(formData, "discountValue"));
  const needsDiscountValue = discountType === "PERCENTAGE" || discountType === "FIXED_AMOUNT";
  if (needsDiscountValue && (!Number.isFinite(discountValueRaw) || discountValueRaw <= 0)) {
    redirect("/admin/promo-codes?error=discount");
  }

  const code = await uniquePromoCode(displayName, formString(formData, "promoCode"));
  const referralSlug = await uniqueReferralSlug(code);
  const siteUrl = getShareableSiteUrl(await headers()).replace(/\/$/, "");
  const shortUrl = buildShortReferralUrl(siteUrl, referralSlug);
  const qrCodeUrl = await QRCode.toDataURL(shortUrl).catch(() => "");
  const logoUrl = await resolveLogoUrl(formData);
  const partnerSlug = await uniquePartnerSlug(displayName);

  const created = await prisma.$transaction(async (tx) => {
    const partner = await tx.partner.create({
      data: {
        displayName,
        slug: partnerSlug,
        partnerType: "PHOTOGRAPHER",
        tier: "FREE",
        status: "ACTIVE",
        subscriptionStatus: "ACTIVE",
        logoUrl,
        showPartnerCard: formData.get("showPartnerCard") === "on",
        createdBy: "admin",
        promoCodes: {
          create: {
            code,
            referralSlug,
            qrCodeUrl,
            status: "ACTIVE",
            discountType,
            discountValue: needsDiscountValue ? discountValueRaw : null,
            createdBy: "admin",
          },
        },
        subscriptions: {
          create: {
            status: "ACTIVE",
            plan: "FREE",
            autoRenew: false,
          },
        },
      },
      include: { promoCodes: true },
    });

    const promo = partner.promoCodes[0];
    await tx.partnerActivityLog.create({
      data: {
        partnerId: partner.id,
        action: "partner.created",
        performedBy: "admin",
        newValue: { displayName, promoCode: code, referralSlug },
        metadata: { source: "quick-promo-code-admin" },
      },
    });
    await tx.auditLog.create({
      data: {
        id: auditId(),
        actorType: "admin",
        actorId: "admin",
        actorLabel: "Admin",
        action: "promo.create",
        entityType: "PartnerPromoCode",
        entityId: promo.id,
        entityLabel: promo.code,
        newValues: { displayName, promoCode: code, referralSlug, discountType, discountValue: needsDiscountValue ? discountValueRaw : null },
        metadata: { source: "quick-promo-code-admin" },
      },
    });

    return { promoId: promo.id };
  });

  redirect(`/admin/promo-codes?created=${created.promoId}`);
}

export async function createDiscountPromoCodeAction(formData: FormData) {
  if (!prisma) redirect("/admin/promo-codes/discounts/new?error=database");

  const internalName = formString(formData, "internalName");
  if (internalName.length < 2) redirect("/admin/promo-codes/discounts/new?error=name");

  const discountTypeValue = formString(formData, "discountType") as DiscountTypeInput;
  const discountType = discountTypes.has(discountTypeValue) ? discountTypeValue : "PERCENTAGE";
  const discountValueRaw = Number(formString(formData, "discountValue"));
  const needsDiscountValue = discountType === "PERCENTAGE" || discountType === "FIXED_AMOUNT";
  if (needsDiscountValue && (!Number.isFinite(discountValueRaw) || discountValueRaw <= 0)) {
    redirect("/admin/promo-codes/discounts/new?error=discount");
  }

  const usageLimitRaw = Number(formString(formData, "usageLimit"));
  const usageLimit = Number.isFinite(usageLimitRaw) && usageLimitRaw > 0 ? Math.floor(usageLimitRaw) : null;
  const startDateRaw = formString(formData, "startDate");
  const expiryDateRaw = formString(formData, "expiryDate");
  const startDate = startDateRaw ? new Date(`${startDateRaw}T00:00:00`) : null;
  const expiryDate = expiryDateRaw ? new Date(`${expiryDateRaw}T23:59:59`) : null;
  const statusValue = formString(formData, "status") as PromoStatusInput;
  const status = promoStatuses.has(statusValue) ? statusValue : "ACTIVE";
  const code = await uniqueDiscountPromoCode(formString(formData, "code"), internalName);

  const created = await prisma.discountPromoCode.create({
    data: {
      internalName,
      code,
      internalDescription: formString(formData, "internalDescription") || null,
      status,
      discountType,
      discountValue: needsDiscountValue ? discountValueRaw : null,
      usageLimit,
      startDate: startDate && !Number.isNaN(startDate.getTime()) ? startDate : null,
      expiryDate: expiryDate && !Number.isNaN(expiryDate.getTime()) ? expiryDate : null,
      restrictions: formString(formData, "notes") ? { notes: formString(formData, "notes") } : undefined,
      createdBy: "admin",
    },
    select: { id: true },
  });

  redirect(`/admin/promo-codes/discounts?created=${created.id}`);
}

export async function updatePartnerPromoStatusAction(formData: FormData) {
  if (!prisma) redirect("/admin/promo-codes/partners?error=database");

  const id = formString(formData, "id");
  const returnTo = safeReturnPath(formString(formData, "returnTo"));
  const statusValue = formString(formData, "status") as PromoStatusInput;
  const status = promoStatuses.has(statusValue) ? statusValue : "PAUSED";
  if (!id) redirect(`${returnTo}?error=missing`);

  await prisma.$transaction(async (tx) => {
    const promo = await tx.partnerPromoCode.update({
      where: { id },
      data: {
        status,
        archivedAt: status === "ARCHIVED" ? new Date() : null,
        deletedAt: null,
      },
      select: { id: true, code: true, partnerId: true, status: true },
    });
    await tx.partnerActivityLog.create({
      data: {
        partnerId: promo.partnerId,
        action: `promo.${status.toLowerCase()}`,
        performedBy: "admin",
        newValue: { promoId: promo.id, code: promo.code, status },
      },
    });
    await tx.auditLog.create({
      data: {
        id: auditId(),
        actorType: "admin",
        actorId: "admin",
        actorLabel: "Admin",
        action: "promo.status",
        entityType: "PartnerPromoCode",
        entityId: promo.id,
        entityLabel: promo.code,
        newValues: { status },
        metadata: { source: "promo-code-admin" },
      },
    });
  });

  redirect(`${returnTo}?status=updated`);
}

export async function softDeletePartnerPromoAction(formData: FormData) {
  if (!prisma) redirect("/admin/promo-codes/partners?error=database");

  const id = formString(formData, "id");
  const returnTo = safeReturnPath(formString(formData, "returnTo"));
  if (!id) redirect(`${returnTo}?error=missing`);

  await prisma.$transaction(async (tx) => {
    const now = new Date();
    const promo = await tx.partnerPromoCode.update({
      where: { id },
      data: { status: "ARCHIVED", archivedAt: now, deletedAt: now },
      select: { id: true, code: true, partnerId: true },
    });
    await tx.partnerActivityLog.create({
      data: {
        partnerId: promo.partnerId,
        action: "promo.deleted",
        performedBy: "admin",
        newValue: { promoId: promo.id, code: promo.code, status: "ARCHIVED" },
      },
    });
    await tx.auditLog.create({
      data: {
        id: auditId(),
        actorType: "admin",
        actorId: "admin",
        actorLabel: "Admin",
        action: "promo.delete",
        entityType: "PartnerPromoCode",
        entityId: promo.id,
        entityLabel: promo.code,
        newValues: { deletedAt: now.toISOString(), status: "ARCHIVED" },
        metadata: { source: "promo-code-admin", deleteType: "soft" },
      },
    });
  });

  redirect(`${returnTo}?status=deleted`);
}

export async function restorePartnerPromoAction(formData: FormData) {
  if (!prisma) redirect("/admin/promo-codes/partners?error=database");

  const id = formString(formData, "id");
  const returnTo = safeReturnPath(formString(formData, "returnTo"), id ? `/admin/promo-codes/${id}` : "/admin/promo-codes/partners");
  if (!id) redirect(`${returnTo}?error=missing`);

  await prisma.$transaction(async (tx) => {
    const promo = await tx.partnerPromoCode.update({
      where: { id },
      data: { status: "ACTIVE", archivedAt: null, deletedAt: null },
      select: { id: true, code: true, partnerId: true },
    });
    await tx.partnerActivityLog.create({
      data: {
        partnerId: promo.partnerId,
        action: "promo.restored",
        performedBy: "admin",
        newValue: { promoId: promo.id, code: promo.code, status: "ACTIVE" },
      },
    });
    await tx.auditLog.create({
      data: {
        id: auditId(),
        actorType: "admin",
        actorId: "admin",
        actorLabel: "Admin",
        action: "promo.restore",
        entityType: "PartnerPromoCode",
        entityId: promo.id,
        entityLabel: promo.code,
        newValues: { status: "ACTIVE", deletedAt: null, archivedAt: null },
        metadata: { source: "promo-code-admin" },
      },
    });
  });

  redirect(`${returnTo}?status=restored`);
}
