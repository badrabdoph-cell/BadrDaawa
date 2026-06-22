import { prisma } from "./db";
import { downloadAndRestoreFromGitHub } from "./backups";

type AutoRestoreResult = {
  executed: boolean;
  restored: boolean;
  reason: string;
  fileName?: string;
  itemsRestored?: number;
  durationMs?: number;
  error?: string;
};

function env(key: string) {
  return process.env[key]?.trim() || "";
}

export async function checkAndAutoRestore(): Promise<AutoRestoreResult> {
  const autoRestoreEnabled = env("AUTO_RESTORE_FROM_GITHUB").toLowerCase() === "true";
  if (!autoRestoreEnabled) {
    return { executed: false, restored: false, reason: "AUTO_RESTORE_FROM_GITHUB غير مفعّل" };
  }

  if (!prisma) {
    return { executed: false, restored: false, reason: "قاعدة البيانات غير متصلة" };
  }

  const onlyIfEmpty = env("AUTO_RESTORE_ONLY_IF_DB_EMPTY").toLowerCase() !== "false";

  if (onlyIfEmpty) {
    try {
      const keysCount = await prisma.appSetting.count();
      if (keysCount > 0) {
        return { executed: false, restored: false, reason: `قاعدة البيانات غير فارغة (${keysCount} مفتاح)، تخطي auto-restore` };
      }
    } catch (error) {
      return { executed: false, restored: false, reason: `فشل التحقق من قاعدة البيانات: ${error instanceof Error ? error.message : String(error)}` };
    }
  }

  let latestBackup;
  try {
    latestBackup = await prisma.backupJob.findFirst({
      where: { status: "SUCCESS", fileName: { not: null }, githubSha: { not: null } },
      orderBy: { createdAt: "desc" },
    });
  } catch (error) {
    return { executed: false, restored: false, reason: `فشل البحث عن آخر نسخة احتياطية: ${error instanceof Error ? error.message : String(error)}` };
  }

  if (!latestBackup?.fileName || !latestBackup.githubSha) {
    return { executed: false, restored: false, reason: "لا توجد نسخة احتياطية ناجحة على GitHub" };
  }

  const destructiveAllowed = env("ALLOW_DESTRUCTIVE_RESTORE") === "I_UNDERSTAND_THIS_OVERWRITES_POSTGRESQL";
  if (!destructiveAllowed) {
    return { executed: false, restored: false, reason: "ALLOW_DESTRUCTIVE_RESTORE غير مضبوط" };
  }

  console.log(`[Auto Restore] بدء الاستعادة التلقائية من: ${latestBackup.fileName}`);
  const result = await downloadAndRestoreFromGitHub(latestBackup.fileName);

  if (result.ok) {
    console.log(`[Auto Restore] تمت استعادة ${result.itemsRestored} عنصر بنجاح (${result.durationMs}ms)`);
    return {
      executed: true,
      restored: true,
      reason: "تمت استعادة الموقع تلقائياً من GitHub",
      fileName: latestBackup.fileName,
      itemsRestored: result.itemsRestored ?? undefined,
      durationMs: result.durationMs ?? undefined,
    };
  }

  console.error(`[Auto Restore] فشلت الاستعادة: ${result.error}`);
  return {
    executed: true,
    restored: false,
    reason: "فشلت الاستعادة التلقائية",
    fileName: latestBackup.fileName,
    error: result.error ?? undefined,
  };
}
