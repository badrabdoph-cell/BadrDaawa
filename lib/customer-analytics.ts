import { prisma } from "@/lib/db";
import type { GuestRsvp, Invitation } from "@/lib/types";

export type CustomerInvitationAnalytics = {
  visits: number;
  confirmedResponses: number;
  declinedResponses: number;
  expectedAttendees: number;
  recentResponses: GuestRsvp[];
  openDays: Array<{ date: string; count: number }>;
};

function dayKey(value: Date | string) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
}

export async function getCustomerInvitationAnalytics(invitation: Pick<Invitation, "code" | "views">, guests: GuestRsvp[]): Promise<CustomerInvitationAnalytics> {
  const confirmedResponses = guests.filter((guest) => guest.status === "confirmed").length;
  const declinedResponses = guests.filter((guest) => guest.status === "declined").length;
  const expectedAttendees = guests.filter((guest) => guest.status === "confirmed").reduce((sum, guest) => sum + Math.max(1, guest.attendees || 1), 0);
  const recentResponses = [...guests].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 5);

  if (!prisma) {
    return {
      visits: invitation.views,
      confirmedResponses,
      declinedResponses,
      expectedAttendees,
      recentResponses,
      openDays: [],
    };
  }

  try {
    const dbInvitation = await prisma.invitation.findFirst({
      where: { code: invitation.code, deletedAt: null },
      select: {
        id: true,
        viewCount: true,
        events: {
          where: { eventType: "VIEW" },
          orderBy: { createdAt: "desc" },
          select: { createdAt: true },
          take: 1000,
        },
      },
    });

    if (!dbInvitation) {
      return {
        visits: invitation.views,
        confirmedResponses,
        declinedResponses,
        expectedAttendees,
        recentResponses,
        openDays: [],
      };
    }

    const dayCounts = new Map<string, number>();
    for (const event of dbInvitation.events) {
      const key = dayKey(event.createdAt);
      if (!key) continue;
      dayCounts.set(key, (dayCounts.get(key) || 0) + 1);
    }

    return {
      visits: dbInvitation.viewCount,
      confirmedResponses,
      declinedResponses,
      expectedAttendees,
      recentResponses,
      openDays: Array.from(dayCounts.entries())
        .map(([date, count]) => ({ date, count }))
        .sort((a, b) => b.count - a.count || b.date.localeCompare(a.date))
        .slice(0, 7),
    };
  } catch (error) {
    console.error("Failed to load customer invitation analytics", error);
    return {
      visits: invitation.views,
      confirmedResponses,
      declinedResponses,
      expectedAttendees,
      recentResponses,
      openDays: [],
    };
  }
}
