import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { createFileOrder } from "@/lib/file-store";
import { queueGitHubSync } from "@/lib/github-sync-queue";
import { saveOrderPreviewImages } from "@/lib/order-preview-images";
import { getPublicTemplateWithSettings, getTemplateSortOrderWithSettings } from "@/lib/template-settings";
import { orderRequestSchema } from "@/lib/validation";

export const runtime = "nodejs";

async function saveOrderImages(images: string[], request: Request) {
  console.log(`[Order API] Saving ${images.length} order image(s) for ${request.url}.`);
  return saveOrderPreviewImages(images, "order-requests");
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = orderRequestSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "اكتب اسم العريس واسم العروسة وتاريخ الفرح، وبعدها تقدر تكمل الطلب على واتساب.", details: parsed.error.flatten() }, { status: 400 });
  }

  const selectedTemplate = await getPublicTemplateWithSettings(parsed.data.templateSlug);
  if (!selectedTemplate) {
    return NextResponse.json({ error: "القالب المختار غير متاح حاليًا" }, { status: 400 });
  }

  const imageUrls = await saveOrderImages(parsed.data.orderImages, request);
  const imageNotes = imageUrls.length ? `صور الطلب:\n${imageUrls.map((url, index) => `${index + 1}. ${url}`).join("\n")}` : "";
  const notes = [parsed.data.notes, imageNotes].filter(Boolean).join("\n\n");
  let orderId = "";

  if (!prisma) {
    const order = await createFileOrder({
      groomName: parsed.data.groomName,
      brideName: parsed.data.brideName,
      phone: parsed.data.phone || "",
      weddingDate: parsed.data.weddingDate,
      venue: parsed.data.venue || "",
      notes,
      imageUrls,
      templateSlug: selectedTemplate.slug,
      language: parsed.data.language,
    });
    orderId = order.id;
  } else {
    try {
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

      const order = await prisma.orderRequest.create({
        data: {
          groomName: parsed.data.groomName,
          brideName: parsed.data.brideName,
          phone: parsed.data.phone || "",
          weddingDate: new Date(parsed.data.weddingDate),
          venue: parsed.data.venue || "",
          notes,
          imageUrls,
          language: parsed.data.language,
          templateId: template.id,
        },
        select: { id: true },
      });
      orderId = order.id;
    } catch (error) {
      console.error("Failed to persist order request", error);
      const order = await createFileOrder({
        groomName: parsed.data.groomName,
        brideName: parsed.data.brideName,
        phone: parsed.data.phone || "",
        weddingDate: parsed.data.weddingDate,
        venue: parsed.data.venue || "",
        notes,
        imageUrls,
        templateSlug: selectedTemplate.slug,
        language: parsed.data.language,
      });
      orderId = order.id;
    }
  }

  queueGitHubSync(`Order request created: ${orderId}.`, { createSnapshot: true });
  return NextResponse.json({ ok: true, orderId, imageUrls });
}
