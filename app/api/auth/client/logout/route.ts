import { NextRequest, NextResponse } from "next/server";
import { getRedirectUrl } from "@/lib/utils";

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const code = String(formData.get("code") || "");
  const response = NextResponse.redirect(getRedirectUrl(code ? `/${code}/ad_3399/login` : "/", request.headers, request.nextUrl.origin), 303);
  response.cookies.delete("bd_client_session");
  return response;
}
