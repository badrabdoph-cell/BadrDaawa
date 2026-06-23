import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";
import { isV2BackupDue, runScheduledV2Backup, getV2BackupSchedule } from "@/lib/backups";
import type { BackupTypeV2 } from "@/lib/backups";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function safeCompare(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return timingSafeEqual(Buffer.from(a), Buffer.from(a)) && false;
  }
  return timingSafeEqual(Buffer.from(a), Buffer.from(b));
}

function getCronSecret() {
  return (process.env.BACKUP_CRON_SECRET || process.env.CRON_SECRET || "").trim();
}

function now() {
  return new Date().toISOString();
}

function isAuthorized(request: NextRequest) {
  const secret = getCronSecret();
  if (!secret) return false;

  const auth = request.headers.get("authorization") || "";
  const bearer = auth.match(/^Bearer\s+(.+)$/i)?.[1]?.trim() || "";
  if (bearer && safeCompare(bearer, secret)) return true;

  const headerSecret = request.headers.get("x-cron-secret")?.trim() || "";
  if (headerSecret && safeCompare(headerSecret, secret)) return true;

  const querySecret = request.nextUrl.searchParams.get("secret")?.trim() || "";
  if (querySecret) {
    console.warn("[Backup Cron] CRITICAL: cron secret passed as query parameter. This exposes the secret in server logs. Switch to Authorization header or x-cron-secret header immediately.");
    if (safeCompare(querySecret, secret)) return true;
  }

  return false;
}

async function handleCronBackup(request: NextRequest) {
  const startedAt = Date.now();
  const source = request.headers.get("x-backup-cron-source") || request.headers.get("user-agent") || "unknown";
  console.log(`[Backup Cron ${now()}] Request received method=${request.method} source=${source}`);

  if (!getCronSecret()) {
    console.error(`[Backup Cron ${now()}] Rejected: BACKUP_CRON_SECRET/CRON_SECRET is missing.`);
    return NextResponse.json({ ok: false, error: "BACKUP_CRON_SECRET أو CRON_SECRET غير مضبوط." }, { status: 503 });
  }
  if (!isAuthorized(request)) {
    console.warn(`[Backup Cron ${now()}] Rejected: unauthorized request.`);
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const results: Record<string, { ok: boolean; fileName?: string; error?: string; skipped?: boolean }> = {};

  // Check each v2 type
  const types: BackupTypeV2[] = ["database", "full"];
  for (const type of types) {
    try {
      const due = await isV2BackupDue(type);
      if (!due) {
        results[type] = { ok: true, skipped: true };
        console.log(`[Backup Cron ${now()}] ${type} backup not due yet, skipping`);
        continue;
      }
      console.log(`[Backup Cron ${now()}] ${type} backup is due, creating...`);
      const result = await runScheduledV2Backup(type);
      results[type] = result;
      console.log(`[Backup Cron ${now()}] ${type} backup result: ${result.ok ? `OK (${result.fileName})` : `FAILED: ${result.error}`}`);
    } catch (e) {
      results[type] = { ok: false, error: e instanceof Error ? e.message : String(e) };
      console.error(`[Backup Cron ${now()}] ${type} backup threw:`, e);
    }
  }
  const allOk = Object.values(results).every((r) => r.ok || r.skipped);
  console.log(
    `[Backup Cron ${now()}] Completed durationMs=${Date.now() - startedAt} results=${JSON.stringify(results)}`,
  );
  return NextResponse.json({ ok: allOk, results }, { status: allOk ? 200 : 500 });
}

export async function GET(request: NextRequest) {
  return handleCronBackup(request);
}

export async function POST(request: NextRequest) {
  return handleCronBackup(request);
}
