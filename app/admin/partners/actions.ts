"use server";

import crypto from "crypto";
import QRCode from "qrcode";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { saveInvitationGalleryImages } from "@/lib/invitation-images";
import { normalizePromoCode } from "@/lib/partner-promo";
import { getPublishedSiteSettings } from "@/lib/site-settings";
import { slugifyInvitationName } from "@/lib/slug";

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

async function uniquePromoCode(displayName: string, requestedCode: string) {
  const base = normalizePromoCode(requestedCode || displayName.replace(/[^\p{L}\p{N}]+/gu, "")) || `PARTNER${crypto.randomBytes(2).toString("hex").toUpperCase()}`;
  let code = base.slice(0, 40);
  let suffix = 2;
  while (await prisma?.partnerPromoCode.findUnique({ where: { code }, select: { id: true } })) {
    code = `${base}${suffix}`.slice(0, 48);
    suffix += 1;
  }
  return code;
}

async function uniqueReferralSlug() {
  for (let index = 0; index < 8; index += 1) {
    const slug = crypto.randomBytes(4).toString("base64url").replace(/[-_]/g, "").slice(0, 6);
    if (!(await prisma?.partnerPromoCode.findUnique({ where: { referralSlug: slug }, select: { id: true } }))) return slug;
  }
  return crypto.randomBytes(5).toString("base64url").replace(/[-_]/g, "").slice(0, 8);
}

async function resolvePartnerLogoUrl(formData: FormData) {
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

function cleanExternalUrl(value: string) {
  if (!value) return "";
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:" ? url.toString() : "";
  } catch {
    return "";
  }
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
  const referralSlug = await uniqueReferralSlug();
  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || process.env.APP_URL || "").replace(/\/$/, "");
  const referralUrl = `${siteUrl || ""}/p/${referralSlug}`;
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

  redirect(`/admin/partners/${id}?status=updated`);
}
