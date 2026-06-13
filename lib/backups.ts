import { createHash } from "node:crypto";
import { readFile, readdir, stat, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { unstable_noStore as noStore } from "next/cache";
import { prisma } from "./db";
import { parseJsonFileIfSafe } from "./json-file-safety";
import { isProjectContentAppSettingKey } from "./project-content-store";
import { ensureParentDirectory, ensureRuntimeDirectories, runtimeBackupDir } from "./runtime-paths";
import { listUploadFiles, readUploadFile } from "./storage-provider";

export type BackupSummary = {
  fileName: string;
  type: string;
  status: "SUCCESS";
  sizeBytes: number;
  createdAt: string;
  source: "database";
  items: number;
};

type BackupPayload = {
  version?: number;
  type?: string;
  createdAt?: string;
  source?: "database";
  runtimeData?: unknown;
  uploads?: unknown;
  metadata?: unknown;
};

const backupDir = runtimeBackupDir;
// We keep exactly the last 20 backups to save storage and maintain history.
const backupRetentionCount = 20;
const maxBackupSummaryBytes = (Number(process.env.BACKUP_SUMMARY_MAX_MB) || 128) * 1024 * 1024;

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

function toErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error || "Unknown error");
}

async function exists(filePath: string) {
  try {
    await stat(filePath);
    return true;
  } catch {
    return false;
  }
}

async function readDatabaseMetadata() {
  if (!prisma) return null;

  try {
    const [
      adminUsers,
      customers,
      invitations,
      guests,
      orders,
      analyticsEvents,
      nonProjectAppSettings,
      guestBookMessages,
      coupleMessagesSettings,
      checkIns,
      liveModes,
      clientMessages,
      internalNotes,
      auditLogs,
      backupJobs,
      syncLogs,
    ] = await Promise.all([
      prisma.adminUser.count(),
      prisma.customer.count(),
      prisma.invitation.count(),
      prisma.guestRsvp.count(),
      prisma.orderRequest.count(),
      prisma.analyticsEvent.count(),
      prisma.appSetting.count({ where: { key: { notIn: projectContentAppSettingKeys() } } }),
      prisma.guestBookMessage.count(),
      prisma.coupleMessagesSetting.count(),
      prisma.invitationCheckIn.count(),
      prisma.weddingLiveMode.count(),
      prisma.clientMessage.count(),
      prisma.internalNote.count(),
      prisma.auditLog.count(),
      prisma.backupJob.count(),
      prisma.syncLog.count(),
    ]);
    return {
      counts: {
        adminUsers,
        customers,
        invitations,
        guestRsvp: guests,
        orders,
        analyticsEvents,
        nonProjectAppSettings,
        guestBookMessages,
        coupleMessagesSettings,
        checkIns,
        liveModes,
        clientMessages,
        internalNotes,
        auditLogs,
        backupJobs,
        syncLogs,
      },
    };
  } catch (error) {
    console.error("[Backup] Failed to read database metadata.", error);
    return null;
  }
}

function projectContentAppSettingKeys() {
  return [
    "project-content:site-settings",
    "project-content:home-content",
    "project-content:home-preview-settings",
    "project-content:template-settings",
    "project-content:template-preview-info",
    "project-content:templates-preview-music",
    "project-content:music-library",
    "project-content:legal-pages",
    "project-content:message-templates",
    "project-content:content-presets",
    "project-content:custom-templates",
  ];
}

