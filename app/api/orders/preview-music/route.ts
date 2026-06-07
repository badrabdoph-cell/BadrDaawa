import { NextResponse } from "next/server";
import { cleanPlayableAudioUrl, saveAudioDataUrl } from "@/lib/audio-files";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { music?: string; musicUrl?: string } | null;
  const musicData = typeof body?.music === "string" ? body.music : "";
  const requestedUrl = typeof body?.musicUrl === "string" ? body.musicUrl : "";

  const uploadedUrl = musicData ? await saveAudioDataUrl(musicData) : "";
  const directUrl = cleanPlayableAudioUrl(requestedUrl);
  const musicUrl = uploadedUrl || directUrl;

  if ((musicData || requestedUrl) && !musicUrl) {
    return NextResponse.json({ error: "ملف أو رابط الموسيقى غير قابل للتشغيل." }, { status: 400 });
  }

  return NextResponse.json({ ok: true, musicUrl });
}
