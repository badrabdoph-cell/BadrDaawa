import { unstable_noStore as noStore } from "next/cache";
import { prisma } from "./db";

export type CustomerQualityFlag = {
  key: "missing-phone" | "missing-email" | "generated-username";
  label: string;
  severity: "warning" | "danger";
};

export type CustomerProfileTimelineItem = {
  id: string;
  kind: "customer" | "invitation" | "order" | "message" | "guest-book" | "note";
  title: string;
  description?: string;
  href?: string;
  createdAt: string;
};

type CustomerQualityInput = {
  phone?: string | null;
  email?: string | null;
  username?: string | null;
};

function dateToIso(value: Date | string | null | undefined) {
  if (!value) return "";
  if (value instanceof Date) return value.toISOString();
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? String(value) : date.toISOString();
}

function cleanText(value: unknown) {
  return String(value || "").trim();
}

function isGeneratedUsername(username?: string | null) {
  const value = cleanText(username).toLowerCase();
  if (!value.startsWith("client_")) return false;
  return !/^client_\d{7,}$/.test(value);
}

export function getCustomerQualityFlags(customer: CustomerQualityInput): CustomerQualityFlag[] {
  const flags: CustomerQualityFlag[] = [];
  if (!cleanText(customer.phone)) flags.push({ key: "missing-phone", label: "بدون هاتف", severity: "danger" });
  if (!cleanText(customer.email)) flags.push({ key: "missing-email", label: "بدون بريد", severity: "warning" });
  if (isGeneratedUsername(customer.username)) flags.push({ key: "generated-username", label: "اسم دخول مولد", severity: "warning" });
  return flags;
}

export async function getAdminCustomerProfile(id: string) {
  noStore();
  if (!prisma || !id) return null;

  const customer = await prisma.customer
    .findFirst({
      where: { id, deletedAt: null },
      include: {
        invitations: {
          where: { deletedAt: null },
          include: { template: { select: { slug: true, arabicName: true } }, guests: { orderBy: { createdAt: "desc" }, take: 8 } },
          orderBy: { createdAt: "desc" },
        },
        orders: {
          where: { deletedAt: null },
          include: { template: { select: { slug: true, arabicName: true } } },
          orderBy: [{ submittedAt: "desc" }, { createdAt: "desc" }],
        },
      },
    })
    .catch((error) => {
      console.error("[Admin CRM] Failed to load customer profile", error);
      return null;
    });

  if (!customer) return null;

  const invitationCodes = customer.invitations.map((invitation) => invitation.code);
  const [messages, guestBookMessages, invitationNotes, customerNotes] = await Promise.all([
    invitationCodes.length
      ? prisma.clientMessage.findMany({
          where: { OR: [{ invitationCode: { in: invitationCodes } }, { scope: "all" }] },
          orderBy: { createdAt: "desc" },
          take: 50,
        })
      : prisma.clientMessage.findMany({ where: { scope: "all" }, orderBy: { createdAt: "desc" }, take: 50 }),
    invitationCodes.length
      ? prisma.guestBookMessage.findMany({
          where: { invitationCode: { in: invitationCodes } },
          orderBy: { createdAt: "desc" },
          take: 50,
        })
      : [],
    invitationCodes.length
      ? prisma.internalNote.findMany({
          where: { entityType: "invitation", entityId: { in: invitationCodes } },
          orderBy: { updatedAt: "desc" },
          take: 50,
        })
      : [],
    prisma.internalNote.findMany({
      where: { entityType: "customer", entityId: customer.id },
      orderBy: { updatedAt: "desc" },
      take: 50,
    }),
  ]);

  const timeline: CustomerProfileTimelineItem[] = [
    {
      id: `customer-${customer.id}`,
      kind: "customer" as const,
      title: "تم إنشاء حساب العميل",
      description: customer.username,
      createdAt: dateToIso(customer.createdAt),
    },
    ...customer.orders.map((order) => ({
      id: `order-${order.id}`,
      kind: "order" as const,
      title: `طلب دعوة: ${order.groomName} و ${order.brideName}`,
      description: String(order.status),
      href: "/admin/orders",
      createdAt: dateToIso(order.submittedAt || order.createdAt),
    })),
    ...customer.invitations.map((invitation) => ({
      id: `invitation-${invitation.id}`,
      kind: "invitation" as const,
      title: `دعوة: ${invitation.groomName} و ${invitation.brideName}`,
      description: invitation.code,
      href: `/admin/invitations-customers/${encodeURIComponent(invitation.code)}`,
      createdAt: dateToIso(invitation.createdAt),
    })),
    ...messages.map((message) => ({
      id: `message-${message.id}`,
      kind: "message" as const,
      title: message.scope === "all" ? "رسالة عامة من الإدارة" : `رسالة: ${message.title}`,
      description: message.body,
      href: "/admin/messages",
      createdAt: dateToIso(message.createdAt),
    })),
    ...guestBookMessages.map((message) => ({
      id: `guest-book-${message.id}`,
      kind: "guest-book" as const,
      title: `تهنئة من ${message.name}`,
      description: message.message,
      href: "/admin/guest-book",
      createdAt: dateToIso(message.createdAt),
    })),
    ...customerNotes.concat(invitationNotes).map((note) => ({
      id: `note-${note.id}`,
      kind: "note" as const,
      title: note.entityType === "customer" ? "ملاحظة على العميل" : "ملاحظة على دعوة",
      description: note.body,
      createdAt: dateToIso(note.updatedAt || note.createdAt),
    })),
  ].sort((first, second) => second.createdAt.localeCompare(first.createdAt));

  const confirmedGuests = customer.invitations.reduce(
    (sum, invitation) => sum + invitation.guests.filter((guest) => guest.status === "CONFIRMED").reduce((guestSum, guest) => guestSum + Math.max(1, guest.attendees || 1), 0),
    0,
  );

  return {
    customer,
    invitations: customer.invitations,
    orders: customer.orders,
    messages,
    guestBookMessages,
    notes: customerNotes,
    invitationNotes,
    qualityFlags: getCustomerQualityFlags(customer),
    timeline,
    stats: {
      invitations: customer.invitations.length,
      orders: customer.orders.length,
      messages: messages.length,
      unreadMessages: messages.filter((message) => !message.readAt).length,
      guestBookMessages: guestBookMessages.length,
      confirmedGuests,
    },
  };
}
