import { readFile } from "node:fs/promises";
import path from "node:path";
import { unstable_noStore as noStore } from "next/cache";
import { readAppSettingOrSeed, writeAppSetting } from "./app-settings";

export type ErrorTrackingEvent = {
  id: string;
  route: string;
  message: string;
  stack?: string;
  user: string;
  source?: string;
  digest?: string;
  createdAt: string;
};

export type ErrorTrackingFilters = {
  q?: string;
  route?: string;
  user?: string;
};

type ErrorTrackingStore = {
  events: ErrorTrackingEvent[];
};

type ErrorTrackingInput = {
  route?: string;
  message?: string;
  stack?: string;
  user?: string;
  source?: string;
  digest?: string;
};

const storePath = path.join(process.cwd(), "data", "error-events.json");
const storeKey = "error-events";
const maxStoredEvents = 2500;
const maxMessageLength = 700;
const maxStackLength = 6000;

function createErrorId() {
  return `err-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function trim(value: string, maxLength: number) {
  return value.length <= maxLength ? value : `${value.slice(0, maxLength)}... [trimmed ${value.length - maxLength} chars]`;
}

function cleanText(value: unknown, maxLength: number) {
  return trim(String(value || "").trim(), maxLength);
}

async function readStore(): Promise<ErrorTrackingStore> {
  noStore();
  return readAppSettingOrSeed(storeKey, async () => {
    try {
    const raw = await readFile(storePath, "utf8");
    const parsed = JSON.parse(raw) as Partial<ErrorTrackingStore>;
    return { events: Array.isArray(parsed.events) ? parsed.events : [] };
    } catch {
    return { events: [] };
    }
  });
}

async function writeStore(store: ErrorTrackingStore) {
  await writeAppSetting(storeKey, store);
}

function matches(value: ErrorTrackingEvent, filters: ErrorTrackingFilters) {
  const q = filters.q?.trim().toLowerCase();
  const route = filters.route?.trim().toLowerCase();
  const user = filters.user?.trim().toLowerCase();
  const haystack = [value.route, value.message, value.stack, value.user, value.source, value.digest].join(" ").toLowerCase();
  return (!q || haystack.includes(q)) && (!route || value.route.toLowerCase().includes(route)) && (!user || value.user.toLowerCase().includes(user));
}

export async function recordErrorEvent(input: ErrorTrackingInput) {
  const message = cleanText(input.message || "Unknown error", maxMessageLength);
  if (!message) return null;

  const event: ErrorTrackingEvent = {
    id: createErrorId(),
    route: cleanText(input.route || "unknown-route", 500),
    message,
    stack: input.stack ? cleanText(input.stack, maxStackLength) : undefined,
    user: cleanText(input.user || "unknown", 160),
    source: input.source ? cleanText(input.source, 120) : undefined,
    digest: input.digest ? cleanText(input.digest, 160) : undefined,
    createdAt: new Date().toISOString(),
  };

  const store = await readStore();
  store.events = [event, ...store.events].slice(0, maxStoredEvents);
  await writeStore(store);
  return event;
}

export async function getErrorEvents(filters: ErrorTrackingFilters = {}) {
  const store = await readStore();
  return store.events.filter((event) => matches(event, filters));
}

export function serializeErrorForTracking(error: unknown) {
  if (error instanceof Error) {
    return {
      message: error.message || error.name || "Error",
      stack: error.stack,
    };
  }
  return {
    message: typeof error === "string" ? error : JSON.stringify(error),
    stack: undefined,
  };
}
