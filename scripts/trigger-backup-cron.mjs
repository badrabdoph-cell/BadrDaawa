import { createHash } from "node:crypto";

const startedAt = Date.now();
const secret = (process.env.BACKUP_CRON_SECRET || process.env.CRON_SECRET || "").trim();
const secretHash = secret ? createHash("sha256").update(secret).digest("hex").slice(0, 8) : "empty";
console.log(`[Backup Cron Trigger] BACKUP_CRON_SECRET SHA256 (first 8): ${secretHash}`);
const configuredUrl = (process.env.BACKUP_CRON_URL || "").trim();
const railwayDomain = (process.env.RAILWAY_PUBLIC_DOMAIN || process.env.RAILWAY_STATIC_URL || "").trim().replace(/^https?:\/\//, "").replace(/\/$/, "");
const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || process.env.SITE_URL || "").trim().replace(/\/$/, "");

if (!secret) {
  throw new Error("BACKUP_CRON_SECRET or CRON_SECRET is required.");
}

const rawBase = configuredUrl || (railwayDomain ? `https://${railwayDomain}` : siteUrl ? siteUrl : "");
const url = rawBase
  ? rawBase.replace(/\/+$/, "").replace(/\/api\/cron\/backup\/?$/i, "") + "/api/cron/backup"
  : "";
if (!url) {
  throw new Error("BACKUP_CRON_URL, RAILWAY_PUBLIC_DOMAIN, or NEXT_PUBLIC_SITE_URL is required.");
}

const parsedUrl = new URL(url);
console.log(
  `[Backup Cron Trigger] Sending request: ${parsedUrl.origin}${parsedUrl.pathname} service=${process.env.RAILWAY_SERVICE_NAME || process.env.RAILWAY_SERVICE_ID || "unknown"} deployment=${process.env.RAILWAY_DEPLOYMENT_ID || "unknown"}`,
);

let response;
try {
  response = await fetch(parsedUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${secret}`,
      Accept: "application/json",
      "User-Agent": "BadrDaawa-Railway-Cron/1.0",
      "X-Backup-Cron-Source": process.env.RAILWAY_SERVICE_NAME || process.env.RAILWAY_SERVICE_ID || "railway-cron",
    },
    signal: AbortSignal.timeout(Number(process.env.BACKUP_CRON_TIMEOUT_MS || 10 * 60 * 1000)),
  });
} catch (error) {
  const cause = error && typeof error === "object" && "cause" in error ? error.cause : null;
  const causeMessage = cause instanceof Error ? ` (${cause.message})` : "";
  const message = error instanceof Error ? `${error.message}${causeMessage}` : String(error || "Unknown request error");
  throw new Error(`Backup cron request could not be sent to ${parsedUrl.origin}${parsedUrl.pathname}: ${message}`);
}

const body = await response.text();
console.log(`[Backup Cron Trigger] Response status=${response.status} durationMs=${Date.now() - startedAt}`);
console.log(body);

if (!response.ok) {
  throw new Error(`Backup cron request failed with status ${response.status}.`);
}

const payload = JSON.parse(body);
if (!payload?.ok) {
  throw new Error("Backup cron run did not finish successfully.");
}
