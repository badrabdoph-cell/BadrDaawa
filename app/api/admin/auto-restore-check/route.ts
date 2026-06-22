import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const checks: Array<{ check: string; status: "ok" | "warning" | "error"; detail: string }> = [];

  checks.push({
    check: "AUTO_RESTORE_FROM_GITHUB",
    status: "warning",
    detail: "معطل — الاستعادة يدوية فقط من لوحة التحكم",
  });

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

  if (prisma) {
    try {
      await prisma.$queryRaw`SELECT 1`;
      checks.push({
        check: "قاعدة البيانات",
        status: "ok",
        detail: "متصلة ✅",
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
        : "لا يوجد أي Backup على GitHub ❌",
    });
  } catch (e) {
    checks.push({
      check: "آخر Backup على GitHub",
      status: "error",
      detail: `فشل البحث: ${e instanceof Error ? e.message : "Unknown"}`,
    });
  }

  return NextResponse.json({
    overall: "warning",
    canAutoRestore: false,
    checks,
    backupInfo,
    recommendation: "الاستعادة التلقائية معطلة. استخدم لوحة التحكم (admin/backups) للاستعادة اليدوية.",
  });
}
