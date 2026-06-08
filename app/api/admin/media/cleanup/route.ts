import { NextRequest, NextResponse } from "next/server";
import { ADMIN_SESSION_COOKIE, verifyAdminSessionCookie } from "@/lib/admin-session";
import { deleteUnusedMediaFiles } from "@/lib/media-cleanup";
import { queueGitHubSync } from "@/lib/github-sync-queue";
import { getRedirectUrl } from "@/lib/utils";

export const runtime = "nodejs";

async function isAdmin(request: NextRequest) {
  return verifyAdminSessionCookie(request.cookies.get(ADMIN_SESSION_COOKIE)?.value);
}

export async function POST(request: NextRequest) {
  if (!(await isAdmin(request))) {
    return NextResponse.redirect(getRedirectUrl("/admin/login", request.headers, request.nextUrl.origin), 303);
  }

  const result = await deleteUnusedMediaFiles();
  queueGitHubSync(`Media cleanup deleted ${result.deletedFiles.length} unused file(s). Backup: ${result.backupFileName}.`, { createSnapshot: true });

  const url = getRedirectUrl("/admin/media", request.headers, request.nextUrl.origin);
  url.searchParams.set("deleted", String(result.deletedFiles.length));
  url.searchParams.set("size", String(result.deletedSizeBytes));
  url.searchParams.set("backup", result.backupFileName);
  if (result.skippedFiles.length) url.searchParams.set("skipped", String(result.skippedFiles.length));
  return NextResponse.redirect(url, 303);
}
