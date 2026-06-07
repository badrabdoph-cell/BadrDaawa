import { NextResponse } from "next/server";
import crypto from "node:crypto";
import { cleanPlayableAudioUrl, saveAudioDataUrl } from "@/lib/audio-files";
import { prisma } from "@/lib/db";
import { createFileOrder } from "@/lib/file-store";
import { queueGitHubSync } from "@/lib/github-sync-queue";
import { saveOrderPreviewImages } from "@/lib/order-preview-images";
import { getPublicTemplateWithSettings, getTemplateSortOrderWithSettings } from "@/lib/template-settings";
import { getPublicSiteUrl, getWhatsAppOrderUrl } from "@/lib/utils";
import { orderRequestSchema } from "@/lib/validation";

export const runtime = "nodejs";

async function saveOrderImages(images: string[], request: Request) {
  console.log(`[Order API] Saving ${images.length} order image(s) for ${request.url}.`);
  return saveOrderPreviewImages(images, "order-requests");
}

async function resolveOrderMusic(input: { musicEnabled: boolean; musicChoice: "default" | "upload" | "url"; musicUrl?: string; orderMusic?: string }) {
  if (!input.musicEnabled) return { musicUrl: "", error: "" };
  if (input.musicChoice === "default") return { musicUrl: "", error: "" };

  if (input.musicChoice === "upload") {
    const uploadedUrl = input.orderMusic ? await saveAudioDataUrl(input.orderMusic) : "";
    if (uploadedUrl) return { musicUrl: uploadedUrl, error: "" };
    const restoredUploadUrl = cleanPlayableAudioUrl(input.musicUrl || "");
    if (restoredUploadUrl) return { musicUrl: restoredUploadUrl, error: "" };
    return { musicUrl: "", error: input.orderMusic || input.musicUrl ? "ملف الموسيقى غير قابل للتشغيل. جرّب mp3 أو m4a أو wav." : "" };
  }

  const directUrl = cleanPlayableAudioUrl(input.musicUrl || "");
  if (input.musicUrl && !directUrl) {
    return { musicUrl: "", error: "رابط الموسيقى لازم يكون رابط صوت مباشر مثل mp3 أو wav أو m4a." };
  }
  return { musicUrl: directUrl, error: "" };
}

function makeOrderNumber() {
  return `ORD-${Date.now().toString(36).toUpperCase()}-${crypto.randomBytes(2).toString("hex").toUpperCase()}`;
}

function makeDedupeKey(value: string) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function absoluteUrl(value: string, siteUrl: string) {
  if (!value) return "";
  if (value.startsWith("http://") || value.startsWith("https://")) return value;
  return `${siteUrl.replace(/\/$/, "")}${value.startsWith("/") ? value : `/${value}`}`;
}

function cleanExternalUrl(value: string) {
  const clean = value.trim();
  if (!clean) return "";
  try {
    const url = new URL(clean);
    return url.protocol === "http:" || url.protocol === "https:" ? url.toString() : "";
  } catch {
    return "";
  }
}

