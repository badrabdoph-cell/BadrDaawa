import { unstable_noStore as noStore } from "next/cache";
import { prisma } from "./db";

export type TrashEntityType = "invitation" | "order" | "customer";

export type TrashItem = {
  type: TrashEntityType;
  id: string;
  title: string;
  subtitle: string;
  deletedAt: string;
  createdAt: string;
  meta?: string;
  relatedCount?: number;
  storage: "database" | "file";
};

function dateToString(value: Date | string | null | undefined) {
  if (!value) return "";
  return value instanceof Date ? value.toISOString() : value;
}

export async function getTrashItems(): Promise<TrashItem[]> {
  noStore();

  if (!prisma) return [];

  try {
    const [invitations, orders, customers] = await Promise.all([
      prisma.invitation.findMany({
        where: { deletedAt: { not: null } },
        select: {
          id: true,
          code: true,
          groomName: true,
          brideName: true,
          venue: true,
          deletedAt: true,
          createdAt: true,
          _count: { select: { guests: true, events: true } },
        },
        orderBy: { deletedAt: "desc" },
      }),
      prisma.orderRequest.findMany({
        where: { deletedAt: { not: null } },
        select: {
          id: true,
          orderNumber: true,
          groomName: true,
          brideName: true,
          venue: true,
          deletedAt: true,
          createdAt: true,
        },
        orderBy: { deletedAt: "desc" },
      }),
      prisma.customer.findMany({
        where: { deletedAt: { not: null } },
        select: {
          id: true,
          name: true,
          phone: true,
          username: true,
          deletedAt: true,
          createdAt: true,
          _count: { select: { invitations: true, orders: true } },
        },
        orderBy: { deletedAt: "desc" },
      }),
    ]);

    const databaseItems: TrashItem[] = [
      ...invitations.map((invitation) => ({
        type: "invitation" as const,
        id: invitation.code,
        title: `${invitation.groomName} و ${invitation.brideName}`,
        subtitle: invitation.code,
        deletedAt: dateToString(invitation.deletedAt),
        createdAt: dateToString(invitation.createdAt),
        meta: invitation.venue,
        relatedCount: invitation._count.guests + invitation._count.events,
        storage: "database" as const,
      })),
      ...orders.map((order) => ({
        type: "order" as const,
        id: order.id,
        title: `${order.groomName} و ${order.brideName}`,
        subtitle: order.orderNumber || order.id,
        deletedAt: dateToString(order.deletedAt),
        createdAt: dateToString(order.createdAt),
        meta: order.venue,
        storage: "database" as const,
      })),
      ...customers.map((customer) => ({
        type: "customer" as const,
        id: customer.id,
        title: customer.name,
        subtitle: customer.username,
        deletedAt: dateToString(customer.deletedAt),
        createdAt: dateToString(customer.createdAt),
        meta: customer.phone,
        relatedCount: customer._count.invitations + customer._count.orders,
        storage: "database" as const,
      })),
    ];

    return databaseItems.sort((a, b) => new Date(b.deletedAt).getTime() - new Date(a.deletedAt).getTime());
  } catch (error) {
    console.error("Failed to load database trash items", error);
    return [];
  }
}

export async function restoreTrashItem(type: TrashEntityType, id: string, storage: "database" | "file" = "database") {
  if (storage === "file") {
    return false;
  }
  if (!prisma) return false;

  if (type === "invitation") {
    const result = await prisma.invitation.updateMany({ where: { code: id, deletedAt: { not: null } }, data: { deletedAt: null, status: "ACTIVE" } });
    return result.count > 0;
  }

  if (type === "order") {
    const result = await prisma.orderRequest.updateMany({ where: { id, deletedAt: { not: null } }, data: { deletedAt: null } });
    return result.count > 0;
  }

  const result = await prisma.customer.updateMany({ where: { id, deletedAt: { not: null } }, data: { deletedAt: null, isActive: true } });
  return result.count > 0;
}

export async function hardDeleteTrashItem(type: TrashEntityType, id: string, storage: "database" | "file" = "database") {
  if (storage === "file") {
    return false;
  }
  if (!prisma) return false;

  if (type === "invitation") {
    const result = await prisma.invitation.deleteMany({ where: { code: id, deletedAt: { not: null } } });
    return result.count > 0;
  }

  if (type === "order") {
    const result = await prisma.orderRequest.deleteMany({ where: { id, deletedAt: { not: null } } });
    return result.count > 0;
  }

  const result = await prisma.customer.deleteMany({ where: { id, deletedAt: { not: null } } });
  return result.count > 0;
}
