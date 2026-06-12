import { NextRequest, NextResponse } from "next/server";
import { runScheduledTask } from "@/lib/task-scheduler";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function getCronSecret() {
  return (process.env.BACKUP_CRON_SECRET || process.env.CRON_SECRET || "").trim();
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
  if (!getCronSecret()) {
    return NextResponse.json({ ok: false, error: "BACKUP_CRON_SECRET أو CRON_SECRET غير مضبوط." }, { status: 503 });
  }
  if (!isAuthorized(request)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const run = await runScheduledTask("backup", "automatic");
  return NextResponse.json({ ok: run.status === "success", run }, { status: run.status === "success" ? 200 : 500 });
}

export async function GET(request: NextRequest) {
  return handleCronBackup(request);
}

export async function POST(request: NextRequest) {
  return handleCronBackup(request);
}
