import { NextResponse } from "next/server";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import { prisma } from "@/lib/db";
import { createFileOrder } from "@/lib/file-store";
import { queueGitHubSync } from "@/lib/github-sync-queue";
import { imageExtensionFromDataMime, isSupportedImageUrl } from "@/lib/image-formats";
import { getPublicTemplateWithSettings, getTemplateSortOrderWithSettings } from "@/lib/template-settings";
import { getPublicUrl, normalizeInternalAssetUrl } from "@/lib/utils";
import { orderRequestSchema } from "@/lib/validation";

export const runtime = "nodejs";

async function saveOrderImages(images: string[], request: Request) {
  const uploadDir = path.join(process.cwd(), "public", "uploads", "order-requests");
  const savedUrls: string[] = [];

  for (const image of images.slice(0, 3)) {
    if (image.startsWith("/") || image.startsWith("http://") || image.startsWith("https://")) {
      savedUrls.push(normalizeInternalAssetUrl(image) || getPublicUrl(image, request.headers, new URL(request.url).origin).toString());
      continue;
    }

    if (!isSupportedImageUrl(image)) continue;

    const match = image.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,([a-zA-Z0-9+/=]+)$/);
    if (!match) continue;

    const bytes = Buffer.from(match[2], "base64");
    if (!bytes.length || bytes.length > 12 * 1024 * 1024) continue;
    const extension = imageExtensionFromDataMime(match[1]) || "jpg";

    await mkdir(uploadDir, { recursive: true });
    const fileName = `order-${Date.now()}-${crypto.randomBytes(4).toString("hex")}.${extension}`;
    await writeFile(path.join(uploadDir, fileName), bytes);
    savedUrls.push(`/uploads/order-requests/${fileName}`);
  }

  return savedUrls;
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
