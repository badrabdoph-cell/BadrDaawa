import { readFile } from "node:fs/promises";
import path from "node:path";
import { unstable_noStore as noStore } from "next/cache";
import { writeJsonFileAtomic } from "./atomic-file";
import type { CoupleMessagesSettings, GuestBookMessage, GuestBookMode, GuestBookStatus } from "./types";

type GuestBookStore = {
  messages: GuestBookMessage[];
};

type CoupleMessagesSettingsStore = {
  settings: CoupleMessagesSettings[];
};

export type GuestBookAction = "approve" | "reject" | "delete";
export type CoupleMessagesAdminAction = GuestBookAction | "edit" | "settings";

const storePath = path.join(process.cwd(), "data", "guest-book.json");
const settingsPath = path.join(process.cwd(), "data", "couple-messages-settings.json");
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

function createEmptyStore(): GuestBookStore {
  return { messages: [] };
}

function normalizeStatus(value: unknown): GuestBookStatus {
  return value === "approved" || value === "rejected" || value === "pending" ? value : "pending";
}

function normalizeMode(value: unknown): GuestBookMode {
  return value === "disabled" || value === "auto" || value === "moderated" ? value : defaultMessagesMode;
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

function normalizeSetting(value: unknown): CoupleMessagesSettings | null {
  if (!value || typeof value !== "object") return null;
  const raw = value as Partial<CoupleMessagesSettings>;
  const invitationCode = cleanText(raw.invitationCode, 160);
  if (!invitationCode) return null;
  return {
    invitationCode,
    mode: normalizeMode(raw.mode),
    ...(raw.updatedAt ? { updatedAt: cleanText(raw.updatedAt, 80) } : {}),
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
  await writeJsonFileAtomic(storePath, store);
}

function createEmptySettingsStore(): CoupleMessagesSettingsStore {
  return { settings: [] };
}

async function readSettingsStore(): Promise<CoupleMessagesSettingsStore> {
  noStore();
  try {
    const raw = await readFile(settingsPath, "utf8");
    const parsed = JSON.parse(raw) as Partial<CoupleMessagesSettingsStore>;
    return {
      settings: Array.isArray(parsed.settings) ? parsed.settings.map(normalizeSetting).filter((setting): setting is CoupleMessagesSettings => Boolean(setting)) : [],
    };
  } catch {
    return createEmptySettingsStore();
  }
}

async function writeSettingsStore(store: CoupleMessagesSettingsStore) {
  await writeJsonFileAtomic(settingsPath, store);
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

export async function getCoupleMessagesSettings(invitationCode: string): Promise<CoupleMessagesSettings> {
  const cleanCode = cleanText(invitationCode, 160);
  const store = await readSettingsStore();
  const saved = store.settings.find((setting) => setting.invitationCode.toLowerCase() === cleanCode.toLowerCase());
  return saved || { invitationCode: cleanCode, mode: defaultMessagesMode };
}

export async function getAllCoupleMessagesSettings() {
  const store = await readSettingsStore();
  return store.settings;
}

export async function updateCoupleMessagesSettings(invitationCode: unknown, mode: unknown) {
  const cleanCode = cleanText(invitationCode, 160);
  if (!cleanCode) return null;
  const next: CoupleMessagesSettings = {
    invitationCode: cleanCode,
    mode: normalizeMode(mode),
    updatedAt: new Date().toISOString(),
  };
  const store = await readSettingsStore();
  const index = store.settings.findIndex((setting) => setting.invitationCode.toLowerCase() === cleanCode.toLowerCase());
  if (index >= 0) {
    store.settings[index] = next;
  } else {
    store.settings.push(next);
  }
  await writeSettingsStore(store);
  return next;
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

  const store = await readStore();
  const guestMessage: GuestBookMessage = {
    id: createId(),
    invitationCode,
    name,
    message,
    status: normalizeStatus(input.status),
    createdAt: new Date().toISOString(),
  };
  store.messages.unshift(guestMessage);
  await writeStore(store);
  return guestMessage;
}

export async function updateGuestBookMessage(id: string, input: { name?: unknown; message?: unknown; status?: unknown }) {
  const cleanId = id.trim();
  if (!cleanId) return null;
  const store = await readStore();
  const target = store.messages.find((message) => message.id === cleanId);
  if (!target) return null;

  const nextName = input.name === undefined ? target.name : cleanText(input.name, maxNameLength);
  const nextMessage = input.message === undefined ? target.message : cleanText(input.message, maxMessageLength);
  if (!nextName || !nextMessage) return null;

  const reviewedAt = input.status !== undefined && normalizeStatus(input.status) !== target.status ? new Date().toISOString() : target.reviewedAt;
  const updated: GuestBookMessage = {
    ...target,
    name: nextName,
    message: nextMessage,
    status: input.status === undefined ? target.status : normalizeStatus(input.status),
    ...(reviewedAt ? { reviewedAt } : {}),
  };

  store.messages = store.messages.map((message) => (message.id === cleanId ? updated : message));
  await writeStore(store);
  return updated;
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
