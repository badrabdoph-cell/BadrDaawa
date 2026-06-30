import { NextRequest, NextResponse } from "next/server";
import { validatePartnerPromoCode } from "@/lib/partner-promo";
import { checkRateLimit, createRateLimitKey, getClientIdentifier, RATE_LIMIT_CONFIGS } from "@/lib/rate-limiting";
import { isSameOriginRequest, sameOriginErrorResponse } from "@/lib/security-enhancements";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  if (!isSameOriginRequest(request)) return sameOriginErrorResponse();
  const rateLimit = checkRateLimit(createRateLimitKey(getClientIdentifier(request), "promo:validate"), RATE_LIMIT_CONFIGS.API_GENERAL);
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { ok: false, error: "تمت محاولات كثيرة في وقت قصير. انتظر دقيقة ثم حاول مرة أخرى." },
      { status: 429, headers: { "Retry-After": String(Math.ceil((rateLimit.resetAt - Date.now()) / 1000)) } },
    );
  }

  const body = (await request.json().catch(() => null)) as { code?: unknown; source?: unknown } | null;
  const code = typeof body?.code === "string" ? body.code : "";
  const result = await validatePartnerPromoCode(code, {
    source: typeof body?.source === "string" ? body.source : "order-form",
    userAgent: request.headers.get("user-agent"),
    customerIp: getClientIdentifier(request),
    logFailures: true,
  });

  return NextResponse.json(result, { status: result.ok ? 200 : 400 });
}
