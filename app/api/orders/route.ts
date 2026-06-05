import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { orderRequestSchema } from "@/lib/validation";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = orderRequestSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "بيانات الطلب غير مكتملة", details: parsed.error.flatten() }, { status: 400 });
  }

  if (prisma) {
    await prisma.orderRequest.create({
      data: {
        groomName: parsed.data.groomName,
        brideName: parsed.data.brideName,
        phone: parsed.data.phone,
        weddingDate: new Date(parsed.data.weddingDate),
        venue: parsed.data.venue,
        notes: parsed.data.notes,
        language: parsed.data.language,
        template: { connect: { slug: parsed.data.templateSlug } },
      },
    });
  }

  return NextResponse.json({ ok: true });
}
