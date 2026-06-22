import { NextRequest, NextResponse } from "next/server";
import { ADMIN_SESSION_COOKIE, verifyAdminSessionCookie } from "@/lib/admin-session";
import { findLatestBackupOnGitHubByType } from "@/lib/backups";
import type { BackupTypeV2 } from "@/lib/backups";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function isAdmin(request: NextRequest) {
  return verifyAdminSessionCookie(request.cookies.get(ADMIN_SESSION_COOKIE)?.value);
}

export async function GET(request: NextRequest) {
  if (!(await isAdmin(request))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const type = request.nextUrl.searchParams.get("type") as BackupTypeV2 | null;
  const all = request.nextUrl.searchParams.get("all") === "true";

  if (!type && !all) {
    return NextResponse.json(
      { error: "Provide ?type=database|uploads|full or ?all=true" },
      { status: 400 },
    );
  }

  try {
    if (all) {
      const types: BackupTypeV2[] = ["database", "uploads", "full"];
      const results: Record<string, unknown> = {};
      for (const t of types) {
        results[t] = await findLatestBackupOnGitHubByType(t);
      }
      return NextResponse.json({ backups: results });
    }

    if (type) {
      const latest = await findLatestBackupOnGitHubByType(type);
      return NextResponse.json({ backup: latest });
    }
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    );
  }
}
