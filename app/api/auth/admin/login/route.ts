import { NextRequest, NextResponse } from "next/server";
import { getAdminPassword, getAdminSessionSecret, getAdminUsernames, isAdminAuthConfigured } from "@/lib/auth-config";

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const username = String(formData.get("username") || "").trim();
  const password = String(formData.get("password") || "");
  const next = String(formData.get("next") || "/admin");

  if (!isAdminAuthConfigured()) {
    return NextResponse.redirect(new URL(`/admin/login?setup=1&next=${encodeURIComponent(next)}`, request.url), 303);
  }

  if (!getAdminUsernames().includes(username) || password !== getAdminPassword()) {
    return NextResponse.redirect(new URL(`/admin/login?error=1&next=${encodeURIComponent(next)}`, request.url), 303);
  }

  const response = NextResponse.redirect(new URL(next.startsWith("/admin") ? next : "/admin", request.url), 303);
  response.cookies.set("bd_admin_session", getAdminSessionSecret(), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 12,
  });
  return response;
}
