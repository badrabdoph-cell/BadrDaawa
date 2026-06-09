import { NextRequest, NextResponse } from "next/server";
import crypto from "node:crypto";
import { getPublicAuditActor, recordAuditLog } from "@/lib/audit-log";
import { cleanPlayableAudioUrl, saveAudioDataUrl } from "@/lib/audio-files";
import { prisma } from "@/lib/db";
import { createFileOrder } from "@/lib/file-store";
import { queueGitHubSync } from "@/lib/github-sync-queue";
import { saveOrderPreviewImages } from "@/lib/order-preview-images";
import { getPublicTemplateWithSettings, getTemplateSortOrderWithSettings } from "@/lib/template-settings";
import { normalizeCoupleStory, normalizeInvitationGift } from "@/lib/invitation-texts";
import { getPublicSiteUrl, getWhatsAppOrderUrl } from "@/lib/utils";
import { orderRequestSchema } from "@/lib/validation";
import { checkRateLimit, createRateLimitKey, getClientIdentifier, RATE_LIMIT_CONFIGS } from "@/lib/rate-limiting";

export const runtime = "nodejs";
export const maxDuration = 45;

type OrderMusicChoice = "default" | "library" | "upload" | "video" | "url";

const maxOrderRequestBytes = 36 * 1024 * 1024;

async function saveOrderImages(images: string[], request: Request) {
  const requestId = `order-${Date.now().toString(36)}`;
  console.log(`[Order API ${requestId}] Saving ${images.length} order image(s) for ${request.url}.`);
  return saveOrderPreviewImages(images, "order-requests", requestId);
}

async function resolveOrderMusic(input: { musicEnabled: boolean; musicChoice: OrderMusicChoice; musicUrl?: string; orderMusic?: string }) {
  if (!input.musicEnabled) return { musicUrl: "", error: "" };
  if (input.musicChoice === "default") return { musicUrl: "", error: "" };

  if (input.musicChoice === "upload") {
    const uploadedUrl = input.orderMusic ? await saveAudioDataUrl(input.orderMusic) : "";
    if (uploadedUrl) return { musicUrl: uploadedUrl, error: "" };
    const restoredUploadUrl = cleanPlayableAudioUrl(input.musicUrl || "");
    if (restoredUploadUrl) return { musicUrl: restoredUploadUrl, error: "" };
    return { musicUrl: "", error: input.orderMusic || input.musicUrl ? "ملف الموسيقى غير قابل للتشغيل. جرّب mp3 أو m4a أو wav." : "" };
  }

  if (input.musicChoice === "video") {
    const extractedUrl = cleanPlayableAudioUrl(input.musicUrl || "");
    if (extractedUrl) return { musicUrl: extractedUrl, error: "" };
    return { musicUrl: "", error: "استخرج الصوت من الفيديو أولاً قبل إرسال الطلب." };
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
  musicChoice: OrderMusicChoice;
  musicUrl: string;
  photographer: { enabled: boolean; name: string; facebookUrl: string; instagramUrl: string };
  story: Array<{ date?: string; title?: string; description?: string }>;
  gift: { vodafoneCash?: string; instapay?: string; bankAccount?: string; customText?: string };
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
      : input.musicChoice === "library"
        ? `مقطع من مكتبة الموقع${input.musicUrl ? `: ${input.musicUrl}` : ""}`
      : input.musicChoice === "upload"
        ? `ملف مرفوع${input.musicUrl ? `: ${input.musicUrl}` : ""}`
      : input.musicChoice === "video"
        ? `صوت مستخرج من فيديو${input.musicUrl ? `: ${input.musicUrl}` : ""}`
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
    "",
    input.story.length
      ? ["قصة العروسين:", ...input.story.map((item, index) => [`${index + 1}. ${item.title || "مرحلة"}`, item.date ? `التاريخ: ${item.date}` : "", item.description ? `الوصف: ${item.description}` : ""].filter(Boolean).join("\n"))].join("\n")
      : "قصة العروسين: لم يتم إضافتها",
    "",
    Object.values(input.gift).some(Boolean)
      ? ["هدية العروسين:", input.gift.vodafoneCash ? `فودافون كاش: ${input.gift.vodafoneCash}` : "", input.gift.instapay ? `إنستا باي: ${input.gift.instapay}` : "", input.gift.bankAccount ? `حساب بنكي: ${input.gift.bankAccount}` : "", input.gift.customText ? `نص مخصص: ${input.gift.customText}` : ""].filter(Boolean).join("\n")
      : "هدية العروسين: لم يتم إضافتها",
  ].join("\n");
}

