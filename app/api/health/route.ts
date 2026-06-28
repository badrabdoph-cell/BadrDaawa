import { NextResponse } from "next/server";
import { getSyncConfig } from "@/lib/github-sync";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const issues: string[] = [];

  if (!prisma) {
    issues.push("database_unavailable");
  } else {
    try {
      await prisma.$queryRaw`SELECT 1`;
    } catch {
      issues.push("database_unreachable");
    }
  }

  const syncConfig = getSyncConfig();
  if (!syncConfig?.token) {
    issues.push("github_sync_token_missing");
  }

  const autoRestoreEnabled = (process.env.AUTO_RESTORE_FROM_GITHUB || "").toLowerCase() === "true";

  return NextResponse.json({
    status: issues.length === 0 ? "ok" : "degraded",
    issues: issues.length > 0 ? issues : undefined,
    backup: {
      github: !!syncConfig?.token,
      autoRestore: autoRestoreEnabled,
      cronSecret: !!((process.env.BACKUP_CRON_SECRET || process.env.CRON_SECRET || "").trim()),
    },
    timestamp: new Date().toISOString(),
  });
}
