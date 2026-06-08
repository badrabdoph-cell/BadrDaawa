import { unstable_noStore as noStore } from "next/cache";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { getMusicLibrary, getMusicSlotByIdOrUrl, type MusicLibrary, type MusicSlot } from "./music-library";

export type TemplatesPreviewMusicSettings = {
  enabled: boolean;
  trackId: string;
  updatedAt: string;
};

export type ResolvedTemplatesPreviewMusic = {
  settings: TemplatesPreviewMusicSettings;
  track?: MusicSlot;
  musicUrl: string;
};

const settingsPath = path.join(process.cwd(), "data", "templates-preview-music.json");

const defaultSettings: TemplatesPreviewMusicSettings = {
  enabled: false,
  trackId: "",
  updatedAt: "",
};

function normalizeSettings(value: Partial<TemplatesPreviewMusicSettings> | null | undefined): TemplatesPreviewMusicSettings {
  return {
    enabled: Boolean(value?.enabled),
    trackId: typeof value?.trackId === "string" ? value.trackId.trim().slice(0, 120) : "",
    updatedAt: typeof value?.updatedAt === "string" ? value.updatedAt : "",
  };
}

async function readSettingsFile() {
  try {
    const raw = await readFile(settingsPath, "utf8");
    const parsed = JSON.parse(raw) as unknown;
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? normalizeSettings(parsed as Partial<TemplatesPreviewMusicSettings>) : defaultSettings;
  } catch {
    return defaultSettings;
  }
}

async function writeSettings(settings: TemplatesPreviewMusicSettings) {
  await mkdir(path.dirname(settingsPath), { recursive: true });
  await writeFile(settingsPath, `${JSON.stringify(settings, null, 2)}\n`, "utf8");
}

export async function getTemplatesPreviewMusicSettings() {
  noStore();
  return readSettingsFile();
}

export async function updateTemplatesPreviewMusicSettings(input: { enabled: boolean; trackId?: string }) {
  const settings = normalizeSettings({
    enabled: input.enabled,
    trackId: input.enabled ? input.trackId || "" : "",
    updatedAt: new Date().toISOString(),
  });
  await writeSettings(settings);
  return settings;
}

export async function clearTemplatesPreviewMusicIfTrackDeleted(trackId: string) {
  const settings = await readSettingsFile();
  if (settings.trackId !== trackId) return false;
  await writeSettings({ enabled: false, trackId: "", updatedAt: new Date().toISOString() });
  return true;
}

export async function resolveTemplatesPreviewMusic(library?: MusicLibrary): Promise<ResolvedTemplatesPreviewMusic> {
  noStore();
  const [settings, resolvedLibrary] = await Promise.all([readSettingsFile(), library ? Promise.resolve(library) : getMusicLibrary()]);
  const track = settings.enabled ? getMusicSlotByIdOrUrl(resolvedLibrary, settings.trackId) : undefined;
  return {
    settings,
    track,
    musicUrl: track?.url || "",
  };
}
