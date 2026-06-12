import { NextRequest, NextResponse } from "next/server";
import { ADMIN_SESSION_COOKIE, verifyAdminSessionCookie } from "@/lib/admin-session";
import { getRedirectUrl } from "@/lib/utils";

export const runtime = "nodejs";

async function isAdmin(request: NextRequest) {
  return verifyAdminSessionCookie(request.cookies.get(ADMIN_SESSION_COOKIE)?.value);
}

function sanitizeReturnTo(value: string) {
  return value === "/admin/backups" || value === "/admin/recent-edits" ? value : "/admin/recent-edits";
}

export async function POST(request: NextRequest) {
  if (!(await isAdmin(request))) {
    return NextResponse.redirect(getRedirectUrl("/admin/login", request.headers, request.nextUrl.origin), 303);
  }

  const formData = await request.formData();
  const returnTo = sanitizeReturnTo(String(formData.get("returnTo") || ""));
  const url = getRedirectUrl(returnTo, request.headers, request.nextUrl.origin);
  url.searchParams.set("error", "manual-restore-only");
  return NextResponse.redirect(url, 303);
}
