import { revalidatePath } from "next/cache";
import { NextRequest, NextResponse } from "next/server";
import { CLIENT_SESSION_COOKIE, verifyClientSessionCookie } from "@/lib/client-session";
import { queueGitHubSync } from "@/lib/github-sync-queue";
import { setWeddingLiveModeEnabled } from "@/lib/wedding-live-mode";

export const runtime = "nodejs";

export async function POST(request: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  if (!(await verifyClientSessionCookie(request.cookies.get(CLIENT_SESSION_COOKIE)?.value, code))) {
    return NextResponse.json({ error: "افتح لوحة الدعوة من رابط الإدارة السري أولاً." }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as { enabled?: unknown } | null;
  const enabled = body?.enabled === true;
  const config = await setWeddingLiveModeEnabled(code, enabled, "client");
  if (!config) {
    return NextResponse.json({ error: "تعذر تحديث Wedding Live Mode." }, { status: 400 });
  }

  revalidatePath(`/${code}`);
  revalidatePath(`/${code}/ad_3399`);
  queueGitHubSync(`Wedding live mode ${enabled ? "enabled" : "disabled"} by client: ${code}.`, { createSnapshot: true });
  return NextResponse.json({ ok: true, config });
}
