import { NextRequest, NextResponse } from "next/server";
import { type BrowserPushSubscription, savePushSubscription } from "@/lib/push-notifications";

export async function POST(request: NextRequest) {
  const data = (await request.json().catch(() => null)) as { invitationCode?: string; subscription?: unknown } | null;

  if (!data || typeof data.subscription !== "object" || !data.subscription) {
    return NextResponse.json({ ok: false, error: "Invalid subscription." }, { status: 400 });
  }

  const result = await savePushSubscription(data.subscription as BrowserPushSubscription, data.invitationCode || "", request.headers.get("user-agent") || undefined);
  return NextResponse.json(result);
}
