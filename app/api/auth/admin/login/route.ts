import { NextRequest, NextResponse } from "next/server";
import { createHash, scryptSync, timingSafeEqual } from "crypto";
import { ADMIN_SESSION_COOKIE, ADMIN_SESSION_MAX_AGE, createAdminSessionCookie } from "@/lib/admin-session";
import { getAdminPassword, getAdminPasswordHash, getAdminUsernames, isAdminAuthConfigured } from "@/lib/auth-config";
import { getPublicSiteUrl, getPublicUrl } from "@/lib/utils";

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

function safeCompareBuffer(left: Buffer, right: Buffer) {
  if (left.length !== right.length) {
    timingSafeEqual(left, left);
    return false;
  }
  return timingSafeEqual(left, right);
}

function verifyPassword(password: string) {
  const passwordHash = getAdminPasswordHash();
  if (!passwordHash) return safeCompare(password, getAdminPassword());

  const [scheme, salt, expected] = passwordHash.split(":");
  if (scheme === "scrypt" && salt && expected) {
    try {
      const expectedBuffer = Buffer.from(expected, "hex");
      const derived = scryptSync(password, Buffer.from(salt, "hex"), expectedBuffer.length);
      return safeCompareBuffer(derived, expectedBuffer);
    } catch {
      return false;
    }
  }

  if (scheme === "sha256" && salt) {
    const derived = createHash("sha256").update(password).digest("hex");
    return safeCompare(derived, salt);
  }

  return false;
}

function sanitizeAdminNext(value: string) {
  if (!value.startsWith("/admin")) return "/admin";
  if (value.startsWith("/admin/login") || value.startsWith("//")) return "/admin";
  return value;
}

function isTrustedOrigin(request: NextRequest) {
  const expectedOrigin = new URL(getPublicSiteUrl(request.headers, request.nextUrl.origin)).origin;
  const requestOrigin = request.headers.get("origin");
  const referer = request.headers.get("referer");
  if (requestOrigin) return requestOrigin === expectedOrigin || requestOrigin === request.nextUrl.origin;
  if (referer) {
    try {
      const refererOrigin = new URL(referer).origin;
      return refererOrigin === expectedOrigin || refererOrigin === request.nextUrl.origin;
    } catch {
      return false;
    }
  }
  return true;
}

function redirectToLogin(request: NextRequest, reason: "error" | "setup", next: string) {
  const url = getPublicUrl("/admin/login", request.headers, request.nextUrl.origin);
  url.searchParams.set(reason, "1");
  url.searchParams.set("next", sanitizeAdminNext(next));
  const response = NextResponse.redirect(url, 303);
  response.headers.set("Cache-Control", "no-store");
  return response;
}

export async function POST(request: NextRequest) {
  if (!isTrustedOrigin(request)) {
    return redirectToLogin(request, "error", "/admin");
  }

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
  const hasValidPassword = verifyPassword(password);

  if (!hasValidUsername || !hasValidPassword) {
    registerFailedAttempt(rateLimitKey);
    return redirectToLogin(request, "error", next);
  }

  clearAttempts(rateLimitKey);

  const response = NextResponse.redirect(getPublicUrl(next, request.headers, request.nextUrl.origin), 303);
  response.cookies.set(ADMIN_SESSION_COOKIE, await createAdminSessionCookie(username), {
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: ADMIN_SESSION_MAX_AGE,
  });
  response.headers.set("Cache-Control", "no-store");
  return response;
}
