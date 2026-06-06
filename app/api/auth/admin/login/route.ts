import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";
import { getAdminPassword, getAdminSessionSecret, getAdminUsernames, isAdminAuthConfigured } from "@/lib/auth-config";
import { getPublicUrl } from "@/lib/utils";

const attempts = new Map<string, { count: number; resetAt: number }>();
const maxAttempts = 7;
const windowMs = 10 * 60 * 1000;

function getClientKey(request: NextRequest, username: string) {
  const forwardedFor = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const realIp = request.headers.get("x-real-ip")?.trim();
  return `${forwardedFor || realIp || "local"}:${username.toLowerCase()}`;
}

function isRateLimited(key: string) {
  const now = Date.now();
  const entry = attempts.get(key);
  if (!entry || entry.resetAt <= now) {
    attempts.set(key, { count: 0, resetAt: now + windowMs });
    return false;
  }
  return entry.count >= maxAttempts;
}

function registerFailedAttempt(key: string) {
  const now = Date.now();
  const entry = attempts.get(key);
  if (!entry || entry.resetAt <= now) {
    attempts.set(key, { count: 1, resetAt: now + windowMs });
    return;
  }
  entry.count += 1;
}

function clearAttempts(key: string) {
  attempts.delete(key);
}

function safeCompare(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  if (leftBuffer.length !== rightBuffer.length) {
    timingSafeEqual(leftBuffer, leftBuffer);
    return false;
  }
  return timingSafeEqual(leftBuffer, rightBuffer);
}

function sanitizeAdminNext(value: string) {
  if (!value.startsWith("/admin")) return "/admin";
  if (value.startsWith("/admin/login") || value.startsWith("//")) return "/admin";
  return value;
}

function redirectToLogin(request: NextRequest, reason: "error" | "setup", next: string) {
  const url = getPublicUrl("/admin/login", request.headers, request.nextUrl.origin);
  url.searchParams.set(reason, "1");
  url.searchParams.set("next", sanitizeAdminNext(next));
  return NextResponse.redirect(url, 303);
}

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const username = String(formData.get("username") || "").trim();
  const password = String(formData.get("password") || "");
  const next = sanitizeAdminNext(String(formData.get("next") || "/admin"));
  const rateLimitKey = getClientKey(request, username);

  if (!isAdminAuthConfigured()) {
    return redirectToLogin(request, "setup", next);
  }

  if (isRateLimited(rateLimitKey)) {
    return redirectToLogin(request, "error", next);
  }

  const hasValidUsername = getAdminUsernames().some((allowedUsername) => safeCompare(username, allowedUsername));
  const hasValidPassword = safeCompare(password, getAdminPassword());

  if (!hasValidUsername || !hasValidPassword) {
    registerFailedAttempt(rateLimitKey);
    return redirectToLogin(request, "error", next);
  }

  clearAttempts(rateLimitKey);

  const response = NextResponse.redirect(getPublicUrl(next, request.headers, request.nextUrl.origin), 303);
  response.cookies.set("bd_admin_session", getAdminSessionSecret(), {
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 12,
  });
  return response;
}
