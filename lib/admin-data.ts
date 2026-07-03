import { prisma } from "./db";
import { isBrowserDisplayImageUrl } from "./image-formats";
import { archiveExpiredInvitations } from "./invitation-archiving";
import { cleanInvitationHeroVideoUrl } from "./invitation-media";
import { normalizeInvitationTexts } from "./invitation-texts";
import type { GuestRsvp, Invitation, OrderPostImageState, OrderRequest } from "./types";
import { normalizeInternalAssetUrl } from "./utils";

export type AdminCustomer = {
  id: string;
  name: string;
  phone: string;
  email?: string;
  username: string;
  isActive: boolean;
  invitations: number;
  createdAt: string;
  deletedAt?: string;
};

type AdminInvitationRow = {
  id: string;
  code: string;
  customSlug?: string | null;
  template?: { slug: string } | null;
  templateSlug?: string;
  language: string;
  groomName: string;
  brideName: string;
  weddingDate: Date | string;
  weddingTime: string;
  venue: string;
  city?: string | null;
  mapUrl?: string | null;
  heroPhoto?: string | null;
  heroVideoUrl?: string | null;
  gallery?: unknown;
  musicUrl?: string | null;
  musicEnabled?: boolean | null;
  texts?: unknown;
  photographer?: unknown;
  postImageUrl?: string | null;
  postImageOgUrl?: string | null;
  postImageTemplateId?: string | null;
  postImageStatus?: string | null;
  postImageSignature?: string | null;
  postImageOgSignature?: string | null;
  postImageGeneratedAt?: Date | string | null;
  postImageError?: string | null;
  postImageWidth?: number | null;
  postImageHeight?: number | null;
  postImageOgWidth?: number | null;
  postImageOgHeight?: number | null;
  status?: string;
  isActive?: boolean;
  disabledAt?: Date | string | null;
  disabledReason?: string | null;
  disabledBy?: string | null;
  trialDays?: number | null;
  trialEndsAt?: Date | string | null;
  viewCount?: number;
  views?: number;
  customerId: string;
  deletedAt?: Date | string | null;
};

type AdminOrderRow = {
  id: string;
  orderNumber?: string | null;
  dedupeKey?: string | null;
  groomName: string;
  brideName: string;
  phone: string;
  weddingDate: Date | string;
  venue: string;
  mapUrl?: string | null;
  notes?: string | null;
  imageUrls?: unknown;
  postImageTemplateId?: string | null;
  musicEnabled?: boolean | null;
  musicChoice?: string | null;
  musicUrl?: string | null;
  texts?: unknown;
  photographer?: unknown;
  rejectionReason?: string | null;
  publishedInvitationCode?: string | null;
  manageToken?: string | null;
  manageTokenExpiresAt?: Date | string | null;
  template?: { slug: string } | null;
  templateSlug?: string;
  language: string;
  status: string;
  submittedAt?: Date | string | null;
  createdAt: Date | string;
  deletedAt?: Date | string | null;
};

type AdminOrderPostImageRow = {
  code: string;
  postImageUrl?: string | null;
  postImageOgUrl?: string | null;
  postImageTemplateId?: string | null;
  postImageStatus?: string | null;
  postImageGeneratedAt?: Date | string | null;
  postImageError?: string | null;
  postImageWidth?: number | null;
  postImageHeight?: number | null;
  postImageOgWidth?: number | null;
  postImageOgHeight?: number | null;
};

type AdminGuestRow = {
  id: string;
  invitation: { code: string };
  name: string;
  phone: string;
  attendees: number;
  status: string;
  note?: string | null;
  createdAt: Date;
};

