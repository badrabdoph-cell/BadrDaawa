import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { queueGitHubSync } from "@/lib/github-sync-queue";
import { checkRequestRateLimit, rateLimitResponse } from "@/lib/rate-limiting";
import { isSameOriginRequest, sameOriginErrorResponse } from "@/lib/security-enhancements";
import { rsvpSchema } from "@/lib/validation";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ code: string }>;
};

export async function POST(request: Request, context: RouteContext) {
  const { code } = await context.params;
  if (!isSameOriginRequest(request)) return sameOriginErrorResponse();
  const limit = checkRequestRateLimit(request, `rsvp:${code}`, { windowMs: 60000, maxRequests: 8 });
  if (!limit.allowed) return rateLimitResponse(limit.resetAt);

  const body = await request.json().catch(() => null);
  const parsed = rsvpSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "راجع بيانات الحضور وحاول مرة تانية", details: parsed.error.flatten() }, { status: 400 });
  }

  if (!prisma) {
    console.error("[RSVP API] PostgreSQL is not configured. Refusing runtime-store fallback write.");
    return NextResponse.json({ error: "قاعدة البيانات غير متاحة حالياً. حاول مرة أخرى بعد قليل." }, { status: 503 });
  }

  try {
    const invitation = await prisma.invitation.findFirst({ where: { code, deletedAt: null } });
    if (!invitation) {
      return NextResponse.json({ error: "الدعوة غير موجودة في قاعدة البيانات" }, { status: 404 });
    }
    if (invitation.status !== "ACTIVE") {
      return NextResponse.json({ error: "الدعوة غير متاحة حاليًا" }, { status: 404 });
    }

    const existingGuest = await prisma.guestRsvp.findFirst({
      where: { invitationId: invitation.id, phone: parsed.data.phone },
      select: { name: true, status: true },
    });
    if (existingGuest) {
      return NextResponse.json({
        ok: true,
        duplicate: true,
        guest: {
          name: existingGuest.name,
          status: existingGuest.status === "CONFIRMED" ? "confirmed" : "declined",
        },
      });
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
    return NextResponse.json({ error: "تعذر حفظ RSVP في قاعدة البيانات." }, { status: 500 });
  }
}