export async function POST(request: NextRequest) {
  const rateLimit = checkRateLimit(createRateLimitKey(getClientIdentifier(request), "orders:create"), RATE_LIMIT_CONFIGS.API_GENERAL);
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: "تم إرسال طلبات كثيرة في وقت قصير. انتظر دقيقة ثم حاول مرة أخرى." },
      { status: 429, headers: { "Retry-After": String(Math.ceil((rateLimit.resetAt - Date.now()) / 1000)) } },
    );
  }

  const contentLength = Number(request.headers.get("content-length") || 0);
  if (contentLength > maxOrderRequestBytes) {
    console.error(`[Order API] Rejected large order payload: ${contentLength} bytes.`);
    return NextResponse.json(
      { error: "حجم الطلب كبير جداً. ارفع الصور من جديد وانتظر اكتمال ضغطها وحفظها قبل تأكيد الدعوة." },
      { status: 413 },
    );
  }

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
  const story = normalizeCoupleStory(parsed.data.story);
  const gift = normalizeInvitationGift(parsed.data.gift);
  const texts = story.length || Object.values(gift).some(Boolean) ? { story, gift } : undefined;
  const orderNumber = makeOrderNumber();
  const dedupeSource = parsed.data.idempotencyKey || JSON.stringify({
    groomName: parsed.data.groomName,
    brideName: parsed.data.brideName,
    weddingDate: parsed.data.weddingDate,
    venue: parsed.data.venue,
    mapUrl: parsed.data.mapUrl,
    templateSlug: selectedTemplate.slug,
    orderImages: parsed.data.orderImages,
    story,
    gift,
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
    ? ["موسيقى الدعوة:", parsed.data.musicChoice === "default" ? "اختار العميل الموسيقى الأساسية." : "", parsed.data.musicChoice === "library" ? "اختار العميل مقطعًا من مكتبة الموقع." : "", music.musicUrl ? `رابط الموسيقى: ${music.musicUrl}` : ""].filter(Boolean).join("\n")
    : "";
  const photographerNotes = parsed.data.photographerEnabled
    ? ["بيانات المصور الفوتوغرافي:", parsed.data.photographerName ? `الاسم: ${parsed.data.photographerName}` : "", photographer.facebookUrl ? `Facebook: ${photographer.facebookUrl}` : "", photographer.instagramUrl ? `Instagram: ${photographer.instagramUrl}` : ""].filter(Boolean).join("\n")
    : "";
  const storyNotes = story.length ? ["قصة العروسين:", ...story.map((item, index) => [`${index + 1}. ${item.title || "مرحلة"}`, item.date ? `التاريخ: ${item.date}` : "", item.description ? `الوصف: ${item.description}` : ""].filter(Boolean).join("\n"))].join("\n") : "";
  const giftNotes = Object.values(gift).some(Boolean) ? ["هدية العروسين:", gift.vodafoneCash ? `فودافون كاش: ${gift.vodafoneCash}` : "", gift.instapay ? `إنستا باي: ${gift.instapay}` : "", gift.bankAccount ? `حساب بنكي: ${gift.bankAccount}` : "", gift.customText ? `نص مخصص: ${gift.customText}` : ""].filter(Boolean).join("\n") : "";
  const notes = [parsed.data.notes, mapNotes, photographerNotes, musicNotes, storyNotes, giftNotes, imageNotes].filter(Boolean).join("\n\n");
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
      texts,
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

      const existingOrder = await prisma.orderRequest.findFirst({ where: { dedupeKey, deletedAt: null }, select: { id: true, orderNumber: true } }).catch(() => null);
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
          story,
          gift,
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
          texts,
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
        texts,
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
    story,
    gift,
  });
  queueGitHubSync(`Order request created: ${orderId}.`, { createSnapshot: true });
  await recordAuditLog({
    actor: getPublicAuditActor(parsed.data.phone || parsed.data.groomName || "Public order"),
    action: "order.create",
    entity: { type: "Order", id: orderId, label: effectiveOrderNumber },
    newValues: {
      orderId,
      orderNumber: effectiveOrderNumber,
      groomName: parsed.data.groomName,
      brideName: parsed.data.brideName,
      phone: parsed.data.phone,
      weddingDate: parsed.data.weddingDate,
      venue: parsed.data.venue,
      mapUrl,
      templateSlug: selectedTemplate.slug,
      imageUrls,
      musicEnabled: parsed.data.musicEnabled,
      musicChoice: parsed.data.musicChoice,
      musicUrl: music.musicUrl,
      texts,
      story,
      gift,
      photographer,
    },
    metadata: { source: "public-order-form" },
  });
  return NextResponse.json({ ok: true, orderId, orderNumber: effectiveOrderNumber, imageUrls, musicUrl: music.musicUrl, whatsappUrl: getWhatsAppOrderUrl(message) });
}
