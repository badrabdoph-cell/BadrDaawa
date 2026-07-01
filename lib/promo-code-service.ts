import crypto from "crypto";
import QRCode from "qrcode";
import { prisma } from "@/lib/db";
import { saveInvitationGalleryImages } from "@/lib/invitation-images";
import { PARTNER_PROMO_COOKIE, buildShortReferralPath, buildShortReferralUrl, type PartnerDiscountType, type PartnerStatusValue } from "@/lib/partner-promo";
import { getPublishedSiteSettings } from "@/lib/site-settings";
import { slugifyInvitationName } from "@/lib/slug";

type PromoDb = NonNullable<typeof prisma>;
type PromoCodeType = "partner" | "discount";

type PromoValidationContext = {
  source?: string;
  userAgent?: string | null;
  customerIp?: string | null;
  logFailures?: boolean;
};

type PromoCreatePartnerInput = {
  formData: FormData;
  siteUrl: string;
};

type PromoCreateDiscountInput = {
  formData: FormData;
};

type PromoApplicationInput = {
  db?: typeof prisma;
  validation: PromoValidationSuccess;
  orderId: string;
  invitationId?: string | null;
  customerIp?: string | null;
  userAgent?: string | null;
  referralSource?: string | null;
};

export type PromoValidationSuccess = {
  ok: true;
  type: PromoCodeType;
  status: "ACTIVE";
  promoId: string;
  code: string;
  discount: {
    discountType: PartnerDiscountType;
    discountValue: number | null;
    label: string;
  };
  partner?: {
    partnerId: string;
    displayName: string;
    partnerType: string;
    logoUrl: string;
    facebookUrl: string;
    instagramUrl: string;
    showPartnerCard: boolean;
  };
  promo: {
    id: string;
    code: string;
    referralSlug?: string;
    qrCodeUrl?: string;
    discountType: PartnerDiscountType;
    discountValue: number | null;
    discountLabel: string;
  };
  photographer?: {
    enabled: true;
    name: string;
    logoUrl: string;
    facebookUrl: string;
    instagramUrl: string;
    lockedByPromo: true;
  };
  message: string;
};

export type PromoValidationFailure = {
  ok: false;
  type: PromoCodeType | "unknown";
  status: "MISSING" | "NOT_FOUND" | "PAUSED" | "PENDING" | "EXPIRED" | "LIMIT_REACHED" | "DELETED" | "ARCHIVED" | "PARTNER_UNAVAILABLE" | "DATABASE_UNAVAILABLE";
  promoId: null;
  code: string;
  discount: null;
  partner: null;
  message: string;
  error: string;
};

export type PromoValidationResult = PromoValidationSuccess | PromoValidationFailure;

const discountTypes = new Set<PartnerDiscountType>(["NONE", "PERCENTAGE", "FIXED_AMOUNT", "FREE_INVITATION"]);
const partnerTypes = new Set(["PHOTOGRAPHER", "VIDEOGRAPHER", "HALL", "PLANNER", "DJ", "MAKEUP_ARTIST", "DECORATOR", "OTHER"]);
const partnerStatuses = new Set<PartnerStatusValue>(["DRAFT", "ACTIVE", "PAUSED", "EXPIRED", "ARCHIVED"]);

function formString(formData: FormData, key: string) {
  return String(formData.get(key) || "").trim();
}

function randomCode(length = 6) {
  return crypto.randomBytes(8).toString("base64url").replace(/[-_]/g, "").slice(0, length).toUpperCase();
}

function numberOrNull(value: unknown) {
  if (value === null || value === undefined || value === "") return null;
  const next = Number(typeof value === "object" && value && "toString" in value ? value.toString() : value);
  return Number.isFinite(next) ? next : null;
}

function isWithinDateWindow(startDate?: Date | null, expiryDate?: Date | null) {
  const now = Date.now();
  if (startDate && startDate.getTime() > now) return false;
  if (expiryDate && expiryDate.getTime() < now) return false;
  return true;
}

function fallbackStatus(startDate?: Date | null, expiryDate?: Date | null) {
  const now = Date.now();
  if (startDate && startDate.getTime() > now) return "PENDING" as const;
  if (expiryDate && expiryDate.getTime() < now) return "EXPIRED" as const;
  return "EXPIRED" as const;
}

