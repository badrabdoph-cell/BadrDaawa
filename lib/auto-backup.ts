let lastCheck = 0;
const COOLDOWN_MS = 120_000;

export async function checkAndRunAutoBackup(): Promise<void> {
  const now = Date.now();
  if (now - lastCheck < COOLDOWN_MS) return;
  lastCheck = now;

  const { isV2BackupDue, runScheduledV2Backup } = await import("./backups-v2");
  const types: ("database" | "uploads" | "full")[] = ["database", "uploads", "full"];

  const results: string[] = [];
  for (const type of types) {
    try {
      const due = await isV2BackupDue(type);
      if (!due) continue;
      const result = await runScheduledV2Backup(type);
      if (result.ok) {
        results.push(`${type} OK (${result.fileName})`);
      } else {
        results.push(`${type} FAILED: ${result.error}`);
      }
    } catch (error) {
      results.push(`${type} ERROR: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  if (results.length > 0) {
    console.log(`[Auto-Backup] ${results.join(" | ")}`);
  }
}
