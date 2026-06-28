const SECONDS_BETWEEN_RUNS = 60;

async function triggerBackup() {
  const BASE_URL = process.env.BACKUP_CRON_URL || process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  const BACKUP_CRON_SECRET = process.env.BACKUP_CRON_SECRET || process.env.CRON_SECRET;

  if (!BACKUP_CRON_SECRET) {
    console.warn("[dev:cron] BACKUP_CRON_SECRET not set. Run `node scripts/prepare-production.mjs` first.");
    return;
  }

  try {
    const url = `${BASE_URL.replace(/\/+$/, "")}/api/cron/backup`;
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${BACKUP_CRON_SECRET}`,
        "x-backup-cron-source": "dev-cron",
      },
    });
    const body = await res.json();
    console.log(`[dev:cron ${new Date().toISOString()}] backup result: ${body.ok ? "OK" : "FAILED"} ${JSON.stringify(body.results || body.error)}`);
  } catch (err) {
    console.error(`[dev:cron ${new Date().toISOString()}] request failed: ${err.message}`);
  }
}

console.log(`[dev:cron] Starting dev cron (every ${SECONDS_BETWEEN_RUNS}s)...`);
triggerBackup();
setInterval(triggerBackup, SECONDS_BETWEEN_RUNS * 1000);
