import { NextRequest, NextResponse } from "next/server";
import { ADMIN_SESSION_COOKIE, verifyAdminSessionCookie } from "@/lib/admin-session";
import { createFullBackupPayload, uploadFullBackupToGitHub } from "@/lib/backups";

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
    const { manifest, files, createdAt } = await createFullBackupPayload();
    const result = await uploadFullBackupToGitHub(manifest, files, createdAt.toISOString().replace(/[:.]/g, "-").replace(/[^\w-]/g, ""), createdAt, "manual");
    if (!result) {
      return NextResponse.json({ ok: false, error: "فشل رفع النسخة إلى GitHub" }, { status: 500 });
    }
    return NextResponse.json({
      ok: true,
      dbSizeBytes: manifest.db.sizeBytes,
      uploadsCount: manifest.uploads.totalFiles,
      uploadsSizeBytes: manifest.uploads.totalSizeBytes,
      blobCount: files.length,
      createdAt: createdAt.toISOString(),
      commitSha: result.commitSha,
      repoPath: result.repoPath,
    });
  } catch (error) {
    console.error("[Full Backup] failed", error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    );
  }
}
