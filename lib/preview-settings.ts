import { unstable_noStore as noStore } from "next/cache";
import { imageExtensionFromName } from "./image-formats";
import { readProjectContentSetting, writeProjectContentSetting, readDraftContent, readPublishedContent, writeDraftContent } from "./project-content-store";
import { getTemplateWithSettings } from "./template-settings";

export type HomePreviewMode = "template" | "image" | "video";

export type HomePreviewSettings = {
  mode: HomePreviewMode;
  templateSlug: string;
  imageUrl: string;
  videoUrl: string;
};

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
  if (allowDataImage && /^data:image\/[a-z0-9.+-]+;base64,/i.test(trimmed)) return trimmed;

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
  if (imageExtensionFromName(clean) || /^data:image\/[a-z0-9.+-]+;base64,/i.test(clean)) return "image";
  return "";
}

function isHomePreviewMode(value: string): value is HomePreviewMode {
  return value === "template" || value === "image" || value === "video";
}

export async function getHomePreviewSettings(): Promise<HomePreviewSettings> {
  noStore();

  const saved = await readProjectContentSetting<Partial<HomePreviewSettings>>("home-preview-settings", defaultHomePreviewSettings, (value) => value as Partial<HomePreviewSettings>);
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

export async function getDraftHomePreviewSettings(): Promise<HomePreviewSettings> {
  noStore();

  const saved = await readDraftContent<Partial<HomePreviewSettings>>("home-preview-settings", defaultHomePreviewSettings, (value) => value as Partial<HomePreviewSettings>);
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

export async function getPublishedHomePreviewSettings(): Promise<HomePreviewSettings> {
  noStore();

  const saved = await readPublishedContent<Partial<HomePreviewSettings>>("home-preview-settings", defaultHomePreviewSettings, (value) => value as Partial<HomePreviewSettings>);
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

  await writeProjectContentSetting("home-preview-settings", nextSettings);
  return nextSettings;
}

export async function updateHomePreviewSettingsDraft(input: {
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

  await writeDraftContent("home-preview-settings", nextSettings);
  return nextSettings;
}
