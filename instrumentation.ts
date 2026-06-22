export async function register() {
  if (process.env.NEXT_PHASE === "phase-production-build") return;

  const autoRestoreEnabled = (process.env.AUTO_RESTORE_FROM_GITHUB || "").trim().toLowerCase() === "true";
  if (!autoRestoreEnabled) return;

  const { prisma } = await import("./lib/db");
  if (!prisma) return;

  try {
    const keysCount = await prisma.appSetting.count();
    if (keysCount > 0) {
      console.log(`[instrumentation] قاعدة البيانات غير فارغة (${keysCount} مفتاح)، تخطي auto-restore`);
      return;
    }
  } catch {
    console.error("[instrumentation] فشل التحقق من قاعدة البيانات");
    return;
  }

  // Try v2 full restore first (preferred, restores DB + uploads from single full backup)
  try {
    const { restoreFullFromGitHub } = await import("./lib/backups");
    console.log("[instrumentation] محاولة الاستعادة الكاملة (v2)...");
    const result = await restoreFullFromGitHub();
    if (result.ok) {
      console.log(`[instrumentation] تمت استعادة v2 كاملة: ${result.itemsRestored} عنصر و ${result.uploadsRestored} ملف (${result.durationMs}ms)`);
      return;
    }
    console.log(`[instrumentation] فشلت استعادة v2 (ربما لا توجد نسخة كاملة v2 بعد): ${result.error}`);
  } catch (e) {
    console.error("[instrumentation] خطأ في استعادة v2:", e);
  }

  // Fall back to v1 legacy restore
  try {
    const { findLatestBackupOnGitHub } = await import("./lib/github-sync");
    const latestBackup = await findLatestBackupOnGitHub();
    if (!latestBackup) {
      console.log("[instrumentation] لا توجد نسخة احتياطية v1 على GitHub");
      return;
    }

    console.log(`[instrumentation] بدء الاستعادة v1 من: ${latestBackup.fileName} (commit: ${latestBackup.commitSha})`);
    const { downloadAndRestoreFromGitHub } = await import("./lib/backups");
    const result = await downloadAndRestoreFromGitHub(latestBackup.fileName, {
      githubSha: latestBackup.commitSha,
      createdAt: latestBackup.createdAt,
    });

    if (result.ok) {
      console.log(`[instrumentation] تمت استعادة v1: ${result.itemsRestored} عنصر و ${result.uploadsRestored} ملف (${result.durationMs}ms)`);
    } else {
      console.error(`[instrumentation] فشلت استعادة v1: ${result.error}`);
    }
  } catch (e) {
    console.error("[instrumentation] فشل البحث عن آخر نسخة v1 على GitHub:", e);
  }
}
