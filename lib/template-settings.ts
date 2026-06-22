import { unstable_noStore as noStore } from "next/cache";
import { cleanPlayableAudioUrl } from "./audio-files";
import { getActiveMusicSlot, getMusicLibrary } from "./music-library";
import { readProjectContentSetting, writeProjectContentSetting, readDraftContent, readPublishedContent, writeDraftContent } from "./project-content-store";
import { getTemplateBySlug, invitationTemplates } from "./templates";
import { resolveTemplatesPreviewMusic } from "./templates-preview-music";
import type { TemplateDefinition } from "./types";
import { normalizeInternalAssetUrl } from "./utils";

type TemplateSettings = Record<
  string,
  {
    musicUrl?: string;
    musicMuted?: boolean;
    arabicName?: string;
    category?: string;
    concept?: string;
    opening?: string;
    layout?: string;
    typography?: string;
    enabled?: boolean;
    previewImage?: string;
    accentImage?: string;
    palette?: Partial<TemplateDefinition["palette"]>;
    photographer?: {
      enabled?: boolean;
      name?: string;
      instagramUrl?: string;
      facebookUrl?: string;
    };
  }
>;

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

function cleanAudioUrl(value: string) {
  return cleanPlayableAudioUrl(value);
}

function cleanText(value: string, maxLength = 800) {
  return value.trim().slice(0, maxLength);
}

function cleanHexColor(value: string) {
  return /^#[0-9a-f]{6}$/i.test(value.trim()) ? value.trim() : "";
}

async function getGlobalMusicOverride() {
  const library = await getMusicLibrary();
  return getActiveMusicSlot(library)?.url || "";
}

async function readTemplateSettings(): Promise<TemplateSettings> {
  noStore();
  return readProjectContentSetting("template-settings", {}, (value) => (value && typeof value === "object" && !Array.isArray(value) ? (value as TemplateSettings) : {}));
}

async function readDraftTemplateSettings(): Promise<TemplateSettings> {
  noStore();
  return readDraftContent("template-settings", {}, (value) => (value && typeof value === "object" && !Array.isArray(value) ? (value as TemplateSettings) : {}));
}

async function readPublishedTemplateSettings(): Promise<TemplateSettings> {
  noStore();
  return readPublishedContent("template-settings", {}, (value) => (value && typeof value === "object" && !Array.isArray(value) ? (value as TemplateSettings) : {}));
}

async function writeTemplateSettings(settings: TemplateSettings) {
  await writeProjectContentSetting("template-settings", settings);
}

async function writeDraftTemplateSettings(settings: TemplateSettings) {
  await writeDraftContent("template-settings", settings);
}

function applyTemplateSettings(template: TemplateDefinition, settings: TemplateSettings, globalMusicUrl?: string): TemplateDefinition {
  const override = settings[template.slug];
  if (!override) {
    return typeof globalMusicUrl === "string" ? { ...template, musicUrl: globalMusicUrl } : template;
  }

  const palette = override.palette
    ? {
        ...template.palette,
        ...Object.fromEntries(Object.entries(override.palette).filter(([, value]) => typeof value === "string" && cleanHexColor(value))),
      }
    : template.palette;

  return {
    ...template,
    arabicName: override.arabicName || template.arabicName,
    category: override.category || template.category,
    concept: override.concept || template.concept,
    opening: override.opening || template.opening,
    layout: override.layout || template.layout,
    typography: override.typography || template.typography,
    enabled: typeof override.enabled === "boolean" ? override.enabled : template.enabled,
    previewImage: normalizeInternalAssetUrl(override.previewImage) || override.previewImage || template.previewImage,
    accentImage: normalizeInternalAssetUrl(override.accentImage) || override.accentImage || template.accentImage,
    palette,
    musicUrl: typeof globalMusicUrl === "string" ? globalMusicUrl : override.musicMuted ? "" : override.musicUrl || template.musicUrl,
    photographer: {
      enabled: override.photographer?.enabled ?? template.photographer?.enabled ?? true,
      name: override.photographer?.name || template.photographer?.name || "badrabdoph",
      instagramUrl: override.photographer?.instagramUrl || template.photographer?.instagramUrl || "https://www.instagram.com/",
      facebookUrl: override.photographer?.facebookUrl || template.photographer?.facebookUrl || "https://www.facebook.com/",
    },
  };
}

