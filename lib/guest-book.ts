import { prisma } from "./db";
import type { CoupleMessagesSettings, GuestBookMessage, GuestBookMode, GuestBookStatus } from "./types";

export type GuestBookAction = "approve" | "reject" | "delete";
export type GuestBookBulkAction = "bulk-delete-all" | "bulk-delete-pending" | "bulk-delete-rejected" | "bulk-delete-invitation" | "bulk-approve-pending" | "bulk-selected-delete" | "bulk-selected-approve";
export type CoupleMessagesAdminAction = GuestBookAction | GuestBookBulkAction | "edit" | "settings";
export type GuestBookBulkResult = {
  action: GuestBookBulkAction;
  matchedCount: number;
  deletedCount: number;
  approvedCount: number;
  invitationCodes: string[];
  messageIds: string[];
};

export class GuestBookStorageError extends Error {
  constructor(message = "Failed to save guest book message to PostgreSQL") {
    super(message);
    this.name = "GuestBookStorageError";
  }
}

const maxNameLength = 80;
const maxMessageLength = 600;
const fallbackGuestName = "ضيف عزيز";
const defaultMessagesMode: GuestBookMode = "moderated";

function cleanText(value: unknown, limit: number) {
  return (typeof value === "string" ? value : "")
    .replace(/\r\n/g, "\n")
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
    .replace(/[<>]/g, "")
    .trim()
    .slice(0, limit);
}

function normalizeStatus(value: unknown): GuestBookStatus {
  return value === "approved" || value === "rejected" || value === "pending" ? value : "pending";
}

function normalizeMode(value: unknown): GuestBookMode {
  return value === "disabled" || value === "auto" || value === "moderated" ? value : defaultMessagesMode;
}