type AdminCustomerRow = {
  id: string;
  name: string;
  phone: string;
  email?: string | null;
  username: string;
  isActive: boolean;
  _count: { invitations: number };
  createdAt: Date;
  deletedAt?: Date | null;
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

function normalizeOrderStatus(status: string): OrderRequest["status"] {
  const clean = status.toLowerCase();
  if (clean === "converted") return "published";
  if (["new", "reviewing", "edited", "accepted", "published", "rejected"].includes(clean)) return clean as OrderRequest["status"];
  return "new";
}

function toOrderPostImageState(row?: AdminOrderPostImageRow | null): OrderPostImageState | undefined {
  if (!row) return undefined;
  return {
    url: row.postImageUrl || undefined,
    ogUrl: row.postImageOgUrl || undefined,
    status:
      row.postImageStatus === "GENERATED" ||
      row.postImageStatus === "GENERATING" ||
      row.postImageStatus === "FAILED" ||
      row.postImageStatus === "NEEDS_REGENERATION"
        ? row.postImageStatus
        : undefined,
    templateId: row.postImageTemplateId || undefined,
    generatedAt: row.postImageGeneratedAt instanceof Date ? row.postImageGeneratedAt.toISOString() : row.postImageGeneratedAt || undefined,
    error: row.postImageError || undefined,
    width: row.postImageWidth || undefined,
    height: row.postImageHeight || undefined,
    ogWidth: row.postImageOgWidth || undefined,
    ogHeight: row.postImageOgHeight || undefined,
  };
}

function parseMusicUrlFromNotes(notes?: string | null) {
  if (!notes) return "";
  const directMatch = notes.match(/رابط الموسيقى:\s*(\S+)/);
  const candidates = directMatch ? [directMatch[1]] : Array.from(notes.matchAll(/https?:\/\/\S+|\/uploads\/music\/[^\s]+/g)).map((match) => match[0]);
  return candidates.find((candidate) => candidate.includes("/uploads/music/") || /\.(mp3|wav|ogg|webm|m4a|aac|mp4|aif|aiff|flac)(?:[?#].*)?$/i.test(candidate)) || "";
}

function parsePhotographerFromNotes(notes?: string | null): OrderRequest["photographer"] | undefined {
  if (!notes?.includes("بيانات المصور")) return undefined;
  const name = notes.match(/الاسم:\s*(.+)/)?.[1]?.trim() || "";
  const facebookUrl = notes.match(/Facebook:\s*(\S+)/)?.[1]?.trim() || "";
  const instagramUrl = notes.match(/Instagram:\s*(\S+)/)?.[1]?.trim() || "";
  return {
    enabled: true,
    name: name || "المصور الفوتوغرافي",
    facebookUrl: facebookUrl || "https://www.facebook.com/",
    instagramUrl: instagramUrl || "https://www.instagram.com/",
  };
}

function toInvitation(row: AdminInvitationRow): Invitation {
  const gallery = toStringArray(row.gallery);
  const heroPhoto = normalizeInternalAssetUrl(row.heroPhoto);
  const rawTexts = row.texts && typeof row.texts === "object" ? (row.texts as Record<string, unknown>) : {};
  const status = String(row.status || (row.isActive && !row.disabledAt ? "ACTIVE" : "PAUSED")).toLowerCase() as Invitation["status"];
  return {
    id: row.id,
    code: row.code,
    customSlug: row.customSlug || undefined,
    templateSlug: row.template?.slug || "featured-1",
    status,
    language: row.language === "en" ? "en" : "ar",
    groomName: row.groomName,
    brideName: row.brideName,
    weddingDate: row.weddingDate instanceof Date ? row.weddingDate.toISOString() : row.weddingDate,
    weddingTime: row.weddingTime,
    venue: row.venue,
    city: row.city || "",
    mapUrl: row.mapUrl || "",
    heroPhoto: (heroPhoto && isBrowserDisplayImageUrl(heroPhoto) ? heroPhoto : "") || gallery[0] || "/assets/brand/hero-luxury.png",
    heroVideoUrl: cleanInvitationHeroVideoUrl(row.heroVideoUrl || rawTexts.heroVideoUrl) || undefined,
    gallery,
    musicUrl: row.musicUrl || undefined,
    musicEnabled: row.musicEnabled === true || (row.musicEnabled == null && Boolean(row.musicUrl)),
    texts: normalizeInvitationTexts(row.texts),
    photographer: toPhotographer(row.photographer),
    postImageUrl: row.postImageUrl || undefined,
    postImageOgUrl: row.postImageOgUrl || undefined,
    postImageTemplateId: row.postImageTemplateId || undefined,
    postImageStatus:
      row.postImageStatus === "GENERATED" ||
      row.postImageStatus === "GENERATING" ||
      row.postImageStatus === "FAILED" ||
      row.postImageStatus === "NEEDS_REGENERATION"
        ? row.postImageStatus
        : undefined,
    postImageSignature: row.postImageSignature || undefined,
    postImageOgSignature: row.postImageOgSignature || undefined,
    postImageGeneratedAt: row.postImageGeneratedAt instanceof Date ? row.postImageGeneratedAt.toISOString() : row.postImageGeneratedAt || undefined,
    postImageError: row.postImageError || undefined,
    postImageWidth: row.postImageWidth || undefined,
    postImageHeight: row.postImageHeight || undefined,
    postImageOgWidth: row.postImageOgWidth || undefined,
    postImageOgHeight: row.postImageOgHeight || undefined,
    isActive: row.status ? (row.status === "ACTIVE" && !row.disabledAt) : Boolean(row.isActive && !row.disabledAt),
    disabledAt: row.disabledAt instanceof Date ? row.disabledAt.toISOString() : row.disabledAt || undefined,
    disabledReason: row.disabledReason || undefined,
    disabledBy: row.disabledBy || undefined,
    trialDays: row.trialDays || undefined,
    trialEndsAt: row.trialEndsAt instanceof Date ? row.trialEndsAt.toISOString() : row.trialEndsAt || undefined,
    views: row.viewCount ?? row.views ?? 0,
    customerId: row.customerId,
  };
}

function toOrder(row: AdminOrderRow, postImage?: AdminOrderPostImageRow | null): OrderRequest {
  const notes = row.notes || "";
  const noteImageUrls = Array.from(notes.matchAll(/https?:\/\/\S+|\/uploads\/[^\s]+/g))
    .map((match) => normalizeInternalAssetUrl(match[0]))
    .filter((url) => Boolean(url && isBrowserDisplayImageUrl(url)))
    .filter(Boolean);
  const savedImageUrls = toStringArray(row.imageUrls);
  const imageUrls = [...savedImageUrls, ...noteImageUrls].filter((url, index, list) => list.indexOf(url) === index).slice(0, 3);

  return {
    id: row.id,
    orderNumber: row.orderNumber || undefined,
    dedupeKey: row.dedupeKey || undefined,
    groomName: row.groomName,
    brideName: row.brideName,
    phone: row.phone,
    weddingDate: row.weddingDate instanceof Date ? row.weddingDate.toISOString() : row.weddingDate,
    venue: row.venue,
    mapUrl: row.mapUrl || undefined,
    notes: notes || undefined,
    imageUrls,
    postImageTemplateId: row.postImageTemplateId || undefined,
    postImage: toOrderPostImageState(postImage),
    musicEnabled: row.musicEnabled ?? Boolean(row.musicUrl || parseMusicUrlFromNotes(notes)),
    musicChoice: row.musicChoice === "upload" || row.musicChoice === "video" || row.musicChoice === "url" || row.musicChoice === "library" ? row.musicChoice : row.musicChoice === "default" ? "default" : row.musicUrl || parseMusicUrlFromNotes(notes) ? "url" : "default",
    musicUrl: row.musicUrl || parseMusicUrlFromNotes(notes) || undefined,
    texts: normalizeInvitationTexts(row.texts),
    photographer: toPhotographer(row.photographer) || parsePhotographerFromNotes(notes),
    rejectionReason: row.rejectionReason || undefined,
    publishedInvitationCode: row.publishedInvitationCode || undefined,
    manageToken: row.manageToken || undefined,
    manageTokenExpiresAt: row.manageTokenExpiresAt instanceof Date ? row.manageTokenExpiresAt.toISOString() : row.manageTokenExpiresAt || undefined,
    templateSlug: row.template?.slug || row.templateSlug || "featured-1",
    language: row.language === "en" ? "en" : "ar",
    status: normalizeOrderStatus(String(row.status || "new")),
    submittedAt: row.submittedAt instanceof Date ? row.submittedAt.toISOString() : row.submittedAt || undefined,
    createdAt: row.createdAt instanceof Date ? row.createdAt.toISOString() : row.createdAt,
  };
}

export async function getAdminInvitations(): Promise<Invitation[]> {
  await archiveExpiredInvitations();
  if (!prisma) return [];

  try {
    const invitations = await prisma.invitation.findMany({
      where: { deletedAt: null },
      include: { template: { select: { slug: true } } },
      orderBy: { createdAt: "desc" },
    });
    return invitations.map(toInvitation);
  } catch (error) {
    console.error("Failed to load admin invitations", error);
    return [];
  }
}

export async function getAdminOrders(): Promise<OrderRequest[]> {
  if (!prisma) return [];

  try {
    const orders = await prisma.orderRequest.findMany({
      where: { deletedAt: null },
      include: { template: { select: { slug: true } } },
      orderBy: [{ submittedAt: "desc" }, { createdAt: "desc" }],
    });
    const publishedCodes = orders.map((order) => order.publishedInvitationCode).filter((code): code is string => Boolean(code));
    const postImages = publishedCodes.length
      ? await prisma.invitation.findMany({
          where: { code: { in: publishedCodes }, deletedAt: null },
          select: {
            code: true,
            postImageUrl: true,
            postImageOgUrl: true,
            postImageTemplateId: true,
            postImageStatus: true,
            postImageGeneratedAt: true,
            postImageError: true,
            postImageWidth: true,
            postImageHeight: true,
            postImageOgWidth: true,
            postImageOgHeight: true,
          },
        })
      : [];
    const postImageByCode = new Map(postImages.map((postImage) => [postImage.code, postImage]));
    return orders.map((order) => toOrder(order, order.publishedInvitationCode ? postImageByCode.get(order.publishedInvitationCode) : undefined));
  } catch (error) {
    console.error("Failed to load admin orders", error);
    return [];
  }
}

export async function getAdminGuests(): Promise<GuestRsvp[]> {
  if (!prisma) return [];

  try {
    const guests = await prisma.guestRsvp.findMany({
      where: { invitation: { deletedAt: null } },
      include: { invitation: { select: { code: true } } },
      orderBy: { createdAt: "desc" },
    });

    return (guests as AdminGuestRow[]).map((guest) => ({
      id: guest.id,
      invitationCode: guest.invitation.code,
      name: guest.name,
      phone: guest.phone,
      attendees: guest.attendees,
      status: guest.status === "CONFIRMED" ? "confirmed" : "declined",
      note: guest.note || undefined,
      createdAt: guest.createdAt.toISOString(),
    }));
  } catch (error) {
    console.error("Failed to load admin guests", error);
    return [];
  }
}

export async function getAdminCustomers(): Promise<AdminCustomer[]> {
  if (!prisma) return [];

  try {
    const customers = await prisma.customer.findMany({
      where: { deletedAt: null },
      include: { _count: { select: { invitations: { where: { deletedAt: null } } } } },
      orderBy: { createdAt: "desc" },
    });

    return (customers as AdminCustomerRow[]).map((customer) => ({
      id: customer.id,
      name: customer.name,
      phone: customer.phone,
      email: customer.email || undefined,
      username: customer.username,
      isActive: customer.isActive,
      invitations: customer._count.invitations,
      createdAt: customer.createdAt.toISOString(),
    }));
  } catch (error) {
    console.error("Failed to load admin customers", error);
    return [];
  }
}
