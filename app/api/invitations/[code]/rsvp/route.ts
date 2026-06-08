import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { addFileGuest, getFileInvitationByCode } from "@/lib/file-store";
import { queueGitHubSync } from "@/lib/github-sync-queue";
import { getInvitationByCode as getDemoInvitationByCode } from "@/lib/demo-data";
import { rsvpSchema } from "@/lib/validation";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ code: string }>;
};

async function saveFileRsvp(code: string, data: {
  name: string;
  phone: string;
  attendees: number;
  status: "confirmed" | "declined";
  note?: string;
}) {
  const fileInvitation = await getFileInvitationByCode(code);
  const demoInvitation = fileInvitation ? undefined : getDemoInvitationByCode(code);
  const invitation = fileInvitation || demoInvitation;

  if (!invitation) {
    return NextResponse.json({ error: "الدعوة غير موجودة" }, { status: 404 });
  }

  if (!invitation.isActive) {
    return NextResponse.json({ error: "الدعوة غير متاحة حاليًا" }, { status: 404 });
  }

  if (fileInvitation) {
    const saved = await addFileGuest(code, data);
    if (saved) queueGitHubSync(`RSVP saved for invitation: ${code}.`, { createSnapshot: true });
  }

  revalidatePath(`/${code}/ad_3399`);
  revalidatePath("/admin/analytics");
  return NextResponse.json({ ok: true });
}

export async function POST(request: Request, context: RouteContext) {
  const { code } = await context.params;
  const body = await request.json().catch(() => null);
  const parsed = rsvpSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "راجع بيانات الحضور وحاول مرة تانية", details: parsed.error.flatten() }, { status: 400 });
  }

  if (prisma) {
    try {
      const invitation = await prisma.invitation.findFirst({ where: { code, deletedAt: null } });
      if (!invitation) {
        return saveFileRsvp(code, parsed.data);
      }
      if (invitation.status !== "ACTIVE") {
        return NextResponse.json({ error: "الدعوة غير متاحة حاليًا" }, { status: 404 });
      }

      await prisma.guestRsvp.create({
        data: {
          invitationId: invitation.id,
          name: parsed.data.name,
          phone: parsed.data.phone,
          attendees: parsed.data.attendees,
          status: parsed.data.status === "confirmed" ? "CONFIRMED" : "DECLINED",
          note: parsed.data.note,
        },
      });
      queueGitHubSync(`RSVP saved for invitation: ${code}.`, { createSnapshot: true });
      revalidatePath(`/${code}/ad_3399`);
      revalidatePath("/admin/analytics");
      return NextResponse.json({ ok: true });
    } catch (error) {
      console.error("Failed to save database RSVP", error);
      return saveFileRsvp(code, parsed.data);
    }
  }

  return saveFileRsvp(code, parsed.data);
}
