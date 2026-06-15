import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { CLIENT_SESSION_COOKIE, verifyClientSessionCookie } from "@/lib/client-session";
import { getGuestBookMessage, moderateGuestBookMessage } from "@/lib/guest-book";
import { getInvitationByCode } from "@/lib/invitation-data";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const messageId = String(body.messageId || "").trim();
  const action = String(body.action || "").trim();

  if (!messageId || (action !== "approve" && action !== "reject")) {
    return NextResponse.json({ error: "invalid" }, { status: 400 });
  }

  const message = await getGuestBookMessage(messageId);
  if (!message) {
    return NextResponse.json({ error: "not-found" }, { status: 404 });
  }

  const invitation = await getInvitationByCode(message.invitationCode).catch(() => null);
  if (!invitation) {
    return NextResponse.json({ error: "invitation-not-found" }, { status: 404 });
  }

  const session = request.cookies.get(CLIENT_SESSION_COOKIE)?.value;
  if (!(await verifyClientSessionCookie(session, invitation.code))) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const result = await moderateGuestBookMessage(messageId, action);
  if (!result?.message) {
    return NextResponse.json({ error: "moderate-failed" }, { status: 500 });
  }

  revalidatePath(`/${invitation.code}`);
  revalidatePath(`/${invitation.code}/ad_3399`);
  if (invitation.customSlug) revalidatePath(`/${invitation.customSlug}`);

  return NextResponse.json({ success: true, status: result.message.status });
}
