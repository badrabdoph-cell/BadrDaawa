import { prisma } from "./db";
import type { ClientMessage } from "./types";
const maxMessageLength = 3000;
const maxTitleLength = 120;

function cleanText(value: string, limit: number) {
  return value.trim().replace(/\r\n/g, "\n").slice(0, limit);
}

function toClientMessage(row: {
  id: string;
  invitationCode: string;
  title: string;
  body: string;
  sender: string;
  scope: string;
  createdAt: Date;
  readAt: Date | null;
}): ClientMessage {
  return {
    id: row.id,
    invitationCode: row.invitationCode,
    title: row.title,
    body: row.body,
    sender: "admin",
    scope: row.scope === "all" ? "all" : "single",
    createdAt: row.createdAt.toISOString(),
    ...(row.readAt ? { readAt: row.readAt.toISOString() } : {}),
  };
}

export async function getAllClientMessages() {
  if (prisma) {
    try {
      const messages = await prisma.clientMessage.findMany({ orderBy: { createdAt: "desc" } });
      return messages.map(toClientMessage);
    } catch (error) {
      console.error("Failed to load client messages from PostgreSQL", error);
    }
  }
  return [];
}

export async function getClientMessages(invitationCode: string) {
  const cleanCode = invitationCode.trim().toLowerCase();
  const messages = await getAllClientMessages();
  return messages.filter((message) => message.scope === "all" || message.invitationCode.toLowerCase() === cleanCode);
}

export async function getClientUnreadMessageCount(invitationCode: string) {
  const messages = await getClientMessages(invitationCode);
  return messages.filter((message) => !message.readAt).length;
}

export async function getTotalUnreadClientMessages() {
  const messages = await getAllClientMessages();
  return messages.filter((message) => !message.readAt).length;
}

export async function createClientMessage(input: { invitationCode: string; title?: string; body: string }) {
  const invitationCode = cleanText(input.invitationCode, 140);
  const body = cleanText(input.body, maxMessageLength);
  if (!invitationCode || !body) return null;
  const title = cleanText(input.title || "رسالة من الإدارة", maxTitleLength) || "رسالة من الإدارة";
  if (!prisma) {
    console.error("[Client Messages] PostgreSQL is not configured. Refusing JSON write.");
    return null;
  }
  const saved = await prisma.clientMessage.create({
    data: {
      id: `msg_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
      invitationCode,
      title,
      body,
      sender: "admin",
    },
  });
  return toClientMessage(saved);
}

export async function markClientMessageRead(invitationCode: string, messageId?: string) {
  const cleanCode = invitationCode.trim().toLowerCase();
  if (!prisma) {
    console.error("[Client Messages] PostgreSQL is not configured. Refusing JSON write.");
    return false;
  }
  const result = await prisma.clientMessage.updateMany({
    where: {
      invitationCode: { equals: cleanCode, mode: "insensitive" },
      ...(messageId ? { id: messageId } : {}),
      readAt: null,
    },
    data: { readAt: new Date() },
  });
  return result.count > 0;
}
