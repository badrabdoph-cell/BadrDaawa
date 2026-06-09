import { NextRequest, NextResponse } from "next/server";
import { ADMIN_SESSION_COOKIE, getAdminSessionUser } from "@/lib/admin-session";
import { recordErrorEvent } from "@/lib/error-tracking";
import { checkRequestRateLimit, rateLimitResponse } from "@/lib/rate-limiting";
import { isSameOriginRequest, sameOriginErrorResponse } from "@/lib/security-enhancements";

export const dynamic = "force-dynamic";

function clean(value: unknown, maxLength: number) {
  return String(value || "").trim().slice(0, maxLength);
}

async function resolveUser(request: NextRequest, payloadUser: string, route: string) {
  const adminUser = await getAdminSessionUser(request.cookies.get(ADMIN_SESSION_COOKIE)?.value).catch(() => null);
  if (adminUser) return `admin:${adminUser}`;
  if (payloadUser) return payloadUser;
  if (route.includes("/ad_3399")) return "client";
  return "public";
}

export async function POST(request: NextRequest) {
  if (!isSameOriginRequest(request)) return sameOriginErrorResponse();
  const limit = checkRequestRateLimit(request, "errors:report", { windowMs: 60000, maxRequests: 12 });
  if (!limit.allowed) return rateLimitResponse(limit.resetAt);

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) return NextResponse.json({ ok: false, error: "invalid-body" }, { status: 400 });

  const route = clean(body.route, 500) || request.headers.get("referer") || "unknown-route";
  const message = clean(body.message, 700);
  if (!message) return NextResponse.json({ ok: false, error: "missing-message" }, { status: 400 });

  const event = await recordErrorEvent({
    route,
    message,
    stack: clean(body.stack, 6000),
    source: clean(body.source, 120),
    digest: clean(body.digest, 160),
    user: await resolveUser(request, clean(body.user, 160), route),
  });

  return NextResponse.json({ ok: true, id: event?.id });
}