function buildOrderWhatsAppMessage(input: {
  orderNumber: string;
  groomName: string;
  brideName: string;
  weddingDate: string;
  venue: string;
  mapUrl: string;
  templateName: string;
  imageUrls: string[];
  musicEnabled: boolean;
  musicChoice: "default" | "upload" | "url";
  musicUrl: string;
  photographer: { enabled: boolean; name: string; facebookUrl: string; instagramUrl: string };
}) {
  const submittedAt = new Intl.DateTimeFormat("ar-EG-u-nu-latn", {
    dateStyle: "full",
    timeStyle: "short",
    timeZone: "Africa/Cairo",
  }).format(new Date());

  const musicLabel = !input.musicEnabled
    ? "لم يطلب موسيقى"
    : input.musicChoice === "default"
      ? "الموسيقى الأساسية"
      : input.musicChoice === "upload"
        ? `ملف مرفوع${input.musicUrl ? `: ${input.musicUrl}` : ""}`
        : `رابط خارجي: ${input.musicUrl || "لم يرسل رابط"}`;

  return [
    `طلب دعوة جديد #${input.orderNumber}`,
    "",
    `العريس: ${input.groomName}`,
    `العروسة: ${input.brideName}`,
    `التاريخ: ${input.weddingDate}`,
    `العنوان: ${input.venue}`,
    `اللوكيشن: ${input.mapUrl || "لم يتم إرساله"}`,
    `القالب: ${input.templateName}`,
    `وقت إرسال الطلب: ${submittedAt}`,
    "",
    "الصور:",
    input.imageUrls.length ? input.imageUrls.map((url, index) => `${index + 1}. ${url}`).join("\n") : "لا توجد صور مرفوعة",
    "",
    `الموسيقى: ${musicLabel}`,
    "",
    input.photographer.enabled
      ? ["بيانات المصور:", `الاسم: ${input.photographer.name || "غير محدد"}`, input.photographer.facebookUrl ? `Facebook: ${input.photographer.facebookUrl}` : "", input.photographer.instagramUrl ? `Instagram: ${input.photographer.instagramUrl}` : ""].filter(Boolean).join("\n")
      : "بيانات المصور: لم يتم إضافتها",
  ].join("\n");
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
  const music = await resolveOrderMusic({
    musicEnabled: parsed.data.musicEnabled,
    musicChoice: parsed.data.musicChoice,
    musicUrl: parsed.data.musicUrl,
    orderMusic: parsed.data.orderMusic,
  });
  if (music.error) {
    return NextResponse.json({ error: music.error }, { status: 400 });
  }
  const orderNumber = makeOrderNumber();
  const dedupeSource = parsed.data.idempotencyKey || JSON.stringify({
    groomName: parsed.data.groomName,
    brideName: parsed.data.brideName,
    weddingDate: parsed.data.weddingDate,
    venue: parsed.data.venue,
    mapUrl: parsed.data.mapUrl,
    templateSlug: selectedTemplate.slug,
    orderImages: parsed.data.orderImages,
  });
  const dedupeKey = makeDedupeKey(dedupeSource);
  const siteUrl = getPublicSiteUrl(request.headers, request.url);
  const absoluteImageUrls = imageUrls.map((url) => absoluteUrl(url, siteUrl));
  const absoluteMusicUrl = music.musicUrl ? absoluteUrl(music.musicUrl, siteUrl) : "";
  const photographer = {
    enabled: parsed.data.photographerEnabled,
    name: parsed.data.photographerName,
    facebookUrl: cleanExternalUrl(parsed.data.photographerFacebookUrl),
    instagramUrl: cleanExternalUrl(parsed.data.photographerInstagramUrl),
  };
  const mapUrl = cleanExternalUrl(parsed.data.mapUrl);
  const imageNotes = imageUrls.length ? `صور الطلب:\n${imageUrls.map((url, index) => `${index + 1}. ${url}`).join("\n")}` : "";
  const mapNotes = mapUrl ? `رابط اللوكيشن:\n${mapUrl}` : "";
  const musicNotes = parsed.data.musicEnabled
    ? ["موسيقى الدعوة:", parsed.data.musicChoice === "default" ? "اختار العميل الموسيقى الأساسية." : "", music.musicUrl ? `رابط الموسيقى: ${music.musicUrl}` : ""].filter(Boolean).join("\n")
    : "";
  const photographerNotes = parsed.data.photographerEnabled
    ? ["بيانات المصور الفوتوغرافي:", parsed.data.photographerName ? `الاسم: ${parsed.data.photographerName}` : "", photographer.facebookUrl ? `Facebook: ${photographer.facebookUrl}` : "", photographer.instagramUrl ? `Instagram: ${photographer.instagramUrl}` : ""].filter(Boolean).join("\n")
    : "";
  const notes = [parsed.data.notes, mapNotes, photographerNotes, musicNotes, imageNotes].filter(Boolean).join("\n\n");
  let orderId = "";
  let effectiveOrderNumber = orderNumber;

  if (!prisma) {
    const order = await createFileOrder({
      orderNumber,
      dedupeKey,
      groomName: parsed.data.groomName,
      brideName: parsed.data.brideName,
      phone: parsed.data.phone || "",
      weddingDate: parsed.data.weddingDate,
      venue: parsed.data.venue || "",
      mapUrl,
      notes,
      imageUrls,
      musicEnabled: parsed.data.musicEnabled,
      musicChoice: parsed.data.musicChoice,
      musicUrl: music.musicUrl,
      photographer,
      templateSlug: selectedTemplate.slug,
      language: parsed.data.language,
    });
    orderId = order.id;
    effectiveOrderNumber = order.orderNumber || orderNumber;
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

      const existingOrder = await prisma.orderRequest.findUnique({ where: { dedupeKey }, select: { id: true, orderNumber: true } }).catch(() => null);
      if (existingOrder) {
        const message = buildOrderWhatsAppMessage({
          orderNumber: existingOrder.orderNumber || orderNumber,
          groomName: parsed.data.groomName,
          brideName: parsed.data.brideName,
          weddingDate: parsed.data.weddingDate,
          venue: parsed.data.venue || "",
          mapUrl,
          templateName: `${selectedTemplate.arabicName} - ${selectedTemplate.name}`,
          imageUrls: absoluteImageUrls,
          musicEnabled: parsed.data.musicEnabled,
          musicChoice: parsed.data.musicChoice,
          musicUrl: absoluteMusicUrl,
          photographer,
        });
        return NextResponse.json({ ok: true, duplicate: true, orderId: existingOrder.id, orderNumber: existingOrder.orderNumber || orderNumber, imageUrls, musicUrl: music.musicUrl, whatsappUrl: getWhatsAppOrderUrl(message) });
      }

      const order = await prisma.orderRequest.create({
        data: {
          orderNumber,
          dedupeKey,
          groomName: parsed.data.groomName,
          brideName: parsed.data.brideName,
          phone: parsed.data.phone || "",
          weddingDate: new Date(parsed.data.weddingDate),
          venue: parsed.data.venue || "",
          mapUrl,
          notes,
          imageUrls,
          musicEnabled: parsed.data.musicEnabled,
          musicChoice: parsed.data.musicChoice,
          musicUrl: music.musicUrl,
          photographer,
          language: parsed.data.language,
          templateId: template.id,
        },
        select: { id: true },
      });
      orderId = order.id;
      effectiveOrderNumber = orderNumber;
    } catch (error) {
      console.error("Failed to persist order request", error);
      const order = await createFileOrder({
        orderNumber,
        dedupeKey,
        groomName: parsed.data.groomName,
        brideName: parsed.data.brideName,
        phone: parsed.data.phone || "",
        weddingDate: parsed.data.weddingDate,
        venue: parsed.data.venue || "",
        mapUrl,
        notes,
        imageUrls,
        musicEnabled: parsed.data.musicEnabled,
        musicChoice: parsed.data.musicChoice,
        musicUrl: music.musicUrl,
        photographer,
        templateSlug: selectedTemplate.slug,
        language: parsed.data.language,
      });
      orderId = order.id;
      effectiveOrderNumber = order.orderNumber || orderNumber;
    }
  }

  const message = buildOrderWhatsAppMessage({
    orderNumber: effectiveOrderNumber,
    groomName: parsed.data.groomName,
    brideName: parsed.data.brideName,
    weddingDate: parsed.data.weddingDate,
    venue: parsed.data.venue || "",
    mapUrl,
    templateName: `${selectedTemplate.arabicName} - ${selectedTemplate.name}`,
    imageUrls: absoluteImageUrls,
    musicEnabled: parsed.data.musicEnabled,
    musicChoice: parsed.data.musicChoice,
    musicUrl: absoluteMusicUrl,
    photographer,
  });
  queueGitHubSync(`Order request created: ${orderId}.`, { createSnapshot: true });
  return NextResponse.json({ ok: true, orderId, orderNumber: effectiveOrderNumber, imageUrls, musicUrl: music.musicUrl, whatsappUrl: getWhatsAppOrderUrl(message) });
}