export async function getTemplatesWithSettings() {
  const [settings, globalMusicUrl] = await Promise.all([readTemplateSettings(), getGlobalMusicOverride()]);
  return invitationTemplates.map((template) => applyTemplateSettings(template, settings, globalMusicUrl));
}

export async function getPublicTemplatesWithSettings() {
  const templates = await getTemplatesWithSettings();
  return templates.filter((template) => template.enabled);
}

export async function getTemplatesWithPreviewMusic() {
  const [settings, previewMusic] = await Promise.all([readTemplateSettings(), resolveTemplatesPreviewMusic()]);
  const previewMusicUrl = previewMusic.settings.enabled ? previewMusic.musicUrl : "";
  return invitationTemplates.map((template) => applyTemplateSettings(template, settings, previewMusicUrl));
}

export async function getPublicTemplatesWithPreviewMusic() {
  const templates = await getTemplatesWithPreviewMusic();
  return templates.filter((template) => template.enabled);
}

export async function getTemplateWithSettings(slug: string) {
  const template = getTemplateBySlug(slug);
  if (!template) return undefined;
  const [settings, globalMusicUrl] = await Promise.all([readTemplateSettings(), getGlobalMusicOverride()]);
  return applyTemplateSettings(template, settings, globalMusicUrl);
}

export async function getPublicTemplateWithSettings(slug: string) {
  const template = await getTemplateWithSettings(slug);
  return template?.enabled ? template : undefined;
}

export async function getTemplateWithPreviewMusic(slug: string) {
  const template = getTemplateBySlug(slug);
  if (!template) return undefined;
  const [settings, previewMusic] = await Promise.all([readTemplateSettings(), resolveTemplatesPreviewMusic()]);
  const previewMusicUrl = previewMusic.settings.enabled ? previewMusic.musicUrl : "";
  return applyTemplateSettings(template, settings, previewMusicUrl);
}

export async function getPublicTemplateWithPreviewMusic(slug: string) {
  const template = await getTemplateWithPreviewMusic(slug);
  return template?.enabled ? template : undefined;
}

export async function updateTemplateMusic(slug: string, musicUrl: string) {
  const template = getTemplateBySlug(slug);
  if (!template) return false;

  const settings = await readTemplateSettings();
  const cleanedMusicUrl = cleanAudioUrl(musicUrl);

  if (cleanedMusicUrl) {
    settings[slug] = { ...(settings[slug] || {}), musicUrl: cleanedMusicUrl };
  } else {
    const nextSettings = { ...(settings[slug] || {}) };
    delete nextSettings.musicUrl;

    if (Object.keys(nextSettings).length > 0) {
      settings[slug] = nextSettings;
    } else {
      delete settings[slug];
    }
  }

  await writeTemplateSettings(settings);
  return true;
}

export async function updateTemplatesMusic(slugs: string[], musicUrl: string) {
  const templates = await getTemplatesWithSettings();
  const validSlugs = new Set(templates.map((template) => template.slug));
  const selectedSlugs = Array.from(new Set(slugs.map((slug) => slug.trim()).filter((slug) => validSlugs.has(slug))));
  const cleanedMusicUrl = cleanAudioUrl(musicUrl);
  if (!selectedSlugs.length || !cleanedMusicUrl) return [];

  const settings = await readTemplateSettings();
  for (const slug of selectedSlugs) {
    settings[slug] = {
      ...(settings[slug] || {}),
      musicMuted: false,
      musicUrl: cleanedMusicUrl,
    };
  }

  await writeTemplateSettings(settings);
  return selectedSlugs;
}

