import { revalidatePath } from "next/cache";
import { NextRequest, NextResponse } from "next/server";
import { ADMIN_SESSION_COOKIE, verifyAdminSessionCookie } from "@/lib/admin-session";
import { getAdminNotifications, getAdminNotificationSnapshot, updateAdminNotificationState, type AdminNotificationAction } from "@/lib/admin-notifications";

export const dynamic = "force-dynamic";

async function isAdmin(request: NextRequest) {
  return verifyAdminSessionCookie(request.cookies.get(ADMIN_SESSION_COOKIE)?.value);
}

function isAction(value: unknown): value is AdminNotificationAction {
  return value === "read" || value === "hide" || value === "complete" || value === "read-all";
}

export async function GET(request: NextRequest) {
  if (!(await isAdmin(request))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const includeHidden = request.nextUrl.searchParams.get("includeHidden") === "1";
  const summaryOnly = request.nextUrl.searchParams.get("summary") === "1";
  return NextResponse.json(summaryOnly ? await getAdminNotificationSnapshot({ includeHidden }) : await getAdminNotifications({ includeHidden }));
}

export async function POST(request: NextRequest) {
  if (!(await isAdmin(request))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as { id?: string; action?: unknown } | null;
  if (!body || !isAction(body.action)) {
    return NextResponse.json({ error: "Invalid notification action" }, { status: 400 });
  }

  if (body.action !== "read-all" && !body.id) {
    return NextResponse.json({ error: "Missing notification id" }, { status: 400 });
  }

  const result = await updateAdminNotificationState(body.action, body.id);
  revalidatePath("/admin/notifications");
  return NextResponse.json(result);
}
