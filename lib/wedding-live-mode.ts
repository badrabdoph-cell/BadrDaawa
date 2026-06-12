import { prisma } from "./db";
import type { WeddingLiveEvent, WeddingLiveModeConfig } from "./types";

export type WeddingLiveModeInput = {
  invitationCode: unknown;
  enabled?: unknown;
  announcement?: unknown;
  events?: unknown;
  updatedBy?: "admin" | "client";
};

function cleanText(value: unknown, limit: number) {
  return (typeof value === "string" ? value : "").trim().replace(/\r\n/g, "\n").slice(0, limit);
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

function toLiveModeConfig(row: {
  invitationCode: string;
  enabled: boolean;
  announcement: string | null;
  events: unknown;
  updatedAt: Date;
  updatedBy: string;
}): WeddingLiveModeConfig {
  return {
    invitationCode: row.invitationCode,
    enabled: row.enabled,
    announcement: row.announcement || "",
    events: normalizeEvents(row.events),
    updatedAt: row.updatedAt.toISOString(),
    updatedBy: row.updatedBy === "client" ? "client" : "admin",
  };
}

export async function getWeddingLiveMode(invitationCode: string) {
  const cleanCode = invitationCode.trim().toLowerCase();
  if (prisma && cleanCode) {
    try {
      const config = await prisma.weddingLiveMode.findUnique({ where: { invitationCode: cleanCode } });
      if (config) return toLiveModeConfig(config);
    } catch (error) {
      console.error("Failed to load wedding live mode from PostgreSQL", error);
    }
  }
  return null;
}

export async function getAllWeddingLiveModes() {
  if (prisma) {
    try {
      const configs = await prisma.weddingLiveMode.findMany({ orderBy: { updatedAt: "desc" } });
      return configs.map(toLiveModeConfig);
    } catch (error) {
      console.error("Failed to load all wedding live modes from PostgreSQL", error);
    }
  }
  return [];
}

export async function upsertWeddingLiveMode(input: WeddingLiveModeInput) {
  const invitationCode = cleanText(input.invitationCode, 160);
  if (!invitationCode) return null;

  if (!prisma) {
    console.error("[Live Mode] PostgreSQL is not configured. Refusing JSON write.");
    return null;
  }
  const current = await getWeddingLiveMode(invitationCode);
  const events = Array.isArray(input.events) ? normalizeEvents(input.events) : current?.events || [];
  const saved = await prisma.weddingLiveMode.upsert({
    where: { invitationCode },
    update: {
      enabled: typeof input.enabled === "boolean" ? input.enabled : current?.enabled === true,
      announcement: input.announcement === undefined ? current?.announcement || "" : cleanText(input.announcement, 500),
      events,
      updatedBy: input.updatedBy || "admin",
    },
    create: {
      invitationCode,
      enabled: typeof input.enabled === "boolean" ? input.enabled : current?.enabled === true,
      announcement: input.announcement === undefined ? current?.announcement || "" : cleanText(input.announcement, 500),
      events,
      updatedBy: input.updatedBy || "admin",
    },
  });
  return toLiveModeConfig(saved);
}

export async function setWeddingLiveModeEnabled(invitationCode: string, enabled: boolean, updatedBy: "admin" | "client") {
  return upsertWeddingLiveMode({ invitationCode, enabled, updatedBy });
}
