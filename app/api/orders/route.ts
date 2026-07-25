import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { getPublicAuditActor, recordAuditLog } from "@/lib/audit-log";
import { cleanPlayableAudioUrl, saveAudioDataUrl } from "@/lib/audio-files";
import { prisma } from "@/lib/db";
import { publishOrder } from "@/lib/order-publishing";
import { saveOrderPreviewImages } from "@/lib/order-preview-images";
import { buildReservedInvitationLinks, createReservedInvitationCode, createReservedManageToken } from "@/lib/order-request-links";
import { getPublishedSiteSettings } from "@/lib/site-settings";
import { getPublicPublishedTemplateWithSettings, getPublishedTemplateSortOrderWithSettings } from "@/lib/template-settings";
import { normalizeCoupleStory } from "@/lib/invitation-texts";
import { getPublicSiteUrl } from "@/lib/utils";
import { orderRequestSchema } from "@/lib/validation";
import { checkRateLimit, createRateLimitKey, getClientIdentifier, RATE_LIMIT_CONFIGS } from "@/lib/rate-limiting";
import { isSameOriginRequest, sameOriginErrorResponse } from "@/lib/security-enhancements";
import { extractCoordinatesFromUrl } from "@/lib/map-url";
import { PromoCodeService, type PromoValidationSuccess } from "@/lib/promo-code-service";

export const runtime = "nodejs";
export const maxDuration = 45;

type OrderMusicChoice = "default" | "library" | "upload" | "video" | "url";

const maxOrderRequestBytes = 36 * 1024 * 1024;

