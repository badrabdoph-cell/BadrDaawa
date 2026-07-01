import { prisma } from "./db";
import { isBrowserDisplayImageUrl } from "./image-formats";
import { archiveExpiredInvitations } from "./invitation-archiving";
import { cleanInvitationHeroVideoUrl } from "./invitation-media";
import { normalizeInvitationTexts } from "./invitation-texts";
import type { GuestRsvp, Invitation } from "./types";
import { createVisitEventMetadata, type VisitSource } from "./visit-source";
import { normalizeInternalAssetUrl } from "./utils";

type DatabaseInvitation = {
  id: string;
  code: string;
  customSlug: string | null;
  language: string;
  groomName: string;
  brideName: string;
  weddingDate: Date;
  weddingTime: string;
  venue: string;
  city: string | null;
  mapUrl: string | null;
  latitude: number | null;
  longitude: number | null;
  heroPhoto: string | null;
  heroVideoUrl?: string | null;
  gallery: unknown;
  musicUrl: string | null;
  musicEnabled?: boolean | null;
  texts?: unknown;
  photographer?: unknown;
  postImageUrl: string | null;
  postImageTemplateId: string | null;
  postImageStatus: string | null;
  postImageSignature: string | null;
  postImageGeneratedAt: Date | null;
  postImageError: string | null;
  postImageWidth: number | null;
  postImageHeight: number | null;
  status: "DRAFT" | "ACTIVE" | "PAUSED" | "ARCHIVED";
  trialDays: number | null;
  trialEndsAt: Date | null;
  disabledAt: Date | null;
  disabledReason: string | null;
  disabledBy: string | null;
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
    description: typeof raw.description === "string" ? raw.description : undefined,
    logoUrl: typeof raw.logoUrl === "string" ? raw.logoUrl : undefined,
    instagramUrl: typeof raw.instagramUrl === "string" ? raw.instagramUrl : "https://www.instagram.com/",
    facebookUrl: typeof raw.facebookUrl === "string" ? raw.facebookUrl : "https://www.facebook.com/",
    whatsappUrl: typeof raw.whatsappUrl === "string" ? raw.whatsappUrl : undefined,
    lockedByPromo: raw.lockedByPromo === true,
    promoCode: typeof raw.promoCode === "string" && raw.promoCode.trim() ? raw.promoCode.trim() : undefined,
  };
}

function toPhotographerWithSource(value: unknown): { photographer: Invitation["photographer"]; logoSource: "global" | "custom" | undefined } | undefined {
  if (!value || typeof value !== "object") return undefined;
  const raw = value as Record<string, unknown>;
  return {
    photographer: {
      enabled: raw.enabled !== false,
      name: typeof raw.name === "string" && raw.name.trim() ? raw.name.trim() : "badrabdoph",
      description: typeof raw.description === "string" ? raw.description : undefined,
      logoUrl: typeof raw.logoUrl === "string" ? raw.logoUrl : undefined,
      instagramUrl: typeof raw.instagramUrl === "string" ? raw.instagramUrl : "https://www.instagram.com/",
      facebookUrl: typeof raw.facebookUrl === "string" ? raw.facebookUrl : "https://www.facebook.com/",
      whatsappUrl: typeof raw.whatsappUrl === "string" ? raw.whatsappUrl : undefined,
      lockedByPromo: raw.lockedByPromo === true,
      promoCode: typeof raw.promoCode === "string" && raw.promoCode.trim() ? raw.promoCode.trim() : undefined,
    },
    logoSource: raw._logoSource === "custom" ? "custom" : raw._logoSource === "global" ? "global" : undefined,
  };
}

