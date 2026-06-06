import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { unstable_noStore as noStore } from "next/cache";
import { getCustomTemplates } from "./custom-templates";
import { getTemplateBySlug, invitationTemplates } from "./templates";
import type { TemplateDefinition } from "./types";

type TemplateSettings = Record<
  string,
  {
    musicUrl?: string;
  }
>;

const settingsPath = path.join(process.cwd(), "data", "template-settings.json");

function cleanMusicUrl(value: string) {
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

async function readTemplateSettings(): Promise<TemplateSettings> {
  noStore();

  try {
    const raw = await readFile(settingsPath, "utf8");
    const parsed = JSON.parse(raw) as unknown;
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? (parsed as TemplateSettings) : {};
  } catch {
    return {};
  }
}

async function writeTemplateSettings(settings: TemplateSettings) {
  await mkdir(path.dirname(settingsPath), { recursive: true });
  await writeFile(settingsPath, `${JSON.stringify(settings, null, 2)}\n`, "utf8");
}

function applyTemplateSettings(template: TemplateDefinition, settings: TemplateSettings): TemplateDefinition {
  const override = settings[template.slug];
  if (!override?.musicUrl) return template;
  return { ...template, musicUrl: override.musicUrl };
}

export async function getTemplatesWithSettings() {
  const settings = await readTemplateSettings();
  const customTemplates = await getCustomTemplates();
  return [...invitationTemplates, ...customTemplates].map((template) => applyTemplateSettings(template, settings));
}

export async function getTemplateWithSettings(slug: string) {
  const customTemplates = await getCustomTemplates();
  const template = getTemplateBySlug(slug) || customTemplates.find((item) => item.slug === slug);
  if (!template) return undefined;
  const settings = await readTemplateSettings();
  return applyTemplateSettings(template, settings);
}

export async function updateTemplateMusic(slug: string, musicUrl: string) {
  const customTemplates = await getCustomTemplates();
  const template = getTemplateBySlug(slug) || customTemplates.find((item) => item.slug === slug);
  if (!template) return false;

  const settings = await readTemplateSettings();
  const cleanedMusicUrl = cleanMusicUrl(musicUrl);

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

export async function getTemplateSortOrderWithSettings(slug: string) {
  const templates = await getTemplatesWithSettings();
  const index = templates.findIndex((template) => template.slug === slug);
  return index >= 0 ? index + 1 : templates.length + 1;
}
