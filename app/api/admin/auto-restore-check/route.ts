import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const checks: Array<{ check: string; status: "ok" | "warning" | "error"; detail: string }> = [];

  // 1. AUTO_RESTORE_FROM_GITHUB
  const autoRestoreVal = (process.env.AUTO_RESTORE_FROM_GITHUB || "").trim();
  const autoRestoreEnabled = autoRestoreVal.toLowerCase() === "true";
  checks.push({
    check: "AUTO_RESTORE_FROM_GITHUB",
    status: autoRestoreEnabled ? "ok" : autoRestoreVal ? "error" : "warning",
    detail: autoRestoreEnabled ? "مفعل ✅" : autoRestoreVal ? `القيمة "${autoRestoreVal}" غير صحيحة (يجب أن تكون true)` : "غير مضبوط (prepare-production يضبطه تلقائياً)",
  });

  // 2. ALLOW_DESTRUCTIVE_RESTORE
  const destructiveVal = (process.env.ALLOW_DESTRUCTIVE_RESTORE || "").trim();
  const destructiveOK = destructiveVal === "I_UNDERSTAND_THIS_OVERWRITES_POSTGRESQL";
  checks.push({
    check: "ALLOW_DESTRUCTIVE_RESTORE",
    status: destructiveOK ? "ok" : destructiveVal ? "error" : "warning",
    detail: destructiveOK ? "مضبوط ✅" : destructiveVal ? "قيمة غير صحيحة" : "غير مضبوط (prepare-production يضبطه تلقائياً)",
  });

  // 3. GitHub config
  const token = (process.env.GITHUB_SYNC_TOKEN || process.env.GITHUB_TOKEN || process.env.GH_TOKEN || "").trim();
  const repo = (process.env.GITHUB_SYNC_REPO || "").trim();
  checks.push({
    check: "GITHUB_SYNC_TOKEN",
    status: token ? "ok" : "error",
    detail: token ? `${token.slice(0, 8)}... موجود ✅` : "غير موجود ❌ (يجب إنشاؤه يدوياً من GitHub)",
  });
  checks.push({
    check: "GITHUB_SYNC_REPO",
    status: repo ? "ok" : "error",
    detail: repo || "غير مضبوط ❌",
  });

  // 4. DB check
  let dbEmpty = false;
  let dbConnected = false;
  if (prisma) {
    try {
      await prisma.$queryRaw`SELECT 1`;
      dbConnected = true;
      const count = await prisma.appSetting.count();
      dbEmpty = count === 0;
      checks.push({
        check: "قاعدة البيانات فارغة",
        status: dbEmpty ? "ok" : "warning",
        detail: dbEmpty ? "نعم ✅ (auto-restore سيعمل)" : `لا - يوجد ${count} AppSetting ⚠️`,
      });
    } catch (e) {
      checks.push({
        check: "قاعدة البيانات",
        status: "error",
        detail: `غير متصلة: ${e instanceof Error ? e.message : "Unknown"}`,
      });
    }
  } else {
    checks.push({
      check: "قاعدة البيانات",
      status: "error",
      detail: "Prisma غير مهيأ",
    });
  }

  // 5. Find backup on GitHub
  let backupFound = false;
  let backupInfo: Record<string, unknown> | null = null;
  try {
    const { findLatestBackupOnGitHub } = await import("@/lib/github-sync");
    const backup = await findLatestBackupOnGitHub();
    backupFound = !!backup;
    if (backup) {
      backupInfo = {
        fileName: backup.fileName,
        commitSha: backup.commitSha.slice(0, 12),
        repoPath: backup.repoPath,
        createdAt: backup.createdAt.toISOString(),
      };
    }
    checks.push({
      check: "آخر Backup على GitHub",
      status: backupFound ? "ok" : "error",
      detail: backupFound
        ? `موجود ✅: ${backup!.fileName}`
        : "لا يوجد أي Backup على GitHub ❌ (لم يعمل النسخ الاحتياطي من قبل)",
    });
  } catch (e) {
    checks.push({
      check: "آخر Backup على GitHub",
      status: "error",
      detail: `فشل البحث: ${e instanceof Error ? e.message : "Unknown"}`,
    });
  }

  // 6. Determine if auto-restore will work
  const canAutoRestore = autoRestoreEnabled && destructiveOK && dbConnected && dbEmpty && backupFound;

  const overall = canAutoRestore ? "ok" : autoRestoreEnabled ? "warning" : "error";

  return NextResponse.json({
    overall,
    canAutoRestore,
    checks,
    backupInfo,
    env: {
      GITHUB_SYNC_REPO: repo || "غير مضبوط",
      NODE_ENV: process.env.NODE_ENV || "غير مضبوط",
    },
    recommendation: canAutoRestore
      ? "كل شيء جاهز. auto-restore سيعمل تلقائياً عند إعادة التشغيل."
      : !autoRestoreEnabled
        ? "اضبط AUTO_RESTORE_FROM_GITHUB=true في Railway Variables."
        : !destructiveOK
          ? "اضبط ALLOW_DESTRUCTIVE_RESTORE=I_UNDERSTAND_THIS_OVERWRITES_POSTGRESQL"
          : !token
            ? "أنشئ GitHub Token وأضفه كـ GITHUB_SYNC_TOKEN في Railway Variables."
            : !backupFound
              ? "لا يوجد Backup على GitHub. شغّل النسخ الاحتياطي من لوحة التحكم (admin/backups) أولاً."
              : !dbEmpty
                ? "قاعدة البيانات ليست فارغة. auto-restore يتخطى لأن AUTO_RESTORE_ONLY_IF_DB_EMPTY=true"
                : "تحقق من Railway Logs لمعرفة الخطأ.",
  });
}
