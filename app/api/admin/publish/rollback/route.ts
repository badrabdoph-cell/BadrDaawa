import { NextRequest, NextResponse } from "next/server";
import { ADMIN_SESSION_COOKIE, verifyAdminSessionCookie } from "@/lib/admin-session";
import { rollbackToVersion } from "@/lib/publish-rollback";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const cookie = request.cookies.get(ADMIN_SESSION_COOKIE)?.value;
  if (!cookie || !(await verifyAdminSessionCookie(cookie))) {
    return NextResponse.json({ ok: false, error: "انتهت جلسة الأدمن." }, { status: 401 });
  }

  try {
    const body = (await request.json().catch(() => null)) as { version?: number } | null;
    const version = typeof body?.version === "number" && body.version > 0 ? body.version : 0;
    if (!version) {
      return NextResponse.json({ ok: false, error: "رقم الإصدار مطلوب." }, { status: 400 });
    }

    const result = await rollbackToVersion(version, "Admin Rollback");

    if (!result.success) {
      return NextResponse.json({ ok: false, error: result.message, rollbackVersion: result.rollbackVersion, rolledBackToSha: result.rolledBackToSha, restoredKeys: result.restoredKeys }, { status: 400 });
    }

    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "فشل" }, { status: 500 });
  }
}
