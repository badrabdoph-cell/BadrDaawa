import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSyncConfig, findLatestBackupOnGitHub } from "@/lib/github-sync";
import { findLatestBackupOnGitHubByType, getV2BackupSchedule, getLastV2BackupTime } from "@/lib/backups";
import { getGitHubContentReadiness } from "@/lib/github-content";
import type { BackupTypeV2 } from "@/lib/backups";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const checks: Array<{ name: string; ok: boolean; detail: string }> = [];

  const dbOk = !!prisma;
  checks.push({ name: "database", ok: dbOk, detail: dbOk ? "متصل" : "غير متصل" });

  const syncConfig = getSyncConfig();
  const githubOk = !!syncConfig?.token;
  checks.push({ name: "github_token", ok: githubOk, detail: githubOk ? `موجود (${syncConfig?.repo?.owner}/${syncConfig?.repo?.repo})` : "غير مضبوط" });

  if (syncConfig?.token) {
    try {
      const latestV1 = await findLatestBackupOnGitHub();
      checks.push({
        name: "latest_backup_v1",
        ok: !!latestV1?.fileName,
        detail: latestV1?.fileName ? `موجود (${latestV1.fileName})` : "لا توجد نسخة v1 على GitHub",
      });
    } catch (e) {
      checks.push({ name: "latest_backup_v1", ok: false, detail: `خطأ: ${e instanceof Error ? e.message : "غير معروف"}` });
    }
  }

  const types: BackupTypeV2[] = ["database", "uploads", "full"];
  for (const type of types) {
    try {
      const [latest, schedule, lastTime] = await Promise.all([
        findLatestBackupOnGitHubByType(type),
        getV2BackupSchedule(type),
        getLastV2BackupTime(type),
      ]);
      const scheduleLabel = schedule.intervalMs === 0 ? "غير مجدول" : `كل ${Math.round(schedule.intervalMs / (60 * 60 * 1000))} ساعة`;
      checks.push({
        name: `v2_${type}`,
        ok: !!latest,
        detail: latest
          ? `موجود (${latest.fileName}) — ${scheduleLabel} — ${lastTime ? `آخر: ${lastTime.toISOString()}` : "لم يتم بعد"}`
          : `لا توجد نسخة — ${scheduleLabel}`,
      });
    } catch (e) {
      checks.push({ name: `v2_${type}`, ok: false, detail: `خطأ في الفحص: ${e instanceof Error ? e.message : "غير معروف"}` });
    }
  }

  try {
    const backupJobsCount = await prisma?.backupJob?.count();
    checks.push({ name: "backup_jobs", ok: backupJobsCount !== undefined, detail: `${backupJobsCount ?? 0} وظيفة مسجلة` });
  } catch {
    checks.push({ name: "backup_jobs", ok: false, detail: "فشل الوصول" });
  }

  try {
    const restoreLogsCount = await prisma?.restoreLog?.count();
    checks.push({ name: "restore_logs", ok: restoreLogsCount !== undefined, detail: `${restoreLogsCount ?? 0} سجل استعادة` });
  } catch {
    checks.push({ name: "restore_logs", ok: false, detail: "فشل الوصول" });
  }

  const allOk = checks.every((c) => c.ok);

  return NextResponse.json({
    ok: allOk,
    status: allOk ? "healthy" : "degraded",
    checks,
    timestamp: new Date().toISOString(),
  }, { status: allOk ? 200 : 200 });
}
