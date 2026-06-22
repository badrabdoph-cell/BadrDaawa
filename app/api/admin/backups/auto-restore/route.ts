import { NextRequest, NextResponse } from "next/server";
import { ADMIN_SESSION_COOKIE, verifyAdminSessionCookie } from "@/lib/admin-session";
import { checkAndAutoRestoreV2 } from "@/lib/backups";
import { updateOperation, failOperation, completeOperation } from "@/lib/operation-progress";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function isAdmin(request: NextRequest) {
  return verifyAdminSessionCookie(request.cookies.get(ADMIN_SESSION_COOKIE)?.value);
}

export async function POST(request: NextRequest) {
  if (!(await isAdmin(request))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const operationId = body.operationId as string | undefined;

  if (operationId) updateOperation(operationId, { progress: 5, step: "بدء Auto Restore", status: "in_progress" });

  try {
    if (operationId) updateOperation(operationId, { progress: 20, step: "فحص حالة قاعدة البيانات والملفات" });
    const result = await checkAndAutoRestoreV2();

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
    return NextResponse.json(
      { executed: false, restored: false, error: msg },
      { status: 500 },
    );
  }
}
