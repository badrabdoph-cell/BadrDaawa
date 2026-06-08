import { NextRequest, NextResponse } from "next/server";
import { ADMIN_SESSION_COOKIE, verifyAdminSessionCookie } from "@/lib/admin-session";
import { getTotalUnreadClientMessages } from "@/lib/client-messages";

export const runtime = "nodejs";

async function isAdmin(request: NextRequest) {
  return verifyAdminSessionCookie(request.cookies.get(ADMIN_SESSION_COOKIE)?.value);
}

export async function GET(request: NextRequest) {
  if (!(await isAdmin(request))) {
    return NextResponse.json({ count: 0 }, { status: 401 });
  }

  return NextResponse.json({ count: await getTotalUnreadClientMessages() }, { headers: { "Cache-Control": "no-store" } });
}
