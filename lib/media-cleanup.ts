import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { unstable_noStore as noStore, revalidatePath } from "next/cache";
import { createBackupSnapshot } from "@/lib/backups";
import { prisma } from "@/lib/db";
import { getAdminInvitations, getAdminOrders } from "@/lib/admin-data";
import { getHomePreviewSettings } from "@/lib/preview-settings";
import { ensureRuntimeDirectories, runtimeDataDir } from "@/lib/runtime-paths";
import { deleteUploadFile, listUploadFiles, storageKeyFromUploadUrl, writeUploadFile } from "@/lib/storage-provider";
import { getTemplatesWithSettings } from "@/lib/template-settings";
import { imageExtensionFromName } from "@/lib/image-formats";

export type MediaReferenceSource = "Invitation" | "Order" | "Template" | "Settings";
export type MediaKind = "image" | "audio";
export type MediaUsageDetail = {
  source: MediaReferenceSource;
  label: string;
};

export type MediaFileReportItem = {
  url: string;
  relativePath: string;
  kind: MediaKind;
  extension: string;
  sizeBytes: number;
  modifiedAt: string;
  sources: MediaReferenceSource[];
  usageDetails: MediaUsageDetail[];
};

export type MediaCleanupReport = {
  generatedAt: string;
  totalFiles: number;
  totalSizeBytes: number;
  imageFiles: number;
  audioFiles: number;
  usedFiles: MediaFileReportItem[];
  unusedFiles: MediaFileReportItem[];
  unusedSizeBytes: number;
};

export type MediaCleanupResult = {
  reportBeforeDelete: MediaCleanupReport;
  deletedFiles: MediaFileReportItem[];
  skippedFiles: MediaFileReportItem[];
  deletedSizeBytes: number;
  backupFileName: string;
};

