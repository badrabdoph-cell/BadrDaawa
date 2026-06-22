import { NextRequest, NextResponse } from "next/server";
import { ADMIN_SESSION_COOKIE, verifyAdminSessionCookie, getAdminSessionUser } from "@/lib/admin-session";
import { downloadAndRestoreFromGitHub, restoreFromBackup, logRestoreAttempt } from "@/lib/backups";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const cookie = request.cookies.get(ADMIN_SESSION_COOKIE)?.value;
  if (!cookie || !(await verifyAdminSessionCookie(cookie))) {
    return NextResponse.json({ ok: false, error: "انتهت جلسة الأدمن." }, { status: 401 });
  }

  try {
    const body = (await request.json().catch(() => null)) as { fileName?: string; source?: "github" | "local" } | null;
    const fileName = typeof body?.fileName === "string" && body.fileName.trim() ? body.fileName.trim() : "";
    const source = body?.source === "local" ? "local" : "github";

    if (!fileName) {
      return NextResponse.json({ ok: false, error: "اسم ملف النسخة الاحتياطية مطلوب." }, { status: 400 });
    }

    const adminEmail = await getAdminSessionUser(cookie) || "unknown";

    if (source === "local") {
      const result = await restoreFromBackup(fileName);
      await logRestoreAttempt({
        type: "local-v1",
        status: result.ok ? "success" : "failed",
        fileName,
        itemsRestored: result.itemsRestored,
        uploadsRestored: result.uploadsRestored,
        error: result.error,
        durationMs: result.durationMs,
        performedBy: adminEmail,
      });
      return NextResponse.json(result);
    }

    const result = await downloadAndRestoreFromGitHub(fileName);
    await logRestoreAttempt({
      type: "github-v1",
      status: result.ok ? "success" : "failed",
      fileName,
      itemsRestored: result.itemsRestored,
      uploadsRestored: result.uploadsRestored,
      error: result.error,
      durationMs: result.durationMs,
      performedBy: adminEmail,
    });
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "فشل" }, { status: 500 });
  }
}