async function saveOrderImages(images: string[], request: Request) {
  const requestId = `order-${Date.now().toString(36)}`;
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
    return { musicUrl: "", error: input.musicUrl ? "استخرج الصوت من الفيديو أولاً قبل إرسال الطلب." : "" };
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

async function activateOrderTrial(input: {
  orderId: string;
  orderNumber: string;
  invitationCode: string;
  manageToken: string;
  siteUrl: string;
  trialDays: number;
  autoTrialPublishEnabled: boolean;
  actorLabel: string;
  duplicate?: boolean;
}) {
  const pending = {
    ok: true,
    activationStatus: "pending" as const,
    duplicate: Boolean(input.duplicate),
    orderId: input.orderId,
    orderNumber: input.orderNumber,
    invitationCode: input.invitationCode,
  };
  if (!input.autoTrialPublishEnabled) return pending;

  try {
    const published = await publishOrder({
      orderId: input.orderId,
      mode: "AUTO_TRIAL",
      templateVisibility: "published",
      trialDays: input.trialDays,
    });
    const links = buildReservedInvitationLinks(input.siteUrl, published.code, input.manageToken);
    await recordAuditLog({
      actor: getPublicAuditActor(input.actorLabel),
      action: "order.auto-trial-publish",
      entity: { type: "Order", id: input.orderId, label: input.orderNumber },
      newValues: {
        invitationCode: published.code,
        trialDays: published.trialDays,
        trialEndsAt: published.trialEndsAt?.toISOString(),
        reused: published.reused,
      },
      metadata: { source: "public-order-form" },
    }).catch((error) => console.error("[Order API] Failed to audit automatic trial publish", error));
    return {
      ...pending,
      activationStatus: "ready" as const,
      invitationCode: published.code,
      trialDays: published.trialDays,
      trialEndsAt: published.trialEndsAt?.toISOString(),
      ...links,
    };
  } catch (error) {
    console.error("[Order API] Automatic trial publish failed", { orderId: input.orderId, error });
    await recordAuditLog({
      actor: getPublicAuditActor(input.actorLabel),
      action: "order.auto-trial-publish-failed",
      entity: { type: "Order", id: input.orderId, label: input.orderNumber },
      metadata: { source: "public-order-form", error: error instanceof Error ? error.message : String(error) },
    }).catch((auditError) => console.error("[Order API] Failed to audit automatic trial failure", auditError));
    return pending;
  }
}

export async function POST(request: NextRequest) {
  if (!isSameOriginRequest(request)) return sameOriginErrorResponse();
  const rateLimit = checkRateLimit(createRateLimitKey(getClientIdentifier(request), "orders:create"), RATE_LIMIT_CONFIGS.API_GENERAL);
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: "تم إرسال طلبات كثيرة في وقت قصير. انتظر دقيقة ثم حاول مرة أخرى." },
      { status: 429, headers: { "Retry-After": String(Math.ceil((rateLimit.resetAt - Date.now()) / 1000)) } },
    );
  }

  const contentLength = Number(request.headers.get("content-length") || 0);
  if (!request.headers.has("content-length")) {
    return NextResponse.json({ error: "طلب غير صالح: يجب تحديد حجم المحتوى." }, { status: 411 });
  }
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
    return NextResponse.json({ error: "اكتب البيانات كاملة وبالهيئة الصحيحة قبل التأكيد.", details: parsed.error.flatten() }, { status: 400 });
  }

  const selectedTemplate = await getPublicPublishedTemplateWithSettings(parsed.data.templateSlug);
  if (!selectedTemplate) {
    return NextResponse.json({ error: "القالب المختار غير متاح حاليًا" }, { status: 400 });
  }

  const siteSettings = await getPublishedSiteSettings();
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
  const effectiveMusicEnabled = Boolean(parsed.data.musicEnabled && (parsed.data.musicChoice === "default" || music.musicUrl));
  const effectiveMusicChoice: OrderMusicChoice = effectiveMusicEnabled ? parsed.data.musicChoice : "default";
  const appliedPromoCode = parsed.data.promoCode || parsed.data.appliedPromoCode;
  const promoValidation = appliedPromoCode
    ? await PromoCodeService.validatePromoCode(appliedPromoCode, {
        source: parsed.data.referralSource || "order-form",
        userAgent: request.headers.get("user-agent"),
        customerIp: getClientIdentifier(request),
        logFailures: true,
      })
    : null;

  if (promoValidation && !promoValidation.ok) {
    return NextResponse.json({ error: promoValidation.error }, { status: 400 });
  }
  const appliedPromo = promoValidation as PromoValidationSuccess | null;
  const appliedPartnerPromo = appliedPromo?.type === "partner" ? appliedPromo : null;
  const appliedDiscountPromo = appliedPromo?.type === "discount" ? appliedPromo : null;
  const openingText = parsed.data.openingText.trim();
  const story = normalizeCoupleStory(parsed.data.story);
  const texts = openingText || story.length ? { openingText, story } : undefined;
  const orderNumber = makeOrderNumber();
  const dedupeSource = parsed.data.idempotencyKey || JSON.stringify({
    groomName: parsed.data.groomName,
    brideName: parsed.data.brideName,
    weddingDate: parsed.data.weddingDate,
    venue: parsed.data.venue,
    mapUrl: parsed.data.mapUrl,
    templateSlug: selectedTemplate.slug,
    postImageTemplateId: parsed.data.postImageTemplateId,
    orderImages: parsed.data.orderImages,
    story,
    openingText,
    appliedPromoCode,
  });
  const dedupeKey = makeDedupeKey(dedupeSource);
  const siteUrl = getPublicSiteUrl(request.headers, request.url);
  let reservedInvitationCode = "";
  let reservedManageToken = "";
  const partnerPhotographer = appliedPartnerPromo?.photographer;
  const partnerSnapshot = appliedPartnerPromo?.partner;
  const photographer = appliedPartnerPromo
    ? {
        enabled: true,
        name: partnerPhotographer?.name || partnerSnapshot?.displayName || "",
        description: "تمت إضافة بيانات الشريك بواسطة البروموكود.",
        logoUrl: partnerPhotographer?.logoUrl || partnerSnapshot?.logoUrl || "",
        facebookUrl: partnerPhotographer?.facebookUrl || partnerSnapshot?.facebookUrl || "",
        instagramUrl: partnerPhotographer?.instagramUrl || partnerSnapshot?.instagramUrl || "",
        lockedByPromo: true,
        promoCode: appliedPartnerPromo.promo.code,
      }
    : {
        enabled: parsed.data.photographerEnabled,
        name: parsed.data.photographerName,
        description: parsed.data.photographerDescription,
        logoUrl: cleanExternalUrl(parsed.data.photographerLogoUrl),
        facebookUrl: cleanExternalUrl(parsed.data.photographerFacebookUrl),
        instagramUrl: cleanExternalUrl(parsed.data.photographerInstagramUrl),
      };
  const mapUrl = cleanExternalUrl(parsed.data.mapUrl);
  const orderMapCoords = extractCoordinatesFromUrl(mapUrl);
  const orderLatitude = orderMapCoords?.lat ?? null;
  const orderLongitude = orderMapCoords?.lng ?? null;
  const imageNotes = imageUrls.length ? `صور الطلب:\n${imageUrls.map((url, index) => `${index + 1}. ${url}`).join("\n")}` : "";
  const mapNotes = mapUrl ? `رابط موقع القاعه:\n${mapUrl}` : "";
  const musicNotes = effectiveMusicEnabled
    ? ["موسيقى الدعوة:", effectiveMusicChoice === "default" ? "اختار العميل الموسيقى الأساسية." : "", effectiveMusicChoice === "library" ? "اختار العميل مقطعًا من مكتبة الموقع." : "", music.musicUrl ? `رابط الموسيقى: ${music.musicUrl}` : ""].filter(Boolean).join("\n")
    : "";
  const photographerNotes = photographer.enabled
    ? [
        appliedPartnerPromo ? "بيانات الشريك من البروموكود:" : "بيانات المصور الفوتوغرافي:",
        photographer.name ? `الاسم: ${photographer.name}` : "",
        photographer.facebookUrl ? `Facebook: ${photographer.facebookUrl}` : "",
        photographer.instagramUrl ? `Instagram: ${photographer.instagramUrl}` : "",
        appliedPartnerPromo ? `Promo: ${appliedPartnerPromo.promo.code}` : "",
        appliedPartnerPromo?.promo.discountLabel || "",
      ].filter(Boolean).join("\n")
    : "";
  const storyNotes = story.length ? ["قصة العروسين:", ...story.map((item, index) => [`${index + 1}. ${item.title || "مرحلة"}`, item.date ? `التاريخ: ${item.date}` : "", item.description ? `الوصف: ${item.description}` : ""].filter(Boolean).join("\n"))].join("\n") : "";
  const openingNotes = openingText ? `نص الافتتاح السينمائي:\n${openingText}` : "";
  const notes = [parsed.data.notes, mapNotes, openingNotes, photographerNotes, musicNotes, storyNotes, imageNotes].filter(Boolean).join("\n\n");
  let orderId = "";
  let effectiveOrderNumber = orderNumber;
  let effectiveInvitationCode = reservedInvitationCode;
  let effectiveManageToken = reservedManageToken;

  if (!prisma) {
    console.error("[Order API] PostgreSQL is not configured. Refusing operational write.");
    return NextResponse.json({ error: "قاعدة البيانات غير متاحة حالياً. حاول مرة أخرى بعد قليل." }, { status: 503 });
  }

  try {
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
          sortOrder: await getPublishedTemplateSortOrderWithSettings(selectedTemplate.slug),
        },
        select: { id: true },
      });

      const existingOrder = await prisma.orderRequest.findFirst({ where: { dedupeKey, deletedAt: null }, select: { id: true, orderNumber: true, publishedInvitationCode: true, manageToken: true, status: true } }).catch((err) => {
        console.error("Deduplication check failed:", err);
        return null;
      });
      if (existingOrder) {
        const duplicateInvitationCode = existingOrder.publishedInvitationCode || await createReservedInvitationCode(parsed.data.groomName, parsed.data.brideName);
        const duplicateManageToken = existingOrder.manageToken || await createReservedManageToken();
        if (!existingOrder.publishedInvitationCode || !existingOrder.manageToken) {
          await prisma.orderRequest.update({
            where: { id: existingOrder.id },
            data: { publishedInvitationCode: duplicateInvitationCode, manageToken: duplicateManageToken },
          });
        }
        return NextResponse.json(await activateOrderTrial({
          orderId: existingOrder.id,
          orderNumber: existingOrder.orderNumber || orderNumber,
          invitationCode: duplicateInvitationCode,
          manageToken: duplicateManageToken,
          siteUrl,
          trialDays: siteSettings.order.defaultTrialDays,
          autoTrialPublishEnabled: siteSettings.order.autoTrialPublishEnabled,
          actorLabel: parsed.data.phone || parsed.data.groomName || "Public order",
          duplicate: true,
        }));
      }

      reservedInvitationCode = await createReservedInvitationCode(parsed.data.groomName, parsed.data.brideName);
      reservedManageToken = await createReservedManageToken();

      const order = await prisma.$transaction(async (tx) => {
        const createdOrder = await tx.orderRequest.create({
          data: {
            orderNumber,
            dedupeKey,
            groomName: parsed.data.groomName,
            brideName: parsed.data.brideName,
            phone: parsed.data.phone || "",
            weddingDate: new Date(parsed.data.weddingDate),
            weddingTime: parsed.data.weddingTime || "07:00 مساءً",
            venue: parsed.data.venue || "",
            mapUrl,
            latitude: orderLatitude,
            longitude: orderLongitude,
            notes,
            imageUrls,
            musicEnabled: effectiveMusicEnabled,
            musicChoice: effectiveMusicChoice,
            musicUrl: music.musicUrl,
            texts,
            photographer,
            partnerId: appliedPartnerPromo?.partner?.partnerId || null,
            partnerPromoId: appliedPartnerPromo?.promo.id || null,
            discountPromoId: appliedDiscountPromo?.promo.id || null,
            partnerSnapshot: appliedPartnerPromo?.partner || undefined,
            discountSnapshot: appliedPromo
              ? {
                  promoId: appliedPromo.promo.id,
                  code: appliedPromo.promo.code,
                  discountType: appliedPromo.promo.discountType,
                  discountValue: appliedPromo.promo.discountValue,
                  label: appliedPromo.promo.discountLabel,
                  type: appliedPromo.type,
                }
              : undefined,
            partnerAppliedAt: appliedPromo ? new Date() : null,
            referralSource: appliedPromo ? parsed.data.referralSource || "order-form" : null,
            language: parsed.data.language,
            templateId: template.id,
            postImageTemplateId: parsed.data.postImageTemplateId,
            publishedInvitationCode: reservedInvitationCode,
            manageToken: reservedManageToken,
          },
          select: { id: true },
        });
        if (appliedPromo) {
          await PromoCodeService.recordPromoOrderApplication({
            db: tx as unknown as typeof prisma,
            validation: appliedPromo,
            orderId: createdOrder.id,
            invitationId: null,
            customerIp: getClientIdentifier(request),
            userAgent: request.headers.get("user-agent"),
            referralSource: parsed.data.referralSource || "order-form",
          });
        }
        return createdOrder;
      });
      orderId = order.id;
      effectiveOrderNumber = orderNumber;
      effectiveInvitationCode = reservedInvitationCode;
      effectiveManageToken = reservedManageToken;
    } catch (error) {
      console.error("Failed to persist order request", error);
      return NextResponse.json({ error: "تعذر حفظ الطلب في قاعدة البيانات. لم يتم استخدام تخزين الملفات الاحتياطي." }, { status: 500 });
    }
  } catch (error) {
    console.error("[Order API] Unexpected PostgreSQL write failure", error);
    return NextResponse.json({ error: "تعذر حفظ الطلب في قاعدة البيانات." }, { status: 500 });
  }

  await recordAuditLog({
    actor: getPublicAuditActor(parsed.data.phone || parsed.data.groomName || "Public order"),
    action: "order.create",
    entity: { type: "Order", id: orderId, label: effectiveOrderNumber },
    newValues: {
      orderId,
      orderNumber: effectiveOrderNumber,
      invitationCode: effectiveInvitationCode,
      groomName: parsed.data.groomName,
      brideName: parsed.data.brideName,
      phone: parsed.data.phone,
      weddingDate: parsed.data.weddingDate,
      venue: parsed.data.venue,
      mapUrl,
      templateSlug: selectedTemplate.slug,
      imageUrls,
      musicEnabled: effectiveMusicEnabled,
      musicChoice: effectiveMusicChoice,
      musicUrl: music.musicUrl,
      texts,
      story,
      photographer,
    },
    metadata: { source: "public-order-form" },
  });
  return NextResponse.json(await activateOrderTrial({
    orderId,
    orderNumber: effectiveOrderNumber,
    invitationCode: effectiveInvitationCode,
    manageToken: effectiveManageToken,
    siteUrl,
    trialDays: siteSettings.order.defaultTrialDays,
    autoTrialPublishEnabled: siteSettings.order.autoTrialPublishEnabled,
    actorLabel: parsed.data.phone || parsed.data.groomName || "Public order",
  }));
}
