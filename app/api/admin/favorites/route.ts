import { revalidatePath } from "next/cache";
import { NextRequest, NextResponse } from "next/server";
import { ADMIN_SESSION_COOKIE, verifyAdminSessionCookie } from "@/lib/admin-session";
import { removeAdminFavorite, toggleAdminFavorite } from "@/lib/admin-favorites";
import { getRedirectUrl } from "@/lib/utils";

export const runtime = "nodejs";

async function isAdmin(request: NextRequest) {
  return verifyAdminSessionCookie(request.cookies.get(ADMIN_SESSION_COOKIE)?.value);
}

function safeReturnTo(value: FormDataEntryValue | null) {
  const path = String(value || "").trim();
  if (!path.startsWith("/") || path.startsWith("//")) return "/admin/favorites";
  return path;
}

function redirectFavorites(request: NextRequest, returnTo: string, status: string) {
  const url = getRedirectUrl(returnTo, request.headers, request.nextUrl.origin);
  url.searchParams.set("favoriteStatus", status);
  return NextResponse.redirect(url, 303);
}

function revalidateFavorites() {
  revalidatePath("/admin/favorites");
  revalidatePath("/admin/invitations");
  revalidatePath("/admin/orders");
  revalidatePath("/admin/customers");
}

export async function POST(request: NextRequest) {
  if (!(await isAdmin(request))) {
    return NextResponse.redirect(getRedirectUrl("/admin/login", request.headers, request.nextUrl.origin), 303);
  }

  const formData = await request.formData();
  const action = String(formData.get("action") || "toggle");
  const returnTo = safeReturnTo(formData.get("returnTo"));
  const entityType = formData.get("entityType");
  const entityId = formData.get("entityId");

  if (action === "remove") {
    const removed = await removeAdminFavorite(entityType, entityId);
    if (!removed) return redirectFavorites(request, returnTo, "missing");
    revalidateFavorites();
    return redirectFavorites(request, returnTo, "removed");
  }

  const result = await toggleAdminFavorite({
    entityType,
    entityId,
    label: formData.get("label"),
    href: formData.get("href"),
  });
  if (!result) return redirectFavorites(request, returnTo, "invalid");
  revalidateFavorites();
  return redirectFavorites(request, returnTo, result.favorited ? "added" : "removed");
}
