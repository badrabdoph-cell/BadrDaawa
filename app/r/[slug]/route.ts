import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import {
  normalizePromoCode,
  normalizeReferralSlug,
  PARTNER_PROMO_COOKIE,
  PARTNER_PROMO_COOKIE_MAX_AGE,
  PARTNER_PROMO_STATUS_COOKIE,
  PARTNER_PROMO_STATUS_COOKIE_MAX_AGE,
} from "@/lib/partner-promo";
import { detectVisitSource } from "@/lib/visit-source";

export const runtime = "nodejs";

const recentVisitKeys = new Map<string, number>();
const VISIT_DEDUPLICATION_WINDOW_MS = 30 * 60 * 1000;

const STATUS_MESSAGES: Record<string, string> = {
  "not-found": "هذا الرابط غير صالح أو البروموكود غير موجود.",
  inactive: "هذا البروموكود غير متوفر أو انتهت صلاحيته.",
  "lookup-failed": "عذراً، حدث خطأ مؤقت. حاول مرة أخرى.",
  "database-unavailable": "الخدمة غير متاحة حالياً. حاول مرة أخرى لاحقاً.",
};

function isWithinDateWindow(startDate?: Date | null, expiryDate?: Date | null) {
  const now = Date.now();
  if (startDate && startDate.getTime() > now) return false;
  if (expiryDate && expiryDate.getTime() < now) return false;
  return true;
}

function shouldLogVisit(key: string) {
  const now = Date.now();
  const previous = recentVisitKeys.get(key);
  if (previous && now - previous < VISIT_DEDUPLICATION_WINDOW_MS) return false;
  recentVisitKeys.set(key, now);

  if (recentVisitKeys.size > 2000) {
    for (const [storedKey, timestamp] of recentVisitKeys) {
      if (now - timestamp >= VISIT_DEDUPLICATION_WINDOW_MS) recentVisitKeys.delete(storedKey);
      if (recentVisitKeys.size <= 1500) break;
    }
  }
  return true;
}

function isSecureRequest(request: NextRequest) {
  return request.nextUrl.protocol === "https:" || request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim() === "https";
}

function referralCookieOptions(request: NextRequest, maxAge: number) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: isSecureRequest(request),
    path: "/",
    maxAge,
  };
}

function buildOrderUrl(request: NextRequest, promoCode?: string, promoStatus?: string) {
  const orderUrl = new URL("/order", request.url);
  if (promoCode) orderUrl.searchParams.set("promo", normalizePromoCode(promoCode));
  if (promoStatus) orderUrl.searchParams.set("promoStatus", promoStatus);
  return orderUrl;
}

function redirectToOrderWithPromo(request: NextRequest, code: string) {
  const response = NextResponse.redirect(buildOrderUrl(request, code), 307);
  response.cookies.set(PARTNER_PROMO_COOKIE, normalizePromoCode(code), referralCookieOptions(request, PARTNER_PROMO_COOKIE_MAX_AGE));
  response.cookies.set(PARTNER_PROMO_STATUS_COOKIE, "", referralCookieOptions(request, 0));
  return response;
}

function redirectToOrderWithUnavailablePromo(request: NextRequest, promoStatus: string) {
  const response = NextResponse.redirect(buildOrderUrl(request, undefined, promoStatus), 307);
  response.cookies.set(PARTNER_PROMO_COOKIE, "", referralCookieOptions(request, 0));
  response.cookies.set(PARTNER_PROMO_STATUS_COOKIE, promoStatus, referralCookieOptions(request, PARTNER_PROMO_STATUS_COOKIE_MAX_AGE));
  return response;
}

function redirectToOrderWithoutPromo(request: NextRequest) {
  return NextResponse.redirect(new URL("/order", request.url), 307);
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const rawSlug = slug.trim();
  const cleanSlug = normalizeReferralSlug(rawSlug);
  if (!rawSlug) return redirectToOrderWithoutPromo(request);
  if (!prisma) return redirectToOrderWithUnavailablePromo(request, "database-unavailable");

  let promo = null;
  try {
    promo = await prisma.partnerPromoCode.findFirst({
      where: {
        OR: [
          { referralSlug: rawSlug },
          { referralSlug: { equals: rawSlug, mode: "insensitive" as const } },
          ...(cleanSlug && cleanSlug !== rawSlug
            ? [{ referralSlug: cleanSlug }, { referralSlug: { equals: cleanSlug, mode: "insensitive" as const } }]
            : []),
        ],
      },
      select: {
        id: true,
        partnerId: true,
        code: true,
        referralSlug: true,
        status: true,
        usageLimit: true,
        currentUsage: true,
        startDate: true,
        expiryDate: true,
        deletedAt: true,
        partner: {
          select: {
            status: true,
            deletedAt: true,
            subscriptionStatus: true,
            subscriptionAutoDisable: true,
          },
        },
      },
    });
  } catch (error) {
    console.error("[Partner Promo] Failed to resolve short link", error);
    return redirectToOrderWithUnavailablePromo(request, "lookup-failed");
  }

  if (!promo) return redirectToOrderWithUnavailablePromo(request, "not-found");

  const invalid =
    promo.deletedAt ||
    promo.status !== "ACTIVE" ||
    !isWithinDateWindow(promo.startDate, promo.expiryDate) ||
    (promo.usageLimit !== null && promo.currentUsage >= promo.usageLimit) ||
    promo.partner.deletedAt ||
    promo.partner.status !== "ACTIVE" ||
    (promo.partner.subscriptionAutoDisable && ["PAST_DUE", "EXPIRED", "CANCELLED"].includes(promo.partner.subscriptionStatus));

  if (invalid) return redirectToOrderWithUnavailablePromo(request, "inactive");

  const visitorIp = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "unknown";
  const dedupKey = `${promo.id}:${visitorIp}`;

  if (shouldLogVisit(dedupKey)) {
    const referrer = request.headers.get("referer");
    const userAgent = request.headers.get("user-agent");
    const source = detectVisitSource({ referrer, userAgent });

    await prisma.partnerActivityLog
      .create({
        data: {
          partnerId: promo.partnerId,
          action: "promo.short_link_visit",
          performedBy: "public-short-link",
          newValue: {
            promoId: promo.id,
            code: promo.code,
            referralSlug: promo.referralSlug,
          },
          metadata: {
            path: `/r/${rawSlug}`,
            resolvedReferralSlug: promo.referralSlug,
            referrer: referrer || null,
            userAgent: userAgent || null,
            source: source || null,
            visitorIp: visitorIp,
          },
        },
      })
      .catch((error) => {
        console.error("[Partner Promo] Failed to log short-link visit", error);
      });
  }

  return redirectToOrderWithPromo(request, promo.code);
}
