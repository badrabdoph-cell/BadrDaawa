import { createHash } from "node:crypto";
import { readdir, readFile, stat, unlink } from "node:fs/promises";
import path from "node:path";
import { unstable_noStore as noStore, revalidatePath } from "next/cache";
import { createBackupSnapshot, type BackupSummary } from "@/lib/backups";
import { prisma } from "@/lib/db";
import { getAdminInvitations, getAdminOrders } from "@/lib/admin-data";
import { getMusicLibrary } from "@/lib/music-library";
import { getHomePreviewSettings } from "@/lib/preview-settings";
import { ensureRuntimeDirectories, runtimeBackupDir, runtimeDataDir } from "@/lib/runtime-paths";
import { deleteUploadFile, listUploadFiles, readUploadFile, storageKeyFromUploadUrl, writeUploadFile } from "@/lib/storage-provider";
import { getTemplatesWithSettings } from "@/lib/template-settings";
import { imageExtensionFromName } from "@/lib/image-formats";

export type MediaReferenceSource = "Invitation" | "Order" | "Template" | "Settings" | "MusicLibrary" | "RuntimeData";
export type MediaKind = "image" | "audio";
export type StorageCleanupAction = "orphans" | "duplicates" | "original-images" | "music-unused" | "old-backups" | "all";
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
  contentHash?: string;
  cleanupReasons: string[];
  duplicateGroupKey?: string;
  sources: MediaReferenceSource[];
  usageDetails: MediaUsageDetail[];
};

export type MediaDuplicateGroup = {
  key: string;
  contentHash: string;
  sizeBytes: number;
  files: MediaFileReportItem[];
  deletableFiles: MediaFileReportItem[];
  recoverableSizeBytes: number;
};

export type BackupCleanupReportItem = BackupSummary & {
  ageDays: number;
  contentHash: string;
  cleanupReasons: string[];
  canDelete: boolean;
};

export type MediaCleanupReport = {
  generatedAt: string;
  totalFiles: number;
  totalSizeBytes: number;
  imageFiles: number;
  audioFiles: number;
  usedSizeBytes: number;
  usedFiles: MediaFileReportItem[];
  unusedFiles: MediaFileReportItem[];
  orphanFiles: MediaFileReportItem[];
  duplicateGroups: MediaDuplicateGroup[];
  duplicateFiles: MediaFileReportItem[];
  unusedOriginalImages: MediaFileReportItem[];
  unusedMusicFiles: MediaFileReportItem[];
  oldTemporaryFiles: MediaFileReportItem[];
  backupFiles: BackupCleanupReportItem[];
  oldBackupFiles: BackupCleanupReportItem[];
  unusedSizeBytes: number;
  duplicateSizeBytes: number;
  recoverableSizeBytes: number;
};

export type MediaCleanupResult = {
  reportBeforeDelete: MediaCleanupReport;
  deletedFiles: MediaFileReportItem[];
  deletedBackups: BackupCleanupReportItem[];
  skippedFiles: MediaFileReportItem[];
  skippedBackups: BackupCleanupReportItem[];
  deletedSizeBytes: number;
  backupFileName: string;
  action: StorageCleanupAction;
};

