import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";
import { runScheduledTask } from "@/lib/task-scheduler";

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

  const run = await runScheduledTask("backup", "automatic");
  console.log(
    `[Backup Cron ${now()}] Completed status=${run.status} durationMs=${Date.now() - startedAt} message=${JSON.stringify(run.message)} metadata=${JSON.stringify(run.metadata || {})}`,
  );
  return NextResponse.json({ ok: run.status === "success", run }, { status: run.status === "success" ? 200 : 500 });
}

export async function GET(request: NextRequest) {
  return handleCronBackup(request);
}

export async function POST(request: NextRequest) {
  return handleCronBackup(request);
}
