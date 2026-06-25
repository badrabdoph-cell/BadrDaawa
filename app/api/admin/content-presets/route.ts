import { revalidatePath } from "next/cache";
import { NextRequest, NextResponse } from "next/server";
import { ADMIN_SESSION_COOKIE, verifyAdminSessionCookie, getAdminSessionUser } from "@/lib/admin-session";
import { createContentPresetDraft, deleteContentPresetDraft, updateContentPresetDraft } from "@/lib/content-presets";
import { publishSingleContentToGitHub } from "@/lib/publish-pipeline";
import { getRedirectUrl } from "@/lib/utils";

export const runtime = "nodejs";

async function isAdmin(request: NextRequest) {
  return verifyAdminSessionCookie(request.cookies.get(ADMIN_SESSION_COOKIE)?.value);
}

function redirectPresets(request: NextRequest, params: Record<string, string>) {
  const url = getRedirectUrl("/admin/content-presets", request.headers, request.nextUrl.origin);
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);
  return NextResponse.redirect(url, 303);
}

function revalidatePresetConsumers() {
  revalidatePath("/admin/content-presets");
  revalidatePath("/admin/new-invitation");
  revalidatePath("/admin/orders");
}

async function publishPresets(request: NextRequest) {
  const username = await getAdminSessionUser(request.cookies.get(ADMIN_SESSION_COOKIE)?.value) || "admin";
  await publishSingleContentToGitHub("content-presets", username);
}

export async function POST(request: NextRequest) {
  if (!(await isAdmin(request))) {
    return NextResponse.redirect(getRedirectUrl("/admin/login", request.headers, request.nextUrl.origin), 303);
  }

  const formData = await request.formData();
  const action = String(formData.get("action") || "create");
  const id = String(formData.get("id") || "").trim();

  if (action === "delete") {
    if (!id) return redirectPresets(request, { error: "id" });
    const deleted = await deleteContentPresetDraft(id);
    if (!deleted) return redirectPresets(request, { error: "id" });
    await publishPresets(request);
    revalidatePresetConsumers();
    return redirectPresets(request, { saved: "deleted" });
  }

  const input = {
    kind: formData.get("kind"),
    title: formData.get("title"),
    content: formData.get("content"),
    secondaryContent: formData.get("secondaryContent"),
  };

  if (!String(input.title || "").trim() || !String(input.content || "").trim()) {
    return redirectPresets(request, { error: "required" });
  }

  if (action === "update") {
    if (!id) return redirectPresets(request, { error: "id" });
    const updated = await updateContentPresetDraft(id, input);
    if (!updated) return redirectPresets(request, { error: "id" });
    await publishPresets(request);
    revalidatePresetConsumers();
    return redirectPresets(request, { saved: "updated" });
  }

  const created = await createContentPresetDraft(input);
  if (!created) return redirectPresets(request, { error: "required" });
  await publishPresets(request);
  revalidatePresetConsumers();
  return redirectPresets(request, { saved: "created" });
}
