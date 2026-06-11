import { NextRequest, NextResponse } from "next/server";
import { saveExtractedMp3Audio } from "@/lib/audio-files";
import { checkRateLimit, createRateLimitKey, getClientIdentifier, RATE_LIMIT_CONFIGS } from "@/lib/rate-limiting";
import { isSameOriginRequest, sameOriginErrorResponse } from "@/lib/security-enhancements";
import { extractMp3AudioFromVideo, maxVideoAudioExtractionBytes, validateVideoAudioFile } from "@/lib/video-audio-extraction";

export const runtime = "nodejs";
export const maxDuration = 180;

export async function POST(request: NextRequest) {
  if (!isSameOriginRequest(request)) return sameOriginErrorResponse();
  const rateLimit = checkRateLimit(createRateLimitKey(getClientIdentifier(request), "orders:extract-video-audio"), RATE_LIMIT_CONFIGS.API_UPLOAD);
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: "تم رفع ملفات كثيرة في وقت قصير. انتظر قليلًا ثم حاول مرة أخرى." },
      { status: 429, headers: { "Retry-After": String(Math.ceil((rateLimit.resetAt - Date.now()) / 1000)) } },
    );
  }

  const contentLength = Number(request.headers.get("content-length") || 0);
  if (contentLength > maxVideoAudioExtractionBytes + 1024 * 1024) {
    return NextResponse.json({ error: "حجم الفيديو كبير جدًا. الحد الأقصى 120MB." }, { status: 413 });
  }

  const formData = await request.formData().catch(() => null);
  const video = formData?.get("videoFile");
  if (!(video instanceof File)) {
    return NextResponse.json({ error: "اختر ملف فيديو أولاً." }, { status: 400 });
  }

  const validation = validateVideoAudioFile(video);
  if (!validation.ok) {
    return NextResponse.json({ error: validation.error }, { status: 400 });
  }

  const extracted = await extractMp3AudioFromVideo(video);
  if (!extracted.bytes) {
    return NextResponse.json({ error: extracted.error || "فشل استخراج الصوت من الفيديو." }, { status: 400 });
  }

  const musicUrl = await saveExtractedMp3Audio(extracted.bytes);
  if (!musicUrl) {
    return NextResponse.json({ error: "تم استخراج الصوت لكن تعذر حفظ ملف MP3 الناتج." }, { status: 500 });
  }

  return NextResponse.json({ ok: true, musicUrl, fileName: extracted.fileName || "video-audio.mp3" });
}
