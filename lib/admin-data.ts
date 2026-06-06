import { prisma } from "./db";
import { getFileCustomers, getFileGuestsByInvitation, getFileInvitations, getFileOrders } from "./file-store";
import type { GuestRsvp, Invitation, OrderRequest } from "./types";

export type AdminCustomer = {
  id: string;
  name: string;
  phone: string;
  email?: string;
  username: string;
  isActive: boolean;
  invitations: number;
  createdAt: string;
};

type AdminInvitationRow = {
  id: string;
  code: string;
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
  status?: string;
  isActive?: boolean;
  viewCount?: number;
  views?: number;
  customerId: string;
};

type AdminOrderRow = {
  id: string;
  groomName: string;
  brideName: string;
  phone: string;
  weddingDate: Date | string;
  venue: string;
  notes?: string | null;
  template?: { slug: string } | null;
  templateSlug?: string;
  language: string;
  status: string;
  createdAt: Date | string;
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
};

function toInvitation(row: AdminInvitationRow): Invitation {
  return {
    id: row.id,
    code: row.code,
    templateSlug: row.template?.slug || "royal-envelope",
    language: row.language === "en" ? "en" : "ar",
    groomName: row.groomName,
    brideName: row.brideName,
    weddingDate: row.weddingDate instanceof Date ? row.weddingDate.toISOString() : row.weddingDate,
    weddingTime: row.weddingTime,
    venue: row.venue,
    city: row.city || "",
    mapUrl: row.mapUrl || "",
    heroPhoto: row.heroPhoto || "/assets/invite/badr-sarah-1.jpeg",
    gallery: Array.isArray(row.gallery) ? row.gallery : [],
    musicUrl: row.musicUrl || undefined,
    isActive: row.status ? row.status === "ACTIVE" : Boolean(row.isActive),
    views: row.viewCount ?? row.views ?? 0,
    customerId: row.customerId,
  };
}

function toOrder(row: AdminOrderRow): OrderRequest {
  const notes = row.notes || "";
  const imageUrls = Array.from(notes.matchAll(/https?:\/\/\S+|\/uploads\/order-requests\/\S+/g)).map((match) => match[0].trim());

  return {
    id: row.id,
    groomName: row.groomName,
    brideName: row.brideName,
    phone: row.phone,
    weddingDate: row.weddingDate instanceof Date ? row.weddingDate.toISOString() : row.weddingDate,
    venue: row.venue,
    notes: notes || undefined,
    imageUrls,
    templateSlug: row.template?.slug || row.templateSlug || "royal-envelope",
    language: row.language === "en" ? "en" : "ar",
    status: String(row.status || "new").toLowerCase() as OrderRequest["status"],
    createdAt: row.createdAt instanceof Date ? row.createdAt.toISOString() : row.createdAt,
  };
}

export async function getAdminInvitations(): Promise<Invitation[]> {
  if (!prisma) return getFileInvitations();

  try {
    const invitations = await prisma.invitation.findMany({
      include: { template: { select: { slug: true } } },
      orderBy: { createdAt: "desc" },
    });
    return invitations.map(toInvitation);
  } catch (error) {
    console.error("Failed to load admin invitations", error);
    return getFileInvitations();
  }
}

export async function getAdminOrders(): Promise<OrderRequest[]> {
  if (!prisma) return getFileOrders();

  try {
    const orders = await prisma.orderRequest.findMany({
      include: { template: { select: { slug: true } } },
      orderBy: { createdAt: "desc" },
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
      include: { _count: { select: { invitations: true } } },
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
