import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { unstable_noStore as noStore } from "next/cache";
import { getTemplateWithSettings } from "./template-settings";

export type HomePreviewMode = "template" | "image" | "video";

export type HomePreviewSettings = {
  mode: HomePreviewMode;
  templateSlug: string;
  imageUrl: string;
  videoUrl: string;
};

const settingsPath = path.join(process.cwd(), "data", "home-preview-settings.json");

export const defaultHomePreviewSettings: HomePreviewSettings = {
  mode: "template",
  templateSlug: "featured-1",
  imageUrl: "",
  videoUrl: "",
};

function cleanMediaUrl(value: string, allowDataImage = false) {
  const trimmed = value.trim();
  if (!trimmed) return "";
  if (trimmed.startsWith("/")) return trimmed;
  if (allowDataImage && trimmed.startsWith("data:image/jpeg")) return trimmed;

  try {
    const url = new URL(trimmed);
    return url.protocol === "http:" || url.protocol === "https:" ? url.toString() : "";
  } catch {
    return "";
  }
}

function inferMediaMode(value: string): HomePreviewMode | "" {
  const clean = value.trim().split("?")[0]?.toLowerCase() || "";
  if (!clean) return "";
  if (/\.(mp4|webm|mov|m4v)$/.test(clean)) return "video";
  if (/\.(jpg|jpeg|png|webp|gif|svg)$/.test(clean) || clean.startsWith("data:image/jpeg")) return "image";
  return "";
}

function isHomePreviewMode(value: string): value is HomePreviewMode {
  return value === "template" || value === "image" || value === "video";
}

async function readHomePreviewSettingsFile(): Promise<Partial<HomePreviewSettings>> {
  try {
    const raw = await readFile(settingsPath, "utf8");
    const parsed = JSON.parse(raw) as unknown;
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? (parsed as Partial<HomePreviewSettings>) : {};
  } catch {
    return {};
  }
}

async function writeHomePreviewSettingsFile(settings: HomePreviewSettings) {
  await mkdir(path.dirname(settingsPath), { recursive: true });
  await writeFile(settingsPath, `${JSON.stringify(settings, null, 2)}\n`, "utf8");
}

export async function getHomePreviewSettings(): Promise<HomePreviewSettings> {
  noStore();

  const saved = await readHomePreviewSettingsFile();
  const mode = saved.mode && isHomePreviewMode(saved.mode) ? saved.mode : defaultHomePreviewSettings.mode;
  const templateSlug = typeof saved.templateSlug === "string" && saved.templateSlug.trim() ? saved.templateSlug.trim() : defaultHomePreviewSettings.templateSlug;
  const template = await getTemplateWithSettings(templateSlug);

  return {
    mode,
    templateSlug: template ? templateSlug : defaultHomePreviewSettings.templateSlug,
    imageUrl: typeof saved.imageUrl === "string" ? saved.imageUrl : "",
    videoUrl: typeof saved.videoUrl === "string" ? saved.videoUrl : "",
  };
}

export async function updateHomePreviewSettings(input: {
  mode: string;
  templateSlug: string;
  mediaUrl?: string;
  uploadedMediaUrl?: string;
  uploadedMediaMode?: string;
  imageUrl: string;
  uploadedImageUrl?: string;
  videoUrl: string;
  uploadedVideoUrl?: string;
}) {
  const mode = isHomePreviewMode(input.mode) ? input.mode : defaultHomePreviewSettings.mode;
  const template = await getTemplateWithSettings(input.templateSlug);
  const templateSlug = template?.slug || defaultHomePreviewSettings.templateSlug;
  const uploadedMediaUrl = cleanMediaUrl(input.uploadedMediaUrl || "");
  const unifiedMediaUrl = uploadedMediaUrl || cleanMediaUrl(input.mediaUrl || "", true);
  const uploadedImageUrl = cleanMediaUrl(input.uploadedImageUrl || "", true);
  const legacyImageUrl = uploadedImageUrl || cleanMediaUrl(input.imageUrl, true);
  const uploadedVideoUrl = cleanMediaUrl(input.uploadedVideoUrl || "");
  const legacyVideoUrl = uploadedVideoUrl || cleanMediaUrl(input.videoUrl);
  const inferredMode = isHomePreviewMode(input.uploadedMediaMode || "")
    ? (input.uploadedMediaMode as HomePreviewMode)
    : inferMediaMode(unifiedMediaUrl) || (uploadedImageUrl ? "image" : uploadedVideoUrl ? "video" : "");
  const finalMode = inferredMode || mode;
  const imageUrl = finalMode === "image" ? unifiedMediaUrl || legacyImageUrl : legacyImageUrl;
  const videoUrl = finalMode === "video" ? unifiedMediaUrl || legacyVideoUrl : legacyVideoUrl;

  const nextSettings: HomePreviewSettings = {
    mode: finalMode,
    templateSlug,
    imageUrl,
    videoUrl,
  };

  await writeHomePreviewSettingsFile(nextSettings);
  return nextSettings;
}
