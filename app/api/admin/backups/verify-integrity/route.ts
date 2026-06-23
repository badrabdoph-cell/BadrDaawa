import { NextRequest, NextResponse } from "next/server";
import { ADMIN_SESSION_COOKIE, verifyAdminSessionCookie } from "@/lib/admin-session";
import { verifyV2BackupIntegrity } from "@/lib/backups";
import type { BackupTypeV2 } from "@/lib/backups";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  if (!(await verifyAdminSessionCookie(request.cookies.get(ADMIN_SESSION_COOKIE)?.value))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const type = request.nextUrl.searchParams.get("type") as BackupTypeV2 | null;
  if (!type || !["database", "uploads", "full"].includes(type)) {
    return NextResponse.json({ error: "Provide ?type=database|uploads|full" }, { status: 400 });
  }

  const result = await verifyV2BackupIntegrity(type);
  return NextResponse.json(result, { status: result.ok ? 200 : 200 });
}
