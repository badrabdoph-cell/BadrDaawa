import { revalidatePath } from "next/cache";
import { NextRequest, NextResponse } from "next/server";
import { CLIENT_SESSION_COOKIE, verifyClientSessionCookie } from "@/lib/client-session";
import { updateCoupleMessagesSettings } from "@/lib/guest-book";
import { getInvitationByCode } from "@/lib/invitation-data";
import { getRedirectUrl } from "@/lib/utils";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const invitationCode = String(formData.get("invitationCode") || "").trim();
  const invitation = invitationCode ? await getInvitationByCode(invitationCode).catch(() => null) : null;
  if (!invitation) {
    return NextResponse.redirect(getRedirectUrl("/manage/invitation/invalid?reason=missing", request.headers, request.nextUrl.origin), 303);
  }

  if (invitation.disabledAt) {
    return NextResponse.redirect(getRedirectUrl(`/${invitation.code}/ad_3399?saved=disabled`, request.headers, request.nextUrl.origin), 303);
  }

  const session = request.cookies.get(CLIENT_SESSION_COOKIE)?.value;
  if (!(await verifyClientSessionCookie(session, invitation.code))) {
    return NextResponse.redirect(getRedirectUrl("/manage/invitation/invalid?reason=session", request.headers, request.nextUrl.origin), 303);
  }

  const settings = await updateCoupleMessagesSettings(invitation.code, formData.get("mode"));
  if (!settings) {
    return NextResponse.redirect(getRedirectUrl(`/${invitation.code}/ad_3399?saved=messages-error`, request.headers, request.nextUrl.origin), 303);
  }

  revalidatePath(`/${invitation.code}`);
  revalidatePath(`/${invitation.code}/ad_3399`);
  if (invitation.customSlug) revalidatePath(`/${invitation.customSlug}`);
  return NextResponse.redirect(getRedirectUrl(`/${invitation.code}/ad_3399?saved=messages-settings`, request.headers, request.nextUrl.origin), 303);
}
