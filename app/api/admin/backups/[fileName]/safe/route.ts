import { NextRequest, NextResponse } from "next/server";
import { ADMIN_SESSION_COOKIE, verifyAdminSessionCookie } from "@/lib/admin-session";
import { markBackupAsSafe, unmarkBackupAsSafe } from "@/lib/backups";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ fileName: string }>;
};

async function isAdmin(request: NextRequest) {
  return verifyAdminSessionCookie(request.cookies.get(ADMIN_SESSION_COOKIE)?.value);
}

export async function POST(request: NextRequest, context: RouteContext) {
  if (!(await isAdmin(request))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { fileName } = await context.params;
  const body = (await request.json().catch(() => ({}))) as { label?: string; notes?: string };
  const entry = await markBackupAsSafe(fileName, {
    label: body.label,
    notes: body.notes,
    markedBy: "admin",
  });
  return NextResponse.json({ ok: true, entry });
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  if (!(await isAdmin(request))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { fileName } = await context.params;
  await unmarkBackupAsSafe(fileName);
  return NextResponse.json({ ok: true });
}
