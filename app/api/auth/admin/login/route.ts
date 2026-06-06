import { NextRequest, NextResponse } from "next/server";

function adminUsername() {
  if (process.env.ADMIN_USERNAME || process.env.ADMIN_EMAIL) return process.env.ADMIN_USERNAME || process.env.ADMIN_EMAIL || "";
  return process.env.NODE_ENV === "production" ? "__missing_admin_username__" : "admin";
}

function adminPassword() {
  return process.env.ADMIN_PASSWORD || (process.env.NODE_ENV === "production" ? "__missing_admin_password__" : "admin12345");
}

function adminSessionSecret() {
  return process.env.ADMIN_SESSION_SECRET || process.env.AUTH_SECRET || "badrdaawa-admin-local";
}

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const username = String(formData.get("username") || "").trim();
  const password = String(formData.get("password") || "");
  const next = String(formData.get("next") || "/admin");

  if (username !== adminUsername() || password !== adminPassword()) {
    return NextResponse.redirect(new URL(`/admin/login?error=1&next=${encodeURIComponent(next)}`, request.url), 303);
  }

  const response = NextResponse.redirect(new URL(next.startsWith("/admin") ? next : "/admin", request.url), 303);
  response.cookies.set("bd_admin_session", adminSessionSecret(), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 12,
  });
  return response;
}
