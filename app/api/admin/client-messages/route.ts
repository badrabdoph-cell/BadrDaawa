import { revalidatePath } from "next/cache";
import { NextRequest, NextResponse } from "next/server";
import { ADMIN_SESSION_COOKIE, verifyAdminSessionCookie } from "@/lib/admin-session";
import { createClientMessage } from "@/lib/client-messages";
import { getAdminInvitations } from "@/lib/admin-data";
import { getCustomerAdminPath } from "@/lib/slug";
import { getRedirectUrl } from "@/lib/utils";

export const runtime = "nodejs";

async function isAdmin(request: NextRequest) {
  return verifyAdminSessionCookie(request.cookies.get(ADMIN_SESSION_COOKIE)?.value);
}

export async function POST(request: NextRequest) {
  if (!(await isAdmin(request))) {
    return NextResponse.redirect(getRedirectUrl("/admin/login", request.headers, request.nextUrl.origin), 303);
  }

  const formData = await request.formData();
  const invitationCode = String(formData.get("invitationCode") || "").trim();
  const title = String(formData.get("title") || "").trim();
  const body = String(formData.get("body") || "").trim();
  const invitations = await getAdminInvitations();
  const invitation = invitations.find((item) => item.code === invitationCode);
  if (!invitation || !body) {
    return NextResponse.redirect(getRedirectUrl("/admin/messages?error=missing", request.headers, request.nextUrl.origin), 303);
  }

  const message = await createClientMessage({ invitationCode, title, body });
  if (!message) {
    return NextResponse.redirect(getRedirectUrl("/admin/messages?error=failed", request.headers, request.nextUrl.origin), 303);
  }

  revalidatePath("/admin/messages");
  revalidatePath(getCustomerAdminPath(invitationCode));

  return NextResponse.redirect(getRedirectUrl(`/admin/messages?sent=${encodeURIComponent(invitationCode)}`, request.headers, request.nextUrl.origin), 303);
}
