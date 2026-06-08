import { NextRequest, NextResponse } from "next/server";
import { CLIENT_SESSION_COOKIE, CLIENT_SESSION_MAX_AGE, createClientSessionCookie } from "@/lib/client-session";
import { prisma } from "@/lib/db";
import { validateFileClientLogin } from "@/lib/file-store";
import { verifyPassword } from "@/lib/password";
import { getRedirectUrl } from "@/lib/utils";

async function isValidClientLogin(code: string, username: string, password: string) {
  const envUsername = process.env.CLIENT_ADMIN_USERNAME;
  const envPassword = process.env.CLIENT_ADMIN_PASSWORD;

  if (envUsername && envPassword && username === envUsername && password === envPassword) {
    return true;
  }

  const isValidFileLogin = await validateFileClientLogin(code, username, password);
  if (!prisma) return isValidFileLogin;

  try {
    const invitation = await prisma.invitation.findUnique({
      where: { code },
      include: { customer: { select: { username: true, passwordHash: true, isActive: true } } },
    });

    const isValidDatabaseLogin = Boolean(
      invitation?.customer.isActive &&
        invitation.customer.username === username &&
        verifyPassword(password, invitation.customer.passwordHash),
    );
    return isValidDatabaseLogin || isValidFileLogin;
  } catch (error) {
    console.error("Failed to validate database client login", error);
    return isValidFileLogin;
  }
}

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const code = String(formData.get("code") || "").trim();
  const username = String(formData.get("username") || "").trim();
  const password = String(formData.get("password") || "");

  if (!code || !(await isValidClientLogin(code, username, password))) {
    const url = getRedirectUrl(`/${code || "invite"}/ad_3399/login`, request.headers, request.nextUrl.origin);
    url.searchParams.set("error", "1");
    return NextResponse.redirect(url, 303);
  }

  const response = NextResponse.redirect(getRedirectUrl(`/${code}/ad_3399`, request.headers, request.nextUrl.origin), 303);
  let sessionCookie = "";
  try {
    sessionCookie = await createClientSessionCookie(code);
  } catch {
    const url = getRedirectUrl(`/${code}/ad_3399/login`, request.headers, request.nextUrl.origin);
    url.searchParams.set("error", "1");
    return NextResponse.redirect(url, 303);
  }

  response.cookies.set(CLIENT_SESSION_COOKIE, sessionCookie, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: CLIENT_SESSION_MAX_AGE,
  });
  return response;
}
