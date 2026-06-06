import { demoGuests, demoInvitations, demoOrders } from "./demo-data";
import { prisma } from "./db";
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

function toInvitation(row: any): Invitation {
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
    isActive: row.status ? row.status === "ACTIVE" : row.isActive,
    views: row.viewCount ?? row.views ?? 0,
    customerId: row.customerId,
  };
}

function toOrder(row: any): OrderRequest {
  return {
    id: row.id,
    groomName: row.groomName,
    brideName: row.brideName,
    phone: row.phone,
    weddingDate: row.weddingDate instanceof Date ? row.weddingDate.toISOString() : row.weddingDate,
    venue: row.venue,
    notes: row.notes || undefined,
    templateSlug: row.template?.slug || row.templateSlug || "royal-envelope",
    language: row.language === "en" ? "en" : "ar",
    status: String(row.status || "new").toLowerCase() as OrderRequest["status"],
    createdAt: row.createdAt instanceof Date ? row.createdAt.toISOString() : row.createdAt,
  };
}

export async function getAdminInvitations(): Promise<Invitation[]> {
  if (!prisma) return demoInvitations;

  const invitations = await prisma.invitation.findMany({
    include: { template: { select: { slug: true } } },
    orderBy: { createdAt: "desc" },
  });
  return invitations.map(toInvitation);
}

export async function getAdminOrders(): Promise<OrderRequest[]> {
  if (!prisma) return demoOrders;

  const orders = await prisma.orderRequest.findMany({
    include: { template: { select: { slug: true } } },
    orderBy: { createdAt: "desc" },
  });
  return orders.map(toOrder);
}

export async function getAdminGuests(): Promise<GuestRsvp[]> {
  if (!prisma) return demoGuests;

  const guests = await prisma.guestRsvp.findMany({
    include: { invitation: { select: { code: true } } },
    orderBy: { createdAt: "desc" },
  });

  return guests.map((guest: any) => ({
    id: guest.id,
    invitationCode: guest.invitation.code,
    name: guest.name,
    phone: guest.phone,
    attendees: guest.attendees,
    status: guest.status === "CONFIRMED" ? "confirmed" : "declined",
    note: guest.note || undefined,
    createdAt: guest.createdAt.toISOString(),
  }));
}

export async function getAdminCustomers(): Promise<AdminCustomer[]> {
  if (!prisma) {
    return [
      {
        id: "cus_001",
        name: "بدر و سارة",
        phone: "01012345678",
        username: "badr-sarah",
        isActive: true,
        invitations: 1,
        createdAt: "2026-06-01T10:00:00.000Z",
      },
    ];
  }

  const customers = await prisma.customer.findMany({
    include: { _count: { select: { invitations: true } } },
    orderBy: { createdAt: "desc" },
  });

  return customers.map((customer: any) => ({
    id: customer.id,
    name: customer.name,
    phone: customer.phone,
    email: customer.email || undefined,
    username: customer.username,
    isActive: customer.isActive,
    invitations: customer._count.invitations,
    createdAt: customer.createdAt.toISOString(),
  }));
}
