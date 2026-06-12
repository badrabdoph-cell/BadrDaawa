import { queueGitHubSync } from "./github-sync-queue";

export type SyncTriggerOptions = {
  reason: string;
  createSnapshot?: boolean;
  uploadProjectFiles?: boolean;
  changeType?: string;
  affectedResource?: string;
};

/**
 * Wraps an async admin operation and automatically queues a GitHub sync
 * after it completes successfully. Sync failures never break the admin op.
 */
export async function withAutoSync<T>(
  operation: () => Promise<T>,
  syncOptions: SyncTriggerOptions,
): Promise<T> {
  const result = await operation();
  try {
    queueGitHubSync(syncOptions.reason, {
      createSnapshot: syncOptions.createSnapshot ?? true,
      uploadProjectFiles: syncOptions.uploadProjectFiles,
      changeType: syncOptions.changeType,
      affectedResource: syncOptions.affectedResource,
    });
  } catch (error) {
    // Never let sync failures break admin operations
    console.error("[SyncMiddleware] Failed to queue GitHub sync:", error);
  }
  return result;
}

/**
 * Build a meaningful sync reason string for common admin operations.
 */
export function buildSyncReason(
  changeType: "template" | "invitation" | "order" | "preview" | "music" | "backup" | "custom",
  action: string,
  identifier?: string,
): string {
  switch (changeType) {
    case "template":
      return identifier ? `Template '${identifier}' ${action}` : `Template ${action}`;
    case "invitation":
      return identifier ? `Invitation '${identifier}' ${action}` : `Invitation ${action}`;
    case "order":
      return identifier ? `Order #${identifier} ${action}` : `Order ${action}`;
    case "preview":
      return "Preview settings updated";
    case "music":
      return identifier ? `Music library updated: ${identifier}` : "Music library updated";
    case "backup":
      return "Backup snapshot created";
    default:
      return action;
  }
}
