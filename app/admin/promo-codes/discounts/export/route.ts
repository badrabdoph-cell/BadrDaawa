import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

function csvCell(value: unknown) {
  const text = value instanceof Date ? value.toISOString() : String(value ?? "");
  return `"${text.replace(/"/g, '""')}"`;
}

function discountValue(type: string, value: unknown) {
  if (type === "FREE_INVITATION") return "100%";
  return value ?? "";
}

export async function GET() {
  if (!prisma) {
    return NextResponse.json({ error: "database_unavailable" }, { status: 503 });
  }

  const codes = await prisma.discountPromoCode.findMany({
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { orders: true } } },
  });

  const rows = [
    ["code", "internalName", "status", "discountType", "discountValue", "usageLimit", "currentUsage", "orders", "startDate", "expiryDate", "deletedAt", "createdAt"],
    ...codes.map((code) => [
      code.code,
      code.internalName,
      code.deletedAt ? "DELETED" : code.status,
      code.discountType,
      discountValue(code.discountType, code.discountValue),
      code.usageLimit ?? "",
      code.currentUsage,
      code._count.orders,
      code.startDate,
      code.expiryDate,
      code.deletedAt,
      code.createdAt,
    ]),
  ];

  const csv = rows.map((row) => row.map(csvCell).join(",")).join("\n");
  const fileName = `discount-codes-${new Date().toISOString().slice(0, 10)}.csv`;

  return new NextResponse(`\uFEFF${csv}`, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${fileName}"`,
    },
  });
}
