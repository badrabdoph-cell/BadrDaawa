import { revalidatePath } from "next/cache";
import { NextRequest, NextResponse } from "next/server";
import { ADMIN_SESSION_COOKIE, verifyAdminSessionCookie } from "@/lib/admin-session";
import { moderateGuestBookMessage, updateCoupleMessagesSettings, updateGuestBookMessage, type CoupleMessagesAdminAction } from "@/lib/guest-book";
import { queueGitHubSync } from "@/lib/github-sync-queue";
import { getInvitationByCode } from "@/lib/invitation-data";
import { getRedirectUrl } from "@/lib/utils";

export const runtime = "nodejs";

async function isAdmin(request: NextRequest) {
  return verifyAdminSessionCookie(request.cookies.get(ADMIN_SESSION_COOKIE)?.value);
}

function isCoupleMessagesAction(value: string): value is CoupleMessagesAdminAction {
  return value === "approve" || value === "reject" || value === "delete" || value === "edit" || value === "settings";
}

export async function POST(request: NextRequest) {
  if (!(await isAdmin(request))) {
    return NextResponse.redirect(getRedirectUrl("/admin/login", request.headers, request.nextUrl.origin), 303);
  }

  const formData = await request.formData();
  const messageId = String(formData.get("messageId") || "").trim();
  const action = String(formData.get("action") || "").trim();
  if (!isCoupleMessagesAction(action)) {
    return NextResponse.redirect(getRedirectUrl("/admin/guest-book?error=invalid", request.headers, request.nextUrl.origin), 303);
  }

  if (action === "settings") {
    const invitationCode = String(formData.get("invitationCode") || "").trim();
    const settings = await updateCoupleMessagesSettings(invitationCode, formData.get("mode"));
    if (!settings) {
      return NextResponse.redirect(getRedirectUrl("/admin/guest-book?error=invalid", request.headers, request.nextUrl.origin), 303);
    }
    revalidatePath("/admin/guest-book");
    revalidatePath(`/${settings.invitationCode}`);
    revalidatePath(`/${settings.invitationCode}/ad_3399`);
    const invitation = await getInvitationByCode(settings.invitationCode).catch(() => null);
    if (invitation?.customSlug) revalidatePath(`/${invitation.customSlug}`);
    queueGitHubSync(`Couple messages settings updated: ${settings.invitationCode}.`, { createSnapshot: true });
    return NextResponse.redirect(getRedirectUrl(`/admin/guest-book?saved=settings&invitation=${encodeURIComponent(settings.invitationCode)}`, request.headers, request.nextUrl.origin), 303);
  }

  if (!messageId) {
    return NextResponse.redirect(getRedirectUrl("/admin/guest-book?error=invalid", request.headers, request.nextUrl.origin), 303);
  }

  if (action === "edit") {
    const updated = await updateGuestBookMessage(messageId, {
      name: formData.get("name"),
      message: formData.get("message"),
      status: formData.get("status"),
    });
    if (!updated) {
      return NextResponse.redirect(getRedirectUrl("/admin/guest-book?error=not-found", request.headers, request.nextUrl.origin), 303);
    }
    revalidatePath("/admin/guest-book");
    revalidatePath("/admin");
    revalidatePath(`/${updated.invitationCode}`);
    revalidatePath(`/${updated.invitationCode}/ad_3399`);
    const invitation = await getInvitationByCode(updated.invitationCode).catch(() => null);
    if (invitation?.customSlug) revalidatePath(`/${invitation.customSlug}`);
    queueGitHubSync(`Couple message edited: ${updated.invitationCode}.`, { createSnapshot: true });
    return NextResponse.redirect(getRedirectUrl("/admin/guest-book?saved=edit", request.headers, request.nextUrl.origin), 303);
  }

  const result = await moderateGuestBookMessage(messageId, action);
  if (!result) {
    return NextResponse.redirect(getRedirectUrl("/admin/guest-book?error=not-found", request.headers, request.nextUrl.origin), 303);
  }

  revalidatePath("/admin/guest-book");
  revalidatePath("/admin");
  revalidatePath(`/${result.message.invitationCode}`);
  revalidatePath(`/${result.message.invitationCode}/ad_3399`);
  const invitation = await getInvitationByCode(result.message.invitationCode).catch(() => null);
  if (invitation?.customSlug) revalidatePath(`/${invitation.customSlug}`);
  queueGitHubSync(`Couple message ${action}: ${result.message.invitationCode}.`, { createSnapshot: true });

  return NextResponse.redirect(getRedirectUrl(`/admin/guest-book?saved=${action}`, request.headers, request.nextUrl.origin), 303);
}
