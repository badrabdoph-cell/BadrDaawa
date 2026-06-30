import { prisma } from "./db";

export type PartnerDiscountType = "NONE" | "PERCENTAGE" | "FIXED_AMOUNT" | "FREE_INVITATION";
export type PartnerStatusValue = "DRAFT" | "ACTIVE" | "PAUSED" | "EXPIRED" | "ARCHIVED";

export type PartnerSnapshotSource = {
  id: string;
  displayName: string;
  partnerType: string;
  logoUrl?: string | null;
  facebookUrl?: string | null;
  instagramUrl?: string | null;
  showPartnerCard?: boolean | null;
};

export type PartnerSnapshot = {
  partnerId: string;
  displayName: string;
  partnerType: string;
  logoUrl: string;
  facebookUrl: string;
  instagramUrl: string;
  showPartnerCard: boolean;
};

export type DiscountSnapshotSource = {
  id: string;
  code: string;
  discountType: PartnerDiscountType;
  discountValue?: number | string | { toString(): string } | null;
};

export type DiscountSnapshot = {
  promoId: string;
  code: string;
  discountType: PartnerDiscountType;
  discountValue: number | null;
  label: string;
};

export type PartnerPromoValidationContext = {
  source?: string;
  userAgent?: string | null;
  customerIp?: string | null;
  logFailures?: boolean;
};

export type PartnerPromoValidationSuccess = {
  ok: true;
  code: string;
  partner: PartnerSnapshot;
  promo: {
    id: string;
    code: string;
    referralSlug: string;
    qrCodeUrl: string;
    discountType: PartnerDiscountType;
    discountValue: number | null;
    discountLabel: string;
  };
  photographer: {
    enabled: true;
    name: string;
    logoUrl: string;
    facebookUrl: string;
    instagramUrl: string;
    lockedByPromo: true;
  };
};

export type PartnerPromoValidationFailure = {
  ok: false;
  code: string;
  reason: "missing" | "not_found" | "paused" | "expired" | "limit_reached" | "partner_unavailable" | "subscription_unavailable" | "database_unavailable";
  error: string;
};

export type PartnerPromoValidationResult = PartnerPromoValidationSuccess | PartnerPromoValidationFailure;

export type PartnerPromoOrderApplicationInput = {
  db?: typeof prisma;
  validation: PartnerPromoValidationSuccess;
  orderId: string;
  invitationId?: string | null;
  customerIp?: string | null;
  userAgent?: string | null;
  referralSource?: string | null;
};

function numberOrNull(value: DiscountSnapshotSource["discountValue"]) {
  if (value === null || value === undefined || value === "") return null;
  const next = Number(value.toString());
  return Number.isFinite(next) ? next : null;
}

function failure(code: string, reason: PartnerPromoValidationFailure["reason"], error: string): PartnerPromoValidationFailure {
  return { ok: false, code, reason, error };
}

export function normalizePromoCode(value: string) {
  return value.trim().replace(/\s+/g, "").toUpperCase();
}

export function normalizeReferralSlug(value: string) {
  return normalizePromoCode(value)
    .normalize("NFKC")
    .replace(/[^\p{L}\p{N}_-]+/gu, "")
    .slice(0, 32);
}

export function buildShortReferralPath(slug: string) {
  const cleanSlug = normalizeReferralSlug(slug);
  return cleanSlug ? `/r/${encodeURIComponent(cleanSlug)}` : "/order";
}

export function buildShortReferralUrl(siteUrl: string, slug: string) {
  const cleanSiteUrl = siteUrl.trim().replace(/\/$/, "");
  const path = buildShortReferralPath(slug);
  return cleanSiteUrl ? `${cleanSiteUrl}${path}` : path;
}

export function formatDiscountLabel(input: { discountType: PartnerDiscountType; discountValue?: number | string | { toString(): string } | null }) {
  const value = numberOrNull(input.discountValue);
  if (input.discountType === "PERCENTAGE" && value !== null) return `تم تطبيق خصم ${value}%`;
  if (input.discountType === "FIXED_AMOUNT" && value !== null) return `تم تطبيق خصم ${value} جنيه`;
  if (input.discountType === "FREE_INVITATION") return "الدعوة مجانية بالكامل";
  return "";
}

export function buildPartnerSnapshot(partner: PartnerSnapshotSource): PartnerSnapshot {
  return {
    partnerId: partner.id,
    displayName: partner.displayName,
    partnerType: partner.partnerType,
    logoUrl: partner.logoUrl || "",
    facebookUrl: partner.facebookUrl || "",
    instagramUrl: partner.instagramUrl || "",
    showPartnerCard: partner.showPartnerCard !== false,
  };
}

export function buildDiscountSnapshot(promo: DiscountSnapshotSource): DiscountSnapshot {
  const discountValue = numberOrNull(promo.discountValue);
  return {
    promoId: promo.id,
    code: promo.code,
    discountType: promo.discountType,
    discountValue,
    label: formatDiscountLabel({ discountType: promo.discountType, discountValue }),
  };
}

