import { prisma } from "./db";
import { getFileCustomers, getFileGuestsByInvitation, getFileInvitations, getFileOrders } from "./file-store";
import { isBrowserDisplayImageUrl } from "./image-formats";
import { archiveExpiredInvitations } from "./invitation-archiving";
import { normalizeInvitationTexts } from "./invitation-texts";
import type { GuestRsvp, Invitation, OrderRequest } from "./types";
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
  gallery?: unknown;
  musicUrl?: string | null;
  musicEnabled?: boolean | null;
  texts?: unknown;
  photographer?: unknown;
  status?: string;
  isActive?: boolean;
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
  musicEnabled?: boolean | null;
  musicChoice?: string | null;
  musicUrl?: string | null;
  texts?: unknown;
  photographer?: unknown;
  rejectionReason?: string | null;
  publishedInvitationCode?: string | null;
  template?: { slug: string } | null;
  templateSlug?: string;
  language: string;
  status: string;
  submittedAt?: Date | string | null;
  createdAt: Date | string;
  deletedAt?: Date | string | null;
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
    logoUrl: typeof raw.logoUrl === "string" ? raw.logoUrl : undefined,
    instagramUrl: typeof raw.instagramUrl === "string" ? raw.instagramUrl : "https://www.instagram.com/",
    facebookUrl: typeof raw.facebookUrl === "string" ? raw.facebookUrl : "https://www.facebook.com/",
    whatsappUrl: typeof raw.whatsappUrl === "string" ? raw.whatsappUrl : undefined,
  };
}

function normalizeOrderStatus(status: string): OrderRequest["status"] {
  const clean = status.toLowerCase();
  if (clean === "accepted") return "reviewing";
  if (clean === "converted") return "published";
  if (["new", "reviewing", "edited", "published", "rejected"].includes(clean)) return clean as OrderRequest["status"];
  return "new";
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
  const status = String(row.status || (row.isActive ? "ACTIVE" : "PAUSED")).toLowerCase() as Invitation["status"];
  return {
    id: row.id,
    code: row.code,
    customSlug: row.customSlug || undefined,
    templateSlug: row.template?.slug || "royal-envelope",
    status,
    language: row.language === "en" ? "en" : "ar",
    groomName: row.groomName,
    brideName: row.brideName,
    weddingDate: row.weddingDate instanceof Date ? row.weddingDate.toISOString() : row.weddingDate,
    weddingTime: row.weddingTime,
    venue: row.venue,
    city: row.city || "",
    mapUrl: row.mapUrl || "",
    heroPhoto: (heroPhoto && isBrowserDisplayImageUrl(heroPhoto) ? heroPhoto : "") || gallery[0] || "/assets/invite/badr-sarah-1.jpeg",
    gallery,
    musicUrl: row.musicUrl || undefined,
    musicEnabled: row.musicEnabled === true || (row.musicEnabled == null && Boolean(row.musicUrl)),
    texts: normalizeInvitationTexts(row.texts),
    photographer: toPhotographer(row.photographer),
    isActive: row.status ? row.status === "ACTIVE" : Boolean(row.isActive),
    views: row.viewCount ?? row.views ?? 0,
    customerId: row.customerId,
  };
}

function toOrder(row: AdminOrderRow): OrderRequest {
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
    musicEnabled: row.musicEnabled ?? Boolean(row.musicUrl || parseMusicUrlFromNotes(notes)),
    musicChoice: row.musicChoice === "upload" || row.musicChoice === "url" || row.musicChoice === "library" ? row.musicChoice : row.musicChoice === "default" ? "default" : row.musicUrl || parseMusicUrlFromNotes(notes) ? "url" : "default",
    musicUrl: row.musicUrl || parseMusicUrlFromNotes(notes) || undefined,
    texts: normalizeInvitationTexts(row.texts),
    photographer: toPhotographer(row.photographer) || parsePhotographerFromNotes(notes),
    rejectionReason: row.rejectionReason || undefined,
    publishedInvitationCode: row.publishedInvitationCode || undefined,
    templateSlug: row.template?.slug || row.templateSlug || "royal-envelope",
    language: row.language === "en" ? "en" : "ar",
    status: normalizeOrderStatus(String(row.status || "new")),
    submittedAt: row.submittedAt instanceof Date ? row.submittedAt.toISOString() : row.submittedAt || undefined,
    createdAt: row.createdAt instanceof Date ? row.createdAt.toISOString() : row.createdAt,
  };
}

export async function getAdminInvitations(): Promise<Invitation[]> {
  await archiveExpiredInvitations();
  if (!prisma) return getFileInvitations();

  try {
    const [invitations, fileInvitations] = await Promise.all([
      prisma.invitation.findMany({
        where: { deletedAt: null },
        include: { template: { select: { slug: true } } },
        orderBy: { createdAt: "desc" },
      }),
      getFileInvitations(),
    ]);
    const databaseInvitations = invitations.map(toInvitation);
    const databaseCodes = new Set(databaseInvitations.map((invitation: Invitation) => invitation.code.toLowerCase()));
    return [...fileInvitations.filter((invitation: Invitation) => !databaseCodes.has(invitation.code.toLowerCase())), ...databaseInvitations];
  } catch (error) {
    console.error("Failed to load admin invitations", error);
    return getFileInvitations();
  }
}

export async function getAdminOrders(): Promise<OrderRequest[]> {
  if (!prisma) return getFileOrders();

  try {
    const orders = await prisma.orderRequest.findMany({
      where: { deletedAt: null },
      include: { template: { select: { slug: true } } },
      orderBy: [{ submittedAt: "desc" }, { createdAt: "desc" }],
    });
    return orders.map(toOrder);
  } catch (error) {
    console.error("Failed to load admin orders", error);
    return getFileOrders();
  }
}

export async function getAdminGuests(): Promise<GuestRsvp[]> {
  if (!prisma) {
    const invitations = await getFileInvitations();
    const guestGroups = await Promise.all(invitations.map((invitation) => getFileGuestsByInvitation(invitation.code)));
    return guestGroups.flat();
  }

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
    const invitations = await getFileInvitations();
    const guestGroups = await Promise.all(invitations.map((invitation) => getFileGuestsByInvitation(invitation.code)));
    return guestGroups.flat();
  }
}

export async function getAdminCustomers(): Promise<AdminCustomer[]> {
  if (!prisma) return getFileCustomers();

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
    return getFileCustomers();
  }
}
