import { NextResponse } from "next/server";

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const rateLimitMap = new Map<string, RateLimitEntry>();

export function getClientIdentifier(request: Request): string {
  const forwardedFor = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const realIp = request.headers.get("x-real-ip")?.trim();
  return forwardedFor || realIp || "local";
}

export function createRateLimitKey(identifier: string, endpoint: string): string {
  return `${identifier}:${endpoint}`;
}

export interface RateLimitConfig {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Maximum requests per window
  skipSuccessfulRequests?: boolean; // Skip counting successful requests
  skipFailedRequests?: boolean; // Skip counting failed requests
}

export function checkRateLimit(key: string, config: RateLimitConfig): { allowed: boolean; remaining: number; resetAt: number } {
  const now = Date.now();
  const entry = rateLimitMap.get(key);

  if (!entry || entry.resetAt <= now) {
    // Create new entry
    const newEntry: RateLimitEntry = {
      count: 1,
      resetAt: now + config.windowMs,
    };
    rateLimitMap.set(key, newEntry);
    return {
      allowed: true,
      remaining: config.maxRequests - 1,
      resetAt: newEntry.resetAt,
    };
  }

  // Check if limit exceeded
  if (entry.count >= config.maxRequests) {
    return {
      allowed: false,
      remaining: 0,
      resetAt: entry.resetAt,
    };
  }

  // Increment counter
  entry.count += 1;
  return {
    allowed: true,
    remaining: config.maxRequests - entry.count,
    resetAt: entry.resetAt,
  };
}

export function checkRequestRateLimit(request: Request, endpoint: string, config: RateLimitConfig) {
  const identifier = getClientIdentifier(request);
  return checkRateLimit(createRateLimitKey(identifier, endpoint), config);
}

export function rateLimitResponse(resetAt: number) {
  const retryAfter = Math.max(1, Math.ceil((resetAt - Date.now()) / 1000));
  return NextResponse.json(
    { error: "طلبات كثيرة جدًا. حاول مرة أخرى بعد قليل." },
    {
      status: 429,
      headers: {
        "Retry-After": String(retryAfter),
      },
    },
  );
}

export function resetRateLimit(key: string): void {
  rateLimitMap.delete(key);
}

// Cleanup old entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitMap.entries()) {
    if (entry.resetAt <= now) {
      rateLimitMap.delete(key);
    }
  }
}, 60000); // Cleanup every minute

// Default rate limit configs
export const RATE_LIMIT_CONFIGS = {
  API_GENERAL: { windowMs: 60000, maxRequests: 30 }, // 30 requests per minute
  API_ADMIN: { windowMs: 60000, maxRequests: 100 }, // 100 requests per minute for admin
  API_AUTH: { windowMs: 900000, maxRequests: 5 }, // 5 requests per 15 minutes for auth
  API_UPLOAD: { windowMs: 3600000, maxRequests: 10 }, // 10 uploads per hour
};
