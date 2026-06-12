import { after } from "next/server";
import { getSystemAuditActor, recordAuditLog } from "./audit-log";
import { syncAdminStateToGitHub, createSyncLog, isGitHubSyncAuthFailure } from "./github-sync";
import type { GitHubSyncResult } from "./github-sync";

type SyncQueueStatus = "pending" | "processing" | "completed" | "failed";

type SyncQueueItem = {
  id: string;
  reason: string;
  timestamp: number;
  status: SyncQueueStatus;
  error?: string;
  result?: GitHubSyncResult;
  completedAt?: number;
  retryCount: number;
  logId?: string | null;
  changeType?: string;
  affectedResource?: string;
};

const maxTrackedJobs = 50;
const syncQueue: SyncQueueItem[] = [];
const trackedJobs = new Map<string, SyncQueueItem>();
let isSyncing = false;
let syncJobCounter = 0;

function scheduleQueueProcessing() {
  const runner = () => {
    processSyncQueue().catch((error) => {
      console.error("Failed to process GitHub sync queue", error);
    });
  };

  try {
    after(runner);
    return;
  } catch {
    // Outside a Next request context, fall back to the normal Node scheduler.
  }

  if (typeof setImmediate === "function") {
    setImmediate(runner);
    return;
  }
  void runner();
}

function trimTrackedJobs() {
  const completed = Array.from(trackedJobs.values())
    .filter((item) => item.status === "completed" || item.status === "failed")
    .sort((a, b) => (b.completedAt || b.timestamp) - (a.completedAt || a.timestamp));

  for (const item of completed.slice(maxTrackedJobs)) {
    trackedJobs.delete(item.id);
  }
}

export function queueGitHubSync(
  reason: string,
  options: {
    uploadExistingBackup?: boolean;
    uploadProjectFiles?: boolean;
    changeType?: string;
    affectedResource?: string;
  } = {},
) {
  const shouldUploadExistingBackup = Boolean(options.uploadExistingBackup);
  const shouldUploadProjectFiles = Boolean(options.uploadProjectFiles);

  if (!shouldUploadExistingBackup && !shouldUploadProjectFiles) {
    console.log(`[GitHub Backup Queue] Ignoring non-backup sync request. PostgreSQL is the live source of truth: ${reason}`);
    return "";
  }

  const item: SyncQueueItem = {
    id: `sync-${++syncJobCounter}-${Date.now()}`,
    reason: shouldUploadProjectFiles ? `Project files upload: ${reason}` : `Backup upload: ${reason}`,
    timestamp: Date.now(),
    status: "pending",
    retryCount: 0,
    changeType: options.changeType || (shouldUploadProjectFiles ? "project" : "backup"),
    affectedResource: options.affectedResource,
  };

  syncQueue.push(item);
  trackedJobs.set(item.id, item);

  if (!isSyncing) {
    scheduleQueueProcessing();
  }

  return item.id;
}

async function processSyncQueue() {
  if (isSyncing) return;
  isSyncing = true;

  try {
    while (syncQueue.length > 0) {
      const item = syncQueue.shift();
      if (!item) break;

      item.status = "processing";

      // Create or reuse a DB log entry
      if (!item.logId) {
        item.logId = await createSyncLog({
          reason: item.reason,
          status: "processing",
          retryCount: item.retryCount,
        });
      }

      try {
        const result = await syncAdminStateToGitHub(item.reason, {
          uploadProjectFiles: item.changeType === "project",
          logId: item.logId ?? undefined,
          retryCount: item.retryCount,
        });
        item.result = result;

        if (result.status === "failed") {
          item.status = "failed";
          item.error = result.message;
          item.completedAt = Date.now();
          if (result.authFailed) console.error(`[GitHub Sync Queue] Not retrying auth failure for: ${item.reason}`);
        } else {
          item.status = "completed";
          item.completedAt = Date.now();
        }
        await recordAuditLog({
          actor: getSystemAuditActor("GitHub Sync Queue"),
          action: "github.sync",
          entity: { type: "GitHubSync", id: item.id, label: item.reason },
          newValues: result,
          metadata: {
            reason: item.reason,
            status: result.status,
            retryCount: item.retryCount,
            logId: item.logId,
          },
        });

        console.log(`[GitHub Sync Queue] ${item.reason}:`, result.status);
      } catch (error) {
        item.error = error instanceof Error ? error.message : "Unknown error";
        console.error(`[GitHub Sync Queue Error] ${item.reason}:`, error);
        if (isGitHubSyncAuthFailure(error)) {
          item.status = "failed";
          item.completedAt = Date.now();
          console.error(`[GitHub Sync Queue] Not retrying thrown auth failure for: ${item.reason}`);
        } else {
          item.status = "failed";
          item.completedAt = Date.now();
        }
        await recordAuditLog({
          actor: getSystemAuditActor("GitHub Sync Queue"),
          action: "github.sync",
          entity: { type: "GitHubSync", id: item.id, label: item.reason },
          newValues: { status: "failed", error: item.error },
          metadata: {
            reason: item.reason,
            retryCount: item.retryCount,
            logId: item.logId,
          },
        });
      }

      trimTrackedJobs();
    }
  } finally {
    isSyncing = false;
  }
}

export function getSyncQueueStatus() {
  return {
    queueLength: syncQueue.length,
    isSyncing,
    items: Array.from(trackedJobs.values()).map((item) => ({
      id: item.id,
      reason: item.reason,
      status: item.status,
      age: Date.now() - item.timestamp,
      error: item.error,
      result: item.result,
      completedAt: item.completedAt,
      retryCount: item.retryCount,
      changeType: item.changeType,
      affectedResource: item.affectedResource,
    })),
  };
}

export function getSyncJobStatus(jobId: string) {
  const item = trackedJobs.get(jobId);
  if (!item) return null;

  return {
    id: item.id,
    reason: item.reason,
    status: item.status,
    timestamp: item.timestamp,
    completedAt: item.completedAt,
    error: item.error,
    retryCount: item.retryCount,
  };
}

export function clearSyncQueue() {
  const count = syncQueue.length;
  for (const item of syncQueue) {
    trackedJobs.delete(item.id);
  }
  syncQueue.length = 0;
  return count;
}
