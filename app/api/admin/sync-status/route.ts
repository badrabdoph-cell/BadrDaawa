import { NextRequest, NextResponse } from "next/server";
import { ADMIN_SESSION_COOKIE, verifyAdminSessionCookie } from "@/lib/admin-session";
import { getGitHubSyncReadiness, syncAdminStateToGitHub } from "@/lib/github-sync";
import { getSyncQueueStatus } from "@/lib/github-sync-queue";
import { getRedirectUrl } from "@/lib/utils";

async function isAdmin(request: NextRequest) {
  return verifyAdminSessionCookie(request.cookies.get(ADMIN_SESSION_COOKIE)?.value);
}

export async function GET(request: NextRequest) {
  if (!(await isAdmin(request))) {
    return NextResponse.redirect(getRedirectUrl("/admin/login", request.headers, request.nextUrl.origin), 303);
  }

  return NextResponse.json({
    readiness: getGitHubSyncReadiness(),
    queue: getSyncQueueStatus(),
  });
}

export async function POST(request: NextRequest) {
  if (!(await isAdmin(request))) {
    return NextResponse.redirect(getRedirectUrl("/admin/login", request.headers, request.nextUrl.origin), 303);
  }

  const result = await syncAdminStateToGitHub("Manual admin sync requested.", { createSnapshot: true });
  return NextResponse.json(result, { status: result.status === "failed" ? 500 : 200 });
}
