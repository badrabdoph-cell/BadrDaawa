import { checkAndAutoRestoreV2, logRestoreAttempt } from "./backups";

const isMain = typeof process !== "undefined" && process.argv[1]?.includes("startup-restore");

export async function safeStartupRestore(): Promise<void> {
  console.log("[Startup Restore] Checking if auto-restore is needed...");

  const autoRestoreEnabled = (process.env.AUTO_RESTORE_FROM_GITHUB || "").toLowerCase() === "true";
  if (!autoRestoreEnabled) {
    console.log("[Startup Restore] AUTO_RESTORE_FROM_GITHUB is not enabled, skipping");
    return;
  }

  try {
    const result = await checkAndAutoRestoreV2();

    if (result.executed) {
      await logRestoreAttempt({
        type: "v2-auto-restore",
        status: result.restored ? "success" : "failed",
        fileName: "startup-auto",
        itemsRestored: result.itemsRestored,
        uploadsRestored: result.uploadFilesRestored,
        error: result.restored ? null : result.reason,
        performedBy: "system",
      });

      if (result.restored) {
        console.log(`[Startup Restore] SUCCESS — ${result.reason}`);
      } else {
        console.warn(`[Startup Restore] FAILED — ${result.reason}`);
      }
    } else {
      console.log(`[Startup Restore] No action needed — ${result.reason}`);
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.warn(`[Startup Restore] Non-fatal error: ${message}`);
    try {
      await logRestoreAttempt({
        type: "v2-auto-restore",
        status: "failed",
        error: message,
        performedBy: "system",
      });
    } catch {
      // ignore logging errors during startup
    }
  }
}

if (isMain) {
  safeStartupRestore()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

