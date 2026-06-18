import { cookies } from "next/headers";
import { NextRequest } from "next/server";

// Generate a CSRF token and store in cookie
export async function generateCsrfToken(): Promise<string> {
  const { randomBytes } = await import("node:crypto");
  const token = randomBytes(32).toString("hex");
  const cookieStore = await cookies();
  cookieStore.set("csrf_token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60,
  });
  return token;
}

// Get the CSRF token from cookie - simple string comparison
export async function validateCsrfToken(request: NextRequest): Promise<boolean> {
  const tokenFromHeader = request.headers.get("x-csrf-token");
  const tokenFromCookie = request.cookies.get("csrf_token")?.value;
  if (!tokenFromHeader || !tokenFromCookie) return false;
  return tokenFromHeader === tokenFromCookie;
}
