import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

function csvCell(value: unknown) {
  const text = value instanceof Date ? value.toISOString() : String(value ?? "");
  return `"${text.replace(/"/g, '""')}"`;
}

function referralSearchToken(value: string) {
  return value
    .replace(/^https?:\/\/[^/]+\/[rp]\//i, "")
    .replace(/^\/?[rp]\//i, "")
    .replace(/^https?:\/\/[^/]+/i, "")
    .replace(/[?#].*$/, "")
    .trim();
}

export async function GET(request: NextRequest) {
  if (!prisma) {
    return NextResponse.json({ error: "database_unavailable" }, { status: 503 });
  }

  const q = (request.nextUrl.searchParams.get("q") || "").trim();
  const status = request.nextUrl.searchParams.get("status") || "all";
  const type = request.nextUrl.searchParams.get("type") || "all";
  const referralToken = referralSearchToken(q);
  const partners = await prisma.partner.findMany({
    where: {
      ...(q
        ? {
            OR: [
              { id: { contains: q, mode: "insensitive" as const } },
              { displayName: { contains: q, mode: "insensitive" as const } },
              { slug: { contains: q, mode: "insensitive" as const } },
              { facebookUrl: { contains: q, mode: "insensitive" as const } },
              { instagramUrl: { contains: q, mode: "insensitive" as const } },
              { promoCodes: { some: { code: { contains: q.toUpperCase(), mode: "insensitive" as const } } } },
              { promoCodes: { some: { referralSlug: { contains: referralToken || q, mode: "insensitive" as const } } } },
            ],
          }
        : {}),
      ...(status !== "all" ? { status: status as never } : {}),
      ...(type !== "all" ? { partnerType: type as never } : {}),
    },
    orderBy: { createdAt: "desc" },
    include: {
      promoCodes: { where: { deletedAt: null }, orderBy: { createdAt: "desc" }, take: 1 },
      _count: { select: { orders: true, usageLogs: true, messages: true } },
    },
  });

  const rows = [
    ["id", "name", "type", "status", "subscriptionStatus", "promoCode", "referralSlug", "discountType", "discountValue", "orders", "usage", "messages", "facebook", "instagram", "createdAt"],
    ...partners.map((partner) => {
      const promo = partner.promoCodes[0];
      return [
        partner.id,
        partner.displayName,
        partner.partnerType,
        partner.status,
        partner.subscriptionStatus,
        promo?.code || "",
        promo?.referralSlug || "",
        promo?.discountType || "",
        promo?.discountValue || "",
        partner._count.orders,
        partner._count.usageLogs,
        partner._count.messages,
        partner.facebookUrl || "",
        partner.instagramUrl || "",
        partner.createdAt,
      ];
    }),
  ];

  const csv = rows.map((row) => row.map(csvCell).join(",")).join("\n");
  const fileName = `partners-${new Date().toISOString().slice(0, 10)}.csv`;

  return new NextResponse(`\uFEFF${csv}`, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${fileName}"`,
    },
  });
}
