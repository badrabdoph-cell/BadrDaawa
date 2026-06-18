import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { addSecurityHeaders } from "@/lib/security-enhancements";

const API_KEYS = (process.env.PUBLIC_API_KEYS || "").split(",").filter(Boolean);

function authenticateApiKey(request: NextRequest): boolean {
  const apiKey = request.headers.get("x-api-key");
  if (!apiKey) return false;
  return API_KEYS.includes(apiKey) || API_KEYS.length === 0;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get("action");

    if (!authenticateApiKey(request)) {
      return addSecurityHeaders(
        NextResponse.json({ error: "مفتاح API غير صالح" }, { status: 401 })
      );
    }

    switch (action) {
      case "list-templates":
        if (!prisma) break;
        const templates = await prisma.weddingTemplate.findMany({
          where: { enabled: true },
          select: { slug: true, name: true, arabicName: true, category: true, style: true },
          orderBy: { sortOrder: "asc" },
        });
        return NextResponse.json({ data: templates });

      case "stats":
        if (!prisma) break;
        const [invitations, orders] = await Promise.all([
          prisma.invitation.count({ where: { status: "ACTIVE", deletedAt: null } }),
          prisma.orderRequest.count({ where: { deletedAt: null } }),
        ]);
        return NextResponse.json({ data: { activeInvitations: invitations, totalOrders: orders } });

      default:
        return NextResponse.json({ 
          error: "إجراء غير معروف",
          available: ["list-templates", "stats"]
        }, { status: 400 });
    }

    return NextResponse.json({ error: "قاعدة البيانات غير متصلة" }, { status: 503 });
  } catch (err) {
    console.error("Public API error:", err);
    return NextResponse.json({ error: "خطأ داخلي" }, { status: 500 });
  }
}
