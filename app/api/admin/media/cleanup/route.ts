import { NextRequest, NextResponse } from "next/server";
import { ADMIN_SESSION_COOKIE, verifyAdminSessionCookie } from "@/lib/admin-session";
import { getAuditActorFromAdminRequest, recordAuditLog } from "@/lib/audit-log";
import { deleteMediaFilesByAction, type StorageCleanupAction } from "@/lib/media-cleanup";
import { queueGitHubSync } from "@/lib/github-sync-queue";
import { getRedirectUrl } from "@/lib/utils";

export const runtime = "nodejs";

async function isAdmin(request: NextRequest) {
  return verifyAdminSessionCookie(request.cookies.get(ADMIN_SESSION_COOKIE)?.value);
}

function isCleanupAction(value: string): value is StorageCleanupAction {
  return value === "orphans" || value === "duplicates" || value === "original-images" || value === "music-unused" || value === "database-orphans" || value === "old-backups" || value === "all";
}

export async function POST(request: NextRequest) {
  if (!(await isAdmin(request))) {
    return NextResponse.redirect(getRedirectUrl("/admin/login", request.headers, request.nextUrl.origin), 303);
  }

  const formData = await request.formData();
  const actionInput = String(formData.get("cleanupAction") || "orphans");
  const confirmText = String(formData.get("confirmText") || "").trim();
  const action = isCleanupAction(actionInput) ? actionInput : "orphans";
  const url = getRedirectUrl("/admin/media", request.headers, request.nextUrl.origin);

  if (confirmText !== "تنظيف") {
    url.searchParams.set("mediaError", "confirm");
    url.searchParams.set("cleanupAction", action);
    return NextResponse.redirect(url, 303);
  }

  const result = await deleteMediaFilesByAction(action);
  const deletedDatabaseRecords = result.deletedDatabaseOrphans.reduce((sum, group) => sum + group.count, 0);
  queueGitHubSync(`Storage cleanup (${action}) deleted ${result.deletedFiles.length} file(s), ${result.deletedBackups.length} backup(s), and ${deletedDatabaseRecords} database record(s). Backup: ${result.backupFileName}.`, { createSnapshot: true });
  if (result.deletedFiles.length || result.deletedBackups.length || deletedDatabaseRecords) {
    await recordAuditLog({
      actor: await getAuditActorFromAdminRequest(request),
      action: deletedDatabaseRecords && !result.deletedFiles.length && !result.deletedBackups.length ? "cleanup.database.delete" : "cleanup.storage.delete",
      entity: { type: "Cleanup", id: "storage-cleanup", label: `${result.deletedFiles.length} file(s), ${result.deletedBackups.length} backup(s), ${deletedDatabaseRecords} record(s)` },
      oldValues: { files: result.deletedFiles, backups: result.deletedBackups, databaseOrphans: result.deletedDatabaseOrphans },
      newValues: { deleted: true, action, filesCount: result.deletedFiles.length, backupsCount: result.deletedBackups.length, databaseRecordsCount: deletedDatabaseRecords },
      metadata: {
        backupFileName: result.backupFileName,
        deletedSizeBytes: result.deletedSizeBytes,
        source: "media-cleanup",
      },
    });
  }

  url.searchParams.set("deleted", String(result.deletedFiles.length + result.deletedBackups.length));
  url.searchParams.set("deletedFiles", String(result.deletedFiles.length));
  url.searchParams.set("deletedBackups", String(result.deletedBackups.length));
  url.searchParams.set("deletedRecords", String(deletedDatabaseRecords));
  url.searchParams.set("size", String(result.deletedSizeBytes));
  url.searchParams.set("backup", result.backupFileName);
  url.searchParams.set("cleanupAction", action);
  if (result.skippedFiles.length || result.skippedBackups.length) url.searchParams.set("skipped", String(result.skippedFiles.length + result.skippedBackups.length));
  return NextResponse.redirect(url, 303);
}
