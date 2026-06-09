import { NextRequest, NextResponse } from "next/server";
import { CLIENT_SESSION_COOKIE, CLIENT_SESSION_MAX_AGE, createClientSessionCookie } from "@/lib/client-session";
import { resolveInvitationManageToken } from "@/lib/invitation-manage-token";
import { getRedirectUrl } from "@/lib/utils";

export const runtime = "nodejs";

export async function GET(request: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const result = await resolveInvitationManageToken(token || "");
  if (!result.ok) {
    const url = getRedirectUrl("/manage/invitation/invalid", request.headers, request.nextUrl.origin);
    url.searchParams.set("reason", result.reason);
    return NextResponse.redirect(url, 303);
  }

  const response = NextResponse.redirect(getRedirectUrl(`/${result.code}/ad_3399`, request.headers, request.nextUrl.origin), 303);
  response.cookies.set(CLIENT_SESSION_COOKIE, await createClientSessionCookie(result.code), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: CLIENT_SESSION_MAX_AGE,
  });
  response.headers.set("Cache-Control", "no-store");
  return response;
}