function failure(code: string, status: PromoValidationFailure["status"], message: string, type: PromoValidationFailure["type"] = "unknown"): PromoValidationFailure {
  return { ok: false, type, status, promoId: null, code, discount: null, partner: null, message, error: message };
}

function auditId() {
  return `audit-${Date.now().toString(36)}-${crypto.randomBytes(4).toString("hex")}`;
}

function normalizeDiscountType(value: string): PartnerDiscountType {
  return discountTypes.has(value as PartnerDiscountType) ? (value as PartnerDiscountType) : "NONE";
}

function normalizePartnerType(value: string) {
  const next = value.toUpperCase();
  return partnerTypes.has(next) ? next : "PHOTOGRAPHER";
}

function normalizeStatus(value: string): PartnerStatusValue {
  return partnerStatuses.has(value as PartnerStatusValue) ? (value as PartnerStatusValue) : "ACTIVE";
}

function formatDiscountLabel(input: { discountType: PartnerDiscountType; discountValue?: unknown; displayMessage?: string | null }) {
  if (input.displayMessage) return input.displayMessage;
  const value = numberOrNull(input.discountValue);
  if (input.discountType === "PERCENTAGE" && value !== null) return `تم تطبيق خصم ${value}%`;
  if (input.discountType === "FIXED_AMOUNT" && value !== null) return `تم تطبيق خصم ${value} جنيه`;
  if (input.discountType === "FREE_INVITATION") return "الدعوة مجانية بالكامل";
  return "تم تطبيق البروموكود بنجاح.";
}

async function uniqueSlug(db: PromoDb, displayName: string) {
  const base = slugifyInvitationName(displayName) || `partner-${Date.now().toString(36)}`;
  let slug = base;
  let suffix = 2;
  while (await db.partner.findUnique({ where: { slug }, select: { id: true } })) {
    slug = `${base}-${suffix}`;
    suffix += 1;
  }
  return slug;
}

async function codeExists(db: PromoDb, code: string) {
  const [partnerPromo, discountPromo] = await Promise.all([
    db.partnerPromoCode.findFirst({ where: { code: { equals: code, mode: "insensitive" } }, select: { id: true } }),
    db.discountPromoCode.findFirst({ where: { code: { equals: code, mode: "insensitive" } }, select: { id: true } }),
  ]);
  return Boolean(partnerPromo || discountPromo);
}

async function uniquePromoCode(db: PromoDb, requestedCode: string, seed: string) {
  const base = PromoCodeService.normalizePromoCodeInput(requestedCode || seed.replace(/[^\p{L}\p{N}]+/gu, "")) || randomCode();
  let code = base.slice(0, 32);
  let suffix = 2;
  while (await codeExists(db, code)) {
    const suffixText = String(suffix);
    code = `${base.slice(0, Math.max(1, 32 - suffixText.length))}${suffixText}`;
    suffix += 1;
  }
  return code;
}

