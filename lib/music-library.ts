import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { unstable_noStore as noStore } from "next/cache";
import { cleanPlayableAudioUrl } from "./audio-files";

export type MusicSlot = {
  id: string;
  name: string;
  url: string;
  enabled: boolean;
  applyToAll: boolean;
  templateSlugs: string[];
  updatedAt: string;
};

export type MusicLibrary = {
  slots: MusicSlot[];
};

const libraryPath = path.join(process.cwd(), "data", "music-library.json");
const defaultSlotId = "global-track";

const defaultMusicSlot: MusicSlot = {
  id: defaultSlotId,
  name: "الموسيقى العامة",
  url: "",
  enabled: false,
  applyToAll: true,
  templateSlugs: [],
  updatedAt: "",
};

const legacySlotIds = ["track-1", "track-2", "track-3", "track-4", "track-5"];
const legacyMusicSlots: MusicSlot[] = legacySlotIds.map((id, index) => ({
  id,
  name: `مقطع ${index + 1}`,
  url: "",
  enabled: false,
  applyToAll: true,
  templateSlugs: [],
  updatedAt: "",
}));

function cleanText(value: string, fallback: string) {
  const text = value.trim().slice(0, 90);
  return text || fallback;
}

function cleanUrl(value: string) {
  return cleanPlayableAudioUrl(value);
}

function timestamp(value?: string) {
  const parsed = Date.parse(value || "");
  return Number.isNaN(parsed) ? 0 : parsed;
}

function makeTrackId(name: string, existingIds: string[]) {
  const base =
    name
      .trim()
      .toLowerCase()
      .replace(/[^\p{L}\p{N}]+/gu, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 46) || "music-track";
  let id = base;
  let index = 2;
  while (existingIds.includes(id)) {
    id = `${base}-${index}`;
    index += 1;
  }
  return id;
}

async function readMusicLibraryFile(): Promise<Partial<MusicLibrary>> {
  try {
    const raw = await readFile(libraryPath, "utf8");
    const parsed = JSON.parse(raw) as unknown;
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? (parsed as Partial<MusicLibrary>) : {};
  } catch {
    return {};
  }
}

function normalizeSlot(input: Partial<MusicSlot>, fallbackName = "مقطع موسيقى"): MusicSlot | null {
  const url = cleanUrl(input.url || "");
  const name = cleanText(input.name || "", fallbackName);
  const id = cleanText(input.id || "", makeTrackId(name, []));
  if (!url && id !== defaultSlotId) return null;

  return {
    id,
    name,
    url,
    enabled: Boolean(input.enabled && url),
    applyToAll: true,
    templateSlugs: [],
    updatedAt: typeof input.updatedAt === "string" ? input.updatedAt : "",
  };
}

function normalizeMusicLibrary(input: Partial<MusicLibrary>): MusicLibrary {
  const inputSlots = Array.isArray(input.slots) ? input.slots : [];
  const normalized: MusicSlot[] = [];
  const seenUrls = new Set<string>();
  const seenIds = new Set<string>();

  for (const rawSlot of [...inputSlots, ...legacyMusicSlots]) {
    const slot = normalizeSlot(rawSlot, defaultMusicSlot.name);
    if (!slot) continue;
    if (slot.url && seenUrls.has(slot.url)) continue;
    if (seenIds.has(slot.id)) slot.id = makeTrackId(slot.name, Array.from(seenIds));
    seenIds.add(slot.id);
    if (slot.url) seenUrls.add(slot.url);
    normalized.push(slot);
  }

  if (!normalized.length) normalized.push({ ...defaultMusicSlot });

  normalized.sort((a, b) => timestamp(b.updatedAt) - timestamp(a.updatedAt));
  const activeIndex = normalized.findIndex((slot) => slot.enabled && slot.url);

  return {
    slots: normalized.map((slot, index) => ({
      ...slot,
      enabled: activeIndex >= 0 ? index === activeIndex : false,
      applyToAll: true,
      templateSlugs: [],
    })),
  };
}

async function writeMusicLibrary(library: MusicLibrary) {
  await mkdir(path.dirname(libraryPath), { recursive: true });
  await writeFile(libraryPath, `${JSON.stringify(library, null, 2)}\n`, "utf8");
}

export async function getMusicLibrary() {
  noStore();
  return normalizeMusicLibrary(await readMusicLibraryFile());
}

export function getActiveMusicSlot(library: MusicLibrary) {
  return library.slots.find((slot) => slot.enabled && slot.url);
}

export async function saveMusicSlot(input: { id?: string; name: string; url: string; enabled: boolean }) {
  const library = await getMusicLibrary();
  const cleanedName = cleanText(input.name, defaultMusicSlot.name);
  const cleanedUrl = cleanUrl(input.url);
  if (!cleanedUrl) return null;

  const existingIndex = input.id ? library.slots.findIndex((slot) => slot.id === input.id) : -1;
  const existingSameNameIndex = library.slots.findIndex((slot) => slot.name.trim().toLowerCase() === cleanedName.toLowerCase());
  const slotIndex = existingIndex >= 0 ? existingIndex : existingSameNameIndex;
  const existingIds = library.slots.map((slot) => slot.id);
  const nextSlot: MusicSlot = {
    id: slotIndex >= 0 ? library.slots[slotIndex].id : makeTrackId(cleanedName, existingIds),
    name: cleanedName,
    url: cleanedUrl,
    enabled: input.enabled,
    applyToAll: true,
    templateSlugs: [],
    updatedAt: new Date().toISOString(),
  };

  const nextSlots = slotIndex >= 0 ? library.slots.map((slot, index) => (index === slotIndex ? nextSlot : slot)) : [nextSlot, ...library.slots.filter((slot) => slot.url)];
  const normalized: MusicLibrary = {
    slots: nextSlots.map((slot) => ({
      ...slot,
      enabled: input.enabled ? slot.id === nextSlot.id : slot.enabled && slot.id !== nextSlot.id,
      applyToAll: true,
      templateSlugs: [],
    })),
  };

  await writeMusicLibrary(normalizeMusicLibrary(normalized));
  return nextSlot;
}

export async function setMusicSlotEnabled(id: string, enabled: boolean) {
  const library = await getMusicLibrary();
  const slot = library.slots.find((item) => item.id === id);
  if (!slot?.url) return null;
  const slots = library.slots.map((item) => ({
    ...item,
    enabled: enabled ? item.id === id : item.id === id ? false : item.enabled,
    updatedAt: item.id === id ? new Date().toISOString() : item.updatedAt,
  }));
  await writeMusicLibrary(normalizeMusicLibrary({ slots }));
  return slots.find((item) => item.id === id) || null;
}

export async function deleteMusicSlot(id: string) {
  const library = await getMusicLibrary();
  const slot = library.slots.find((item) => item.id === id);
  if (!slot) return null;
  const slots = library.slots.filter((item) => item.id !== id);
  await writeMusicLibrary(normalizeMusicLibrary({ slots }));
  return slot;
}
