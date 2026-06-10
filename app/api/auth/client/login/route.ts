import { NextRequest, NextResponse } from "next/server";
import { getRedirectUrl } from "@/lib/utils";

export async function POST(request: NextRequest) {
  const accept = request.headers.get("accept") || "";
  if (accept.includes("application/json")) {
    return NextResponse.json({ error: "تم إيقاف تسجيل دخول العميل. استخدم رابط إدارة الدعوة السري." }, { status: 410 });
  }

  const url = getRedirectUrl("/manage/invitation/invalid", request.headers, request.nextUrl.origin);
  url.searchParams.set("reason", "session");
  return NextResponse.redirect(url, 303);
}
