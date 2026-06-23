import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { ADMIN_SESSION_COOKIE, verifyAdminSessionCookie } from "@/lib/admin-session";
import { getAuditActorFromAdminRequest, recordAuditLog } from "@/lib/audit-log";
import { saveInvitationHeroVideo } from "@/lib/invitation-media-server";
import { saveOrderPreviewImages, type PreviewImageInput } from "@/lib/order-preview-images";
import { checkRateLimit, createRateLimitKey, getClientIdentifier, RATE_LIMIT_CONFIGS } from "@/lib/rate-limiting";
import { isSameOriginRequest, sameOriginErrorResponse } from "@/lib/security-enhancements";

export const runtime = "nodejs";
export const maxDuration = 45;

const maxTemplateMediaRequestBytes = 40 * 1024 * 1024;

async function isAdmin(request: NextRequest) {
  return verifyAdminSessionCookie(request.cookies.get(ADMIN_SESSION_COOKIE)?.value);
}

function isPreviewImageInput(value: unknown): value is PreviewImageInput {
  if (typeof value === "string") return true;
  if (typeof File !== "undefined" && value instanceof File) return value.size > 0;
  if (!value || typeof value !== "object") return false;
  const input = value as { dataUrl?: unknown };
  return typeof input.dataUrl === "string";
}

export async function POST(request: NextRequest) {
  if (!(await isAdmin(request))) return NextResponse.json({ ok: false, error: "انتهت جلسة الأدمن. سجل الدخول مرة أخرى." }, { status: 401 });
  if (!isSameOriginRequest(request)) return sameOriginErrorResponse();

  const requestId = `template-media-${Date.now().toString(36)}-${crypto.randomBytes(3).toString("hex")}`;
  const startedAt = Date.now();
  const contentLength = Number(request.headers.get("content-length") || 0);
  if (contentLength > maxTemplateMediaRequestBytes) {
    return NextResponse.json({ ok: false, error: "حجم الملف كبير جداً. استخدم صورة أقل من 32MB أو فيديو أقل من 35MB." }, { status: 413 });
  }

  const rateLimit = checkRateLimit(createRateLimitKey(getClientIdentifier(request), "admin:templates:media"), RATE_LIMIT_CONFIGS.ORDER_IMAGE_UPLOAD);
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { ok: false, error: "تمت محاولات رفع كثيرة في وقت قصير. انتظر دقيقة ثم حاول مرة أخرى." },
      { status: 429, headers: { "Retry-After": String(Math.ceil((rateLimit.resetAt - Date.now()) / 1000)) } },
    );
  }

  const formData = await request.formData().catch((error) => {
    console.error(`[Template Media ${requestId}] Failed to parse multipart payload.`, error);
    return null;
  });
  if (!formData) return NextResponse.json({ ok: false, error: "لم يصل الملف للخادم بشكل صالح." }, { status: 400 });

  const kind = String(formData.get("kind") || "image");
  const slot = String(formData.get("slot") || "template");
  const actor = await getAuditActorFromAdminRequest(request);

  try {
    if (kind === "video") {
      const file = formData.get("media");
      if (!(file instanceof File) || !file.size) return NextResponse.json({ ok: false, error: "لم يتم اختيار فيديو صالح." }, { status: 400 });
      const mediaUrl = await saveInvitationHeroVideo(file, "template-previews");
      if (!mediaUrl) return NextResponse.json({ ok: false, error: "الفيديو غير مدعوم. استخدم MP4 أو WebM بحجم أقل من 35MB." }, { status: 422 });
      await recordAuditLog({
        actor,
        action: "media.image.upload",
        entity: { type: "Media", id: mediaUrl, label: slot },
        newValues: { mediaUrl },
        metadata: { requestId, source: "template-content-media" },
      });
      return NextResponse.json({ ok: true, mediaUrl });
    }

    const images = formData.getAll("images").filter(isPreviewImageInput);
    if (!images.length) return NextResponse.json({ ok: false, error: "لم تصل أي صورة صالحة للخادم." }, { status: 400 });
    const imageUrls = await saveOrderPreviewImages(images, "template-previews", requestId);
    if (!imageUrls.length) return NextResponse.json({ ok: false, error: "الصورة غير صالحة أو تالفة. جرّب JPG أو PNG أو HEIC." }, { status: 422 });
    await recordAuditLog({
      actor,
      action: "media.image.upload",
      entity: { type: "Media", id: imageUrls[0], label: slot },
      newValues: { imageUrls },
      metadata: { requestId, source: "template-content-media" },
    });
    return NextResponse.json({ ok: true, imageUrls });
  } catch (error) {
    console.error(`[Template Media ${requestId}] Unexpected upload failure after ${Date.now() - startedAt}ms.`, error);
    return NextResponse.json({ ok: false, error: "حصل خطأ أثناء حفظ الملف. جرّب ملفاً أصغر." }, { status: 500 });
  }
}
