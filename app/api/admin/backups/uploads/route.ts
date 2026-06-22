import { NextRequest, NextResponse } from "next/server";
import { ADMIN_SESSION_COOKIE, verifyAdminSessionCookie } from "@/lib/admin-session";
import { createUploadsBackupPayload, uploadUploadsBackupToGitHub } from "@/lib/backups";
import { updateOperation, failOperation, completeOperation } from "@/lib/operation-progress";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function isAdmin(request: NextRequest) {
  return verifyAdminSessionCookie(request.cookies.get(ADMIN_SESSION_COOKIE)?.value);
}

export async function POST(request: NextRequest) {
  if (!(await isAdmin(request))) {
    return NextResponse.json({ error: "غير مصرح." }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const operationId = body.operationId as string | undefined;

  if (operationId) updateOperation(operationId, { progress: 5, step: "بدء إنشاء نسخة الملفات", status: "in_progress" });

  try {
    if (operationId) updateOperation(operationId, { progress: 20, step: "قراءة الملفات المرفوعة" });
    const { manifest, files, createdAt } = await createUploadsBackupPayload();

    if (operationId) updateOperation(operationId, { progress: 50, step: "رفع إلى GitHub" });
    const result = await uploadUploadsBackupToGitHub(
      manifest, files,
      createdAt.toISOString().replace(/[:.]/g, "-").replace(/[^\w-]/g, ""),
      createdAt, "manual",
    );
    if (!result) {
      const msg = "فشل رفع النسخة إلى GitHub";
      if (operationId) failOperation(operationId, msg);
      return NextResponse.json({ ok: false, error: msg }, { status: 500 });
    }

    const response = {
      ok: true,
      totalFiles: manifest.totalFiles,
      totalSizeBytes: manifest.totalSizeBytes,
      blobCount: files.length,
      createdAt: createdAt.toISOString(),
      commitSha: result.commitSha,
      repoPath: result.repoPath,
    };

    if (operationId) completeOperation(operationId, response as unknown as Record<string, unknown>);
    return NextResponse.json(response);
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    if (operationId) failOperation(operationId, msg, error instanceof Error ? error.stack : undefined);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