async function readRuntimeDataSnapshot() {
  if (!prisma) throw new Error("DATABASE_URL is required to create a Runtime Data backup.");

  const appSettings = await prisma.appSetting.findMany();
  const nonProjectAppSettings = appSettings.filter((setting) => !isProjectContentAppSettingKey(setting.key));

  return {
    adminUsers: await prisma.adminUser.findMany({ orderBy: { createdAt: "asc" } }),
    customers: await prisma.customer.findMany({ orderBy: { createdAt: "asc" } }),
    invitations: await prisma.invitation.findMany({ orderBy: { createdAt: "asc" } }),
    guestRsvps: await prisma.guestRsvp.findMany({ orderBy: { createdAt: "asc" } }),
    orderRequests: await prisma.orderRequest.findMany({ orderBy: { createdAt: "asc" } }),
    analyticsEvents: await prisma.analyticsEvent.findMany({ orderBy: { createdAt: "asc" } }),
    appSettings: nonProjectAppSettings,
    guestBookMessages: await prisma.guestBookMessage.findMany({ orderBy: { createdAt: "asc" } }),
    coupleMessagesSettings: await prisma.coupleMessagesSetting.findMany({ orderBy: { updatedAt: "asc" } }),
    clientMessages: await prisma.clientMessage.findMany({ orderBy: { createdAt: "asc" } }),
    invitationCheckIns: await prisma.invitationCheckIn.findMany({ orderBy: { createdAt: "asc" } }),
    weddingLiveModes: await prisma.weddingLiveMode.findMany({ orderBy: { updatedAt: "asc" } }),
    internalNotes: await prisma.internalNote.findMany({ orderBy: { createdAt: "asc" } }),
    auditLogs: await prisma.auditLog.findMany({ orderBy: { createdAt: "asc" } }),
    backupJobs: await prisma.backupJob.findMany({ orderBy: { createdAt: "asc" } }),
    syncLogs: await prisma.syncLog.findMany({ orderBy: { createdAt: "asc" } }),
  };
}

function countRuntimeItems(runtimeData: Record<string, unknown[]>, uploadsCount: number) {
  return Object.values(runtimeData).reduce((sum, rows) => sum + rows.length, 0) + uploadsCount;
}

async function readRuntimeUploadSnapshot() {
  const files = await listUploadFiles();
  const uploads = [];
  for (const file of files.sort((a, b) => a.key.localeCompare(b.key))) {
    const bytes = await readUploadFile(file.key);
    if (!bytes) continue;
    uploads.push({
      key: file.key,
      url: file.url,
      relativePath: file.relativePath,
      contentType: file.contentType,
      lastModified: file.lastModified,
      sizeBytes: bytes.length,
      sha256: createHash("sha256").update(bytes).digest("hex"),
      encoding: "base64",
      base64: bytes.toString("base64"),
    });
  }
  return uploads;
}

async function createBackupJob(type: string, startedAt: Date) {
  if (!prisma) return null;
  try {
    const job = await prisma.backupJob.create({
      data: {
        type,
        status: "RUNNING",
        startedAt,
      },
    });
    return job.id;
  } catch (error) {
    console.error("[Backup] Failed to create BackupJob", error);
    return null;
  }
}

async function updateBackupJob(
  id: string | null,
  data: {
    status: "SUCCESS" | "FAILED";
    fileName?: string;
    sizeBytes?: number;
    error?: string;
  },
) {
  if (!prisma || !id) return;
  try {
    await prisma.backupJob.update({
      where: { id },
      data: {
        status: data.status,
        fileName: data.fileName,
        sizeBytes: data.sizeBytes === undefined ? undefined : BigInt(data.sizeBytes),
        error: data.error,
        finishedAt: new Date(),
      },
    });
  } catch (error) {
    console.error("[Backup] Failed to update BackupJob", error);
  }
}

async function cleanupOldBackups() {
  try {
    if (!(await exists(backupDir))) return;

    const entries = await readdir(backupDir, { withFileTypes: true });
    const backups: Array<{ name: string; time: number }> = [];

    for (const entry of entries) {
      if (!entry.isFile() || !entry.name.endsWith(".json")) continue;

      const filePath = path.join(backupDir, entry.name);
      const fileStat = await stat(filePath);
      backups.push({ name: entry.name, time: fileStat.mtime.getTime() });
    }

    const sortedFiles = backups.sort((a, b) => b.time - a.time);
    for (const file of sortedFiles.slice(backupRetentionCount)) {
      await unlink(path.join(backupDir, file.name)).catch((error) => {
        console.error(`[Backup Cleanup] Failed to delete ${file.name}`, error);
      });
    }
  } catch (error) {
    console.error("Failed to cleanup old backups", error);
  }
}

