import { createHash, timingSafeEqual } from "node:crypto";
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

if (!BACKUP_CRON_SECRET) {
  console.error("[backup:local] BACKUP_CRON_SECRET is not set. Run prepare-production.mjs first or set it manually.");
  process.exit(1);
}

const BASE_URL = process.env.BACKUP_CRON_URL || process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
const url = `${BASE_URL.replace(/\/+$/, "")}/api/cron/backup`;

async function main() {
  console.log(`[backup:local] Triggering backup at ${url}...`);
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${BACKUP_CRON_SECRET}`,
      "x-backup-cron-source": "local-script",
    },
  });
  const body = await res.json();
  if (body.ok) {
    console.log(`[backup:local] OK — ${JSON.stringify(body.results)}`);
    process.exit(0);
  } else {
    console.error(`[backup:local] FAILED — ${body.error || JSON.stringify(body)}`);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(`[backup:local] Error: ${err.message}`);
  process.exit(1);
});
