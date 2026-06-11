import { NextRequest, NextResponse } from "next/server";
import { cleanNewDirectAudioUrl, isBlockedMusicPageUrl, saveAudioDataUrl } from "@/lib/audio-files";
import { checkRateLimit, createRateLimitKey, getClientIdentifier, RATE_LIMIT_CONFIGS } from "@/lib/rate-limiting";
import { isSameOriginRequest, sameOriginErrorResponse } from "@/lib/security-enhancements";

export const runtime = "nodejs";

const maxMusicRequestBytes = 48 * 1024 * 1024;

export async function POST(request: NextRequest) {
  if (!isSameOriginRequest(request)) return sameOriginErrorResponse();
  const rateLimit = checkRateLimit(createRateLimitKey(getClientIdentifier(request), "orders:preview-music"), RATE_LIMIT_CONFIGS.API_UPLOAD);
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: "تم رفع ملفات كثيرة في وقت قصير. انتظر قليلًا ثم حاول مرة أخرى." },
      { status: 429, headers: { "Retry-After": String(Math.ceil((rateLimit.resetAt - Date.now()) / 1000)) } },
    );
  }

  const contentLength = Number(request.headers.get("content-length") || 0);
  if (contentLength > maxMusicRequestBytes) {
    return NextResponse.json({ error: "ملف الموسيقى كبير جدًا. اختار ملفًا أصغر ثم حاول مرة أخرى." }, { status: 413 });
  }

  const body = (await request.json().catch(() => null)) as { music?: string; musicUrl?: string } | null;
  const musicData = typeof body?.music === "string" ? body.music : "";
  const requestedUrl = typeof body?.musicUrl === "string" ? body.musicUrl : "";

  const uploadedUrl = musicData ? await saveAudioDataUrl(musicData) : "";
  if (requestedUrl && isBlockedMusicPageUrl(requestedUrl)) {
    return NextResponse.json({ error: "استخدم رابط ملف صوت مباشر، وليس رابط صفحة موسيقى أو منصة تشغيل." }, { status: 400 });
  }
  const directUrl = cleanNewDirectAudioUrl(requestedUrl);
  const musicUrl = uploadedUrl || directUrl;

  if ((musicData || requestedUrl) && !musicUrl) {
    return NextResponse.json({ error: "ملف أو رابط الموسيقى غير قابل للتشغيل." }, { status: 400 });
  }

  return NextResponse.json({ ok: true, musicUrl });
}
