import { revalidatePath } from "next/cache";
import { NextRequest, NextResponse } from "next/server";
import { ADMIN_SESSION_COOKIE, verifyAdminSessionCookie } from "@/lib/admin-session";
import { getTaskExecutionLog, listScheduledTasks, runScheduledTask } from "@/lib/task-scheduler";
import { getRedirectUrl } from "@/lib/utils";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function isAdmin(request: NextRequest) {
  return verifyAdminSessionCookie(request.cookies.get(ADMIN_SESSION_COOKIE)?.value);
}

function wantsJson(request: NextRequest) {
  return request.headers.get("accept")?.includes("application/json");
}

function getReturnPath(value: string) {
  return value === "/admin/sync-settings" ? value : "/admin/tasks";
}

function redirectToTasks(request: NextRequest, params: Record<string, string>, returnTo = "/admin/tasks") {
  const url = getRedirectUrl(getReturnPath(returnTo), request.headers, request.nextUrl.origin);
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);
  return NextResponse.redirect(url, 303);
}

export async function GET(request: NextRequest) {
  if (!(await isAdmin(request))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [tasks, runs] = await Promise.all([listScheduledTasks(), getTaskExecutionLog(50)]);
  return NextResponse.json({ tasks, runs });
}

export async function POST(request: NextRequest) {
  if (!(await isAdmin(request))) {
    return wantsJson(request) ? NextResponse.json({ error: "Unauthorized" }, { status: 401 }) : NextResponse.redirect(getRedirectUrl("/admin/login", request.headers, request.nextUrl.origin), 303);
  }

  const contentType = request.headers.get("content-type") || "";
  const body = contentType.includes("application/json")
    ? ((await request.json().catch(() => null)) as { action?: string; taskId?: string; returnTo?: string } | null)
    : null;
  const form = body ? null : await request.formData();
  const action = body?.action || String(form?.get("action") || "");
  const taskId = body?.taskId || String(form?.get("taskId") || "");
  const returnTo = body?.returnTo || String(form?.get("returnTo") || "/admin/tasks");

  try {
    if (action === "run") {
      const run = await runScheduledTask(taskId, "manual");
      revalidatePath(getReturnPath(returnTo));
      return wantsJson(request) ? NextResponse.json({ run }) : redirectToTasks(request, { task: taskId, result: run.status }, returnTo);
    }

    return wantsJson(request) ? NextResponse.json({ error: "Invalid action" }, { status: 400 }) : redirectToTasks(request, { error: "invalid-action" }, returnTo);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error || "Unknown error");
    return wantsJson(request) ? NextResponse.json({ error: message }, { status: 400 }) : redirectToTasks(request, { task: taskId || "unknown", error: encodeURIComponent(message) }, returnTo);
  }
}
