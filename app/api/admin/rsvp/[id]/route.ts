import { revalidatePath } from "next/cache";
import { NextRequest, NextResponse } from "next/server";
import { ADMIN_SESSION_COOKIE, verifyAdminSessionCookie } from "@/lib/admin-session";
import { prisma } from "@/lib/db";
import { deleteFileGuest, updateFileGuest } from "@/lib/file-store";
import { queueGitHubSync } from "@/lib/github-sync-queue";
import { rsvpSchema } from "@/lib/validation";
import { getRedirectUrl } from "@/lib/utils";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ id: string }>;
};

async function isAdmin(request: NextRequest) {
  return verifyAdminSessionCookie(request.cookies.get(ADMIN_SESSION_COOKIE)?.value);
}

function redirectAttendance(request: NextRequest, params: Record<string, string>) {
  const url = getRedirectUrl("/admin/attendance", request.headers, request.nextUrl.origin);
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);
  return NextResponse.redirect(url, 303);
}

function revalidateRsvpPages(code?: string) {
  revalidatePath("/admin/attendance");
  revalidatePath("/admin/analytics");
  if (code) {
    revalidatePath(`/${code}/ad_3399`);
    revalidatePath(`/${code}`);
  }
}

export async function POST(request: NextRequest, context: RouteContext) {
  if (!(await isAdmin(request))) {
    return NextResponse.redirect(getRedirectUrl("/admin/login", request.headers, request.nextUrl.origin), 303);
  }

  const { id } = await context.params;
  const formData = await request.formData();
  const action = String(formData.get("action") || "update");

  if (action === "delete") {
    if (prisma) {
      const existing = await prisma.guestRsvp.findUnique({ where: { id }, include: { invitation: { select: { code: true } } } }).catch(() => null);
      if (existing) {
        await prisma.guestRsvp.delete({ where: { id } });
        revalidateRsvpPages(existing.invitation.code);
        queueGitHubSync(`Admin RSVP deleted: ${existing.invitation.code}.`, { createSnapshot: true });
        return redirectAttendance(request, { saved: "deleted" });
      }
    }
    const deleted = await deleteFileGuest(id);
    if (!deleted) return redirectAttendance(request, { error: "not-found" });
    revalidateRsvpPages(deleted.invitationCode);
    queueGitHubSync(`Admin file RSVP deleted: ${deleted.invitationCode}.`, { createSnapshot: true });
    return redirectAttendance(request, { saved: "deleted" });
  }

  const parsed = rsvpSchema.safeParse({
    name: formData.get("name"),
    phone: formData.get("phone"),
    attendees: formData.get("attendees"),
    status: formData.get("status"),
    note: formData.get("note"),
  });
  if (!parsed.success) return redirectAttendance(request, { error: "invalid" });

  if (prisma) {
    const existing = await prisma.guestRsvp.findUnique({ where: { id }, include: { invitation: { select: { code: true } } } }).catch(() => null);
    if (existing) {
      await prisma.guestRsvp.update({
        where: { id },
        data: {
          name: parsed.data.name,
          phone: parsed.data.phone,
          attendees: parsed.data.attendees,
          status: parsed.data.status === "confirmed" ? "CONFIRMED" : "DECLINED",
          note: parsed.data.note || null,
        },
      });
      revalidateRsvpPages(existing.invitation.code);
      queueGitHubSync(`Admin RSVP updated: ${existing.invitation.code}.`, { createSnapshot: true });
      return redirectAttendance(request, { saved: "updated" });
    }
  }

  const updated = await updateFileGuest(id, parsed.data);
  if (!updated) return redirectAttendance(request, { error: "not-found" });
  revalidateRsvpPages(updated.invitationCode);
  queueGitHubSync(`Admin file RSVP updated: ${updated.invitationCode}.`, { createSnapshot: true });
  return redirectAttendance(request, { saved: "updated" });
}
