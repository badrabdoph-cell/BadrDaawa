import { NextResponse } from "next/server";
import { saveInvitationHeroVideo } from "@/lib/invitation-media-server";
import { checkRequestRateLimit, rateLimitResponse } from "@/lib/rate-limiting";
import { isSameOriginRequest, sameOriginErrorResponse } from "@/lib/security-enhancements";

export const runtime = "nodejs";
export const maxDuration = 45;

const maxRequestBytes = 40 * 1024 * 1024;

export async function POST(request: Request) {
  if (!isSameOriginRequest(request)) return sameOriginErrorResponse();
  const limit = checkRequestRateLimit(request, "orders:preview-media", { windowMs: 60 * 60 * 1000, maxRequests: 8 });
  if (!limit.allowed) return rateLimitResponse(limit.resetAt);

  const contentLength = Number(request.headers.get("content-length") || "0");
  if (contentLength > maxRequestBytes) {
    return NextResponse.json({ error: "حجم الفيديو كبير جدًا. استخدم ملفًا أقل من 35MB." }, { status: 413 });
  }

  const formData = await request.formData().catch(() => null);
  const file = formData?.get("media");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "لم يتم إرسال ملف صالح." }, { status: 400 });
  }

  const url = await saveInvitationHeroVideo(file);
  if (!url) {
    return NextResponse.json({ error: "الفيديو غير مدعوم. استخدم MP4 أو WebM بحجم أقل من 35MB." }, { status: 400 });
  }

  return NextResponse.json({ ok: true, mediaUrl: url });
}
