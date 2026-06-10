import { NextRequest, NextResponse } from "next/server";
import { ADMIN_SESSION_COOKIE, verifyAdminSessionCookie } from "./admin-session";
import { getClientIdentifier, checkRateLimit, RATE_LIMIT_CONFIGS } from "./rate-limiting";
import { getPublicSiteUrl } from "./utils";

/**
 * Verify admin session middleware
 */
export async function verifyAdminSession(request: NextRequest) {
  const session = request.cookies.get(ADMIN_SESSION_COOKIE)?.value;
  return verifyAdminSessionCookie(session);
}

/**
 * Check rate limit for API endpoint
 */
export function checkApiRateLimit(request: NextRequest, endpoint: string, config = RATE_LIMIT_CONFIGS.API_ADMIN) {
  const identifier = getClientIdentifier(request);
  const key = `${identifier}:${endpoint}`;
  return checkRateLimit(key, config);
}

/**
 * Sanitize input to prevent XSS
 */
export function sanitizeInput(input: string): string {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;")
    .replace(/\//g, "&#x2F;");
}

/**
 * Validate CSRF token
 */
export function validateCsrfToken(token: string, sessionToken: string): boolean {
  // Simple CSRF validation - in production use more sophisticated methods
  return token === sessionToken;
}

/**
 * Create CSRF token
 */
export function createCsrfToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Secure headers middleware
 */
export function addSecurityHeaders(response: NextResponse) {
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-XSS-Protection", "1; mode=block");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set("Permissions-Policy", "geolocation=(), microphone=(), camera=()");
  return response;
}

export function getRequestOrigin(request: Request) {
  try {
    return new URL(request.url).origin;
  } catch {
    return "";
  }
}

function normalizeOrigin(value?: string | null) {
  if (!value) return "";
  try {
    const url = new URL(value);
    if (url.protocol !== "http:" && url.protocol !== "https:") return "";
    return url.origin;
  } catch {
    return "";
  }
}

function getForwardedOrigin(headers: Headers) {
  const forwardedHost = headers.get("x-forwarded-host")?.split(",")[0]?.trim() || headers.get("host")?.split(",")[0]?.trim();
  if (!forwardedHost) return "";
  const forwardedProto = headers.get("x-forwarded-proto")?.split(",")[0]?.trim() || (/^(localhost|127\.0\.0\.1)(:\d+)?$/i.test(forwardedHost) ? "http" : "https");
  return normalizeOrigin(`${forwardedProto}://${forwardedHost}`);
}

function isLocalOrigin(value: string) {
  try {
    const hostname = new URL(value).hostname;
    return hostname === "localhost" || hostname === "127.0.0.1";
  } catch {
    return false;
  }
}

function getTrustedRequestOrigins(request: Request) {
  const requestOrigin = getRequestOrigin(request);
  return new Set(
    [
      requestOrigin,
      getForwardedOrigin(request.headers),
      normalizeOrigin(getPublicSiteUrl(request.headers, requestOrigin || undefined)),
      normalizeOrigin(process.env.NEXT_PUBLIC_SITE_URL),
    ].filter(Boolean),
  );
}

/**
 * Validate request origin
 */
export function isValidOrigin(request: NextRequest, allowedOrigins: string[]): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return true; // Allow requests without origin header (same-site)
  return allowedOrigins.includes(origin);
}

export function isSameOriginRequest(request: Request): boolean {
  const trustedOrigins = getTrustedRequestOrigins(request);
  if (!trustedOrigins.size) return true;

  const sourceOrigin = normalizeOrigin(request.headers.get("origin"));
  if (sourceOrigin) {
    if (trustedOrigins.has(sourceOrigin)) return true;
    if (process.env.NODE_ENV === "development" && isLocalOrigin(sourceOrigin) && Array.from(trustedOrigins).some(isLocalOrigin)) return true;
    return false;
  }

  const referer = request.headers.get("referer");
  if (!referer) return true;

  const refererOrigin = normalizeOrigin(referer);
  if (!refererOrigin) return false;
  if (trustedOrigins.has(refererOrigin)) return true;
  return process.env.NODE_ENV === "development" && isLocalOrigin(refererOrigin) && Array.from(trustedOrigins).some(isLocalOrigin);
}

export function sameOriginErrorResponse() {
  return NextResponse.json({ error: "تم رفض الطلب بسبب مصدر غير موثوق." }, { status: 403 });
}

/**
 * Log security event
 */
export interface SecurityEvent {
  type: "auth_failure" | "rate_limit" | "invalid_input" | "unauthorized_access" | "suspicious_activity";
  timestamp: Date;
  ipAddress: string;
  userId?: string;
  details: Record<string, unknown>;
}

const securityLog: SecurityEvent[] = [];

export function logSecurityEvent(event: Omit<SecurityEvent, "timestamp">): void {
  const logEntry: SecurityEvent = {
    ...event,
    timestamp: new Date(),
  };
  securityLog.push(logEntry);

  // Keep only last 1000 events
  if (securityLog.length > 1000) {
    securityLog.shift();
  }

  // Log to console in development
  if (process.env.NODE_ENV === "development") {
    console.warn("[Security Event]", logEntry);
  }
}

export function getSecurityLog(): SecurityEvent[] {
  return [...securityLog];
}

/**
 * Validate file upload
 */
export interface FileValidationOptions {
  maxSize?: number; // in bytes
  allowedMimeTypes?: string[];
  allowedExtensions?: string[];
}

export function validateFileUpload(
  file: File,
  options: FileValidationOptions = {},
): { valid: boolean; error?: string } {
  const { maxSize = 10 * 1024 * 1024, allowedMimeTypes = [], allowedExtensions = [] } = options;

  // Check file size
  if (file.size > maxSize) {
    return { valid: false, error: `حجم الملف يتجاوز الحد المسموح (${maxSize / 1024 / 1024}MB)` };
  }

  // Check MIME type
  if (allowedMimeTypes.length > 0 && !allowedMimeTypes.includes(file.type)) {
    return { valid: false, error: "نوع الملف غير مسموح" };
  }

  // Check extension
  if (allowedExtensions.length > 0) {
    const extension = file.name.split(".").pop()?.toLowerCase();
    if (!extension || !allowedExtensions.includes(extension)) {
      return { valid: false, error: "امتداد الملف غير مسموح" };
    }
  }

  return { valid: true };
}

/**
 * Generate secure random string
 */
export function generateSecureRandom(length: number = 32): string {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Hash sensitive data (simple version - use bcrypt in production)
 */
export async function hashSensitiveData(data: string): Promise<string> {
  const encoder = new TextEncoder();
  const dataBuffer = encoder.encode(data);
  const hashBuffer = await crypto.subtle.digest("SHA-256", dataBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Verify sensitive data
 */
export async function verifySensitiveData(data: string, hash: string): Promise<boolean> {
  const computedHash = await hashSensitiveData(data);
  return computedHash === hash;
}
