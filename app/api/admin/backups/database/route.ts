import { NextRequest, NextResponse } from "next/server";
import { ADMIN_SESSION_COOKIE, verifyAdminSessionCookie } from "@/lib/admin-session";
import { uploadDatabaseBackupToGitHub, createDatabaseBackupPayload } from "@/lib/backups";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function isAdmin(request: NextRequest) {
  return verifyAdminSessionCookie(request.cookies.get(ADMIN_SESSION_COOKIE)?.value);
}

export async function POST(request: NextRequest) {
  if (!(await isAdmin(request))) {
    return NextResponse.json({ error: "غير مصرح." }, { status: 401 });
  }

  try {
    const { bytes, fileName, createdAt } = await createDatabaseBackupPayload();
    const result = await uploadDatabaseBackupToGitHub(bytes, fileName, createdAt, "manual");
    if (!result) {
      return NextResponse.json({ ok: false, error: "فشل رفع النسخة إلى GitHub (التهيئة أو حجم الملف)" }, { status: 500 });
    }
    return NextResponse.json({
      ok: true,
      fileName,
      createdAt: createdAt.toISOString(),
      commitSha: result.commitSha,
      repoPath: result.repoPath,
    });
  } catch (error) {
    console.error("[Database Backup] failed", error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    );
  }
}
