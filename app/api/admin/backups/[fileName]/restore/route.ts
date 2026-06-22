import { NextRequest, NextResponse } from "next/server";
import { ADMIN_SESSION_COOKIE, verifyAdminSessionCookie, getAdminSessionUser } from "@/lib/admin-session";
import { restoreFromBackup, logRestoreAttempt } from "@/lib/backups";
import { revalidatePath } from "next/cache";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ fileName: string }>;
};

async function getAdminEmail(request: NextRequest) {
  const session = await getAdminSessionUser(request.cookies.get(ADMIN_SESSION_COOKIE)?.value);
  return session || "unknown";
}

export async function POST(request: NextRequest, context: RouteContext) {
  if (!(await verifyAdminSessionCookie(request.cookies.get(ADMIN_SESSION_COOKIE)?.value))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { fileName } = await context.params;

  if (process.env.ALLOW_DESTRUCTIVE_RESTORE !== "I_UNDERSTAND_THIS_OVERWRITES_POSTGRESQL") {
    return NextResponse.json(
      { error: "Restore is disabled. Set ALLOW_DESTRUCTIVE_RESTORE=I_UNDERSTAND_THIS_OVERWRITES_POSTGRESQL to enable." },
      { status: 403 },
    );
  }

  const adminEmail = await getAdminEmail(request);
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

  revalidatePath("/admin/backups");

  return NextResponse.json(result, { status: result.ok ? 200 : 500 });
}
