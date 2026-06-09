import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { unstable_noStore as noStore } from "next/cache";
import type { GuestBookMessage, GuestBookStatus } from "./types";

type GuestBookStore = {
  messages: GuestBookMessage[];
};

export type GuestBookAction = "approve" | "reject" | "delete";

const storePath = path.join(process.cwd(), "data", "guest-book.json");
const maxNameLength = 80;
const maxMessageLength = 600;
const fallbackGuestName = "ضيف عزيز";

function cleanText(value: unknown, limit: number) {
  return (typeof value === "string" ? value : "")
    .replace(/\r\n/g, "\n")
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
    .replace(/[<>]/g, "")
    .trim()
    .slice(0, limit);
}

function createEmptyStore(): GuestBookStore {
  return { messages: [] };
}

function normalizeStatus(value: unknown): GuestBookStatus {
  return value === "approved" || value === "rejected" || value === "pending" ? value : "pending";
}

function normalizeMessage(value: unknown): GuestBookMessage | null {
  if (!value || typeof value !== "object") return null;
  const raw = value as Partial<GuestBookMessage>;
  const id = cleanText(raw.id, 120);
  const invitationCode = cleanText(raw.invitationCode, 160);
  const name = cleanText(raw.name, maxNameLength) || fallbackGuestName;
  const message = cleanText(raw.message, maxMessageLength);
  const createdAt = cleanText(raw.createdAt, 80);
  if (!id || !invitationCode || !message || !createdAt) return null;
  return {
    id,
    invitationCode,
    name,
    message,
    status: normalizeStatus(raw.status),
    createdAt,
    ...(raw.reviewedAt ? { reviewedAt: cleanText(raw.reviewedAt, 80) } : {}),
  };
}

async function readStore(): Promise<GuestBookStore> {
  noStore();
  try {
    const raw = await readFile(storePath, "utf8");
    const parsed = JSON.parse(raw) as Partial<GuestBookStore>;
    return {
      messages: Array.isArray(parsed.messages) ? parsed.messages.map(normalizeMessage).filter((message): message is GuestBookMessage => Boolean(message)) : [],
    };
  } catch {
    return createEmptyStore();
  }
}

async function writeStore(store: GuestBookStore) {
  await mkdir(path.dirname(storePath), { recursive: true });
  await writeFile(storePath, `${JSON.stringify(store, null, 2)}\n`, "utf8");
}

function createId() {
  return `gb_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export async function getAllGuestBookMessages() {
  const store = await readStore();
  return store.messages.sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
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

export async function createGuestBookMessage(input: { invitationCode: unknown; name: unknown; message: unknown }) {
  const invitationCode = cleanText(input.invitationCode, 160);
  const name = cleanText(input.name, maxNameLength);
  const message = cleanText(input.message, maxMessageLength);
  if (!invitationCode || !name || !message) return null;

  const store = await readStore();
  const guestMessage: GuestBookMessage = {
    id: createId(),
    invitationCode,
    name,
    message,
    status: "pending",
    createdAt: new Date().toISOString(),
  };
  store.messages.unshift(guestMessage);
  await writeStore(store);
  return guestMessage;
}

export async function moderateGuestBookMessage(id: string, action: GuestBookAction) {
  const cleanId = id.trim();
  if (!cleanId) return null;
  const store = await readStore();
  const target = store.messages.find((message) => message.id === cleanId);
  if (!target) return null;

  if (action === "delete") {
    store.messages = store.messages.filter((message) => message.id !== cleanId);
    await writeStore(store);
    return { message: target, deleted: true };
  }

  const nextStatus: GuestBookStatus = action === "approve" ? "approved" : "rejected";
  const reviewedAt = new Date().toISOString();
  store.messages = store.messages.map((message) => (message.id === cleanId ? { ...message, status: nextStatus, reviewedAt } : message));
  await writeStore(store);
  return { message: { ...target, status: nextStatus, reviewedAt }, deleted: false };
}