export async function updateTemplatesMusicState(slugs: string[], input: { musicUrl?: string; enabled: boolean }) {
  const templates = await getTemplatesWithSettings();
  const validSlugs = new Set(templates.map((template) => template.slug));
  const selectedSlugs = Array.from(new Set(slugs.map((slug) => slug.trim()).filter((slug) => validSlugs.has(slug))));
  const cleanedMusicUrl = cleanAudioUrl(input.musicUrl || "");
  if (!selectedSlugs.length) return [];
  if (input.enabled && !cleanedMusicUrl) return [];

  const settings = await readTemplateSettings();
  for (const slug of selectedSlugs) {
    const next = { ...(settings[slug] || {}) };
    next.musicMuted = !input.enabled;
    if (cleanedMusicUrl) next.musicUrl = cleanedMusicUrl;
    settings[slug] = next;
  }

  await writeTemplateSettings(settings);
  return selectedSlugs;
}

export async function getDraftTemplateWithSettings(slug: string) {
  const template = getTemplateBySlug(slug);
  if (!template) return undefined;
  const [settings, globalMusicUrl] = await Promise.all([readDraftTemplateSettings(), getGlobalMusicOverride()]);
  return applyTemplateSettings(template, settings, globalMusicUrl);
}

export async function updateDraftTemplateSettings(
  slug: string,
  input: {
    arabicName?: string;
    category?: string;
    concept?: string;
    opening?: string;
    layout?: string;
    typography?: string;
    enabled?: boolean;
    musicUrl?: string;
    musicMuted?: boolean;
    previewImage?: string;
    accentImage?: string;
    palette?: Partial<TemplateDefinition["palette"]>;
    photographer?: {
      enabled?: boolean;
      name?: string;
      instagramUrl?: string;
      facebookUrl?: string;
    };
  },
) {
  const template = getTemplateBySlug(slug);
  if (!template) return false;

  const settings = await readDraftTemplateSettings();
  const next = { ...(settings[slug] || {}) };

  const arabicName = cleanText(input.arabicName || "", 90);
  const category = cleanText(input.category || "", 80);
  const concept = cleanText(input.concept || "", 500);
  const opening = cleanText(input.opening || "", 240);
  const layout = cleanText(input.layout || "", 240);
  const typography = cleanText(input.typography || "", 240);
  const previewImage = normalizeInternalAssetUrl(input.previewImage) || cleanUrl(input.previewImage || "");
  const accentImage = normalizeInternalAssetUrl(input.accentImage) || cleanUrl(input.accentImage || "");
  const musicUrl = cleanAudioUrl(input.musicUrl || "");
  const instagramUrl = cleanUrl(input.photographer?.instagramUrl || "");
  const facebookUrl = cleanUrl(input.photographer?.facebookUrl || "");

  if (arabicName) next.arabicName = arabicName;
  else delete next.arabicName;
  if (category) next.category = category;
  else delete next.category;
  if (concept) next.concept = concept;
  else delete next.concept;
  if (opening) next.opening = opening;
  else delete next.opening;
  if (layout) next.layout = layout;
  else delete next.layout;
  if (typography) next.typography = typography;
  else delete next.typography;
  if (previewImage) next.previewImage = previewImage;
  else delete next.previewImage;
  if (accentImage) next.accentImage = accentImage;
  else delete next.accentImage;

  next.enabled = input.enabled !== false;
  next.musicMuted = input.musicMuted === true;
  if (musicUrl && !next.musicMuted) next.musicUrl = musicUrl;
  else delete next.musicUrl;

  const paletteEntries = Object.entries(input.palette || {})
    .map(([key, value]) => [key, cleanHexColor(String(value || ""))])
    .filter(([, value]) => value);
  if (paletteEntries.length) next.palette = Object.fromEntries(paletteEntries) as Partial<TemplateDefinition["palette"]>;
  else delete next.palette;

  const photographerName = cleanText(input.photographer?.name || "", 90);
  next.photographer = {
    ...(next.photographer || { enabled: true }),
    enabled: input.photographer?.enabled !== false,
    ...(photographerName ? { name: photographerName } : {}),
    ...(instagramUrl ? { instagramUrl } : {}),
    ...(facebookUrl ? { facebookUrl } : {}),
  };

  settings[slug] = next;
  await writeDraftTemplateSettings(settings);
  return true;
}

export async function getTemplateSortOrderWithSettings(slug: string) {
  const templates = await getTemplatesWithSettings();
  const index = templates.findIndex((template) => template.slug === slug);
  return index >= 0 ? index + 1 : templates.length + 1;
}
