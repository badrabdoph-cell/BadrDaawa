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
const globalSlotId = "global-track";

export const defaultMusicSlots: MusicSlot[] = [
  {
    id: globalSlotId,
    name: "الموسيقى العامة",
    url: "",
    enabled: true,
    applyToAll: true,
    templateSlugs: [],
    updatedAt: "",
  },
];

const legacySlotIds = ["track-1", "track-2", "track-3", "track-4", "track-5"];
const legacyMusicSlots: MusicSlot[] = legacySlotIds.map((id, index) => ({
  id,
  name: `مقطع ${index + 1}`,
  url: "",
  enabled: true,
  applyToAll: false,
  templateSlugs: [],
  updatedAt: "",
}));

function cleanUrl(value: string) {
  return cleanPlayableAudioUrl(value);
}

function cleanText(value: string, fallback: string) {
  const text = value.trim().slice(0, 90);
  return text || fallback;
}

function timestamp(value?: string) {
  const parsed = Date.parse(value || "");
  return Number.isNaN(parsed) ? 0 : parsed;
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

function normalizeMusicLibrary(input: Partial<MusicLibrary>): MusicLibrary {
  const inputSlots = Array.isArray(input.slots) ? input.slots : [];
  const legacyFallback = [...inputSlots, ...legacyMusicSlots]
    .filter((slot) => slot?.url)
    .sort((a, b) => timestamp(b.updatedAt) - timestamp(a.updatedAt))[0];

  const slots = defaultMusicSlots.map((fallback) => {
    const incoming = inputSlots.find((slot) => slot?.id === fallback.id) || legacyFallback;
    return {
      id: fallback.id,
      name: cleanText(incoming?.name || "", fallback.name),
      url: cleanUrl(incoming?.url || ""),
      enabled: incoming?.enabled !== false,
      applyToAll: true,
      templateSlugs: [],
      updatedAt: typeof incoming?.updatedAt === "string" ? incoming.updatedAt : "",
    };
  });

  return { slots };
}

async function writeMusicLibrary(library: MusicLibrary) {
  await mkdir(path.dirname(libraryPath), { recursive: true });
  await writeFile(libraryPath, `${JSON.stringify(library, null, 2)}\n`, "utf8");
}

export async function getMusicLibrary() {
  noStore();
  return normalizeMusicLibrary(await readMusicLibraryFile());
}

export async function updateMusicSlot(input: {
  id: string;
  name: string;
  url: string;
  enabled: boolean;
  applyToAll: boolean;
  templateSlugs: string[];
}) {
  const library = await getMusicLibrary();
  const slotIndex = library.slots.findIndex((slot) => slot.id === input.id);
  if (slotIndex < 0) return null;

  const fallback = defaultMusicSlots[slotIndex];
  library.slots[slotIndex] = {
    id: fallback.id,
    name: cleanText(input.name, fallback.name),
    url: cleanUrl(input.url),
    enabled: input.enabled,
    applyToAll: true,
    templateSlugs: [],
    updatedAt: new Date().toISOString(),
  };

  await writeMusicLibrary(library);
  return library.slots[slotIndex];
}
