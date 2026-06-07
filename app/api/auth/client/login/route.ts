import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getClientSessionSecret } from "@/lib/auth-config";
import { validateFileClientLogin } from "@/lib/file-store";
import { verifyPassword } from "@/lib/password";

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
    return NextResponse.redirect(new URL(`/${code || "invite"}/ad_3399/login?error=1`, request.url), 303);
  }

  const response = NextResponse.redirect(new URL(`/${code}/ad_3399`, request.url), 303);
  response.cookies.set("bd_client_session", `${getClientSessionSecret()}:${code}`, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 12,
  });
  return response;
}