export async function createBackupSnapshot(type = "manual") {
  noStore();
  ensureRuntimeDirectories();

  const createdAt = new Date();
  const jobId = await createBackupJob(type, createdAt);
  console.log(`[Backup] Backup Started: ${type}`);

  try {
    const runtimeData = await readRuntimeDataSnapshot();
    const uploads = await readRuntimeUploadSnapshot();
    const database = await readDatabaseMetadata();
    const fileName = formatBackupName(type);
    const payload: BackupPayload & {
      app: "BadrDaawa";
      retention: { keepLast: number };
    } = {
      version: 2,
      type,
      createdAt: createdAt.toISOString(),
      source: "database",
      app: "BadrDaawa",
      retention: { keepLast: backupRetentionCount },
      runtimeData,
      uploads,
      metadata: {
        database,
        classification: {
          included: "Runtime Data and customer uploads only",
          excluded: "Project Content, code, templates, base site assets, and project music",
        },
        runtimeTables: Object.fromEntries(Object.entries(runtimeData).map(([table, rows]) => [table, rows.length])),
        uploads: {
          files: uploads.length,
          bytes: uploads.reduce((sum, upload) => sum + upload.sizeBytes, 0),
        },
      },
    };
    const json = `${JSON.stringify(payload, jsonReplacer, 2)}\n`;
    const sizeBytes = Buffer.byteLength(json);

    const backupPath = path.join(backupDir, fileName);
    ensureParentDirectory(backupPath);
    await writeFile(backupPath, json, "utf8");
    await cleanupOldBackups();
    const items = countRuntimeItems(runtimeData, uploads.length);
    console.log(`[Backup] Backup Completed: ${fileName} (${sizeBytes} bytes, ${items} runtime item(s)).`);

    await updateBackupJob(jobId, {
      status: "SUCCESS",
      fileName,
      sizeBytes,
    });

    return toBackupSummary(fileName, sizeBytes, createdAt.toISOString(), "database", items);
  } catch (error) {
    const message = toErrorMessage(error);
    console.error(`[Backup] Backup Failed: ${message}`);
    await updateBackupJob(jobId, {
      status: "FAILED",
      error: message,
    });
    throw error;
  }
}

export async function markBackupSnapshotPipelineFailed(fileName: string, error: string) {
  if (!prisma || !/^[a-z0-9-]+\.json$/i.test(fileName)) return;
  try {
    await prisma.backupJob.updateMany({
      where: { fileName },
      data: {
        status: "FAILED",
        error,
        finishedAt: new Date(),
      },
    });
  } catch (updateError) {
    console.error("[Backup] Failed to mark backup pipeline failure", updateError);
  }
}

function toBackupSummary(fileName: string, sizeBytes: number, createdAt: string, source: "database", items: number): BackupSummary {
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
        let source: BackupSummary["source"] = "database";
        let items = 0;
        if (fileStat.size <= maxBackupSummaryBytes) {
          try {
            const safe = await parseJsonFileIfSafe<{
              source?: BackupSummary["source"];
              runtimeData?: Record<string, unknown[]>;
              uploads?: unknown[];
            }>(filePath, entry.name, maxBackupSummaryBytes);
            const parsed = safe.value;
            if (!parsed) throw new Error(safe.skipped ? "oversized-backup" : "invalid-backup");
            source = "database";
            const runtimeItems = parsed.runtimeData
              ? Object.values(parsed.runtimeData).reduce((sum, rows) => sum + (Array.isArray(rows) ? rows.length : 0), 0)
              : 0;
            items = runtimeItems + (Array.isArray(parsed.uploads) ? parsed.uploads.length : 0);
          } catch {
            items = 0;
          }
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
