import { NextResponse } from "next/server";
import { saveInvitationHeroVideo } from "@/lib/invitation-media-server";

export const runtime = "nodejs";
export const maxDuration = 45;

export async function POST(request: Request) {
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