function toPublicInvitation(invitation: DatabaseInvitation): Invitation {
  const gallery = toStringArray(invitation.gallery);
  const normalizedHero = normalizeInternalAssetUrl(invitation.heroPhoto);
  const heroPhoto = (normalizedHero && isBrowserDisplayImageUrl(normalizedHero) ? normalizedHero : "") || gallery[0] || "/assets/brand/hero-luxury.png";
  const rawTexts = invitation.texts && typeof invitation.texts === "object" ? (invitation.texts as Record<string, unknown>) : {};
  return {
    id: invitation.id,
    code: invitation.code,
    customSlug: invitation.customSlug || undefined,
    templateSlug: invitation.template.slug,
    status: invitation.status.toLowerCase() as Invitation["status"],
    language: invitation.language === "en" ? "en" : "ar",
    groomName: invitation.groomName,
    brideName: invitation.brideName,
    weddingDate: invitation.weddingDate.toISOString(),
    weddingTime: invitation.weddingTime,
    venue: invitation.venue,
    city: invitation.city || "",
    mapUrl: invitation.mapUrl || "",
    latitude: invitation.latitude ?? null,
    longitude: invitation.longitude ?? null,
    heroPhoto,
    heroVideoUrl: cleanInvitationHeroVideoUrl(invitation.heroVideoUrl || rawTexts.heroVideoUrl) || undefined,
    gallery: gallery.length ? gallery : [heroPhoto],
    musicUrl: invitation.musicUrl || undefined,
    musicEnabled: invitation.musicEnabled === true || (invitation.musicEnabled == null && Boolean(invitation.musicUrl)),
    texts: normalizeInvitationTexts(invitation.texts),
    photographer: toPhotographer(invitation.photographer),
    postImageUrl: invitation.postImageUrl || undefined,
    postImageTemplateId: invitation.postImageTemplateId || undefined,
    postImageStatus:
      invitation.postImageStatus === "GENERATED" ||
      invitation.postImageStatus === "GENERATING" ||
      invitation.postImageStatus === "FAILED" ||
      invitation.postImageStatus === "NEEDS_REGENERATION"
        ? invitation.postImageStatus
        : undefined,
    postImageSignature: invitation.postImageSignature || undefined,
    postImageGeneratedAt: invitation.postImageGeneratedAt?.toISOString(),
    postImageError: invitation.postImageError || undefined,
    postImageWidth: invitation.postImageWidth || undefined,
    postImageHeight: invitation.postImageHeight || undefined,
    isActive: invitation.status === "ACTIVE" && !invitation.disabledAt,
    disabledAt: invitation.disabledAt?.toISOString(),
    disabledReason: invitation.disabledReason || undefined,
    disabledBy: invitation.disabledBy || undefined,
    trialDays: invitation.trialDays || undefined,
    trialEndsAt: invitation.trialEndsAt?.toISOString() || undefined,
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
  await archiveExpiredInvitations(code);
  if (!prisma) return undefined;

  try {
    const invitation = await prisma.invitation.findFirst({
      where: {
        deletedAt: null,
        OR: [{ code }, { customSlug: code }],
      },
      include: { template: { select: { slug: true } } },
    });

    return invitation ? toPublicInvitation(invitation as unknown as DatabaseInvitation) : undefined;
  } catch (error) {
    console.error("Failed to load invitation", error);
    return undefined;
  }
}

export async function getGuestsByInvitation(code: string): Promise<GuestRsvp[]> {
  if (!prisma) return [];

  try {
    const guests = await prisma.guestRsvp.findMany({
      where: { invitation: { code, deletedAt: null } },
      include: { invitation: { select: { code: true } } },
      orderBy: { createdAt: "desc" },
    });

    return guests.map((guest: any) => toGuestRsvp(guest as DatabaseGuest));
  } catch (error) {
    console.error("Failed to load invitation guests", error);
    return [];
  }
}

export type InvitationViewTrackingInput = {
  source: VisitSource;
  searchParams?: Record<string, string | string[] | undefined> | null;
  referrer?: string | null;
  userAgent?: string | null;
};

export async function recordInvitationView(code: string, tracking?: InvitationViewTrackingInput) {
  const metadata = tracking ? createVisitEventMetadata(tracking) : undefined;
  if (!prisma) {
    console.error("[Analytics] PostgreSQL is not configured. Refusing operational write.");
    return;
  }

  try {
    const invitation = await prisma.invitation.updateMany({
      where: { code, deletedAt: null },
      data: { viewCount: { increment: 1 } },
    });
    if (!invitation.count) return;
    const current = await prisma.invitation.findUnique({ where: { code }, select: { id: true } });
    if (!current) return;

    await prisma.analyticsEvent.create({
      data: {
        invitationId: current.id,
        eventType: "VIEW",
        metadata,
      },
    });
  } catch (error) {
    console.error("Failed to record invitation view", error);
  }
}

export async function autoDisableExpiredTrial(code: string): Promise<void> {
  if (!prisma) return;
  try {
    const invitation = await prisma.invitation.findFirst({
      where: { code, deletedAt: null, disabledAt: null, trialEndsAt: { lte: new Date() } },
      select: { id: true, trialDays: true, trialEndsAt: true },
    });
    if (!invitation) return;
    await prisma.invitation.update({
      where: { id: invitation.id },
      data: {
        disabledAt: new Date(),
        disabledReason: invitation.trialEndsAt
          ? `انتهت الفترة التجريبية (${invitation.trialDays || 0} أيام)`
          : "انتهت الفترة التجريبية",
        disabledBy: "system",
      },
    });
  } catch { /* silent */ }
}

export async function getInvitationDisabledStatus(code: string): Promise<{ disabled: boolean; reason?: string; disabledBy?: string; disabledAt?: string }> {
  if (!prisma) return { disabled: false };
  try {
    const invitation = await prisma.invitation.findFirst({
      where: { code, deletedAt: null },
      select: { disabledAt: true, disabledReason: true, disabledBy: true },
    });
    if (!invitation?.disabledAt) return { disabled: false };
    return {
      disabled: true,
      reason: invitation.disabledReason || undefined,
      disabledBy: invitation.disabledBy || undefined,
      disabledAt: invitation.disabledAt.toISOString(),
    };
  } catch {
    return { disabled: false };
  }
}