export function buildPromoSnapshot(promo: DiscountSnapshotSource & { referralSlug?: string | null; qrCodeUrl?: string | null }) {
  return {
    ...buildDiscountSnapshot(promo),
    referralSlug: promo.referralSlug || "",
    qrCodeUrl: promo.qrCodeUrl || "",
  };
}

function isWithinDateWindow(startDate?: Date | null, expiryDate?: Date | null) {
  const now = Date.now();
  if (startDate && startDate.getTime() > now) return false;
  if (expiryDate && expiryDate.getTime() < now) return false;
  return true;
}

async function recordFailedValidation(code: string, result: PartnerPromoValidationFailure, context: PartnerPromoValidationContext) {
  if (!context.logFailures || !prisma) return;
  await prisma.partnerUsageLog
    .create({
      data: {
        result: "FAILED",
        failureReason: result.reason,
        customerIp: context.customerIp || null,
        browser: context.userAgent || null,
        metadata: {
          code,
          source: context.source || "promo-validation",
          error: result.error,
        },
      },
    })
    .catch((error) => {
      console.error("[Partner Promo] Failed to log validation failure", error);
    });
}

export async function validatePartnerPromoCode(rawCode: string, context: PartnerPromoValidationContext = {}): Promise<PartnerPromoValidationResult> {
  const code = normalizePromoCode(rawCode);
  if (!code) return failure(code, "missing", "اكتب البروموكود أولاً.");
  if (!prisma) return failure(code, "database_unavailable", "قاعدة البيانات غير متاحة حالياً.");

  const promo = await prisma.partnerPromoCode.findUnique({
    where: { code },
    include: { partner: true },
  });

  if (!promo || promo.deletedAt || promo.archivedAt) {
    const result = failure(code, "not_found", "هذا البروموكود غير صالح.");
    await recordFailedValidation(code, result, context);
    return result;
  }

  if (promo.status !== "ACTIVE") {
    const result = failure(code, promo.status === "EXPIRED" ? "expired" : "paused", promo.status === "EXPIRED" ? "انتهت صلاحية البروموكود." : "تم إيقاف البروموكود.");
    await recordFailedValidation(code, result, context);
    return result;
  }

  if (!isWithinDateWindow(promo.startDate, promo.expiryDate)) {
    const result = failure(code, "expired", "انتهت صلاحية البروموكود.");
    await recordFailedValidation(code, result, context);
    return result;
  }

  if (promo.usageLimit !== null && promo.currentUsage >= promo.usageLimit) {
    const result = failure(code, "limit_reached", "تم الوصول للحد الأقصى لاستخدام البروموكود.");
    await recordFailedValidation(code, result, context);
    return result;
  }

  if (promo.partner.deletedAt || promo.partner.archivedAt || promo.partner.status !== "ACTIVE") {
    const result = failure(code, "partner_unavailable", "الشريك المرتبط بهذا البروموكود غير متاح حالياً.");
    await recordFailedValidation(code, result, context);
    return result;
  }

  if (promo.partner.subscriptionAutoDisable && ["PAST_DUE", "EXPIRED", "CANCELLED"].includes(promo.partner.subscriptionStatus)) {
    const result = failure(code, "subscription_unavailable", "اشتراك الشريك لا يسمح باستخدام البروموكود حالياً.");
    await recordFailedValidation(code, result, context);
    return result;
  }

  const partner = buildPartnerSnapshot(promo.partner);
  const discount = buildDiscountSnapshot(promo);
  return {
    ok: true,
    code,
    partner,
    promo: {
      id: promo.id,
      code: promo.code,
      referralSlug: promo.referralSlug,
      qrCodeUrl: promo.qrCodeUrl || "",
      discountType: promo.discountType,
      discountValue: discount.discountValue,
      discountLabel: discount.label,
    },
    photographer: {
      enabled: true,
      name: partner.displayName,
      logoUrl: partner.logoUrl,
      facebookUrl: partner.facebookUrl,
      instagramUrl: partner.instagramUrl,
      lockedByPromo: true,
    },
  };
}

export async function recordPartnerPromoOrderApplication(input: PartnerPromoOrderApplicationInput) {
  const db = input.db || prisma;
  if (!db) throw new Error("database_unavailable");
  await db.partnerPromoCode.update({
    where: { id: input.validation.promo.id },
    data: {
      currentUsage: { increment: 1 },
      lastUsedAt: new Date(),
    },
  });
  await db.partnerUsageLog.create({
    data: {
      partnerId: input.validation.partner.partnerId,
      promoId: input.validation.promo.id,
      orderId: input.orderId,
      invitationId: input.invitationId || null,
      customerIp: input.customerIp || null,
      browser: input.userAgent || null,
      result: "SUCCESS",
      metadata: {
        referralSource: input.referralSource || "order-form",
        code: input.validation.promo.code,
      },
    },
  });
  await db.partnerActivityLog.create({
    data: {
      partnerId: input.validation.partner.partnerId,
      action: "promo.applied_to_order",
      performedBy: "public-order-form",
      newValue: {
        orderId: input.orderId,
        invitationId: input.invitationId || null,
        promoId: input.validation.promo.id,
        code: input.validation.promo.code,
      },
      metadata: {
        referralSource: input.referralSource || "order-form",
      },
    },
  });
}
