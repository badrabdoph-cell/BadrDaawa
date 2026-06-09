import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { unstable_noStore as noStore } from "next/cache";
import { defaultTemplateMusicUrl, getTemplateBySlug, invitationTemplates } from "./templates";
import type { TemplateDefinition } from "./types";

const customTemplatesPath = path.join(process.cwd(), "data", "custom-templates.json");

type StoredCustomTemplate = {
  id: string;
  slug: string;
  name: string;
  arabicName: string;
  category: string;
  concept: string;
  html: string;
  musicUrl?: string;
  createdAt: string;
  updatedAt: string;
};

function slugify(value: string) {
  return (
    value
      .toLowerCase()
      .trim()
      .replace(/['"`]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "custom-template"
  );
}

function extractHtmlTitle(html: string) {
  const title = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1];
  const heading = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)?.[1];
  const cleaned = (title || heading || "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return cleaned || "Custom Template";
}

function cleanHtml(value: string) {
  const html = value.trim();
  if (!html) return "";
  return html.includes("<html") ? html : `<!DOCTYPE html><html lang="ar" dir="rtl"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head><body>${html}</body></html>`;
}

async function readStoredCustomTemplates(): Promise<StoredCustomTemplate[]> {
  noStore();

  try {
    const raw = await readFile(customTemplatesPath, "utf8");
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item): item is StoredCustomTemplate => Boolean(item && typeof item === "object" && "slug" in item && "html" in item));
  } catch {
    return [];
  }
}

async function writeStoredCustomTemplates(templates: StoredCustomTemplate[]) {
  await mkdir(path.dirname(customTemplatesPath), { recursive: true });
  await writeFile(customTemplatesPath, `${JSON.stringify(templates, null, 2)}\n`, "utf8");
}

function toTemplateDefinition(template: StoredCustomTemplate): TemplateDefinition {
  return {
    id: template.id,
    slug: template.slug,
    name: template.name,
    arabicName: template.arabicName,
    category: template.category,
    style: "custom",
    concept: template.concept,
    opening: "Custom HTML",
    layout: "قالب HTML مضاف من لوحة الأدمن.",
    typography: "حسب الكود الملصوق داخل القالب.",
    palette: {
      primary: "#101010",
      secondary: "#1b1b1b",
      accent: "#d4af37",
      ink: "#f8f4ec",
      surface: "#ffffff",
    },
    previewImage: "/assets/templates/featured-1.svg",
    accentImage: "/assets/brand/champagne-rings.png",
    musicUrl: template.musicUrl || defaultTemplateMusicUrl,
    customHtml: template.html,
    isCustom: true,
    enabled: true,
    score: 88,
  };
}

export async function getCustomTemplates() {
  const templates = await readStoredCustomTemplates();
  return templates.map(toTemplateDefinition);
}

export async function getCustomTemplateBySlug(slug: string) {
  const templates = await getCustomTemplates();
  return templates.find((template) => template.slug === slug);
}

export async function createCustomTemplateFromHtml({
  html,
  name,
  slug,
  category,
  concept,
  musicUrl,
}: {
  html: string;
  name?: string;
  slug?: string;
  category?: string;
  concept?: string;
  musicUrl?: string;
}) {
  const cleanedHtml = cleanHtml(html);
  if (!cleanedHtml || cleanedHtml.length < 20) return { ok: false as const, reason: "empty" };

  const storedTemplates = await readStoredCustomTemplates();
  const title = name?.trim() || extractHtmlTitle(cleanedHtml);
  const baseSlug = slugify(slug || title);
  const takenSlugs = new Set([...invitationTemplates.map((template) => template.slug), ...storedTemplates.map((template) => template.slug)]);
  let finalSlug = baseSlug;
  let index = 2;

  while (takenSlugs.has(finalSlug) && !getTemplateBySlug(finalSlug)) {
    finalSlug = `${baseSlug}-${index}`;
    index += 1;
  }

  if (getTemplateBySlug(finalSlug)) {
    finalSlug = `${baseSlug}-${Date.now().toString(36)}`;
  }

  const now = new Date().toISOString();
  const template: StoredCustomTemplate = {
    id: `tpl_custom_${finalSlug.replace(/-/g, "_")}`,
    slug: finalSlug,
    name: title,
    arabicName: title,
    category: category?.trim() || "قالب مخصص",
    concept: concept?.trim() || "قالب تم إنشاؤه تلقائيًا من كود HTML داخل لوحة الأدمن.",
    html: cleanedHtml,
    musicUrl: musicUrl?.trim() || defaultTemplateMusicUrl,
    createdAt: now,
    updatedAt: now,
  };

  await writeStoredCustomTemplates([template, ...storedTemplates]);
  return { ok: true as const, template: toTemplateDefinition(template) };
}
