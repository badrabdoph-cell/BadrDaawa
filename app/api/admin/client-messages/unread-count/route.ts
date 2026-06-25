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

  try {
    const count = await Promise.race([
      getTotalUnreadClientMessages(),
      new Promise<number>((_, reject) => setTimeout(() => reject(new Error("timeout")), 8000)),
    ]);
    return NextResponse.json({ count }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ count: 0 }, { headers: { "Cache-Control": "no-store" } });
  }
}
