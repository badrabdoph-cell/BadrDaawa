import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

function csvCell(value: unknown) {
  const text = value instanceof Date ? value.toISOString() : String(value ?? "");
  return `"${text.replace(/"/g, '""')}"`;
}

function readValue(value: unknown, key: string) {
  if (!value || typeof value !== "object" || !(key in value)) return "";
  const next = (value as Record<string, unknown>)[key];
  return typeof next === "string" || typeof next === "number" ? String(next) : "";
}

function validDate(value: string | null) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export async function GET(request: NextRequest) {
  if (!prisma) {
    return NextResponse.json({ error: "database_unavailable" }, { status: 503 });
  }

  const q = (request.nextUrl.searchParams.get("q") || "").trim();
  const action = request.nextUrl.searchParams.get("action") || "all";
  const dateFrom = validDate(request.nextUrl.searchParams.get("dateFrom"));
  const dateToValue = request.nextUrl.searchParams.get("dateTo");
  const dateTo = validDate(dateToValue ? `${dateToValue}T23:59:59` : null);
  const activity = await prisma.partnerActivityLog.findMany({
    where: {
      ...(action !== "all" ? { action } : {}),
      ...(q ? { partner: { displayName: { contains: q, mode: "insensitive" as const } } } : {}),
      ...(dateFrom || dateTo
        ? {
            createdAt: {
              ...(dateFrom ? { gte: dateFrom } : {}),
              ...(dateTo ? { lte: dateTo } : {}),
            },
          }
        : {}),
    },
    orderBy: { createdAt: "desc" },
    take: 1000,
    include: { partner: { select: { displayName: true } } },
  });

  const rows = [
    ["createdAt", "partner", "action", "performedBy", "promoCode", "promoId"],
    ...activity.map((item) => [
      item.createdAt,
      item.partner?.displayName || "",
      item.action,
      item.performedBy || "",
      readValue(item.newValue, "code") || readValue(item.newValue, "promoCode"),
      readValue(item.newValue, "promoId"),
    ]),
  ];

  const csv = rows.map((row) => row.map(csvCell).join(",")).join("\n");
  const fileName = `partner-activity-${new Date().toISOString().slice(0, 10)}.csv`;

  return new NextResponse(`\uFEFF${csv}`, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${fileName}"`,
    },
  });
}
