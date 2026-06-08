import { revalidatePath } from "next/cache";
import { NextRequest, NextResponse } from "next/server";
import { ADMIN_SESSION_COOKIE, verifyAdminSessionCookie } from "@/lib/admin-session";
import { getAdminInvitations } from "@/lib/admin-data";
import { queueGitHubSync } from "@/lib/github-sync-queue";
import { getRedirectUrl } from "@/lib/utils";
import { parseLiveModeEventsText, upsertWeddingLiveMode } from "@/lib/wedding-live-mode";

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
  const enabled = formData.get("enabled") === "on";
  const announcement = String(formData.get("announcement") || "");
  const events = parseLiveModeEventsText(String(formData.get("events") || ""));
  const invitation = (await getAdminInvitations()).find((item) => item.code === invitationCode);
  if (!invitation) {
    return NextResponse.redirect(getRedirectUrl("/admin/live-mode?error=missing", request.headers, request.nextUrl.origin), 303);
  }

  const config = await upsertWeddingLiveMode({ invitationCode, enabled, announcement, events, updatedBy: "admin" });
  if (!config) {
    return NextResponse.redirect(getRedirectUrl("/admin/live-mode?error=invalid", request.headers, request.nextUrl.origin), 303);
  }

  revalidatePath("/admin/live-mode");
  revalidatePath("/admin");
  revalidatePath(`/${invitationCode}`);
  queueGitHubSync(`Wedding live mode updated: ${invitationCode}.`, { createSnapshot: true });
  return NextResponse.redirect(getRedirectUrl(`/admin/live-mode?saved=${encodeURIComponent(invitationCode)}`, request.headers, request.nextUrl.origin), 303);
}
