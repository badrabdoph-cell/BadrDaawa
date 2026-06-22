import { NextRequest, NextResponse } from "next/server";
import { ADMIN_SESSION_COOKIE, verifyAdminSessionCookie, getAdminSessionUser } from "@/lib/admin-session";
import { checkAndAutoRestoreV2, logRestoreAttempt } from "@/lib/backups";
import { updateOperation, failOperation, completeOperation } from "@/lib/operation-progress";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  if (!(await verifyAdminSessionCookie(request.cookies.get(ADMIN_SESSION_COOKIE)?.value))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const operationId = body.operationId as string | undefined;
  const adminEmail = await getAdminSessionUser(request.cookies.get(ADMIN_SESSION_COOKIE)?.value) || "unknown";

  if (operationId) updateOperation(operationId, { progress: 5, step: "بدء Auto Restore", status: "in_progress" });

  try {
    if (operationId) updateOperation(operationId, { progress: 20, step: "فحص حالة قاعدة البيانات والملفات" });
    const result = await checkAndAutoRestoreV2();

    if (result.executed) {
      await logRestoreAttempt({
        type: "v2-auto-restore",
        status: result.restored ? "success" : "failed",
        fileName: "auto",
        itemsRestored: result.itemsRestored,
        uploadsRestored: result.uploadFilesRestored,
        error: result.restored ? null : result.reason,
        performedBy: adminEmail,
      });
    }

    if (operationId) {
      if (result.executed) {
        completeOperation(operationId, result as unknown as Record<string, unknown>);
      } else {
        completeOperation(operationId, { ...result, autoRestoreStatus: "no_action_needed" });
      }
    }

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    if (operationId) failOperation(operationId, msg, error instanceof Error ? error.stack : undefined);
    await logRestoreAttempt({
      type: "v2-auto-restore",
      status: "failed",
      error: msg,
      performedBy: adminEmail,
    });
    return NextResponse.json(
      { executed: false, restored: false, error: msg },
      { status: 500 },
    );
  }
}
