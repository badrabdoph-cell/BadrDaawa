import { revalidatePath } from "next/cache";
import { NextRequest, NextResponse } from "next/server";
import { ADMIN_SESSION_COOKIE, verifyAdminSessionCookie } from "@/lib/admin-session";
import { createBackupSnapshot, listBackupSnapshots } from "@/lib/backups";
import { getRedirectUrl } from "@/lib/utils";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function isAdmin(request: NextRequest) {
  return verifyAdminSessionCookie(request.cookies.get(ADMIN_SESSION_COOKIE)?.value);
}

export async function GET(request: NextRequest) {
  if (!(await isAdmin(request))) {
    return NextResponse.json({ error: "غير مصرح." }, { status: 401 });
  }

  return NextResponse.json({ backups: await listBackupSnapshots() });
}

export async function POST(request: NextRequest) {
  if (!(await isAdmin(request))) {
    return NextResponse.json({ error: "غير مصرح." }, { status: 401 });
  }

  try {
    const backup = await createBackupSnapshot("manual");
    revalidatePath("/admin/backups");
    return NextResponse.redirect(getRedirectUrl(`/admin/backups?created=${encodeURIComponent(backup.fileName)}`, request.headers, request.nextUrl.origin), 303);
  } catch (error) {
    console.error("[Backup] Manual backup failed", error);
    return NextResponse.redirect(getRedirectUrl("/admin/backups?error=create", request.headers, request.nextUrl.origin), 303);
  }
}
