import { NextRequest, NextResponse } from "next/server";
import { ADMIN_SESSION_COOKIE, verifyAdminSessionCookie } from "@/lib/admin-session";
import { getAuditActorFromAdminRequest, recordAuditLog } from "@/lib/audit-log";
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
  const deletedImages = result.deletedFiles.filter((file) => file.kind === "image");
  if (deletedImages.length) {
    await recordAuditLog({
      actor: await getAuditActorFromAdminRequest(request),
      action: "media.image.delete",
      entity: { type: "Media", id: "media-cleanup", label: `${deletedImages.length} unused image(s)` },
      oldValues: deletedImages,
      newValues: { deleted: true, count: deletedImages.length },
      metadata: {
        backupFileName: result.backupFileName,
        deletedSizeBytes: deletedImages.reduce((sum, file) => sum + file.sizeBytes, 0),
        source: "media-cleanup",
      },
    });
  }

  const url = getRedirectUrl("/admin/media", request.headers, request.nextUrl.origin);
  url.searchParams.set("deleted", String(result.deletedFiles.length));
  url.searchParams.set("size", String(result.deletedSizeBytes));
  url.searchParams.set("backup", result.backupFileName);
  if (result.skippedFiles.length) url.searchParams.set("skipped", String(result.skippedFiles.length));
  return NextResponse.redirect(url, 303);
}
