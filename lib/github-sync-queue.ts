import { after } from "next/server";
import { syncAdminStateToGitHub } from "./github-sync";
import type { GitHubSyncResult } from "./github-sync";

type SyncQueueStatus = "pending" | "processing" | "completed" | "failed";

type SyncQueueItem = {
  id: string;
  reason: string;
  createSnapshot: boolean;
  timestamp: number;
  status: SyncQueueStatus;
  error?: string;
  result?: GitHubSyncResult;
  completedAt?: number;
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

  setTimeout(runner, 0);
}

function trimTrackedJobs() {
  const completed = Array.from(trackedJobs.values())
    .filter((item) => item.status === "completed" || item.status === "failed")
    .sort((a, b) => (b.completedAt || b.timestamp) - (a.completedAt || a.timestamp));

  for (const item of completed.slice(maxTrackedJobs)) {
    trackedJobs.delete(item.id);
  }
}

export function queueGitHubSync(reason: string, options: { createSnapshot?: boolean } = {}) {
  const item: SyncQueueItem = {
    id: `sync-${++syncJobCounter}-${Date.now()}`,
    reason,
    createSnapshot: options.createSnapshot ?? false,
    timestamp: Date.now(),
    status: "pending",
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

      try {
        const result = await syncAdminStateToGitHub(item.reason, {
          createSnapshot: item.createSnapshot,
        });
        item.result = result;
        item.status = result.status === "failed" ? "failed" : "completed";
        item.completedAt = Date.now();
        if (result.status === "failed") item.error = result.message;
        console.log(`[GitHub Sync] ${item.reason}:`, result);
      } catch (error) {
        item.status = "failed";
        item.completedAt = Date.now();
        item.error = error instanceof Error ? error.message : "Unknown error";
        console.error(`[GitHub Sync Error] ${item.reason}:`, error);
      }

      trimTrackedJobs();
      await new Promise((resolve) => setTimeout(resolve, 500));
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
