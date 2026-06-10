import { NextRequest, NextResponse } from "next/server";
import { CLIENT_SESSION_COOKIE } from "@/lib/client-session";
import { getRedirectUrl } from "@/lib/utils";

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const code = String(formData.get("code") || "");
  const response = NextResponse.redirect(getRedirectUrl(code ? `/${code}` : "/", request.headers, request.nextUrl.origin), 303);
  response.cookies.delete(CLIENT_SESSION_COOKIE);
  return response;
}
