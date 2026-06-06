import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const code = String(formData.get("code") || "");
  const response = NextResponse.redirect(new URL(code ? `/${code}/ad_3399/login` : "/", request.url), 303);
  response.cookies.delete("bd_client_session");
  return response;
}