const audioExtensions = new Set(["mp3", "wav", "ogg", "aac", "m4a", "webm", "flac", "mp4", "aif", "aiff"]);
const uploadUrlPattern = /(?:https?:\/\/[^"'\s<>)]+)?\/uploads\/[^"'\s<>)]+/gi;

function extensionFromPath(value: string) {
  const clean = value.split("?")[0].split("#")[0];
  return clean.split(".").pop()?.toLowerCase() || "";
}

function mediaKindFromPath(value: string): MediaKind | "" {
  const extension = extensionFromPath(value);
  if (imageExtensionFromName(value)) return "image";
  if (audioExtensions.has(extension)) return "audio";
  return "";
}

function normalizeUploadUrl(value: string) {
  const clean = value.trim();
  if (!clean) return "";

  try {
    const parsed = clean.startsWith("http://") || clean.startsWith("https://") ? new URL(clean) : null;
    const pathname = parsed ? parsed.pathname : clean.split("?")[0].split("#")[0];
    if (!pathname.startsWith("/uploads/") || !mediaKindFromPath(pathname)) return "";
    return decodeURI(pathname);
  } catch {
    const pathname = clean.split("?")[0].split("#")[0];
    return pathname.startsWith("/uploads/") && mediaKindFromPath(pathname) ? pathname : "";
  }
}

function addReference(references: Map<string, MediaUsageDetail[]>, value: string, source: MediaReferenceSource, label: string) {
  const direct = normalizeUploadUrl(value);
  if (direct) {
    references.set(direct, [...(references.get(direct) || []), { source, label }]);
    return;
  }

  for (const match of value.matchAll(uploadUrlPattern)) {
    const url = normalizeUploadUrl(match[0] || "");
    if (!url) continue;
    references.set(url, [...(references.get(url) || []), { source, label }]);
  }
}

function collectReferencesFromValue(references: Map<string, MediaUsageDetail[]>, value: unknown, source: MediaReferenceSource, label: string) {
  if (!value) return;
  if (typeof value === "string") {
    addReference(references, value, source, label);
    return;
  }
  if (Array.isArray(value)) {
    for (const item of value) collectReferencesFromValue(references, item, source, label);
    return;
  }
  if (typeof value === "object") {
    for (const item of Object.values(value as Record<string, unknown>)) collectReferencesFromValue(references, item, source, label);
  }
}

async function walkUploadMedia(): Promise<MediaFileReportItem[]> {
  const files = await listUploadFiles();
  const mediaFiles: MediaFileReportItem[] = [];
  for (const file of files) {
    const kind = mediaKindFromPath(file.key);
    if (!kind) continue;
    const extension = extensionFromPath(file.key);
    mediaFiles.push({
      url: file.url,
      relativePath: file.key,
      kind,
      extension,
      sizeBytes: file.size,
      modifiedAt: (file.lastModified || new Date()).toISOString(),
      sources: [],
      usageDetails: [],
    });
  }
  return mediaFiles.sort((a, b) => b.sizeBytes - a.sizeBytes);
}

async function collectDatabaseReferences(references: Map<string, MediaUsageDetail[]>) {
  if (!prisma) return;

  const [invitations, orders, templates] = await Promise.all([
    prisma.invitation.findMany({ select: { code: true, groomName: true, brideName: true, heroPhoto: true, gallery: true, musicUrl: true, photographer: true } }).catch(() => []),
    prisma.orderRequest.findMany({ select: { orderNumber: true, groomName: true, brideName: true, imageUrls: true, musicUrl: true, photographer: true } }).catch(() => []),
    prisma.weddingTemplate.findMany({ select: { slug: true, arabicName: true, previewUrl: true } }).catch(() => []),
  ]);

  for (const invitation of invitations) collectReferencesFromValue(references, invitation, "Invitation", `${invitation.groomName} و ${invitation.brideName} (${invitation.code})`);
  for (const order of orders) collectReferencesFromValue(references, order, "Order", `${order.groomName} و ${order.brideName}${order.orderNumber ? ` (${order.orderNumber})` : ""}`);
  for (const template of templates) collectReferencesFromValue(references, template, "Template", `${template.arabicName} (${template.slug})`);
}

async function collectFileStoreReferences(references: Map<string, MediaUsageDetail[]>) {
  const [invitations, orders] = await Promise.all([getAdminInvitations(), getAdminOrders()]);
  for (const invitation of invitations) collectReferencesFromValue(references, invitation, "Invitation", `${invitation.groomName} و ${invitation.brideName} (${invitation.code})`);
  for (const order of orders) collectReferencesFromValue(references, order, "Order", `${order.groomName} و ${order.brideName}${order.orderNumber ? ` (${order.orderNumber})` : ""}`);
}

async function collectTemplateReferences(references: Map<string, MediaUsageDetail[]>) {
  const templates = await getTemplatesWithSettings();
  for (const template of templates) collectReferencesFromValue(references, template, "Template", `${template.arabicName} (${template.slug})`);
}

async function collectSettingsReferences(references: Map<string, MediaUsageDetail[]>) {
  collectReferencesFromValue(references, await getHomePreviewSettings(), "Settings", "إعدادات معاينة الرئيسية");

  const entries = await readdir(runtimeDataDir, { withFileTypes: true }).catch(() => []);
  for (const entry of entries) {
    if (!entry.isFile() || !entry.name.endsWith(".json")) continue;
    const filePath = path.join(runtimeDataDir, entry.name);
    try {
      collectReferencesFromValue(references, JSON.parse(await readFile(filePath, "utf8")), "Settings", entry.name);
    } catch {
      collectReferencesFromValue(references, await readFile(filePath, "utf8"), "Settings", entry.name);
    }
  }
}

export async function getMediaCleanupReport(): Promise<MediaCleanupReport> {
  noStore();
  ensureRuntimeDirectories();

  const references = new Map<string, MediaUsageDetail[]>();
  await Promise.all([
    collectDatabaseReferences(references),
    collectFileStoreReferences(references),
    collectTemplateReferences(references),
    collectSettingsReferences(references),
  ]);

  const files = await walkUploadMedia();
  const filesWithSources = files.map((file) => ({
    ...file,
    usageDetails: references.get(file.url) || [],
    sources: Array.from(new Set((references.get(file.url) || []).map((item) => item.source))).sort(),
  }));
  const usedFiles = filesWithSources.filter((file) => file.sources.length > 0);
  const unusedFiles = filesWithSources.filter((file) => file.sources.length === 0);

  return {
    generatedAt: new Date().toISOString(),
    totalFiles: filesWithSources.length,
    totalSizeBytes: filesWithSources.reduce((sum, file) => sum + file.sizeBytes, 0),
    imageFiles: filesWithSources.filter((file) => file.kind === "image").length,
    audioFiles: filesWithSources.filter((file) => file.kind === "audio").length,
    usedFiles,
    unusedFiles,
    unusedSizeBytes: unusedFiles.reduce((sum, file) => sum + file.sizeBytes, 0),
  };
}

export async function getMediaFile(url: string) {
  const cleanUrl = normalizeUploadUrl(url);
  if (!cleanUrl) return null;
  const report = await getMediaCleanupReport();
  return report.usedFiles.concat(report.unusedFiles).find((file) => file.url === cleanUrl) || null;
}

export async function deleteMediaFile(url: string) {
  const file = await getMediaFile(url);
  if (!file || file.sources.length) return { ok: false, reason: file?.sources.length ? "used" : "missing", file };
  const backup = await createBackupSnapshot("media-delete");
  const fresh = await getMediaFile(url);
  if (!fresh || fresh.sources.length) return { ok: false, reason: fresh?.sources.length ? "used" : "missing", file: fresh, backupFileName: backup.fileName };
  const key = storageKeyFromUploadUrl(fresh.url);
  if (!key) return { ok: false, reason: "invalid", file: fresh, backupFileName: backup.fileName };
  const deleted = await deleteUploadFile(key);
  if (!deleted) return { ok: false, reason: "missing", file: fresh, backupFileName: backup.fileName };
  revalidatePath("/admin/media");
  return { ok: true, reason: "", file: fresh, backupFileName: backup.fileName };
}

export async function replaceMediaFile(url: string, file: File | null) {
  const current = await getMediaFile(url);
  if (!current || !file?.size) return { ok: false, reason: current ? "file" : "missing", file: current };
  const replacementExtension = extensionFromPath(file.name);
  if (!replacementExtension || replacementExtension !== current.extension) return { ok: false, reason: "extension", file: current };
  if (current.kind === "image" && !imageExtensionFromName(file.name)) return { ok: false, reason: "type", file: current };
  if (current.kind === "audio" && !audioExtensions.has(replacementExtension)) return { ok: false, reason: "type", file: current };

  const backup = await createBackupSnapshot("media-replace");
  const key = storageKeyFromUploadUrl(current.url);
  if (!key) return { ok: false, reason: "invalid", file: current, backupFileName: backup.fileName };
  await writeUploadFile(key, Buffer.from(await file.arrayBuffer()), current.kind === "image" ? `image/${current.extension}` : `audio/${current.extension}`);
  revalidatePath("/admin/media");
  return { ok: true, reason: "", file: current, backupFileName: backup.fileName };
}

export async function deleteUnusedMediaFiles(): Promise<MediaCleanupResult> {
  const reportBeforeDelete = await getMediaCleanupReport();
  const backup = await createBackupSnapshot("media-cleanup");
  const freshReport = await getMediaCleanupReport();
  const deletedFiles: MediaFileReportItem[] = [];
  const skippedFiles: MediaFileReportItem[] = [];

  for (const file of freshReport.unusedFiles) {
    const key = storageKeyFromUploadUrl(file.url);
    if (!key) {
      skippedFiles.push(file);
      continue;
    }

    const deleted = await deleteUploadFile(key);
    if (deleted) {
      deletedFiles.push(file);
    } else {
      skippedFiles.push(file);
    }
  }

  revalidatePath("/admin/media");

  return {
    reportBeforeDelete,
    deletedFiles,
    skippedFiles,
    deletedSizeBytes: deletedFiles.reduce((sum, file) => sum + file.sizeBytes, 0),
    backupFileName: backup.fileName,
  };
}
