import { getGuestsByInvitation as getDemoGuestsByInvitation, getInvitationByCode as getDemoInvitationByCode } from "./demo-data";
import { prisma } from "./db";
import { getFileGuestsByInvitation, getFileInvitationByCode, recordFileInvitationView } from "./file-store";
import type { GuestRsvp, Invitation } from "./types";

type DatabaseInvitation = {
  id: string;
  code: string;
  language: string;
  groomName: string;
  brideName: string;
  weddingDate: Date;
  weddingTime: string;
  venue: string;
  city: string | null;
  mapUrl: string | null;
  heroPhoto: string | null;
  gallery: unknown;
  musicUrl: string | null;
  status: "DRAFT" | "ACTIVE" | "PAUSED" | "ARCHIVED";
  viewCount: number;
  customerId: string;
  template: {
    slug: string;
  };
};

type DatabaseGuest = {
  id: string;
  invitation: {
    code: string;
  };
  name: string;
  phone: string;
  attendees: number;
  status: "CONFIRMED" | "DECLINED";
  note: string | null;
  createdAt: Date;
};

function toStringArray(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function toPublicInvitation(invitation: DatabaseInvitation): Invitation {
  return {
    id: invitation.id,
    code: invitation.code,
    templateSlug: invitation.template.slug,
    language: invitation.language === "en" ? "en" : "ar",
    groomName: invitation.groomName,
    brideName: invitation.brideName,
    weddingDate: invitation.weddingDate.toISOString(),
    weddingTime: invitation.weddingTime,
    venue: invitation.venue,
    city: invitation.city || "",
    mapUrl: invitation.mapUrl || "",
    heroPhoto: invitation.heroPhoto || "/assets/brand/hero-luxury.png",
    gallery: toStringArray(invitation.gallery),
    musicUrl: invitation.musicUrl || undefined,
    isActive: invitation.status === "ACTIVE",
    views: invitation.viewCount,
    customerId: invitation.customerId,
  };
}

function toGuestRsvp(guest: DatabaseGuest): GuestRsvp {
  return {
    id: guest.id,
    invitationCode: guest.invitation.code,
    name: guest.name,
    phone: guest.phone,
    attendees: guest.attendees,
    status: guest.status === "CONFIRMED" ? "confirmed" : "declined",
    note: guest.note || undefined,
    createdAt: guest.createdAt.toISOString(),
  };
}

export async function getInvitationByCode(code: string): Promise<Invitation | undefined> {
  if (!prisma) {
    return (await getFileInvitationByCode(code)) || getDemoInvitationByCode(code);
  }

  try {
    const invitation = await prisma.invitation.findUnique({
      where: { code },
      include: { template: { select: { slug: true } } },
    });

    return invitation ? toPublicInvitation(invitation as DatabaseInvitation) : undefined;
  } catch (error) {
    console.error("Failed to load invitation", error);
    return (await getFileInvitationByCode(code)) || getDemoInvitationByCode(code);
  }
}

export async function getGuestsByInvitation(code: string): Promise<GuestRsvp[]> {
  if (!prisma) {
    const fileGuests = await getFileGuestsByInvitation(code);
    return fileGuests.length ? fileGuests : getDemoGuestsByInvitation(code);
  }

  try {
    const guests = await prisma.guestRsvp.findMany({
      where: { invitation: { code } },
      include: { invitation: { select: { code: true } } },
      orderBy: { createdAt: "desc" },
    });

    return guests.map((guest) => toGuestRsvp(guest as DatabaseGuest));
  } catch (error) {
    console.error("Failed to load invitation guests", error);
    const fileGuests = await getFileGuestsByInvitation(code);
    return fileGuests.length ? fileGuests : getDemoGuestsByInvitation(code);
  }
}

export async function recordInvitationView(code: string) {
  if (!prisma) {
    await recordFileInvitationView(code);
    return;
  }

  try {
    const invitation = await prisma.invitation.update({
      where: { code },
      data: { viewCount: { increment: 1 } },
      select: { id: true },
    });

    await prisma.analyticsEvent.create({
      data: {
        invitationId: invitation.id,
        eventType: "VIEW",
      },
    });
  } catch (error) {
    console.error("Failed to record invitation view", error);
    await recordFileInvitationView(code);
  }
}
