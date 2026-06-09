import { revalidatePath } from "next/cache";
import { NextRequest, NextResponse } from "next/server";
import { ADMIN_SESSION_COOKIE, verifyAdminSessionCookie } from "@/lib/admin-session";
import { moderateGuestBookMessage, type GuestBookAction } from "@/lib/guest-book";
import { queueGitHubSync } from "@/lib/github-sync-queue";
import { getInvitationByCode } from "@/lib/invitation-data";
import { getRedirectUrl } from "@/lib/utils";

export const runtime = "nodejs";

async function isAdmin(request: NextRequest) {
  return verifyAdminSessionCookie(request.cookies.get(ADMIN_SESSION_COOKIE)?.value);
}

function isGuestBookAction(value: string): value is GuestBookAction {
  return value === "approve" || value === "reject" || value === "delete";
}

export async function POST(request: NextRequest) {
  if (!(await isAdmin(request))) {
    return NextResponse.redirect(getRedirectUrl("/admin/login", request.headers, request.nextUrl.origin), 303);
  }

  const formData = await request.formData();
  const messageId = String(formData.get("messageId") || "").trim();
  const action = String(formData.get("action") || "").trim();
  if (!messageId || !isGuestBookAction(action)) {
    return NextResponse.redirect(getRedirectUrl("/admin/guest-book?error=invalid", request.headers, request.nextUrl.origin), 303);
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
  queueGitHubSync(`Guest book message ${action}: ${result.message.invitationCode}.`, { createSnapshot: true });

  return NextResponse.redirect(getRedirectUrl(`/admin/guest-book?saved=${action}`, request.headers, request.nextUrl.origin), 303);
}
