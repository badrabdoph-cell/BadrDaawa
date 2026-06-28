import { readFileSync, existsSync } from "node:fs";
import path from "node:path";

const secretsFile = path.join(process.cwd(), "data", ".secrets.env");
const secrets = existsSync(secretsFile)
  ? Object.fromEntries(
      readFileSync(secretsFile, "utf8")
        .split("\n")
        .filter(Boolean)
        .map((l) => {
          const idx = l.indexOf("=");
          return idx === -1 ? null : [l.slice(0, idx), l.slice(idx + 1)];
        })
        .filter(Boolean),
    )
  : {};

const BACKUP_CRON_SECRET = process.env.BACKUP_CRON_SECRET || secrets.BACKUP_CRON_SECRET || process.env.CRON_SECRET;
const BASE_URL = process.env.BACKUP_CRON_URL || process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
const ALERT_WEBHOOK = process.env.ALERT_WEBHOOK_URL || "";

async function sendAlert(subject, body) {
  if (!ALERT_WEBHOOK) {
    console.warn(`[backup-health] No ALERT_WEBHOOK_URL set. Would alert: ${subject}`);
    return;
  }
  try {
    await fetch(ALERT_WEBHOOK, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ subject, body, timestamp: new Date().toISOString() }),
    });
  } catch (err) {
    console.error(`[backup-health] Failed to send alert: ${err.message}`);
  }
}

async function main() {
  const checks = [];
  let allOk = true;

  // 1. Health endpoint
  try {
    const healthRes = await fetch(`${BASE_URL.replace(/\/+$/, "")}/api/health`);
    const health = await healthRes.json();
    const healthy = health.status === "ok";
    checks.push({ name: "health_endpoint", ok: healthy, detail: healthy ? "OK" : JSON.stringify(health.issues) });
    if (!healthy) allOk = false;
  } catch (err) {
    checks.push({ name: "health_endpoint", ok: false, detail: err.message });
    allOk = false;
  }

  // 2. Backup status endpoint
  if (BACKUP_CRON_SECRET) {
    try {
      const statusRes = await fetch(`${BASE_URL.replace(/\/+$/, "")}/api/admin/backups/status`, {
        headers: { Authorization: `Bearer ${BACKUP_CRON_SECRET}` },
      });
      const status = await statusRes.json();
      checks.push({ name: "backup_status_api", ok: statusRes.ok, detail: statusRes.ok ? `فحوصات: ${status.checks?.length ?? 0}` : statusRes.statusText });
      if (status.checks) {
        for (const c of status.checks) {
          checks.push({ name: `backup_${c.name}`, ok: c.ok, detail: c.detail });
          if (!c.ok) allOk = false;
        }
      }
    } catch (err) {
      checks.push({ name: "backup_status_api", ok: false, detail: err.message });
      allOk = false;
    }
  }

  // 3. Check cron job ran recently by looking at last backup time
  if (BACKUP_CRON_SECRET) {
    try {
      const cronRes = await fetch(`${BASE_URL.replace(/\/+$/, "")}/api/cron/backup`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${BACKUP_CRON_SECRET}`,
          "x-backup-cron-source": "health-check",
        },
      });
      const cron = await cronRes.json();
      const hasSkipped = Object.values(cron.results || {}).every((r) => r.skipped);
      checks.push({ name: "cron_trigger", ok: cronRes.ok, detail: hasSkipped ? "كل النسخ محدثة" : "تم إنشاء نسخ جديدة" });
    } catch (err) {
      checks.push({ name: "cron_trigger", ok: false, detail: err.message });
      allOk = false;
    }
  }

  const failed = checks.filter((c) => !c.ok);
  if (failed.length > 0) {
    console.warn(`[backup-health] ${failed.length} فشل من أصل ${checks.length} فحص:`);
    for (const f of failed) {
      console.warn(`  [FAIL] ${f.name}: ${f.detail}`);
    }
    await sendAlert(
      `⚠️ فشل فحص النسخ الاحتياطي (${failed.length} مشكلة)`,
      failed.map((f) => `- ${f.name}: ${f.detail}`).join("\n"),
    );
  } else {
    console.log(`[backup-health] OK — ${checks.length} فحص جميعها ناجحة`);
  }

  process.exit(allOk ? 0 : 1);
}

main().catch((err) => {
  console.error(`[backup-health] Error: ${err.message}`);
  process.exit(1);
});
