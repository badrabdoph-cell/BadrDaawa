import { readFile } from "node:fs/promises";
import path from "node:path";
import { unstable_noStore as noStore } from "next/cache";
import { readAppSettingOrSeed, writeAppSetting } from "./app-settings";
import { cleanNewDirectAudioUrl, cleanPlayableAudioUrl, isUploadedMusicUrl } from "./audio-files";
import { statUploadFile } from "./storage-provider";
import type { Invitation } from "./types";

export type MusicSourceKind = "upload" | "url";

export type MusicSlot = {
  id: string;
  name: string;
  url: string;
  enabled: boolean;
  applyToAll: boolean;
  templateSlugs: string[];
  updatedAt: string;
  createdAt?: string;
  source?: MusicSourceKind;
  sizeBytes?: number;
  mimeType?: string;
  extension?: string;
  durationSeconds?: number;
};

export type MusicLibrary = {
  slots: MusicSlot[];
};

export type ResolvedInvitationMusic = {
  enabled: boolean;
  url: string;
  source: "disabled" | "invitation" | "library" | "default" | "none";
  track?: MusicSlot;
};

const libraryPath = path.join(process.cwd(), "data", "music-library.json");
const libraryKey = "music-library";
const defaultSlotId = "global-track";

const defaultMusicSlot: MusicSlot = {
  id: defaultSlotId,
  name: "الموسيقى العامة",
  url: "",
  enabled: false,
  applyToAll: true,
  templateSlugs: [],
  updatedAt: "",
  createdAt: "",
  source: "upload",
};

const legacySlotIds = ["track-1", "track-2", "track-3", "track-4", "track-5"];
const legacyMusicSlots: MusicSlot[] = legacySlotIds.map((id, index) => ({
  ...defaultMusicSlot,
  id,
  name: `مقطع ${index + 1}`,
}));

function cleanText(value: string, fallback: string) {
  const text = value.trim().slice(0, 90);
  return text || fallback;
}

function timestamp(value?: string) {
  const parsed = Date.parse(value || "");
  return Number.isNaN(parsed) ? 0 : parsed;
}

function makeTrackId(name: string, existingIds: string[]) {
  const baseName = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\u0600-\u06ff]+/gi, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 36);
  const base = `music-${baseName || Date.now().toString(36)}`;
  let id = base;
  let index = 2;
  while (existingIds.includes(id)) {
    id = `${base}-${index}`;
    index += 1;
  }
  return id;
}

function extensionFromUrl(url: string) {
  const cleanPath = url.split("?")[0].split("#")[0];
  return cleanPath.split(".").pop()?.toLowerCase() || "";
}

function mimeFromExtension(extension: string) {
  if (!extension) return "";
  if (extension === "mp3") return "audio/mpeg";
  if (extension === "m4a") return "audio/mp4";
  if (extension === "flac") return "audio/flac";
  return `audio/${extension}`;
}

