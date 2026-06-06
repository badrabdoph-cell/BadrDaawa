import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { unstable_noStore as noStore } from "next/cache";

export type MusicSlot = {
  id: string;
  name: string;
  url: string;
  applyToAll: boolean;
  templateSlugs: string[];
  updatedAt: string;
};

export type MusicLibrary = {
  slots: MusicSlot[];
};

const libraryPath = path.join(process.cwd(), "data", "music-library.json");
const slotIds = ["track-1", "track-2", "track-3", "track-4", "track-5"];

export const defaultMusicSlots: MusicSlot[] = slotIds.map((id, index) => ({
  id,
  name: `مقطع ${index + 1}`,
  url: "",
  applyToAll: false,
  templateSlugs: [],
  updatedAt: "",
}));

function cleanUrl(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return "";
  if (trimmed.startsWith("/")) return trimmed;

  try {
    const url = new URL(trimmed);
    return url.protocol === "http:" || url.protocol === "https:" ? url.toString() : "";
  } catch {
    return "";
  }
}

function cleanText(value: string, fallback: string) {
  const text = value.trim().slice(0, 90);
  return text || fallback;
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
  const slots = defaultMusicSlots.map((fallback) => {
    const incoming = Array.isArray(input.slots) ? input.slots.find((slot) => slot?.id === fallback.id) : undefined;
    return {
      id: fallback.id,
      name: cleanText(incoming?.name || "", fallback.name),
      url: cleanUrl(incoming?.url || ""),
      applyToAll: incoming?.applyToAll === true,
      templateSlugs: Array.isArray(incoming?.templateSlugs) ? Array.from(new Set(incoming.templateSlugs.map((slug) => String(slug).trim()).filter(Boolean))) : [],
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
    applyToAll: input.applyToAll,
    templateSlugs: Array.from(new Set(input.templateSlugs.map((slug) => slug.trim()).filter(Boolean))),
    updatedAt: new Date().toISOString(),
  };

  await writeMusicLibrary(library);
  return library.slots[slotIndex];
}
