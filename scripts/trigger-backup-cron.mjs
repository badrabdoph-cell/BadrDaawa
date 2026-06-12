const secret = (process.env.BACKUP_CRON_SECRET || process.env.CRON_SECRET || "").trim();
const configuredUrl = (process.env.BACKUP_CRON_URL || "").trim();
const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || process.env.SITE_URL || "").trim().replace(/\/$/, "");

if (!secret) {
  throw new Error("BACKUP_CRON_SECRET or CRON_SECRET is required.");
}

const url = configuredUrl || (siteUrl ? `${siteUrl}/api/cron/backup` : "");
if (!url) {
  throw new Error("BACKUP_CRON_URL or NEXT_PUBLIC_SITE_URL is required.");
}

const response = await fetch(url, {
  method: "POST",
  headers: {
    Authorization: `Bearer ${secret}`,
    Accept: "application/json",
  },
});

const body = await response.text();
console.log(body);

if (!response.ok) {
  throw new Error(`Backup cron request failed with status ${response.status}.`);
}

const payload = JSON.parse(body);
if (!payload?.ok) {
  throw new Error("Backup cron run did not finish successfully.");
}
