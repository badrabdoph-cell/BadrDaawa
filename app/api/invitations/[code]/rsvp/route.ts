import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { addFileGuest, getFileInvitationByCode } from "@/lib/file-store";
import { getInvitationByCode } from "@/lib/demo-data";
import { rsvpSchema } from "@/lib/validation";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ code: string }>;
};

export async function POST(request: Request, context: RouteContext) {
  const { code } = await context.params;
  const body = await request.json().catch(() => null);
  const parsed = rsvpSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "راجع بيانات الحضور وحاول مرة تانية", details: parsed.error.flatten() }, { status: 400 });
  }

  if (prisma) {
    const invitation = await prisma.invitation.findUnique({ where: { code } });
    if (!invitation || invitation.status !== "ACTIVE") {
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
  } else {
    const invitation = (await getFileInvitationByCode(code)) || getInvitationByCode(code);
    if (!invitation) {
      return NextResponse.json({ error: "الدعوة غير موجودة" }, { status: 404 });
    }
    if (await getFileInvitationByCode(code)) {
      await addFileGuest(code, {
        name: parsed.data.name,
        phone: parsed.data.phone,
        attendees: parsed.data.attendees,
        status: parsed.data.status,
        note: parsed.data.note,
      });
    }
  }

  return NextResponse.json({ ok: true });
}
