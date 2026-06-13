import { NextRequest, NextResponse } from "next/server";
import { runScheduledTask } from "@/lib/task-scheduler";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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
  const headerSecret = request.headers.get("x-cron-secret")?.trim() || "";
  const querySecret = request.nextUrl.searchParams.get("secret")?.trim() || "";
  return bearer === secret || headerSecret === secret || querySecret === secret;
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