const audioExtensions = new Set(["mp3", "wav", "ogg", "aac", "m4a", "webm", "flac", "mp4", "aif", "aiff"]);
const temporaryUploadPrefixes = ["order-previews/", "order-requests/", "previews/", "template-previews/"];
const originalImageExtensions = new Set(["jpg", "jpeg", "png", "heic", "heif", "bmp", "tiff"]);
const uploadUrlPattern = /(?:https?:\/\/[^"'\s<>)]+)?\/uploads\/[^"'\s<>)]+/gi;
const backupRetentionDays = 30;
const backupMinimumPerType = 5;

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

function ageDays(value: string) {
  const time = Date.parse(value);
  if (!Number.isFinite(time)) return 0;
  return Math.max(0, Math.floor((Date.now() - time) / (24 * 60 * 60 * 1000)));
}

async function sha256UploadFile(key: string) {
  const bytes = await readUploadFile(key).catch(() => null);
  return bytes ? createHash("sha256").update(bytes).digest("hex") : "";
}

async function sha256LocalFile(filePath: string) {
  const bytes = await readFile(filePath).catch(() => null);
  return bytes ? createHash("sha256").update(bytes).digest("hex") : "";
}

function isTemporaryUpload(file: Pick<MediaFileReportItem, "relativePath">) {
  return temporaryUploadPrefixes.some((prefix) => file.relativePath.startsWith(prefix));
}

function isOriginalImageCandidate(file: Pick<MediaFileReportItem, "kind" | "extension" | "sizeBytes">) {
  return file.kind === "image" && originalImageExtensions.has(file.extension) && file.sizeBytes >= 350 * 1024;
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
      contentHash: await sha256UploadFile(file.key),
      cleanupReasons: [],
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

async function collectMusicLibraryReferences(references: Map<string, MediaUsageDetail[]>) {
  const library = await getMusicLibrary();
  for (const slot of library.slots) {
    collectReferencesFromValue(references, slot.url, "MusicLibrary", slot.name || slot.id);
  }
}

async function collectSettingsReferences(references: Map<string, MediaUsageDetail[]>) {
  collectReferencesFromValue(references, await getHomePreviewSettings(), "Settings", "إعدادات معاينة الرئيسية");

  const entries = await readdir(runtimeDataDir, { withFileTypes: true }).catch(() => []);
  for (const entry of entries) {
    if (!entry.isFile() || !entry.name.endsWith(".json")) continue;
    const filePath = path.join(runtimeDataDir, entry.name);
    try {
      collectReferencesFromValue(references, JSON.parse(await readFile(filePath, "utf8")), "RuntimeData", entry.name);
    } catch {
      collectReferencesFromValue(references, await readFile(filePath, "utf8"), "RuntimeData", entry.name);
    }
  }
}

function buildDuplicateGroups(files: MediaFileReportItem[]) {
  const groups = new Map<string, MediaFileReportItem[]>();
  for (const file of files) {
    if (!file.contentHash) continue;
    const key = `${file.sizeBytes}:${file.contentHash}`;
    groups.set(key, [...(groups.get(key) || []), file]);
  }

  return Array.from(groups.entries())
    .map(([key, group]): MediaDuplicateGroup | null => {
      if (group.length < 2) return null;
      const sorted = [...group].sort((a, b) => {
        if (b.sources.length !== a.sources.length) return b.sources.length - a.sources.length;
        return Date.parse(b.modifiedAt) - Date.parse(a.modifiedAt);
      });
      const keep = sorted[0];
      const deletableFiles = sorted.filter((file) => file.url !== keep.url && file.sources.length === 0);
      return {
        key,
        contentHash: keep.contentHash || "",
        sizeBytes: keep.sizeBytes,
        files: sorted,
        deletableFiles,
        recoverableSizeBytes: deletableFiles.reduce((sum, file) => sum + file.sizeBytes, 0),
      };
    })
    .filter((group): group is MediaDuplicateGroup => Boolean(group));
}

async function listBackupFilesFast(): Promise<BackupSummary[]> {
  const entries = await readdir(runtimeBackupDir, { withFileTypes: true }).catch(() => []);
  const backups = await Promise.all(
    entries
      .filter((entry) => entry.isFile() && entry.name.endsWith(".json"))
      .map(async (entry) => {
        const filePath = path.join(runtimeBackupDir, entry.name);
        const fileStat = await stat(filePath);
        return {
          fileName: entry.name,
          type: entry.name.split("-")[0] || "manual",
          status: "SUCCESS" as const,
          sizeBytes: fileStat.size,
          createdAt: fileStat.mtime.toISOString(),
          source: "files" as const,
          items: 0,
        };
      }),
  );
  return backups.sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
}

async function getBackupCleanupReport(): Promise<BackupCleanupReportItem[]> {
  const backups = await listBackupFilesFast().catch(() => []);
  const byType = new Map<string, BackupSummary[]>();
  for (const backup of backups) byType.set(backup.type, [...(byType.get(backup.type) || []), backup]);

  const sizeCounts = new Map<number, number>();
  for (const backup of backups) sizeCounts.set(backup.sizeBytes, (sizeCounts.get(backup.sizeBytes) || 0) + 1);
  const hashCounts = new Map<string, number>();
  const hashes = new Map<string, string>();
  for (const backup of backups) {
    if ((sizeCounts.get(backup.sizeBytes) || 0) < 2) continue;
    const filePath = path.join(runtimeBackupDir, backup.fileName);
    const hash = await sha256LocalFile(filePath);
    hashes.set(backup.fileName, hash);
    if (hash) hashCounts.set(hash, (hashCounts.get(hash) || 0) + 1);
  }

  const keepFiles = new Set<string>();
  for (const files of byType.values()) {
    files
      .slice()
      .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))
      .slice(0, backupMinimumPerType)
      .forEach((backup) => keepFiles.add(backup.fileName));
  }

  const seenHashes = new Set<string>();
  return backups.map((backup) => {
    const days = ageDays(backup.createdAt);
    const hash = hashes.get(backup.fileName) || "";
    const cleanupReasons: string[] = [];
    if (days > backupRetentionDays && !keepFiles.has(backup.fileName)) cleanupReasons.push(`أقدم من ${backupRetentionDays} يوم`);
    if (hash && (hashCounts.get(hash) || 0) > 1) {
      if (seenHashes.has(hash)) cleanupReasons.push("نسخة مكررة بنفس المحتوى");
      else seenHashes.add(hash);
    }
    return {
      ...backup,
      ageDays: days,
      contentHash: hash,
      cleanupReasons,
      canDelete: cleanupReasons.length > 0 && !keepFiles.has(backup.fileName),
    };
  });
}

export async function getMediaCleanupReport(): Promise<MediaCleanupReport> {
  noStore();
  ensureRuntimeDirectories();

  const references = new Map<string, MediaUsageDetail[]>();
  await Promise.all([
    collectDatabaseReferences(references),
    collectFileStoreReferences(references),
    collectTemplateReferences(references),
    collectMusicLibraryReferences(references),
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
  const duplicateGroups = buildDuplicateGroups(filesWithSources);
  const duplicateFiles = duplicateGroups.flatMap((group) =>
    group.deletableFiles.map((file) => ({
      ...file,
      duplicateGroupKey: group.key,
      cleanupReasons: [...file.cleanupReasons, "ملف مكرر وغير مستخدم"],
    })),
  );
  const duplicateUrls = new Set(duplicateFiles.map((file) => file.url));
  const oldTemporaryFiles = unusedFiles
    .filter((file) => isTemporaryUpload(file) && ageDays(file.modifiedAt) >= 7)
    .map((file) => ({ ...file, cleanupReasons: [...file.cleanupReasons, "ملف مؤقت قديم وغير مستخدم"] }));
  const temporaryUrls = new Set(oldTemporaryFiles.map((file) => file.url));
  const unusedOriginalImages = unusedFiles
    .filter((file) => isOriginalImageCandidate(file))
    .map((file) => ({ ...file, cleanupReasons: [...file.cleanupReasons, "صورة أصلية كبيرة وغير مستخدمة"] }));
  const originalUrls = new Set(unusedOriginalImages.map((file) => file.url));
  const unusedMusicFiles = unusedFiles
    .filter((file) => file.kind === "audio")
    .map((file) => ({ ...file, cleanupReasons: [...file.cleanupReasons, "ملف موسيقى غير مرتبط"] }));
  const musicUrls = new Set(unusedMusicFiles.map((file) => file.url));
  const orphanFiles = unusedFiles.map((file) => {
    const reasons = ["ملف يتيم لا يوجد له مرجع فعلي"];
    if (duplicateUrls.has(file.url)) reasons.push("نسخة مكررة");
    if (temporaryUrls.has(file.url)) reasons.push("مؤقت قديم");
    if (originalUrls.has(file.url)) reasons.push("صورة أصلية غير مستخدمة");
    if (musicUrls.has(file.url)) reasons.push("موسيقى غير مستخدمة");
    return { ...file, cleanupReasons: Array.from(new Set([...file.cleanupReasons, ...reasons])) };
  });
  const orphanUrls = new Set(orphanFiles.map((file) => file.url));
  const normalizedDuplicateFiles = duplicateFiles.map((file) => orphanFiles.find((orphan) => orphan.url === file.url) || file);
  const normalizedOriginalImages = unusedOriginalImages.map((file) => orphanFiles.find((orphan) => orphan.url === file.url) || file);
  const normalizedMusicFiles = unusedMusicFiles.map((file) => orphanFiles.find((orphan) => orphan.url === file.url) || file);
  const normalizedTemporaryFiles = oldTemporaryFiles.map((file) => orphanFiles.find((orphan) => orphan.url === file.url) || file);
  const backupFiles = await getBackupCleanupReport();
  const oldBackupFiles = backupFiles.filter((backup) => backup.canDelete);
  const recoverableMedia = new Map<string, MediaFileReportItem>();
  for (const file of [...orphanFiles, ...normalizedDuplicateFiles, ...normalizedOriginalImages, ...normalizedMusicFiles, ...normalizedTemporaryFiles]) {
    if (orphanUrls.has(file.url) && file.sources.length === 0) recoverableMedia.set(file.url, file);
  }

  return {
    generatedAt: new Date().toISOString(),
    totalFiles: filesWithSources.length,
    totalSizeBytes: filesWithSources.reduce((sum, file) => sum + file.sizeBytes, 0),
    imageFiles: filesWithSources.filter((file) => file.kind === "image").length,
    audioFiles: filesWithSources.filter((file) => file.kind === "audio").length,
    usedSizeBytes: usedFiles.reduce((sum, file) => sum + file.sizeBytes, 0),
    usedFiles,
    unusedFiles,
    orphanFiles,
    duplicateGroups,
    duplicateFiles: normalizedDuplicateFiles,
    unusedOriginalImages: normalizedOriginalImages,
    unusedMusicFiles: normalizedMusicFiles,
    oldTemporaryFiles: normalizedTemporaryFiles,
    backupFiles,
    oldBackupFiles,
    unusedSizeBytes: unusedFiles.reduce((sum, file) => sum + file.sizeBytes, 0),
    duplicateSizeBytes: normalizedDuplicateFiles.reduce((sum, file) => sum + file.sizeBytes, 0),
    recoverableSizeBytes: Array.from(recoverableMedia.values()).reduce((sum, file) => sum + file.sizeBytes, 0) + oldBackupFiles.reduce((sum, backup) => sum + backup.sizeBytes, 0),
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

function uniqueFiles(files: MediaFileReportItem[]) {
  const seen = new Set<string>();
  return files.filter((file) => {
    if (seen.has(file.url)) return false;
    seen.add(file.url);
    return true;
  });
}

function filesForCleanupAction(report: MediaCleanupReport, action: StorageCleanupAction) {
  if (action === "duplicates") return uniqueFiles(report.duplicateFiles);
  if (action === "original-images") return uniqueFiles(report.unusedOriginalImages);
  if (action === "music-unused") return uniqueFiles(report.unusedMusicFiles);
  if (action === "old-backups") return [];
  if (action === "all") return uniqueFiles([...report.orphanFiles, ...report.duplicateFiles, ...report.unusedOriginalImages, ...report.unusedMusicFiles, ...report.oldTemporaryFiles]);
  return uniqueFiles(report.orphanFiles);
}

function backupsForCleanupAction(report: MediaCleanupReport, action: StorageCleanupAction) {
  if (action === "old-backups" || action === "all") return report.oldBackupFiles;
  return [];
}

async function deleteBackupFile(fileName: string) {
  if (!/^[a-z0-9-]+\.json$/i.test(fileName)) return false;
  const filePath = path.join(runtimeBackupDir, fileName);
  if (!filePath.startsWith(runtimeBackupDir)) return false;
  try {
    const fileStat = await stat(filePath);
    if (!fileStat.isFile()) return false;
    await unlink(filePath);
    return true;
  } catch {
    return false;
  }
}

export async function deleteMediaFilesByAction(action: StorageCleanupAction): Promise<MediaCleanupResult> {
  const reportBeforeDelete = await getMediaCleanupReport();
  const backup = await createBackupSnapshot(`storage-cleanup-${action}`);
  const freshReport = await getMediaCleanupReport();
  const targetFiles = filesForCleanupAction(freshReport, action);
  const targetBackups = backupsForCleanupAction(freshReport, action);
  const deletedFiles: MediaFileReportItem[] = [];
  const deletedBackups: BackupCleanupReportItem[] = [];
  const skippedFiles: MediaFileReportItem[] = [];
  const skippedBackups: BackupCleanupReportItem[] = [];

  for (const file of targetFiles) {
    if (file.sources.length) {
      skippedFiles.push(file);
      continue;
    }
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

  for (const backupFile of targetBackups) {
    if (!backupFile.canDelete || backupFile.fileName === backup.fileName) {
      skippedBackups.push(backupFile);
      continue;
    }
    const deleted = await deleteBackupFile(backupFile.fileName);
    if (deleted) deletedBackups.push(backupFile);
    else skippedBackups.push(backupFile);
  }

  revalidatePath("/admin/media");
  revalidatePath("/admin/backups");

  return {
    reportBeforeDelete,
    deletedFiles,
    deletedBackups,
    skippedFiles,
    skippedBackups,
    deletedSizeBytes: deletedFiles.reduce((sum, file) => sum + file.sizeBytes, 0) + deletedBackups.reduce((sum, file) => sum + file.sizeBytes, 0),
    backupFileName: backup.fileName,
    action,
  };
}

export async function deleteUnusedMediaFiles(): Promise<MediaCleanupResult> {
  return deleteMediaFilesByAction("orphans");
}
