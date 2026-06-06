import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getTemplateSortOrderWithSettings, getTemplateWithSettings } from "@/lib/template-settings";
import { orderRequestSchema } from "@/lib/validation";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = orderRequestSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "اكتب اسم العريس واسم العروسة وتاريخ الفرح، وبعدها تقدر تكمل الطلب على واتساب.", details: parsed.error.flatten() }, { status: 400 });
  }

  if (prisma) {
    const selectedTemplate = await getTemplateWithSettings(parsed.data.templateSlug);
    if (!selectedTemplate) {
      return NextResponse.json({ error: "القالب المختار غير موجود" }, { status: 400 });
    }

    const template = await prisma.weddingTemplate.upsert({
      where: { slug: parsed.data.templateSlug },
      update: {
        name: selectedTemplate.name,
        arabicName: selectedTemplate.arabicName,
        category: selectedTemplate.category,
        style: selectedTemplate.style,
        concept: selectedTemplate.concept,
        opening: selectedTemplate.opening,
        layout: selectedTemplate.layout,
        typography: selectedTemplate.typography,
        palette: selectedTemplate.palette,
        previewUrl: selectedTemplate.previewImage,
        enabled: selectedTemplate.enabled,
      },
      create: {
        slug: selectedTemplate.slug,
        name: selectedTemplate.name,
        arabicName: selectedTemplate.arabicName,
        category: selectedTemplate.category,
        style: selectedTemplate.style,
        concept: selectedTemplate.concept,
        opening: selectedTemplate.opening,
        layout: selectedTemplate.layout,
        typography: selectedTemplate.typography,
        palette: selectedTemplate.palette,
        previewUrl: selectedTemplate.previewImage,
        enabled: selectedTemplate.enabled,
        sortOrder: await getTemplateSortOrderWithSettings(selectedTemplate.slug),
      },
      select: { id: true },
    });

    await prisma.orderRequest.create({
      data: {
        groomName: parsed.data.groomName,
        brideName: parsed.data.brideName,
        phone: parsed.data.phone || "",
        weddingDate: new Date(parsed.data.weddingDate),
        venue: parsed.data.venue || "",
        notes: parsed.data.notes,
        language: parsed.data.language,
        templateId: template.id,
      },
    });
  }

  return NextResponse.json({ ok: true });
}
