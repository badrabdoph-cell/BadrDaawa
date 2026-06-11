import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { unstable_noStore as noStore } from "next/cache";
import { prisma } from "./db";
import type { ClientMessage } from "./types";

type ClientMessageStore = {
  messages: ClientMessage[];
};

const messageStorePath = path.join(process.cwd(), "data", "client-messages.json");
const maxMessageLength = 3000;
const maxTitleLength = 120;

function cleanText(value: string, limit: number) {
  return value.trim().replace(/\r\n/g, "\n").slice(0, limit);
}

function createEmptyStore(): ClientMessageStore {
  return { messages: [] };
}

function normalizeMessage(value: unknown): ClientMessage | null {
  if (!value || typeof value !== "object") return null;
  const raw = value as Partial<ClientMessage>;
  if (!raw.id || !raw.invitationCode || !raw.body || !raw.createdAt) return null;
  return {
    id: String(raw.id),
    invitationCode: String(raw.invitationCode),
    title: cleanText(String(raw.title || "رسالة من الإدارة"), maxTitleLength) || "رسالة من الإدارة",
    body: cleanText(String(raw.body || ""), maxMessageLength),
    sender: "admin",
    createdAt: String(raw.createdAt),
    ...(raw.readAt ? { readAt: String(raw.readAt) } : {}),
  };
}

async function readMessageStore(): Promise<ClientMessageStore> {
  noStore();
  try {
    const raw = await readFile(messageStorePath, "utf8");
    const parsed = JSON.parse(raw) as Partial<ClientMessageStore>;
    return {
      messages: Array.isArray(parsed.messages) ? parsed.messages.map(normalizeMessage).filter((message): message is ClientMessage => Boolean(message)) : [],
    };
  } catch {
    return createEmptyStore();
  }
}

async function writeMessageStore(store: ClientMessageStore) {
  await mkdir(path.dirname(messageStorePath), { recursive: true });
  await writeFile(messageStorePath, `${JSON.stringify(store, null, 2)}\n`, "utf8");
}

function toClientMessage(row: {
  id: string;
  invitationCode: string;
  title: string;
  body: string;
  sender: string;
  createdAt: Date;
  readAt: Date | null;
}): ClientMessage {
  return {
    id: row.id,
    invitationCode: row.invitationCode,
    title: row.title,
    body: row.body,
    sender: "admin",
    createdAt: row.createdAt.toISOString(),
    ...(row.readAt ? { readAt: row.readAt.toISOString() } : {}),
  };
}

export async function getAllClientMessages() {
  if (prisma) {
    try {
      const messages = await prisma.clientMessage.findMany({ orderBy: { createdAt: "desc" } });
      if (messages.length) return messages.map(toClientMessage);
    } catch (error) {
      console.error("Failed to load client messages from PostgreSQL", error);
    }
  }
  const store = await readMessageStore();
  return store.messages.sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
}

export async function getClientMessages(invitationCode: string) {
  const cleanCode = invitationCode.trim().toLowerCase();
  const messages = await getAllClientMessages();
  return messages.filter((message) => message.invitationCode.toLowerCase() === cleanCode);
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