function createId() {
  return `gb_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function uniqueStrings(values: unknown[]) {
  return Array.from(new Set(values.map((value) => cleanText(value, 180)).filter(Boolean)));
}

function toGuestBookMessage(row: {
  id: string;
  invitationCode: string;
  name: string;
  message: string;
  status: string;
  createdAt: Date;
  reviewedAt: Date | null;
}): GuestBookMessage {
  return {
    id: row.id,
    invitationCode: row.invitationCode,
    name: row.name,
    message: row.message,
    status: normalizeStatus(row.status),
    createdAt: row.createdAt.toISOString(),
    ...(row.reviewedAt ? { reviewedAt: row.reviewedAt.toISOString() } : {}),
  };
}

export async function getAllGuestBookMessages() {
  if (prisma) {
    try {
      const messages = await prisma.guestBookMessage.findMany({ orderBy: { createdAt: "desc" } });
      return messages.map(toGuestBookMessage);
    } catch (error) {
      console.error("Failed to load guest book messages from PostgreSQL", error);
    }
  }
  return [];
}

export async function getGuestBookMessages(invitationCode: string, status: GuestBookStatus | "all" = "all") {
  const cleanCode = invitationCode.trim().toLowerCase();
  const messages = await getAllGuestBookMessages();
  return messages.filter((message) => {
    const matchesCode = message.invitationCode.toLowerCase() === cleanCode;
    const matchesStatus = status === "all" || message.status === status;
    return matchesCode && matchesStatus;
  });
}

export async function getApprovedGuestBookMessages(invitationCode: string) {
  return getGuestBookMessages(invitationCode, "approved");
}

export async function getCoupleMessagesSettings(invitationCode: string): Promise<CoupleMessagesSettings> {
  const cleanCode = cleanText(invitationCode, 160);
  if (prisma && cleanCode) {
    try {
      const saved = await prisma.coupleMessagesSetting.findUnique({ where: { invitationCode: cleanCode } });
      if (saved) return { invitationCode: saved.invitationCode, mode: normalizeMode(saved.mode), updatedAt: saved.updatedAt.toISOString() };
    } catch (error) {
      console.error("Failed to load couple messages settings from PostgreSQL", error);
    }
  }
  return { invitationCode: cleanCode, mode: defaultMessagesMode };
}

export async function getAllCoupleMessagesSettings() {
  if (prisma) {
    try {
      const settings = await prisma.coupleMessagesSetting.findMany({ orderBy: { updatedAt: "desc" } });
      return settings.map((setting) => ({ invitationCode: setting.invitationCode, mode: normalizeMode(setting.mode), updatedAt: setting.updatedAt.toISOString() }));
    } catch (error) {
      console.error("Failed to load all couple messages settings from PostgreSQL", error);
    }
  }
  return [];
}

export async function updateCoupleMessagesSettings(invitationCode: unknown, mode: unknown) {
  const cleanCode = cleanText(invitationCode, 160);
  if (!cleanCode) return null;
  const next: CoupleMessagesSettings = {
    invitationCode: cleanCode,
    mode: normalizeMode(mode),
    updatedAt: new Date().toISOString(),
  };
  if (!prisma) {
    console.error("[Guest Book] PostgreSQL is not configured. Refusing couple settings JSON write.");
    return null;
  }
  try {
    const saved = await prisma.coupleMessagesSetting.upsert({
      where: { invitationCode: cleanCode },
      update: { mode: next.mode },
      create: { invitationCode: cleanCode, mode: next.mode },
    });
    return { invitationCode: saved.invitationCode, mode: normalizeMode(saved.mode), updatedAt: saved.updatedAt.toISOString() };
  } catch (error) {
    console.error("Failed to save couple messages settings to PostgreSQL", error);
    return null;
  }
}

export async function getGuestBookMessage(id: string) {
  const cleanId = id.trim();
  if (!cleanId || !prisma) return null;
  const row = await prisma.guestBookMessage.findUnique({ where: { id: cleanId } }).catch(() => null);
  return row ? toGuestBookMessage(row) : null;
}

export async function getCoupleMessagesStats(invitationCode?: string) {
  const cleanCode = invitationCode ? invitationCode.trim().toLowerCase() : "";
  const messages = cleanCode ? await getGuestBookMessages(cleanCode, "all") : await getAllGuestBookMessages();
  return {
    total: messages.length,
    pending: messages.filter((message) => message.status === "pending").length,
    published: messages.filter((message) => message.status === "approved").length,
    rejected: messages.filter((message) => message.status === "rejected").length,
  };
}

export async function createGuestBookMessage(input: { invitationCode: unknown; name: unknown; message: unknown; status?: unknown }) {
  const invitationCode = cleanText(input.invitationCode, 160);
  const name = cleanText(input.name, maxNameLength);
  const message = cleanText(input.message, maxMessageLength);
  if (!invitationCode || !name || !message) return null;

  const guestMessage: GuestBookMessage = {
    id: createId(),
    invitationCode,
    name,
    message,
    status: normalizeStatus(input.status),
    createdAt: new Date().toISOString(),
  };
  if (!prisma) {
    console.error("[Guest Book] PostgreSQL is not configured. Refusing guest-book JSON write.");
    throw new GuestBookStorageError("PostgreSQL is not configured for guest book writes.");
  }
  try {
    const saved = await prisma.guestBookMessage.create({
      data: {
        id: guestMessage.id,
        invitationCode,
        name,
        message,
        status: guestMessage.status,
      },
    });
    return toGuestBookMessage(saved);
  } catch (error) {
    console.error("Failed to save guest book message to PostgreSQL", error);
    throw new GuestBookStorageError();
  }
}

export async function updateGuestBookMessage(id: string, input: { name?: unknown; message?: unknown; status?: unknown }) {
  const cleanId = id.trim();
  if (!cleanId) return null;
  if (!prisma) {
    console.error("[Guest Book] PostgreSQL is not configured. Refusing guest-book JSON write.");
    return null;
  }
  const target = await prisma.guestBookMessage.findUnique({ where: { id: cleanId } }).catch(() => null);
  if (!target) return null;

  const nextName = input.name === undefined ? target.name : cleanText(input.name, maxNameLength);
  const nextMessage = input.message === undefined ? target.message : cleanText(input.message, maxMessageLength);
  if (!nextName || !nextMessage) return null;

  const nextStatus = input.status === undefined ? normalizeStatus(target.status) : normalizeStatus(input.status);
  const reviewedAt = input.status !== undefined && nextStatus !== normalizeStatus(target.status) ? new Date() : target.reviewedAt;
  const updated = await prisma.guestBookMessage.update({
    where: { id: cleanId },
    data: { name: nextName, message: nextMessage, status: nextStatus, reviewedAt },
  });
  return toGuestBookMessage(updated);
}

export async function moderateGuestBookMessage(id: string, action: GuestBookAction) {
  const cleanId = id.trim();
  if (!cleanId) return null;
  if (!prisma) {
    console.error("[Guest Book] PostgreSQL is not configured. Refusing guest-book JSON write.");
    return null;
  }
  const target = await prisma.guestBookMessage.findUnique({ where: { id: cleanId } }).catch(() => null);
  if (!target) return null;

  if (action === "delete") {
    await prisma.guestBookMessage.delete({ where: { id: cleanId } });
    return { message: toGuestBookMessage(target), deleted: true };
  }

  const nextStatus: GuestBookStatus = action === "approve" ? "approved" : "rejected";
  const updated = await prisma.guestBookMessage.update({ where: { id: cleanId }, data: { status: nextStatus, reviewedAt: new Date() } });
  return { message: toGuestBookMessage(updated), deleted: false };
}

export async function countGuestBookBulkTargets(action: GuestBookBulkAction, input: { invitationCode?: unknown; messageIds?: unknown[] } = {}) {
  if (!prisma) return 0;
  const invitationCode = cleanText(input.invitationCode, 160);
  const ids = uniqueStrings(input.messageIds || []);
  const where =
    action === "bulk-delete-all"
      ? {}
      : action === "bulk-delete-pending" || action === "bulk-approve-pending"
        ? { status: "pending" }
        : action === "bulk-delete-rejected"
          ? { status: "rejected" }
          : action === "bulk-delete-invitation"
            ? invitationCode
              ? { invitationCode }
              : { id: "__missing__" }
            : ids.length
              ? { id: { in: ids }, ...(action === "bulk-selected-approve" ? { status: "pending" } : {}) }
              : { id: "__missing__" };
  return prisma.guestBookMessage.count({ where });
}

export async function bulkModerateGuestBookMessages(action: GuestBookBulkAction, input: { invitationCode?: unknown; messageIds?: unknown[] } = {}): Promise<GuestBookBulkResult | null> {
  if (!prisma) {
    console.error("[Guest Book] PostgreSQL is not configured. Refusing guest-book bulk write.");
    return null;
  }

  const invitationCode = cleanText(input.invitationCode, 160);
  const ids = uniqueStrings(input.messageIds || []);
  const where =
    action === "bulk-delete-all"
      ? {}
      : action === "bulk-delete-pending" || action === "bulk-approve-pending"
        ? { status: "pending" }
        : action === "bulk-delete-rejected"
          ? { status: "rejected" }
          : action === "bulk-delete-invitation"
            ? invitationCode
              ? { invitationCode }
              : { id: "__missing__" }
            : ids.length
              ? { id: { in: ids }, ...(action === "bulk-selected-approve" ? { status: "pending" } : {}) }
              : { id: "__missing__" };

  const targets = await prisma.guestBookMessage.findMany({ where, select: { id: true, invitationCode: true } });
  if (!targets.length) {
    return { action, matchedCount: 0, deletedCount: 0, approvedCount: 0, invitationCodes: [], messageIds: [] };
  }

  if (action === "bulk-approve-pending" || action === "bulk-selected-approve") {
    const updated = await prisma.guestBookMessage.updateMany({
      where: { id: { in: targets.map((target) => target.id) }, status: "pending" },
      data: { status: "approved", reviewedAt: new Date() },
    });
    return {
      action,
      matchedCount: targets.length,
      deletedCount: 0,
      approvedCount: updated.count,
      invitationCodes: Array.from(new Set(targets.map((target) => target.invitationCode))),
      messageIds: targets.map((target) => target.id),
    };
  }

  const deleted = await prisma.guestBookMessage.deleteMany({ where: { id: { in: targets.map((target) => target.id) } } });
  return {
    action,
    matchedCount: targets.length,
    deletedCount: deleted.count,
    approvedCount: 0,
    invitationCodes: Array.from(new Set(targets.map((target) => target.invitationCode))),
    messageIds: targets.map((target) => target.id),
  };
}
