import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { createCheckIn, hasCheckIn } from "@/lib/check-ins";
import { queueGitHubSync } from "@/lib/github-sync-queue";
import { getInvitationByCode } from "@/lib/invitation-data";
import { checkRequestRateLimit, rateLimitResponse } from "@/lib/rate-limiting";
import { isSameOriginRequest, sameOriginErrorResponse } from "@/lib/security-enhancements";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ code: string }>;
};

export async function GET(request: Request, context: RouteContext) {
  const { code } = await context.params;
  const url = new URL(request.url);
  const visitorKey = url.searchParams.get("visitorKey") || "";
  return NextResponse.json({ checkedIn: visitorKey ? await hasCheckIn(code, visitorKey) : false });
}

export async function POST(request: Request, context: RouteContext) {
  const { code } = await context.params;
  if (!isSameOriginRequest(request)) return sameOriginErrorResponse();
  const limit = checkRequestRateLimit(request, `check-in:${code}`, { windowMs: 60000, maxRequests: 10 });
  if (!limit.allowed) return rateLimitResponse(limit.resetAt);

  const invitation = await getInvitationByCode(code);
  if (!invitation || !invitation.isActive || invitation.checkInEnabled === false) {
    return NextResponse.json({ error: "تسجيل الوصول غير متاح لهذه الدعوة." }, { status: 404 });
  }

  const body = (await request.json().catch(() => null)) as { visitorKey?: unknown } | null;
  const result = await createCheckIn({
    invitationCode: code,
    visitorKey: body?.visitorKey,
    userAgent: request.headers.get("user-agent") || "",
  });
  if (!result) {
    return NextResponse.json({ error: "تعذر تسجيل الوصول. حاول مرة أخرى." }, { status: 400 });
  }

  revalidatePath("/admin/check-ins");
  revalidatePath("/admin");
  if (!result.duplicate) {
    queueGitHubSync(`Invitation check-in recorded: ${code}.`, { createSnapshot: true });
  }
  return NextResponse.json({ ok: true, duplicate: result.duplicate, checkIn: result.checkIn });
}
