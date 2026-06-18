import { createHash } from "node:crypto";

const LOCAL_DEV_SECRET = "badrdaawa-local-dev-cron-secret";
const THREE_HOURS_MS = 3 * 60 * 60 * 1000;
const POLL_INTERVAL_MS = 10 * 60 * 1000;
const STARTUP_WAIT_MS = 2 * 1000;
const SERVER_READY_TIMEOUT_MS = 60 * 1000;

const secret = (process.env.BACKUP_CRON_SECRET || process.env.CRON_SECRET || (process.env.NODE_ENV !== "production" ? LOCAL_DEV_SECRET : "")).trim();

const port = process.env.PORT || "3000";
const baseUrl = `http://localhost:${port}`;
const cronUrl = `${baseUrl}/api/cron/backup`;

function log(...args) {
  const time = new Date().toLocaleString("ar-EG", { hour12: false });
  console.log(`[LocalDevCron ${time}]`, ...args);
}

async function waitForServer() {
  const startedAt = Date.now();
  while (Date.now() - startedAt < SERVER_READY_TIMEOUT_MS) {
    try {
      const res = await fetch(baseUrl, { signal: AbortSignal.timeout(3000) });
      if (res.ok || res.status < 500) {
        log("الخادم جاهز.");
        return true;
      }
    } catch {
      // Server not ready yet
    }
    await new Promise((r) => setTimeout(r, STARTUP_WAIT_MS));
  }
  return false;
}

async function getLastBackupTime() {
  try {
    const res = await fetch(`${baseUrl}/api/admin/backups`, {
      signal: AbortSignal.timeout(5000),
      headers: { Accept: "application/json" },
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (data?.backups?.length > 0) {
      const sorted = data.backups
        .filter((b) => b.type === "scheduled")
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      return sorted.length > 0 ? new Date(sorted[0].createdAt).getTime() : null;
    }
    return null;
  } catch {
    return null;
  }
}

async function triggerBackup() {
  try {
    const res = await fetch(cronUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${secret}`,
        "Content-Type": "application/json",
        "User-Agent": "BadrDaawa-LocalDevCron/1.0",
        "X-Backup-Cron-Source": "local-dev-cron",
      },
      signal: AbortSignal.timeout(10 * 60 * 1000),
    });
    const body = await res.text();
    if (res.ok) {
      log("✅ تم تشغيل النسخ الاحتياطي بنجاح.");
    } else {
      log(`⚠️ فشل تشغيل النسخ: ${res.status} ${body.slice(0, 200)}`);
    }
  } catch (error) {
    log("❌ خطأ في الاتصال:", error?.message || error);
  }
}

async function main() {
  log("بدء تشغيل LocalDevCron لمحاكاة Railway Cron محلياً.");
  log(`المنفذ: ${port}, الرابط: ${cronUrl}`);

  if (!secret) {
    log("❌ لم يتم تعيين BACKUP_CRON_SECRET أو CRON_SECRET. أضفهما في .env أو استخدم الإعداد الافتراضي للتطوير.");
    process.exit(1);
  }

  const hash = createHash("sha256").update(secret).digest("hex").slice(0, 8);
  log(`بصمة المفتاح: ${hash}`);

  log("في انتظار اتصال خادم Next.js...");
  const ready = await waitForServer();
  if (!ready) {
    log("❌ لم يتمكن من الاتصال بخادم Next.js. تأكد من تشغيل 'pnpm dev' أولاً.");
    process.exit(1);
  }

  // Initial backup check — trigger if overdue
  const lastTime = await getLastBackupTime();
  const now = Date.now();
  if (lastTime && now - lastTime >= THREE_HOURS_MS) {
    log("آخر نسخة أقدم من 3 ساعات. جاري تشغيل نسخة فورية...");
    await triggerBackup();
  } else if (!lastTime) {
    log("لا توجد نسخ سابقة. جاري تشغيل النسخة الأولى...");
    await triggerBackup();
  } else {
    const remaining = Math.round((THREE_HOURS_MS - (now - lastTime)) / 60000);
    log(`آخر نسخة منذ أقل من 3 ساعات. الانتظار ${remaining} دقيقة للنسخة التالية.`);
  }

  // Periodic polling loop
  log(`بدء المراقبة الدورية كل ${POLL_INTERVAL_MS / 60000} دقائق...`);
  const pollInterval = setInterval(async () => {
    const lastTime = await getLastBackupTime();
    const now = Date.now();
    if (!lastTime || now - lastTime >= THREE_HOURS_MS) {
      log("حان وقت النسخ. جاري التشغيل...");
      await triggerBackup();
    }
  }, POLL_INTERVAL_MS);

  process.on("SIGINT", () => {
    clearInterval(pollInterval);
    log("تم إيقاف LocalDevCron.");
    process.exit(0);
  });
  process.on("SIGTERM", () => {
    clearInterval(pollInterval);
    log("تم إيقاف LocalDevCron.");
    process.exit(0);
  });
}

main().catch((error) => {
  log("خطأ غير متوقع:", error?.message || error);
  process.exit(1);
});
