/**
 * سكربت تشغيل النسخ الاحتياطي محلياً
 *
 * يمكن استخدامه:
 * 1. يدوياً:                    pnpm backup:local
 * 2. عبر macOS crontab:         * */3 * * * /path/to/node /path/to/scripts/trigger-backup-local.mjs
 * 3. عبر launchd (أفضل):       استخدام ملف plist للتشغيل الدوري
 *
 * المتغيرات المطلوبة (مع قيم افتراضية للتطوير):
 *   BACKUP_CRON_SECRET أو CRON_SECRET — مفتاح التوثيق (افتراضياً badrdaawa-local-dev-cron-secret للتطوير)
 *   NEXT_PUBLIC_SITE_URL — رابط الموقع (افتراضياً http://localhost:3000)
 *   PORT — منفذ التطوير (افتراضياً 3000)
 */

const LOCAL_DEV_SECRET = "badrdaawa-local-dev-cron-secret";

const secret = (process.env.BACKUP_CRON_SECRET || process.env.CRON_SECRET || (process.env.NODE_ENV !== "production" ? LOCAL_DEV_SECRET : "")).trim();

if (!secret) {
  console.error("[BackupLocal] ❌ BACKUP_CRON_SECRET أو CRON_SECRET غير محدد.");
  console.error("[BackupLocal] أضف BACKUP_CRON_SECRET=your-secret في .env أو استخدم الإعداد الافتراضي للتطوير.");
  process.exit(1);
}

const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || `http://localhost:${process.env.PORT || "3000"}`).replace(/\/+$/, "");
const cronUrl = `${siteUrl}/api/cron/backup`;

const startedAt = Date.now();

try {
  const response = await fetch(cronUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${secret}`,
      "Content-Type": "application/json",
      "User-Agent": "BadrDaawa-LocalBackup/1.0",
      "X-Backup-Cron-Source": "local-trigger",
    },
    signal: AbortSignal.timeout(10 * 60 * 1000),
  });

  const body = await response.text();
  const duration = ((Date.now() - startedAt) / 1000).toFixed(1);

  if (response.ok) {
    console.log(`[BackupLocal] ✅ تم تشغيل النسخ الاحتياطي بنجاح (${duration} ثانية).`);
    console.log(body);
    process.exit(0);
  } else {
    console.error(`[BackupLocal] ❌ فشل التشغيل: ${response.status} ${body.slice(0, 300)}`);
    process.exit(1);
  }
} catch (error) {
  const duration = ((Date.now() - startedAt) / 1000).toFixed(1);
  console.error(`[BackupLocal] ❌ خطأ في الاتصال (${duration} ثانية):`, error?.message || error);
  process.exit(1);
}
