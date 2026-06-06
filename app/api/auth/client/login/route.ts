import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifyPassword } from "@/lib/password";

function clientSessionSecret() {
  return process.env.CLIENT_SESSION_SECRET || process.env.AUTH_SECRET || "badrdaawa-client-local";
}

async function isValidClientLogin(code: string, username: string, password: string) {
  const envUsername = process.env.CLIENT_ADMIN_USERNAME;
  const envPassword = process.env.CLIENT_ADMIN_PASSWORD;

  if (envUsername && envPassword && username === envUsername && password === envPassword) {
    return true;
  }

  if (!prisma) {
    if (process.env.NODE_ENV === "production") {
      return false;
    }
    return username === "client" && password === "client12345";
  }

  const invitation = await prisma.invitation.findUnique({
    where: { code },
    include: { customer: { select: { username: true, passwordHash: true, isActive: true } } },
  });

  return Boolean(
    invitation?.customer.isActive &&
      invitation.customer.username === username &&
      verifyPassword(password, invitation.customer.passwordHash),
  );
}

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const code = String(formData.get("code") || "").trim();
  const username = String(formData.get("username") || "").trim();
  const password = String(formData.get("password") || "");

  if (!code || !(await isValidClientLogin(code, username, password))) {
    return NextResponse.redirect(new URL(`/${code || "invite"}/ad_3399/login?error=1`, request.url), 303);
  }

  const response = NextResponse.redirect(new URL(`/${code}/ad_3399`, request.url), 303);
  response.cookies.set("bd_client_session", `${clientSessionSecret()}:${code}`, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 12,
  });
  return response;
}
