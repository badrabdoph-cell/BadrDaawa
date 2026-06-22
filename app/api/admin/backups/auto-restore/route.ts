import { NextRequest, NextResponse } from "next/server";
import { ADMIN_SESSION_COOKIE, verifyAdminSessionCookie } from "@/lib/admin-session";
import { checkAndAutoRestoreV2 } from "@/lib/backups";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function isAdmin(request: NextRequest) {
  return verifyAdminSessionCookie(request.cookies.get(ADMIN_SESSION_COOKIE)?.value);
}

export async function POST(request: NextRequest) {
  if (!(await isAdmin(request))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await checkAndAutoRestoreV2();
    return NextResponse.json(result, { status: result.executed && result.restored ? 200 : 200 });
  } catch (error) {
    return NextResponse.json(
      { executed: false, restored: false, error: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    );
  }
}