function sourceFromUrl(url: string): MusicSourceKind {
  return isUploadedMusicUrl(url) ? "upload" : "url";
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

function normalizeSlot(input: Partial<MusicSlot>, existingIds: string[], fallbackName = "مقطع موسيقى"): MusicSlot | null {
  const url = cleanPlayableAudioUrl(input.url || "");
  const name = cleanText(input.name || "", fallbackName);
  const id = cleanText(input.id || "", makeTrackId(name, existingIds));
  if (!url && id !== defaultSlotId) return null;
  const extension = input.extension || extensionFromUrl(url);

  return {
    id,
    name,
    url,
    enabled: Boolean(input.enabled && url),
    applyToAll: true,
    templateSlugs: [],
    updatedAt: typeof input.updatedAt === "string" ? input.updatedAt : "",
    createdAt: typeof input.createdAt === "string" ? input.createdAt : input.updatedAt || "",
    source: input.source === "url" ? "url" : sourceFromUrl(url),
    sizeBytes: typeof input.sizeBytes === "number" && input.sizeBytes > 0 ? input.sizeBytes : undefined,
    mimeType: input.mimeType || mimeFromExtension(extension),
    extension,
    durationSeconds: typeof input.durationSeconds === "number" && input.durationSeconds > 0 ? input.durationSeconds : undefined,
  };
}

function normalizeMusicLibrary(input: Partial<MusicLibrary>): MusicLibrary {
  const inputSlots = Array.isArray(input.slots) ? input.slots : [];
  const normalized: MusicSlot[] = [];
  const seenUrls = new Set<string>();
  const seenIds = new Set<string>();

  for (const rawSlot of [...inputSlots, ...legacyMusicSlots]) {
    const slot = normalizeSlot(rawSlot, Array.from(seenIds), defaultMusicSlot.name);
    if (!slot) continue;
    if (slot.url && seenUrls.has(slot.url)) continue;
    if (seenIds.has(slot.id)) slot.id = makeTrackId(slot.name, Array.from(seenIds));
    seenIds.add(slot.id);
    if (slot.url) seenUrls.add(slot.url);
    normalized.push(slot);
  }

  if (!normalized.length) normalized.push({ ...defaultMusicSlot });
  normalized.sort((a, b) => timestamp(b.updatedAt || b.createdAt) - timestamp(a.updatedAt || a.createdAt));
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

async function enrichMusicSlot(slot: MusicSlot): Promise<MusicSlot> {
  if (!isUploadedMusicUrl(slot.url)) return slot;
  try {
    const fileStat = await statUploadFile(slot.url);
    if (!fileStat) return slot;
    const extension = slot.extension || extensionFromUrl(slot.url);
    return {
      ...slot,
      sizeBytes: slot.sizeBytes || fileStat.size,
      extension,
      mimeType: slot.mimeType || mimeFromExtension(extension),
      createdAt: slot.createdAt || fileStat.lastModified?.toISOString() || "",
      updatedAt: slot.updatedAt || fileStat.lastModified?.toISOString() || "",
      source: "upload",
    };
  } catch {
    return slot;
  }
}

async function writeMusicLibrary(library: MusicLibrary) {
  await writeAppSetting(libraryKey, normalizeMusicLibrary(library));
}

export async function getMusicLibrary() {
  noStore();
  const normalized = normalizeMusicLibrary(await readAppSettingOrSeed(libraryKey, readMusicLibraryFile));
  return { slots: await Promise.all(normalized.slots.map(enrichMusicSlot)) };
}

export function getActiveMusicSlot(library: MusicLibrary) {
  return library.slots.find((slot) => slot.enabled && slot.url);
}

export const getDefaultMusicSlot = getActiveMusicSlot;

export function getMusicSlotByIdOrUrl(library: MusicLibrary, value?: string | null) {
  const clean = (value || "").trim();
  if (!clean) return undefined;
  return library.slots.find((slot) => slot.id === clean || slot.url === clean);
}

export function getMusicUsage(invitations: Pick<Invitation, "musicEnabled" | "musicUrl">[], library: MusicLibrary) {
  const usageByUrl = new Map<string, number>();
  const defaultUrl = getDefaultMusicSlot(library)?.url || "";
  let customInvitationCount = 0;
  let defaultInvitationCount = 0;

  for (const invitation of invitations) {
    if (!invitation.musicEnabled) continue;
    const musicUrl = invitation.musicUrl || "";
    if (musicUrl) {
      usageByUrl.set(musicUrl, (usageByUrl.get(musicUrl) || 0) + 1);
      if (!library.slots.some((slot) => slot.url === musicUrl)) customInvitationCount += 1;
    } else {
      defaultInvitationCount += 1;
      if (defaultUrl) usageByUrl.set(defaultUrl, (usageByUrl.get(defaultUrl) || 0) + 1);
    }
  }

  return {
    usageByUrl,
    customInvitationCount,
    defaultInvitationCount,
    mostUsedTrack: library.slots
      .map((slot) => ({ slot, count: usageByUrl.get(slot.url) || 0 }))
      .sort((a, b) => b.count - a.count)[0],
  };
}

export function resolveInvitationMusic({
  invitation,
  library,
  fallbackMusicUrl = "",
  disableMusic = false,
}: {
  invitation: Pick<Invitation, "musicEnabled" | "musicUrl">;
  library: MusicLibrary;
  fallbackMusicUrl?: string;
  disableMusic?: boolean;
}): ResolvedInvitationMusic {
  if (disableMusic || invitation.musicEnabled === false) return { enabled: false, url: "", source: "disabled" };

  const invitationUrl = cleanPlayableAudioUrl(invitation.musicUrl || "");
  if (invitationUrl) {
    const libraryTrack = library.slots.find((slot) => slot.url === invitationUrl);
    return {
      enabled: true,
      url: invitationUrl,
      source: libraryTrack ? "library" : "invitation",
      track: libraryTrack,
    };
  }

  const defaultTrack = getDefaultMusicSlot(library);
  if (defaultTrack?.url) return { enabled: true, url: defaultTrack.url, source: "default", track: defaultTrack };

  const fallback = cleanPlayableAudioUrl(fallbackMusicUrl);
  if (fallback) return { enabled: true, url: fallback, source: "default" };
  return { enabled: false, url: "", source: "none" };
}

export async function saveMusicSlot(input: { id?: string; name: string; url: string; enabled: boolean; source?: MusicSourceKind; durationSeconds?: number }) {
  const library = await getMusicLibrary();
  const cleanedName = cleanText(input.name, defaultMusicSlot.name);
  const cleanedUrl = input.source === "url" ? cleanNewDirectAudioUrl(input.url) : cleanPlayableAudioUrl(input.url);
  if (!cleanedUrl) return null;

  const existingIndex = input.id ? library.slots.findIndex((slot) => slot.id === input.id) : -1;
  const existingSameNameIndex = library.slots.findIndex((slot) => slot.name.trim().toLowerCase() === cleanedName.toLowerCase());
  const slotIndex = existingIndex >= 0 ? existingIndex : existingSameNameIndex;
  const existingIds = library.slots.map((slot) => slot.id);
  const existing = slotIndex >= 0 ? library.slots[slotIndex] : null;
  const extension = extensionFromUrl(cleanedUrl);
  const now = new Date().toISOString();
  const nextSlot: MusicSlot = {
    id: existing?.id || makeTrackId(cleanedName, existingIds),
    name: cleanedName,
    url: cleanedUrl,
    enabled: input.enabled,
    applyToAll: true,
    templateSlugs: [],
    updatedAt: now,
    createdAt: existing?.createdAt || now,
    source: input.source || sourceFromUrl(cleanedUrl),
    sizeBytes: existing?.url === cleanedUrl ? existing.sizeBytes : undefined,
    mimeType: mimeFromExtension(extension),
    extension,
    durationSeconds: input.durationSeconds || existing?.durationSeconds,
  };

  const nextSlots = slotIndex >= 0 ? library.slots.map((slot, index) => (index === slotIndex ? nextSlot : slot)) : [nextSlot, ...library.slots.filter((slot) => slot.url)];
  await writeMusicLibrary({
    slots: nextSlots.map((slot) => ({
      ...slot,
      enabled: input.enabled ? slot.id === nextSlot.id : slot.enabled && slot.id !== nextSlot.id,
    })),
  });
  return nextSlot;
}

export async function renameMusicSlot(id: string, name: string) {
  const library = await getMusicLibrary();
  const slot = library.slots.find((item) => item.id === id);
  if (!slot) return null;
  const slots = library.slots.map((item) => (item.id === id ? { ...item, name: cleanText(name, item.name), updatedAt: new Date().toISOString() } : item));
  await writeMusicLibrary({ slots });
  return slots.find((item) => item.id === id) || null;
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
  await writeMusicLibrary({ slots });
  return slots.find((item) => item.id === id) || null;
}

export async function deleteMusicSlot(id: string) {
  const library = await getMusicLibrary();
  const slot = library.slots.find((item) => item.id === id);
  if (!slot) return null;
  await writeMusicLibrary({ slots: library.slots.filter((item) => item.id !== id) });
  return slot;
}
