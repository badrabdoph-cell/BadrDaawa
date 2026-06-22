import { NextRequest, NextResponse } from "next/server";
import { ADMIN_SESSION_COOKIE, verifyAdminSessionCookie, getAdminSessionUser } from "@/lib/admin-session";
import { restoreFullFromGitHub, logRestoreAttempt } from "@/lib/backups";
import { updateOperation, failOperation, completeOperation } from "@/lib/operation-progress";
import { revalidatePath } from "next/cache";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function getAdminEmail(request: NextRequest) {
  const session = await getAdminSessionUser(request.cookies.get(ADMIN_SESSION_COOKIE)?.value);
  return session || "system";
}

export async function POST(request: NextRequest) {
  if (!(await verifyAdminSessionCookie(request.cookies.get(ADMIN_SESSION_COOKIE)?.value))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (process.env.ALLOW_DESTRUCTIVE_RESTORE !== "I_UNDERSTAND_THIS_OVERWRITES_POSTGRESQL") {
    return NextResponse.json(
      { error: "Restore is disabled. Set ALLOW_DESTRUCTIVE_RESTORE=I_UNDERSTAND_THIS_OVERWRITES_POSTGRESQL to enable." },
      { status: 403 },
    );
  }

  const body = await request.json().catch(() => ({}));
  const operationId = body.operationId as string | undefined;

  if (operationId) updateOperation(operationId, { progress: 2, step: "بدء الاستعادة الكاملة", status: "in_progress" });

  const adminEmail = await getAdminEmail(request);

  try {
    if (operationId) updateOperation(operationId, { progress: 5, step: "تحميل النسخة من GitHub" });
    const result = await restoreFullFromGitHub({
      fileName: body.fileName || undefined,
      commitSha: body.sha || undefined,
    });

    await logRestoreAttempt({
      type: "v2-full",
      status: result.ok ? "success" : "failed",
      fileName: result.fileName,
      itemsRestored: result.itemsRestored,
      uploadsRestored: result.uploadsRestored,
      error: result.error,
      durationMs: result.durationMs,
      performedBy: adminEmail,
    });

    if (operationId) {
      if (result.ok) {
        completeOperation(operationId, result as unknown as Record<string, unknown>);
      } else {
        failOperation(operationId, result.error || "فشلت الاستعادة الكاملة بدون تفاصيل");
      }
    }

    revalidatePath("/admin/backups");
    return NextResponse.json(result, { status: result.ok ? 200 : 500 });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    if (operationId) failOperation(operationId, msg, error instanceof Error ? error.stack : undefined);
    await logRestoreAttempt({
      type: "v2-full",
      status: "failed",
      fileName: body.fileName || undefined,
      error: msg,
      performedBy: adminEmail,
    });
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
