import { NextRequest, NextResponse } from "next/server";
import { ADMIN_SESSION_COOKIE, verifyAdminSessionCookie } from "@/lib/admin-session";
import { getGitHubSyncReadiness, getSyncHistory, getLastSuccessfulSync } from "@/lib/github-sync";
import { getSyncQueueStatus } from "@/lib/github-sync-queue";
import { getRedirectUrl } from "@/lib/utils";

export const dynamic = "force-dynamic";

async function isAdmin(request: NextRequest) {
  return verifyAdminSessionCookie(request.cookies.get(ADMIN_SESSION_COOKIE)?.value);
}

export async function GET(request: NextRequest) {
  if (!(await isAdmin(request))) {
    return NextResponse.redirect(getRedirectUrl("/admin/login", request.headers, request.nextUrl.origin), 303);
  }

  const [readiness, queue, { logs: recentLogs }, lastSync] = await Promise.all([
    Promise.resolve(getGitHubSyncReadiness()),
    Promise.resolve(getSyncQueueStatus()),
    getSyncHistory({ limit: 5 }),
    getLastSuccessfulSync(),
  ]);

  return NextResponse.json({
    readiness,
    queue,
    recentLogs,
    lastSync,
    nextRetry: null,
  });
}


