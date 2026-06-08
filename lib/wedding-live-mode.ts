import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { unstable_noStore as noStore } from "next/cache";
import type { WeddingLiveEvent, WeddingLiveModeConfig } from "./types";

type WeddingLiveStore = {
  liveModes: WeddingLiveModeConfig[];
};

export type WeddingLiveModeInput = {
  invitationCode: unknown;
  enabled?: unknown;
  announcement?: unknown;
  events?: unknown;
  updatedBy?: "admin" | "client";
};

const storePath = path.join(process.cwd(), "data", "wedding-live-mode.json");

function cleanText(value: unknown, limit: number) {
  return (typeof value === "string" ? value : "").trim().replace(/\r\n/g, "\n").slice(0, limit);
}

function createEmptyStore(): WeddingLiveStore {
  return { liveModes: [] };
}

function createId(prefix = "evt") {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function normalizeEvent(value: unknown): WeddingLiveEvent | null {
  if (!value || typeof value !== "object") return null;
  const raw = value as Partial<WeddingLiveEvent>;
  const title = cleanText(raw.title, 120);
  if (!title) return null;
  return {
    id: cleanText(raw.id, 120) || createId(),
    time: cleanText(raw.time, 40),
    title,
    ...(raw.description ? { description: cleanText(raw.description, 240) } : {}),
  };
}

function normalizeEvents(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value.map(normalizeEvent).filter((event): event is WeddingLiveEvent => Boolean(event)).slice(0, 12);
}

function normalizeConfig(value: unknown): WeddingLiveModeConfig | null {
  if (!value || typeof value !== "object") return null;
  const raw = value as Partial<WeddingLiveModeConfig>;
  const invitationCode = cleanText(raw.invitationCode, 160);
  if (!invitationCode) return null;
  return {
    invitationCode,
    enabled: raw.enabled === true,
    announcement: cleanText(raw.announcement, 500),
    events: normalizeEvents(raw.events),
    updatedAt: cleanText(raw.updatedAt, 80) || new Date(0).toISOString(),
    updatedBy: raw.updatedBy === "client" ? "client" : "admin",
  };
}

async function readStore(): Promise<WeddingLiveStore> {
  noStore();
  try {
    const raw = await readFile(storePath, "utf8");
    const parsed = JSON.parse(raw) as Partial<WeddingLiveStore>;
    return {
      liveModes: Array.isArray(parsed.liveModes) ? parsed.liveModes.map(normalizeConfig).filter((config): config is WeddingLiveModeConfig => Boolean(config)) : [],
    };
  } catch {
    return createEmptyStore();
  }
}

async function writeStore(store: WeddingLiveStore) {
  await mkdir(path.dirname(storePath), { recursive: true });
  await writeFile(storePath, `${JSON.stringify(store, null, 2)}\n`, "utf8");
}

export function parseLiveModeEventsText(value: unknown) {
  const text = cleanText(value, 4000);
  if (!text) return [];
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [timePart, rest = ""] = line.split("|");
      const [titlePart, descriptionPart = ""] = rest ? rest.split(" - ") : ["", ""];
      const title = cleanText(titlePart || timePart, 120);
      const time = rest ? cleanText(timePart, 40) : "";
      return normalizeEvent({ id: createId(), time, title, description: descriptionPart });
    })
    .filter((event): event is WeddingLiveEvent => Boolean(event))
    .slice(0, 12);
}

export function serializeLiveModeEvents(events: WeddingLiveEvent[]) {
  return events.map((event) => [event.time, `${event.title}${event.description ? ` - ${event.description}` : ""}`].filter(Boolean).join("|")).join("\n");
}

export async function getWeddingLiveMode(invitationCode: string) {
  const cleanCode = invitationCode.trim().toLowerCase();
  const store = await readStore();
  return store.liveModes.find((config) => config.invitationCode.toLowerCase() === cleanCode) || null;
}

export async function getAllWeddingLiveModes() {
  const store = await readStore();
  return store.liveModes.sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt));
}

export async function upsertWeddingLiveMode(input: WeddingLiveModeInput) {
  const invitationCode = cleanText(input.invitationCode, 160);
  if (!invitationCode) return null;

  const store = await readStore();
  const current = store.liveModes.find((config) => config.invitationCode.toLowerCase() === invitationCode.toLowerCase());
  const events = Array.isArray(input.events) ? normalizeEvents(input.events) : current?.events || [];
  const next: WeddingLiveModeConfig = {
    invitationCode,
    enabled: typeof input.enabled === "boolean" ? input.enabled : current?.enabled === true,
    announcement: input.announcement === undefined ? current?.announcement || "" : cleanText(input.announcement, 500),
    events,
    updatedAt: new Date().toISOString(),
    updatedBy: input.updatedBy || "admin",
  };
  store.liveModes = [next, ...store.liveModes.filter((config) => config.invitationCode.toLowerCase() !== invitationCode.toLowerCase())];
  await writeStore(store);
  return next;
}

export async function setWeddingLiveModeEnabled(invitationCode: string, enabled: boolean, updatedBy: "admin" | "client") {
  return upsertWeddingLiveMode({ invitationCode, enabled, updatedBy });
}
