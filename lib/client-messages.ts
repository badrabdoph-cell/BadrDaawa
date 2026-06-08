import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { unstable_noStore as noStore } from "next/cache";
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

export async function getAllClientMessages() {
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
  const store = await readMessageStore();
  const message: ClientMessage = {
    id: `msg_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
    invitationCode,
    title,
    body,
    sender: "admin",
    createdAt: new Date().toISOString(),
  };
  store.messages.unshift(message);
  await writeMessageStore(store);
  return message;
}

export async function markClientMessageRead(invitationCode: string, messageId?: string) {
  const cleanCode = invitationCode.trim().toLowerCase();
  const now = new Date().toISOString();
  const store = await readMessageStore();
  let changed = false;
  store.messages = store.messages.map((message) => {
    const matchesCode = message.invitationCode.toLowerCase() === cleanCode;
    const matchesMessage = !messageId || message.id === messageId;
    if (!matchesCode || !matchesMessage || message.readAt) return message;
    changed = true;
    return { ...message, readAt: now };
  });
  if (changed) await writeMessageStore(store);
  return changed;
}
