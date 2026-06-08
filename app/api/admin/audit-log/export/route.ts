import { NextRequest, NextResponse } from "next/server";
import { ADMIN_SESSION_COOKIE, verifyAdminSessionCookie } from "@/lib/admin-session";
import { auditLogEntriesToCsv, listAuditLogEntries } from "@/lib/audit-log";

export const runtime = "nodejs";

async function isAdmin(request: NextRequest) {
  return verifyAdminSessionCookie(request.cookies.get(ADMIN_SESSION_COOKIE)?.value);
}

export async function GET(request: NextRequest) {
  if (!(await isAdmin(request))) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const entries = await listAuditLogEntries({
    q: request.nextUrl.searchParams.get("q") || undefined,
    action: request.nextUrl.searchParams.get("action") || undefined,
    entityType: request.nextUrl.searchParams.get("entityType") || undefined,
    actor: request.nextUrl.searchParams.get("actor") || undefined,
    from: request.nextUrl.searchParams.get("from") || undefined,
    to: request.nextUrl.searchParams.get("to") || undefined,
  });

  const csv = auditLogEntriesToCsv(entries);
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="audit-log-${new Date().toISOString().slice(0, 10)}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
