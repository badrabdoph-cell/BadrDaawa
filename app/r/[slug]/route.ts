import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { normalizeReferralSlug } from "@/lib/partner-promo";

export const runtime = "nodejs";

const recentVisitKeys = new Map<string, number>();
const VISIT_DEDUPLICATION_WINDOW_MS = 30 * 60 * 1000;

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

export async function GET(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const rawSlug = slug.trim();
  const cleanSlug = normalizeReferralSlug(rawSlug);
  const fallback = new URL("/order", request.url);
  if (!rawSlug || !prisma) return NextResponse.redirect(fallback, 307);

  const promo = await prisma.partnerPromoCode.findFirst({
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
      archivedAt: true,
      partner: {
        select: {
          status: true,
          deletedAt: true,
          archivedAt: true,
          subscriptionStatus: true,
          subscriptionAutoDisable: true,
        },
      },
    },
  });

  const invalid =
    !promo ||
    promo.deletedAt ||
    promo.archivedAt ||
    promo.status !== "ACTIVE" ||
    !isWithinDateWindow(promo.startDate, promo.expiryDate) ||
    (promo.usageLimit !== null && promo.currentUsage >= promo.usageLimit) ||
    promo.partner.deletedAt ||
    promo.partner.archivedAt ||
    promo.partner.status !== "ACTIVE" ||
    (promo.partner.subscriptionAutoDisable && ["PAST_DUE", "EXPIRED", "CANCELLED"].includes(promo.partner.subscriptionStatus));

  if (invalid) return NextResponse.redirect(fallback, 307);

  const visitorIp = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "unknown";
  if (shouldLogVisit(`${promo.id}:${visitorIp}`)) {
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
            referrer: request.headers.get("referer") || null,
            userAgent: request.headers.get("user-agent") || null,
          },
        },
      })
      .catch((error) => {
        console.error("[Partner Promo] Failed to log short-link visit", error);
      });
  }

  const url = new URL("/order", request.url);
  url.searchParams.set("promo", promo.code);
  url.searchParams.set("referralSource", "short-link");
  return NextResponse.redirect(url, 307);
}
