import { revalidatePath } from "next/cache";
import { NextRequest, NextResponse } from "next/server";
import { ADMIN_SESSION_COOKIE, verifyAdminSessionCookie } from "@/lib/admin-session";
import { createMessageTemplate, deleteMessageTemplate, updateMessageTemplate } from "@/lib/message-templates";
import { queueGitHubSync } from "@/lib/github-sync-queue";
import { getRedirectUrl } from "@/lib/utils";

export const runtime = "nodejs";

async function isAdmin(request: NextRequest) {
  return verifyAdminSessionCookie(request.cookies.get(ADMIN_SESSION_COOKIE)?.value);
}

function redirectTemplates(request: NextRequest, params: Record<string, string>) {
  const url = getRedirectUrl("/admin/message-templates", request.headers, request.nextUrl.origin);
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);
  return NextResponse.redirect(url, 303);
}

function revalidateConsumers() {
  revalidatePath("/admin/message-templates");
  revalidatePath("/admin/messages");
  revalidatePath("/client");
}

export async function POST(request: NextRequest) {
  if (!(await isAdmin(request))) {
    return NextResponse.redirect(getRedirectUrl("/admin/login", request.headers, request.nextUrl.origin), 303);
  }

  const formData = await request.formData();
  const action = String(formData.get("action") || "create");
  const id = String(formData.get("id") || "").trim();

  if (action === "delete") {
    if (!id) return redirectTemplates(request, { error: "id" });
    const deleted = await deleteMessageTemplate(id);
    if (!deleted) return redirectTemplates(request, { error: "id" });
    revalidateConsumers();
    queueGitHubSync(`Message template deleted: ${id}.`, { uploadProjectFiles: true, changeType: "project" });
    return redirectTemplates(request, { saved: "deleted" });
  }

  const input = {
    kind: formData.get("kind"),
    title: formData.get("title"),
    content: formData.get("content"),
  };

  if (!String(input.title || "").trim() || !String(input.content || "").trim()) {
    return redirectTemplates(request, { error: "required" });
  }

  if (action === "update") {
    if (!id) return redirectTemplates(request, { error: "id" });
    const updated = await updateMessageTemplate(id, input);
    if (!updated) return redirectTemplates(request, { error: "id" });
    revalidateConsumers();
    queueGitHubSync(`Message template updated: ${updated.id}.`, { uploadProjectFiles: true, changeType: "project" });
    return redirectTemplates(request, { saved: "updated" });
  }

  const created = await createMessageTemplate(input);
  if (!created) return redirectTemplates(request, { error: "required" });
  revalidateConsumers();
  queueGitHubSync(`Message template created: ${created.id}.`, { uploadProjectFiles: true, changeType: "project" });
  return redirectTemplates(request, { saved: "created" });
}