async function uniqueReferralSlug(db: PromoDb, code: string) {
  let referralSlug = PromoCodeService.normalizePromoCodeInput(code).slice(0, 32) || randomCode();
  const base = referralSlug;
  let suffix = 2;
  while (await db.partnerPromoCode.findFirst({ where: { referralSlug: { equals: referralSlug, mode: "insensitive" } }, select: { id: true } })) {
    const suffixText = String(suffix);
    referralSlug = `${base.slice(0, Math.max(1, 32 - suffixText.length))}${suffixText}`;
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

async function recordFailedValidation(code: string, result: PromoValidationFailure, context: PromoValidationContext) {
  if (!context.logFailures || !prisma) return;
  await prisma.partnerUsageLog
    .create({
      data: {
        result: "FAILED",
        failureReason: result.status,
        customerIp: context.customerIp || null,
        browser: context.userAgent || null,
        metadata: { code, type: result.type, source: context.source || "promo-validation", error: result.error },
      },
    })
    .catch((error) => console.error("[PromoCodeService] Failed to log validation failure", error));
}

export const PromoCodeService = {
  normalizePromoCodeInput(value: string) {
    return value.trim().replace(/\s+/g, "").toUpperCase().normalize("NFKC").replace(/[^\p{L}\p{N}_-]+/gu, "").slice(0, 32);
  },

  formatDiscountLabel,

  async validatePromoCode(rawCode: string, context: PromoValidationContext = {}): Promise<PromoValidationResult> {
    const code = PromoCodeService.normalizePromoCodeInput(rawCode);
    if (!code) return failure(code, "MISSING", "اكتب البروموكود أولاً.");
    if (!prisma) return failure(code, "DATABASE_UNAVAILABLE", "قاعدة البيانات غير متاحة حالياً.");

    let partnerPromo = await prisma.partnerPromoCode.findUnique({ where: { code }, include: { partner: true } });
    if (!partnerPromo) {
      partnerPromo = await prisma.partnerPromoCode.findFirst({ where: { code: { equals: code, mode: "insensitive" } }, include: { partner: true } });
    }

    if (partnerPromo) {
      const type: PromoCodeType = "partner";
      let result: PromoValidationFailure | null = null;
      if (partnerPromo.deletedAt) result = failure(code, "DELETED", "هذا البروموكود محذوف.", type);
      else if (partnerPromo.archivedAt || partnerPromo.status === "ARCHIVED") result = failure(code, "ARCHIVED", "هذا البروموكود مؤرشف.", type);
      else if (partnerPromo.status !== "ACTIVE") result = failure(code, partnerPromo.status === "EXPIRED" ? "EXPIRED" : "PAUSED", partnerPromo.status === "EXPIRED" ? "انتهت صلاحية البروموكود." : "تم إيقاف البروموكود مؤقتًا.", type);
      else if (!isWithinDateWindow(partnerPromo.startDate, partnerPromo.expiryDate)) result = failure(code, fallbackStatus(partnerPromo.startDate, partnerPromo.expiryDate), "هذا البروموكود غير متاح في الوقت الحالي.", type);
      else if (partnerPromo.usageLimit !== null && partnerPromo.currentUsage >= partnerPromo.usageLimit) result = failure(code, "LIMIT_REACHED", "تم الوصول للحد الأقصى لاستخدام البروموكود.", type);
      else if (partnerPromo.partner.deletedAt || partnerPromo.partner.archivedAt || partnerPromo.partner.status !== "ACTIVE") result = failure(code, "PARTNER_UNAVAILABLE", "الشريك المرتبط بهذا البروموكود غير متاح حالياً.", type);

      if (result) {
        await recordFailedValidation(code, result, context);
        return result;
      }

      const discountValue = numberOrNull(partnerPromo.discountValue);
      const label = formatDiscountLabel({ discountType: partnerPromo.discountType, discountValue });
      const partner = {
        partnerId: partnerPromo.partner.id,
        displayName: partnerPromo.partner.displayName,
        partnerType: partnerPromo.partner.partnerType,
        logoUrl: partnerPromo.partner.logoUrl || "",
        facebookUrl: partnerPromo.partner.facebookUrl || "",
        instagramUrl: partnerPromo.partner.instagramUrl || "",
        showPartnerCard: partnerPromo.partner.showPartnerCard !== false,
      };
      return {
        ok: true,
        type,
        status: "ACTIVE",
        promoId: partnerPromo.id,
        code: partnerPromo.code,
        discount: { discountType: partnerPromo.discountType, discountValue, label },
        partner,
        promo: {
          id: partnerPromo.id,
          code: partnerPromo.code,
          referralSlug: partnerPromo.referralSlug,
          qrCodeUrl: partnerPromo.qrCodeUrl || "",
          discountType: partnerPromo.discountType,
          discountValue,
          discountLabel: label,
        },
        photographer: {
          enabled: true,
          name: partner.displayName,
          logoUrl: partner.logoUrl,
          facebookUrl: partner.facebookUrl,
          instagramUrl: partner.instagramUrl,
          lockedByPromo: true,
        },
        message: label || "تم التعرف على المصور وسيتم إضافة بياناته إلى الدعوة.",
      };
    }

    let discountPromo = await prisma.discountPromoCode.findUnique({ where: { code } });
    if (!discountPromo) {
      discountPromo = await prisma.discountPromoCode.findFirst({ where: { code: { equals: code, mode: "insensitive" } } });
    }
    if (!discountPromo) {
      const result = failure(code, "NOT_FOUND", "هذا البروموكود غير صالح.");
      await recordFailedValidation(code, result, context);
      return result;
    }

    const type: PromoCodeType = "discount";
    let result: PromoValidationFailure | null = null;
    if (discountPromo.deletedAt) result = failure(code, "DELETED", "هذا الكود محذوف.", type);
    else if (discountPromo.archivedAt || discountPromo.status === "ARCHIVED") result = failure(code, "ARCHIVED", "هذا الكود مؤرشف.", type);
    else if (discountPromo.status !== "ACTIVE") result = failure(code, discountPromo.status === "EXPIRED" ? "EXPIRED" : "PAUSED", discountPromo.status === "EXPIRED" ? "انتهت صلاحية كود الخصم." : "تم إيقاف كود الخصم مؤقتًا.", type);
    else if (!isWithinDateWindow(discountPromo.startDate, discountPromo.expiryDate)) result = failure(code, fallbackStatus(discountPromo.startDate, discountPromo.expiryDate), "كود الخصم غير متاح في الوقت الحالي.", type);
    else if (discountPromo.usageLimit !== null && discountPromo.currentUsage >= discountPromo.usageLimit) result = failure(code, "LIMIT_REACHED", "تم الوصول للحد الأقصى لاستخدام كود الخصم.", type);
    if (result) {
      await recordFailedValidation(code, result, context);
      return result;
    }

    const discountValue = numberOrNull(discountPromo.discountValue);
    const label = formatDiscountLabel({ discountType: discountPromo.discountType, discountValue, displayMessage: discountPromo.displayMessage });
    return {
      ok: true,
      type,
      status: "ACTIVE",
      promoId: discountPromo.id,
      code: discountPromo.code,
      discount: { discountType: discountPromo.discountType, discountValue, label },
      promo: {
        id: discountPromo.id,
        code: discountPromo.code,
        discountType: discountPromo.discountType,
        discountValue,
        discountLabel: label,
      },
      message: label,
    };
  },

  async createPartnerPromo(input: PromoCreatePartnerInput) {
    if (!prisma) throw new Error("database_unavailable");
    const displayName = formString(input.formData, "displayName");
    if (displayName.length < 2) throw new Error("name");
    const discountType = normalizeDiscountType(formString(input.formData, "discountType"));
    const discountValueRaw = Number(formString(input.formData, "discountValue"));
    const needsDiscountValue = discountType === "PERCENTAGE" || discountType === "FIXED_AMOUNT";
    if (needsDiscountValue && (!Number.isFinite(discountValueRaw) || discountValueRaw <= 0)) throw new Error("discount");

    const code = await uniquePromoCode(prisma, formString(input.formData, "promoCode"), displayName);
    const referralSlug = await uniqueReferralSlug(prisma, code);
    const shortUrl = buildShortReferralUrl(input.siteUrl, referralSlug);
    const qrCodeUrl = await QRCode.toDataURL(shortUrl).catch(() => "");
    const logoUrl = await resolveLogoUrl(input.formData);
    const partnerSlug = await uniqueSlug(prisma, displayName);
    const partnerType = normalizePartnerType(formString(input.formData, "partnerType"));
    const facebookUrl = formString(input.formData, "facebookUrl") || null;
    const instagramUrl = formString(input.formData, "instagramUrl") || null;

    const created = await prisma.$transaction(async (tx) => {
      const partner = await tx.partner.create({
        data: {
          displayName,
          slug: partnerSlug,
          partnerType: partnerType as never,
          tier: "FREE",
          status: "ACTIVE",
          subscriptionStatus: "ACTIVE",
          logoUrl,
          facebookUrl,
          instagramUrl,
          showPartnerCard: input.formData.get("showPartnerCard") !== "off",
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
          subscriptions: { create: { status: "ACTIVE", plan: "FREE", autoRenew: false } },
        },
        include: { promoCodes: true },
      });
      const promo = partner.promoCodes[0];
      await tx.partnerActivityLog.create({
        data: { partnerId: partner.id, action: "partner.created", performedBy: "admin", newValue: { displayName, promoCode: code, referralSlug }, metadata: { source: "promo-code-service" } },
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
          metadata: { source: "promo-code-service" },
        },
      });
      return { partner, promo };
    });

    const linkTest = await PromoCodeService.testShortLink({ siteUrl: input.siteUrl, slug: created.promo.referralSlug, expectedCode: created.promo.code });
    if (!linkTest.ok) {
      await prisma.$transaction([
        prisma.partnerPromoCode.update({ where: { id: created.promo.id }, data: { status: "PAUSED" } }),
        prisma.partnerActivityLog.create({
          data: {
            partnerId: created.partner.id,
            action: "promo.short_link_test_failed",
            performedBy: "promo-code-service",
            newValue: { promoId: created.promo.id, code: created.promo.code, reason: linkTest.reason || "unknown" },
            metadata: { url: linkTest.url, status: linkTest.status || null, location: linkTest.location || null },
          },
        }),
      ]);
    }
    return { ...created, shortUrl, qrCodeUrl, linkTest };
  },

  async createDiscountPromo(input: PromoCreateDiscountInput) {
    if (!prisma) throw new Error("database_unavailable");
    const internalName = formString(input.formData, "internalName") || formString(input.formData, "displayMessage") || "كود خصم";
    if (internalName.length < 2) throw new Error("name");
    const discountType = normalizeDiscountType(formString(input.formData, "discountType") || "PERCENTAGE");
    const discountValueRaw = Number(formString(input.formData, "discountValue"));
    const needsDiscountValue = discountType === "PERCENTAGE" || discountType === "FIXED_AMOUNT";
    if (needsDiscountValue && (!Number.isFinite(discountValueRaw) || discountValueRaw <= 0)) throw new Error("discount");
    const code = await uniquePromoCode(prisma, formString(input.formData, "code"), internalName);
    const startDateRaw = formString(input.formData, "startDate");
    const expiryDateRaw = formString(input.formData, "expiryDate");
    const startDate = startDateRaw ? new Date(`${startDateRaw}T00:00:00`) : null;
    const expiryDate = expiryDateRaw ? new Date(`${expiryDateRaw}T23:59:59`) : null;
    const usageLimitRaw = Number(formString(input.formData, "usageLimit"));
    const created = await prisma.discountPromoCode.create({
      data: {
        internalName,
        code,
        internalDescription: formString(input.formData, "internalDescription") || null,
        displayMessage: formString(input.formData, "displayMessage") || null,
        status: normalizeStatus(formString(input.formData, "status")),
        discountType,
        discountValue: needsDiscountValue ? discountValueRaw : null,
        usageLimit: Number.isFinite(usageLimitRaw) && usageLimitRaw > 0 ? Math.floor(usageLimitRaw) : null,
        startDate: startDate && !Number.isNaN(startDate.getTime()) ? startDate : null,
        expiryDate: expiryDate && !Number.isNaN(expiryDate.getTime()) ? expiryDate : null,
        restrictions: formString(input.formData, "notes") ? { notes: formString(input.formData, "notes") } : undefined,
        createdBy: "admin",
      },
      select: { id: true, code: true },
    });
    return created;
  },

  async recordPromoOrderApplication(input: PromoApplicationInput) {
    const db = input.db || prisma;
    if (!db) throw new Error("database_unavailable");
    if (input.validation.type === "partner" && input.validation.partner) {
      await db.partnerPromoCode.update({ where: { id: input.validation.promoId }, data: { currentUsage: { increment: 1 }, lastUsedAt: new Date() } });
      await db.partnerUsageLog.create({
        data: {
          partnerId: input.validation.partner.partnerId,
          promoId: input.validation.promoId,
          orderId: input.orderId,
          invitationId: input.invitationId || null,
          customerIp: input.customerIp || null,
          browser: input.userAgent || null,
          result: "SUCCESS",
          metadata: { referralSource: input.referralSource || "order-form", code: input.validation.code, type: input.validation.type },
        },
      });
      await db.partnerActivityLog.create({
        data: {
          partnerId: input.validation.partner.partnerId,
          action: "promo.applied_to_order",
          performedBy: "public-order-form",
          newValue: { orderId: input.orderId, invitationId: input.invitationId || null, promoId: input.validation.promoId, code: input.validation.code },
          metadata: { referralSource: input.referralSource || "order-form", type: input.validation.type },
        },
      });
      return;
    }
    await db.discountPromoCode.update({ where: { id: input.validation.promoId }, data: { currentUsage: { increment: 1 }, lastUsedAt: new Date() } });
  },

  async testShortLink(input: { siteUrl: string; slug: string; expectedCode?: string }) {
    const path = buildShortReferralPath(input.slug);
    const url = buildShortReferralUrl(input.siteUrl, input.slug);
    if (!path.startsWith("/r/") || !input.slug) {
      return { ok: false, status: 0, location: "", cookieName: PARTNER_PROMO_COOKIE, path, url, expectedCode: input.expectedCode || "", reason: "invalid-short-path" };
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    try {
      const response = await fetch(url, { redirect: "manual", cache: "no-store", signal: controller.signal });
      const location = response.headers.get("location") || "";
      const setCookie = response.headers.get("set-cookie") || "";
      const redirectOk = response.status === 307 && (location.endsWith("/order") || location.includes("/order"));
      const expectedCode = PromoCodeService.normalizePromoCodeInput(input.expectedCode || "");
      const cookieOk = setCookie.includes(PARTNER_PROMO_COOKIE) && (!expectedCode || setCookie.toUpperCase().includes(expectedCode));
      const reason = !redirectOk ? "short-link-did-not-redirect-to-order" : !cookieOk ? "promo-cookie-missing" : "";
      return {
        ok: redirectOk && cookieOk,
        status: response.status,
        location,
        cookieName: PARTNER_PROMO_COOKIE,
        path,
        url,
        expectedCode,
        reason,
      };
    } catch (error) {
      return {
        ok: false,
        status: 0,
        location: "",
        cookieName: PARTNER_PROMO_COOKIE,
        path,
        url,
        expectedCode: input.expectedCode || "",
        reason: error instanceof Error ? error.message : "short-link-fetch-failed",
      };
    } finally {
      clearTimeout(timeout);
    }
  },

  async getPromoHealth() {
    if (!prisma) throw new Error("database_unavailable");
    const [partnerPromos, discountPromos] = await Promise.all([
      prisma.partnerPromoCode.findMany({ include: { partner: { select: { id: true, deletedAt: true } } } }),
      prisma.discountPromoCode.findMany(),
    ]);
    const allCodes = [...partnerPromos.map((item) => item.code), ...discountPromos.map((item) => item.code)].map((code) => PromoCodeService.normalizePromoCodeInput(code));
    const duplicateCodes = allCodes.length - new Set(allCodes).size;
    const activeCount = partnerPromos.filter((item) => item.status === "ACTIVE" && !item.deletedAt).length + discountPromos.filter((item) => item.status === "ACTIVE" && !item.deletedAt).length;
    const pausedCount = partnerPromos.filter((item) => item.status === "PAUSED").length + discountPromos.filter((item) => item.status === "PAUSED").length;
    const expiredCount = partnerPromos.filter((item) => item.status === "EXPIRED" || (item.expiryDate && item.expiryDate.getTime() < Date.now())).length + discountPromos.filter((item) => item.status === "EXPIRED" || (item.expiryDate && item.expiryDate.getTime() < Date.now())).length;
    const archivedCount = partnerPromos.filter((item) => item.status === "ARCHIVED" || item.archivedAt).length + discountPromos.filter((item) => item.status === "ARCHIVED" || item.archivedAt).length;
    const brokenShortLinks = partnerPromos.filter((item) => !item.referralSlug || item.deletedAt || item.status !== "ACTIVE").length;
    const invalidQrCodes = partnerPromos.filter((item) => item.qrCodeUrl && !String(item.qrCodeUrl).startsWith("data:image/")).length;
    const relationErrors = partnerPromos.filter((item) => !item.partner || item.partner.deletedAt).length;
    return {
      partnerPromoCount: partnerPromos.length,
      discountPromoCount: discountPromos.length,
      activeCount,
      pausedCount,
      expiredCount,
      archivedCount,
      brokenShortLinks,
      invalidQrCodes,
      duplicateCodes,
      relationErrors,
    };
  },
};
