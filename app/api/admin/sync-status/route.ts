import { NextRequest, NextResponse } from "next/server";
import { ADMIN_SESSION_COOKIE, verifyAdminSessionCookie } from "@/lib/admin-session";
import { getGitHubSyncReadiness, syncAdminStateToGitHub, getSyncHistory, getLastSuccessfulSync } from "@/lib/github-sync";
import { getSyncQueueStatus } from "@/lib/github-sync-queue";
import { getRedirectUrl } from "@/lib/utils";

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

export async function POST(request: NextRequest) {
  if (!(await isAdmin(request))) {
    return NextResponse.redirect(getRedirectUrl("/admin/login", request.headers, request.nextUrl.origin), 303);
  }

  const result = await syncAdminStateToGitHub("Manual GitHub backup upload requested.");
  const wantsJson = request.headers.get("accept")?.includes("application/json") || request.headers.get("content-type")?.includes("application/json");
  if (wantsJson) {
    return NextResponse.json(
      {
        ...result,
        readiness: getGitHubSyncReadiness(),
      },
      { status: result.status === "failed" ? 500 : 200 },
    );
  }

  const url = getRedirectUrl("/admin", request.headers, request.nextUrl.origin);
  url.searchParams.set("sync", result.status);
  url.searchParams.set("syncMessage", result.message.slice(0, 180));
  return NextResponse.redirect(url, 303);
}
