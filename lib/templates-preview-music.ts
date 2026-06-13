import { unstable_noStore as noStore } from "next/cache";
import { getMusicLibrary, getMusicSlotByIdOrUrl, type MusicLibrary, type MusicSlot } from "./music-library";
import { readProjectContentSetting, writeProjectContentSetting } from "./project-content-store";

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

async function writeSettings(settings: TemplatesPreviewMusicSettings) {
  await writeProjectContentSetting("templates-preview-music", settings);
}

export async function getTemplatesPreviewMusicSettings() {
  noStore();
  return readProjectContentSetting("templates-preview-music", defaultSettings, (value) => normalizeSettings(value as Partial<TemplatesPreviewMusicSettings>));
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
  const settings = await getTemplatesPreviewMusicSettings();
  if (settings.trackId !== trackId) return false;
  await writeSettings({ enabled: false, trackId: "", updatedAt: new Date().toISOString() });
  return true;
}

export async function resolveTemplatesPreviewMusic(library?: MusicLibrary): Promise<ResolvedTemplatesPreviewMusic> {
  noStore();
  const [settings, resolvedLibrary] = await Promise.all([getTemplatesPreviewMusicSettings(), library ? Promise.resolve(library) : getMusicLibrary()]);
  const track = settings.enabled ? getMusicSlotByIdOrUrl(resolvedLibrary, settings.trackId) : undefined;
  return {
    settings,
    track,
    musicUrl: track?.url || "",
  };
}
