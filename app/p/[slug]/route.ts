import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";

export async function GET(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const cleanSlug = slug.trim();
  const fallback = new URL("/order", request.url);
  if (!cleanSlug || !prisma) return NextResponse.redirect(fallback, 307);

  const promo = await prisma.partnerPromoCode.findUnique({
    where: { referralSlug: cleanSlug },
    select: {
      code: true,
      status: true,
      deletedAt: true,
      archivedAt: true,
      partner: { select: { status: true, deletedAt: true, archivedAt: true } },
    },
  });

  if (
    !promo ||
    promo.deletedAt ||
    promo.archivedAt ||
    promo.status !== "ACTIVE" ||
    promo.partner.deletedAt ||
    promo.partner.archivedAt ||
    promo.partner.status !== "ACTIVE"
  ) {
    return NextResponse.redirect(fallback, 307);
  }

  const url = new URL("/order", request.url);
  url.searchParams.set("promo", promo.code);
  url.searchParams.set("referralSource", "short-link");
  return NextResponse.redirect(url, 307);
}
