export async function register() {
  if (process.env.NEXT_PHASE === "phase-production-build") return;

  const autoRestoreEnabled = (process.env.AUTO_RESTORE_FROM_GITHUB || "").trim().toLowerCase() === "true";
  if (!autoRestoreEnabled) return;

  const { prisma } = await import("./lib/db");
  if (!prisma) return;

  const onlyIfEmpty = (process.env.AUTO_RESTORE_ONLY_IF_DB_EMPTY || "").trim().toLowerCase() !== "false";

  if (onlyIfEmpty) {
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
  }

  let latestBackup;
  try {
    const { findLatestBackupOnGitHub } = await import("./lib/github-sync");
    latestBackup = await findLatestBackupOnGitHub();
  } catch {
    console.error("[instrumentation] فشل البحث عن آخر نسخة احتياطية على GitHub");
    return;
  }

  if (!latestBackup) {
    console.log("[instrumentation] لا توجد نسخة احتياطية على GitHub");
    return;
  }

  const destructiveAllowed = (process.env.ALLOW_DESTRUCTIVE_RESTORE || "").trim() === "I_UNDERSTAND_THIS_OVERWRITES_POSTGRESQL";
  if (!destructiveAllowed) {
    console.log("[instrumentation] ALLOW_DESTRUCTIVE_RESTORE غير مضبوط، تخطي auto-restore");
    return;
  }

  console.log(`[instrumentation] بدء الاستعادة التلقائية من: ${latestBackup.fileName} (commit: ${latestBackup.commitSha})`);
  const { downloadAndRestoreFromGitHub } = await import("./lib/backups");
  const result = await downloadAndRestoreFromGitHub(latestBackup.fileName, {
    githubSha: latestBackup.commitSha,
    createdAt: latestBackup.createdAt,
  });

  if (result.ok) {
    console.log(`[instrumentation] تمت استعادة ${result.itemsRestored} عنصر بنجاح (${result.durationMs}ms)`);
  } else {
    console.error(`[instrumentation] فشلت الاستعادة: ${result.error}`);
  }
}
