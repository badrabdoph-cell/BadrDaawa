import { NextResponse } from "next/server";
import { getCheckInsByInvitation } from "@/lib/check-ins";
import { getApprovedGuestBookMessages } from "@/lib/guest-book";
import { getWeddingLiveMode } from "@/lib/wedding-live-mode";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ code: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const { code } = await context.params;
  const config = await getWeddingLiveMode(code);
  if (!config?.enabled) {
    return NextResponse.json({ enabled: false, config: null, checkInCount: 0, messages: [] });
  }
  const [checkIns, messages] = await Promise.all([getCheckInsByInvitation(code), getApprovedGuestBookMessages(code)]);
  return NextResponse.json({
    enabled: true,
    config,
    checkInCount: checkIns.length,
    messages: messages.slice(0, 5),
  });
}
