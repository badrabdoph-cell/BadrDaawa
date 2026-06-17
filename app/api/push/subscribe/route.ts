import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { type BrowserPushSubscription, savePushSubscription } from "@/lib/push-notifications";
import { checkRequestRateLimit, rateLimitResponse } from "@/lib/rate-limiting";
import { isSameOriginRequest, sameOriginErrorResponse } from "@/lib/security-enhancements";

export async function POST(request: NextRequest) {
  if (!isSameOriginRequest(request)) return sameOriginErrorResponse();
  const limit = checkRequestRateLimit(request, "push:subscribe", { windowMs: 60000, maxRequests: 10 });
  if (!limit.allowed) return rateLimitResponse(limit.resetAt);

  const data = (await request.json().catch(() => null)) as { invitationCode?: string; subscription?: unknown } | null;

  if (!data || typeof data.subscription !== "object" || !data.subscription) {
    return NextResponse.json({ ok: false, error: "Invalid subscription." }, { status: 400 });
  }

  let invitationCode = typeof data.invitationCode === "string" && /^[a-zA-Z0-9_-]{1,120}$/.test(data.invitationCode) ? data.invitationCode : "";
  if (invitationCode && prisma) {
    const disabledCheck = await prisma.invitation.findFirst({ where: { code: invitationCode, deletedAt: null }, select: { disabledAt: true } }).catch(() => null);
    if (disabledCheck?.disabledAt) invitationCode = "";
  }
  const result = await savePushSubscription(data.subscription as BrowserPushSubscription, invitationCode, request.headers.get("user-agent") || undefined);
  return NextResponse.json(result);
}
