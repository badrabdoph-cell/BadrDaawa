import { mkdir, readFile, readdir, stat, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { unstable_noStore as noStore } from "next/cache";
import { prisma } from "./db";
import { ensureParentDirectory, ensureRuntimeDirectories, runtimeBackupDir, runtimeDataDir } from "./runtime-paths";
import { listUploadFiles, readUploadFile, writeUploadFile } from "./storage-provider";

export type BackupSummary = {
  fileName: string;
  type: string;
  status: "SUCCESS";
  sizeBytes: number;
  createdAt: string;
  source: "database" | "files";
  items: number;
};

type BackupUploadFile = {
  path: string;
  sizeBytes: number;
  modifiedAt: string;
  base64: string;
};

type BackupPayload = {
  version?: number;
  type?: string;
  createdAt?: string;
  source?: "database" | "files";
  database?: unknown;
  dataFiles?: Record<string, unknown>;
  uploads?: BackupUploadFile[];
};

const backupDir = runtimeBackupDir;
const dataDir = runtimeDataDir;
const maxUploadFileBytes = 5 * 1024 * 1024;
const maxUploadsTotalBytes = 40 * 1024 * 1024;
const maxBackupAgeMs = 7 * 24 * 60 * 60 * 1000;
const maxBackupsPerType = 5;

function jsonReplacer(_key: string, value: unknown) {
  if (typeof value === "bigint") return value.toString();
  if (value instanceof Date) return value.toISOString();
  return value;
}

function formatStamp(date = new Date()) {
  return date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
}

function formatBackupName(type: string) {
  const cleanType = type.toLowerCase().replace(/[^a-z0-9]+/g, "-") || "manual";
  return `${cleanType}-${formatStamp()}.json`;
}

async function exists(filePath: string) {
  try {
    await stat(filePath);
    return true;
  } catch {
    return false;
  }
}

async function listJsonDataFiles() {
  ensureRuntimeDirectories();
  if (!(await exists(dataDir))) return [];
  const entries = await readdir(dataDir, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isFile() && entry.name.endsWith(".json") && !entry.name.startsWith("backup"))
    .map((entry) => entry.name);
}

async function readDataFiles() {
  const files = await listJsonDataFiles();
  const output: Record<string, unknown> = {};

  for (const file of files) {
    try {
      output[file] = JSON.parse(await readFile(path.join(dataDir, file), "utf8"));
    } catch {
      output[file] = await readFile(path.join(dataDir, file), "utf8");
    }
  }

  return output;
}

async function walkUploads(): Promise<BackupUploadFile[]> {
  const entries = await listUploadFiles();
  const files: BackupUploadFile[] = [];

  for (const entry of entries) {
    if (entry.size > maxUploadFileBytes) continue;
    const currentTotal = files.reduce((sum, file) => sum + file.sizeBytes, 0);
    if (currentTotal + entry.size > maxUploadsTotalBytes) continue;
    const bytes = await readUploadFile(entry.key).catch(() => null);
    if (!bytes) continue;

    files.push({
      path: entry.key,
      sizeBytes: entry.size,
      modifiedAt: entry.lastModified?.toISOString() || new Date().toISOString(),
      base64: bytes.toString("base64"),
    });
  }

  return files;
}

async function readDatabaseSnapshot() {
  if (!prisma) return null;

  try {
    const [customers, templates, invitations, guests, orders, analyticsEvents, backupJobs] = await Promise.all([
      prisma.customer.findMany({
        orderBy: { createdAt: "desc" },
        select: { id: true, name: true, phone: true, email: true, username: true, isActive: true, createdAt: true, updatedAt: true },
      }),
      prisma.weddingTemplate.findMany({
        orderBy: { sortOrder: "asc" },
        select: { id: true, slug: true, name: true, arabicName: true, enabled: true, sortOrder: true },
      }),
      prisma.invitation.findMany({
        orderBy: { createdAt: "desc" },
        select: { id: true, code: true, status: true, groomName: true, brideName: true, weddingDate: true, venue: true, heroPhoto: true, gallery: true, musicEnabled: true, musicUrl: true, texts: true, photographer: true, createdAt: true, updatedAt: true },
      }),
      prisma.guestRsvp.findMany({
        orderBy: { createdAt: "desc" },
        take: 100,
        select: { id: true, name: true, phone: true, status: true, createdAt: true },
      }),
      prisma.orderRequest.findMany({
        orderBy: { createdAt: "desc" },
        take: 50,
        select: { id: true, groomName: true, brideName: true, phone: true, status: true, imageUrls: true, musicEnabled: true, musicChoice: true, musicUrl: true, texts: true, photographer: true, createdAt: true, updatedAt: true },
      }),
      prisma.analyticsEvent.findMany({
        orderBy: { createdAt: "desc" },
        take: 100,
        select: { id: true, eventType: true, invitationId: true, createdAt: true },
      }),
      prisma.backupJob.findMany({
        orderBy: { createdAt: "desc" },
        take: 20,
        select: { id: true, type: true, status: true, fileName: true, sizeBytes: true, createdAt: true },
      }),
    ]);
    return { customers, templates, invitations, guests, orders, analyticsEvents, backupJobs };
  } catch (error) {
    console.error("[Backup] Failed to read database snapshot. Falling back to file snapshot.", error);
    return null;
  }
}

async function cleanupOldBackups() {
  try {
    if (!(await exists(backupDir))) return;

    const entries = await readdir(backupDir, { withFileTypes: true });
    const backupsByType = new Map<string, Array<{ name: string; time: number }>>();

    for (const entry of entries) {
      if (!entry.isFile() || !entry.name.endsWith(".json")) continue;

      const filePath = path.join(backupDir, entry.name);
      const fileStat = await stat(filePath);
      const type = entry.name.split("-")[0] || "manual";
      backupsByType.set(type, [...(backupsByType.get(type) || []), { name: entry.name, time: fileStat.mtime.getTime() }]);
    }

    const now = Date.now();
    for (const files of backupsByType.values()) {
      const sortedFiles = files.sort((a, b) => b.time - a.time);

      for (let index = 0; index < sortedFiles.length; index += 1) {
        const file = sortedFiles[index];
        if (now - file.time <= maxBackupAgeMs && index < maxBackupsPerType) continue;

        await unlink(path.join(backupDir, file.name)).catch((error) => {
          console.error(`[Backup Cleanup] Failed to delete ${file.name}`, error);
        });
      }
    }
  } catch (error) {
    console.error("Failed to cleanup old backups", error);
  }
}

export async function createBackupSnapshot(type = "manual") {
  noStore();
  ensureRuntimeDirectories();

  const createdAt = new Date();
  const database = await readDatabaseSnapshot();
  const dataFiles = await readDataFiles();
  const uploads = await walkUploads();
  const fileName = formatBackupName(type);
  const payload = {
    version: 1,
    type,
    createdAt: createdAt.toISOString(),
    source: database ? "database" : "files",
    app: "BadrDaawa",
    database,
    dataFiles,
    uploads,
  };
  const json = `${JSON.stringify(payload, jsonReplacer, 2)}\n`;

  const backupPath = path.join(backupDir, fileName);
  ensureParentDirectory(backupPath);
  await writeFile(backupPath, json, "utf8");
  console.log(`[Backup] Created ${fileName} (${Buffer.byteLength(json)} bytes, source: ${payload.source}).`);

  if (prisma) {
    await prisma.backupJob
      .create({
        data: {
          type,
          status: "SUCCESS",
          fileName,
          sizeBytes: BigInt(Buffer.byteLength(json)),
          startedAt: createdAt,
          finishedAt: new Date(),
        },
      })
      .catch((error: any) => console.error("[Backup] Failed to record backup job", error));
  }

  await cleanupOldBackups();

  return toBackupSummary(fileName, Buffer.byteLength(json), createdAt.toISOString(), database ? "database" : "files", Object.keys(dataFiles).length + uploads.length);
}

function toBackupSummary(fileName: string, sizeBytes: number, createdAt: string, source: "database" | "files", items: number): BackupSummary {
  return {
    fileName,
    type: fileName.split("-")[0] || "manual",
    status: "SUCCESS",
    sizeBytes,
    createdAt,
    source,
    items,
  };
}

export async function listBackupSnapshots() {
  noStore();
  ensureRuntimeDirectories();

  if (!(await exists(backupDir))) return [];
  const entries = await readdir(backupDir, { withFileTypes: true });
  const summaries = await Promise.all(
    entries
      .filter((entry) => entry.isFile() && entry.name.endsWith(".json"))
      .map(async (entry) => {
        const filePath = path.join(backupDir, entry.name);
        const fileStat = await stat(filePath);
        let source: BackupSummary["source"] = "files";
        let items = 0;
        try {
          const parsed = JSON.parse(await readFile(filePath, "utf8")) as {
            source?: BackupSummary["source"];
            dataFiles?: Record<string, unknown>;
            uploads?: unknown[];
          };
          source = parsed.source === "database" ? "database" : "files";
          items = Object.keys(parsed.dataFiles || {}).length + (Array.isArray(parsed.uploads) ? parsed.uploads.length : 0);
        } catch {
          items = 0;
        }
        return toBackupSummary(entry.name, fileStat.size, fileStat.mtime.toISOString(), source, items);
      }),
  );

  return summaries.sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
}

export async function getBackupFile(fileName: string) {
  noStore();

  if (!/^[a-z0-9-]+\.json$/i.test(fileName)) return null;
  const filePath = path.join(backupDir, fileName);
  if (!filePath.startsWith(backupDir) || !(await exists(filePath))) return null;
  return {
    fileName,
    bytes: await readFile(filePath),
  };
}

async function readBackupPayload(fileName: string): Promise<BackupPayload | null> {
  const backup = await getBackupFile(fileName);
  if (!backup) return null;

  try {
    const parsed = JSON.parse(backup.bytes.toString("utf8")) as unknown;
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? (parsed as BackupPayload) : null;
  } catch {
    return null;
  }
}

function isSafeDataFileName(fileName: string) {
  return /^[a-z0-9._-]+\.json$/i.test(fileName) && !fileName.includes("..") && !fileName.startsWith("backup");
}

function isSafeUploadPath(filePath: string) {
  return /^[a-z0-9._\-\/]+$/i.test(filePath) && !path.isAbsolute(filePath) && !filePath.split(/[\\/]+/).includes("..");
}

export async function restoreBackupSnapshot(fileName: string) {
  noStore();
  ensureRuntimeDirectories();

  const payload = await readBackupPayload(fileName);
  if (!payload?.dataFiles || typeof payload.dataFiles !== "object") return null;

  const beforeRestore = await createBackupSnapshot("restore-before");
  let restoredDataFiles = 0;
  let restoredUploads = 0;

  await mkdir(dataDir, { recursive: true });
  for (const [name, value] of Object.entries(payload.dataFiles)) {
    if (!isSafeDataFileName(name)) continue;
    await writeFile(path.join(dataDir, name), `${JSON.stringify(value, null, 2)}\n`, "utf8");
    restoredDataFiles += 1;
  }

  if (Array.isArray(payload.uploads)) {
    for (const upload of payload.uploads) {
      if (!upload?.path || !upload.base64 || !isSafeUploadPath(upload.path)) continue;
      await writeUploadFile(upload.path, Buffer.from(upload.base64, "base64"));
      restoredUploads += 1;
    }
  }

  return {
    fileName,
    beforeRestoreFileName: beforeRestore.fileName,
    restoredDataFiles,
    restoredUploads,
    source: payload.source || "files",
    includesDatabaseDump: Boolean(payload.source === "database" && payload.database),
  };
}
