import { NextResponse } from "next/server";
import { ADMIN_SESSION_COOKIE } from "@/lib/admin-session";
import { getPublicUrl } from "@/lib/utils";

export async function POST(request: Request) {
  const response = NextResponse.redirect(getPublicUrl("/admin/login", request.headers, request.url), 303);
  response.cookies.delete(ADMIN_SESSION_COOKIE);
  response.headers.set("Cache-Control", "no-store");
  return response;
}
