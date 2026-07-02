import { revalidatePath } from "next/cache";
import { NextRequest, NextResponse } from "next/server";
import { ADMIN_SESSION_COOKIE, getAdminSessionUser, verifyAdminSessionCookie } from "@/lib/admin-session";
import { createInternalNote, deleteInternalNote, updateInternalNote } from "@/lib/internal-notes";
import { getRedirectUrl } from "@/lib/utils";

export const runtime = "nodejs";

async function isAdmin(request: NextRequest) {
  return verifyAdminSessionCookie(request.cookies.get(ADMIN_SESSION_COOKIE)?.value);
}

function safeReturnTo(value: FormDataEntryValue | null) {
  const path = String(value || "").trim();
  if (!path.startsWith("/") || path.startsWith("//")) return "/admin";
  return path;
}

function redirectNotes(request: NextRequest, returnTo: string, params: Record<string, string>) {
  const url = getRedirectUrl(returnTo, request.headers, request.nextUrl.origin);
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);
  return NextResponse.redirect(url, 303);
}

function revalidateAdminNotes() {
  revalidatePath("/admin/invitations");
  revalidatePath("/admin/orders");
  revalidatePath("/admin/customers");
}

export async function POST(request: NextRequest) {
  if (!(await isAdmin(request))) {
    return NextResponse.redirect(getRedirectUrl("/admin/login", request.headers, request.nextUrl.origin), 303);
  }

  const formData = await request.formData();
  const action = String(formData.get("action") || "create");
  const id = String(formData.get("id") || "").trim();
  const returnTo = safeReturnTo(formData.get("returnTo"));
  const username = await getAdminSessionUser(request.cookies.get(ADMIN_SESSION_COOKIE)?.value);
  const authorLabel = username || "Admin";

  if (action === "delete") {
    if (!id) return redirectNotes(request, returnTo, { noteStatus: "missing" });
    const deleted = await deleteInternalNote(id);
    if (!deleted) return redirectNotes(request, returnTo, { noteStatus: "missing" });
    revalidateAdminNotes();
    revalidatePath(returnTo);
    return redirectNotes(request, returnTo, { noteStatus: "deleted" });
  }

  if (action === "update") {
    if (!id) return redirectNotes(request, returnTo, { noteStatus: "missing" });
    const updated = await updateInternalNote(id, { body: formData.get("body") });
    if (!updated) return redirectNotes(request, returnTo, { noteStatus: "invalid" });
    revalidateAdminNotes();
    revalidatePath(returnTo);
    return redirectNotes(request, returnTo, { noteStatus: "updated" });
  }

  const created = await createInternalNote({
    entityType: formData.get("entityType"),
    entityId: formData.get("entityId"),
    body: formData.get("body"),
    authorLabel,
  });
  if (!created) return redirectNotes(request, returnTo, { noteStatus: "invalid" });
  revalidateAdminNotes();
  revalidatePath(returnTo);
  return redirectNotes(request, returnTo, { noteStatus: "created" });
}
