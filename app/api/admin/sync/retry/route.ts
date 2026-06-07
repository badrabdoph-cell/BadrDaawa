import { NextRequest, NextResponse } from "next/server";
import { ADMIN_SESSION_COOKIE, verifyAdminSessionCookie } from "@/lib/admin-session";
import { syncAdminStateToGitHub, updateSyncLog } from "@/lib/github-sync";
import { getRedirectUrl } from "@/lib/utils";

async function isAdmin(request: NextRequest) {
  return verifyAdminSessionCookie(request.cookies.get(ADMIN_SESSION_COOKIE)?.value);
}

export async function POST(request: NextRequest) {
  if (!(await isAdmin(request))) {
    return NextResponse.redirect(getRedirectUrl("/admin/login", request.headers, request.nextUrl.origin), 303);
  }

  let logId: string | undefined;
  let reason = "Manual retry from admin panel";

  try {
    const body = await request.json().catch(() => ({}));
    logId = body.logId as string | undefined;
    if (body.reason) reason = String(body.reason);
  } catch {
    // ignore parse errors
  }

  // Reset the log entry to processing state before retrying
  if (logId) {
    await updateSyncLog(logId, { status: "processing", errorMessage: undefined as unknown as string, nextRetryAt: undefined as unknown as Date });
  }

  const result = await syncAdminStateToGitHub(reason, {
    createSnapshot: false,
    logId,
    retryCount: 0,
  });

  return NextResponse.json(
    {
      success: result.status !== "failed",
      message: result.message,
      result,
    },
    { status: result.status === "failed" ? 500 : 200 },
  );
}
