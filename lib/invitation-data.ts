import { getGuestsByInvitation as getDemoGuestsByInvitation, getInvitationByCode as getDemoInvitationByCode } from "./demo-data";
import { prisma } from "./db";
import { getFileGuestsByInvitation, getFileInvitationByCode, recordFileInvitationView } from "./file-store";
import { isBrowserDisplayImageUrl } from "./image-formats";
import { normalizeInvitationTexts } from "./invitation-texts";
import type { GuestRsvp, Invitation } from "./types";
import { normalizeInternalAssetUrl } from "./utils";

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
  musicEnabled?: boolean | null;
  texts?: unknown;
  photographer?: unknown;
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
  const clean = (item: string) => {
    const url = normalizeInternalAssetUrl(item);
    return url && isBrowserDisplayImageUrl(url) ? url : "";
  };
  if (Array.isArray(value)) return value.filter((item): item is string => typeof item === "string").map(clean).filter(Boolean);
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value) as unknown;
      return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string").map(clean).filter(Boolean) : [];
    } catch {
      return [];
    }
  }
  return [];
}

function toPhotographer(value: unknown): Invitation["photographer"] | undefined {
  if (!value || typeof value !== "object") return undefined;
  const raw = value as Record<string, unknown>;
  return {
    enabled: raw.enabled !== false,
    name: typeof raw.name === "string" && raw.name.trim() ? raw.name.trim() : "badrabdoph",
    logoUrl: typeof raw.logoUrl === "string" ? raw.logoUrl : undefined,
    instagramUrl: typeof raw.instagramUrl === "string" ? raw.instagramUrl : "https://www.instagram.com/",
    facebookUrl: typeof raw.facebookUrl === "string" ? raw.facebookUrl : "https://www.facebook.com/",
  };
}

function toPublicInvitation(invitation: DatabaseInvitation): Invitation {
  const gallery = toStringArray(invitation.gallery);
  const normalizedHero = normalizeInternalAssetUrl(invitation.heroPhoto);
  const heroPhoto = (normalizedHero && isBrowserDisplayImageUrl(normalizedHero) ? normalizedHero : "") || gallery[0] || "/assets/brand/hero-luxury.png";
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
    heroPhoto,
    gallery: gallery.length ? gallery : [heroPhoto],
    musicUrl: invitation.musicUrl || undefined,
    musicEnabled: invitation.musicEnabled === true && Boolean(invitation.musicUrl),
    texts: normalizeInvitationTexts(invitation.texts),
    photographer: toPhotographer(invitation.photographer),
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

    return invitation ? toPublicInvitation(invitation as DatabaseInvitation) : (await getFileInvitationByCode(code)) || getDemoInvitationByCode(code);
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

    if (guests.length) return guests.map((guest: any) => toGuestRsvp(guest as DatabaseGuest));
    const fileGuests = await getFileGuestsByInvitation(code);
    return fileGuests.length ? fileGuests : getDemoGuestsByInvitation(code);
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
