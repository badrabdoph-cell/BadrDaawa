import { createHash } from "crypto";
import { readFile, readdir, stat, unlink, writeFile } from "fs/promises";
import path from "path";
import { gzipSync, gunzipSync } from "zlib";
import { unstable_noStore as noStore } from "next/cache";
import { prisma } from "./db";
import { getDatabaseUrl } from "./database-url";
import { uploadRuntimeBackupToGitHub } from "./github-sync";
import { parseJsonFileIfSafe } from "./json-file-safety";
import { ensureParentDirectory, ensureRuntimeDirectories, runtimeBackupDir } from "./runtime-paths";
import { listUploadFiles, readUploadFile } from "./storage-provider";

export type BackupSummary = {
  fileName: string;
  type: string;
  status: "SUCCESS" | "FAILED";
  sizeBytes: number;
  createdAt: string;
  source: "database";
  items: number;
  github: {
    verified: boolean;
    commitSha: string | null;
    fileUrl: string | null;
    repoPath: string | null;
  };
};

export type BackupRuntimeStatus = {
  latestSuccessful: {
    fileName: string;
    type: "Manual" | "Scheduled" | string;
    createdAt: string;
    sizeBytes: number;
    durationMs: number | null;
    storagePath: string;
    localFileExists: boolean;
    commitSha: string | null;
    githubFileUrl: string | null;
    githubUploadSuccess: boolean;
  } | null;
  postgresDump: {
    status: "not_included" | "unknown";
    detail: string;
  };
  uploadsBackup: {
    status: "ok" | "missing" | "unknown";
    files: number | null;
    bytes: number | null;
    detail: string;
  };
  githubBackup: {
    status: "ok" | "failed" | "not_configured" | "unknown";
    detail: string;
    commitSha: string | null;
    githubFileUrl: string | null;
  };
  lastError: {
    message: string;
    createdAt: string | null;
    type: string | null;
  } | null;
  nextScheduledAt: string | null;
  backupsCount: number;
};

export type BackupVerificationResult = {
  ok: boolean;
  startedAt: string;
  finishedAt: string;
  durationMs: number;
  fileName: string | null;
  storagePath: string | null;
  sizeBytes: number | null;
  backupJob: {
    id: string;
    type: string;
    status: string;
    fileName: string | null;
    startedAt: string | null;
    finishedAt: string | null;
    sizeBytes: string | null;
    githubSha: string | null;
    githubUrl: string | null;
    error: string | null;
    createdAt: string;
  } | null;
  steps: Array<{
    name: string;
    ok: boolean;
    detail: string;
    timestamp: string;
  }>;
  error: string | null;
};

export type BackupDiagnostics = {
  databaseUrlPresent: boolean;
  postgresqlConnected: boolean;
  postgresqlError: string | null;
  cronSecretPresent: boolean;
  lastCronInvocation: {
    createdAt: string;
    status: string;
    fileName: string | null;
    githubSha: string | null;
    githubUrl: string | null;
    error: string | null;
  } | null;
  lastScheduledSuccess: {
    createdAt: string;
    fileName: string | null;
    sizeBytes: string | null;
    githubSha: string | null;
    githubUrl: string | null;
  } | null;
  backupsCount: number;
  cronSecretSha256: string | null;
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
// We keep the last 60 backups for extended recovery window before migration.
const backupRetentionCount = 60;
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
      appSettingsCount,
      guestBookMessages,
      coupleMessagesSettings,
      checkIns,
      liveModes,
      clientMessages,
      internalNotes,
      auditLogs,
      backupJobs,
      syncLogs,
      dynamicPages,
      weddingTemplates,
    ] = await Promise.all([
      prisma.adminUser.count(),
      prisma.customer.count(),
      prisma.invitation.count(),
      prisma.guestRsvp.count(),
      prisma.orderRequest.count(),
      prisma.analyticsEvent.count(),
      prisma.appSetting.count(),
      prisma.guestBookMessage.count(),
      prisma.coupleMessagesSetting.count(),
      prisma.invitationCheckIn.count(),
      prisma.weddingLiveMode.count(),
      prisma.clientMessage.count(),
      prisma.internalNote.count(),
      prisma.auditLog.count(),
      prisma.backupJob.count(),
      prisma.syncLog.count(),
      prisma.dynamicPage.count(),
      prisma.weddingTemplate.count(),
    ]);
    return {
      counts: {
        adminUsers,
        customers,
        invitations,
        guestRsvp: guests,
        orders,
        analyticsEvents,
        appSettings: appSettingsCount,
        guestBookMessages,
        coupleMessagesSettings,
        checkIns,
        liveModes,
        clientMessages,
        internalNotes,
        auditLogs,
        backupJobs,
        syncLogs,
        dynamicPages,
        weddingTemplates,
      },
    };
  } catch (error) {
    console.error("[Backup] Failed to read database metadata.", error);
    return null;
  }
}

async function readRuntimeDataSnapshot() {
  if (!prisma) throw new Error("DATABASE_URL is required to create a Runtime Data backup.");

  const [appSettings, adminUsers, customers, invitations, guestRsvps, orderRequests, analyticsEvents, guestBookMessages, coupleMessagesSettings, clientMessages, invitationCheckIns, weddingLiveModes, internalNotes, auditLogs, backupJobs, syncLogs, dynamicPages, weddingTemplates] = await Promise.all([
    prisma.appSetting.findMany({ orderBy: { key: "asc" } }),
    prisma.adminUser.findMany({ orderBy: { createdAt: "asc" } }),
    prisma.customer.findMany({ orderBy: { createdAt: "asc" } }),
    prisma.invitation.findMany({ orderBy: { createdAt: "asc" } }),
    prisma.guestRsvp.findMany({ orderBy: { createdAt: "asc" } }),
    prisma.orderRequest.findMany({ orderBy: { createdAt: "asc" } }),
    prisma.analyticsEvent.findMany({ orderBy: { createdAt: "asc" } }),
    prisma.guestBookMessage.findMany({ orderBy: { createdAt: "asc" } }),
    prisma.coupleMessagesSetting.findMany({ orderBy: { updatedAt: "asc" } }),
    prisma.clientMessage.findMany({ orderBy: { createdAt: "asc" } }),
    prisma.invitationCheckIn.findMany({ orderBy: { createdAt: "asc" } }),
    prisma.weddingLiveMode.findMany({ orderBy: { updatedAt: "asc" } }),
    prisma.internalNote.findMany({ orderBy: { createdAt: "asc" } }),
    prisma.auditLog.findMany({ orderBy: { createdAt: "asc" } }),
    prisma.backupJob.findMany({ orderBy: { createdAt: "asc" } }),
    prisma.syncLog.findMany({ orderBy: { createdAt: "asc" } }),
    prisma.dynamicPage.findMany({ orderBy: { createdAt: "asc" } }),
    prisma.weddingTemplate.findMany({ orderBy: { createdAt: "asc" } }),
  ]);

  return {
    adminUsers,
    customers,
    invitations,
    guestRsvps,
    orderRequests,
    analyticsEvents,
    appSettings,
    guestBookMessages,
    coupleMessagesSettings,
    clientMessages,
    invitationCheckIns,
    weddingLiveModes,
    internalNotes,
    auditLogs,
    backupJobs,
    syncLogs,
    dynamicPages,
    weddingTemplates,
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
    githubSha?: string | null;
    githubUrl?: string | null;
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
        githubSha: data.githubSha,
        githubUrl: data.githubUrl,
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
  let fileName: string | undefined;
  let sizeBytes: number | undefined;
  console.log(`[Backup] Backup Started: ${type}`);

  try {
    const runtimeData = await readRuntimeDataSnapshot();
    const uploads = await readRuntimeUploadSnapshot();
    const database = await readDatabaseMetadata();
    fileName = formatBackupName(type);
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
          included: "All PostgreSQL tables + file uploads",
          excluded: "Code and base site assets only",
        },
        runtimeTables: Object.fromEntries(Object.entries(runtimeData).map(([table, rows]) => [table, rows.length])),
        uploads: {
          files: uploads.length,
          bytes: uploads.reduce((sum, upload) => sum + upload.sizeBytes, 0),
        },
      },
    };
    const json = `${JSON.stringify(payload, jsonReplacer, 2)}\n`;
    sizeBytes = Buffer.byteLength(json);

    const backupPath = path.join(backupDir, fileName);
    ensureParentDirectory(backupPath);
    await writeFile(backupPath, json, "utf8");
    await cleanupOldBackups();

    const runtimeTables = Object.fromEntries(Object.entries(runtimeData).map(([table, rows]) => [table, rows.length]));
    const uploadCount = uploads.length;
    const uploadBytes = uploads.reduce((sum, upload) => sum + upload.sizeBytes, 0);
    const uploadsMeta = {
      files: uploadCount,
      bytes: uploadBytes,
      note: "Uploads included in GitHub backup.",
    };
    const githubOnlyPayload: Record<string, unknown> = {
      version: payload.version,
      type: payload.type,
      createdAt: payload.createdAt,
      source: payload.source,
      app: (payload as Record<string, unknown>).app,
      retention: (payload as Record<string, unknown>).retention,
      runtimeData: payload.runtimeData,
      uploads,
      metadata: {
        database,
        classification: {
          included: "Runtime tables + file uploads",
          excluded: "Code and base site assets only",
        },
        runtimeTables,
        uploads: uploadsMeta,
      },
    };
    const githubJson = `${JSON.stringify(githubOnlyPayload, jsonReplacer, 2)}\n`;
    const githubRawBytes = Buffer.from(githubJson, "utf8");
    const githubCompressed = gzipSync(githubRawBytes, { level: 9 });
    const githubFileName = `${fileName}.gz`;
    console.log(`[Backup] GitHub payload: ${githubRawBytes.length} → ${githubCompressed.length} bytes (${(githubCompressed.length / githubRawBytes.length * 100).toFixed(1)}%)`);
    const githubUpload = await uploadRuntimeBackupToGitHub({
      fileName: githubFileName,
      bytes: githubCompressed,
      createdAt,
      reason: `Runtime backup ${type} (${uploadCount} uploads, ${(uploadBytes / 1024).toFixed(1)} KB)`,
      keepLast: 60,
    });
    if (githubUpload.status !== "synced" || !githubUpload.verified) {
      throw new Error(githubUpload.message || "GitHub backup upload failed.");
    }
    const items = countRuntimeItems(runtimeData, uploads.length);
    console.log(`[Backup] Backup Completed: ${fileName} (${sizeBytes} bytes, ${items} runtime item(s)).`);

    await updateBackupJob(jobId, {
      status: "SUCCESS",
      fileName,
      sizeBytes,
      githubSha: githubUpload.commitSha,
      githubUrl: githubUpload.fileUrl,
    });

    return toBackupSummary(fileName, sizeBytes, createdAt.toISOString(), "database", items, "SUCCESS", {
      verified: githubUpload.verified,
      commitSha: githubUpload.commitSha,
      fileUrl: githubUpload.fileUrl,
      repoPath: githubUpload.repoPath,
    });
  } catch (error) {
    const message = toErrorMessage(error);
    console.error(`[Backup] Backup Failed: ${message}`);
    await updateBackupJob(jobId, {
      status: "FAILED",
      fileName,
      sizeBytes,
      error: message,
    });
    const failure = error instanceof Error ? error : new Error(message);
    Object.assign(failure, {
      backupFileName: fileName ?? null,
      backupSizeBytes: sizeBytes ?? null,
      backupStoragePath: fileName ? backupPathFor(fileName) : null,
    });
    throw failure;
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

function toBackupSummary(
  fileName: string,
  sizeBytes: number,
  createdAt: string,
  source: "database",
  items: number,
  status: BackupSummary["status"] = "SUCCESS",
  github: BackupSummary["github"] = {
    verified: false,
    commitSha: null,
    fileUrl: null,
    repoPath: null,
  },
): BackupSummary {
  return {
    fileName,
    type: fileName.split("-")[0] || "manual",
    status,
    sizeBytes,
    createdAt,
    source,
    items,
    github,
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
  const sorted = summaries.sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
  if (!prisma) return sorted;

  const localFileNames = new Set(sorted.map((s) => s.fileName));
  const localFileNameList = sorted.length ? sorted.map((s) => s.fileName) : [""];

  const [jobs, orphanJobs] = await Promise.all([
    prisma.backupJob.findMany({
      where: { fileName: { in: localFileNameList } },
      orderBy: { createdAt: "desc" },
    }).catch(() => []),
    prisma.backupJob.findMany({
      where: {
        status: "SUCCESS",
        fileName: { not: null },
        NOT: { fileName: { in: localFileNameList } },
      },
      orderBy: { createdAt: "desc" },
    }).catch(() => []),
  ]);

  const orphanSummaries = orphanJobs
    .filter((j) => j.fileName && !localFileNames.has(j.fileName))
    .map((job) => toBackupSummary(
      job.fileName!,
      Number(job.sizeBytes) || 0,
      job.createdAt.toISOString(),
      "database",
      0,
      "SUCCESS",
      {
        verified: Boolean(job.githubSha && job.githubUrl),
        commitSha: job.githubSha,
        fileUrl: job.githubUrl,
        repoPath: null,
      },
    ));

  const merged = [...sorted, ...orphanSummaries]
    .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));

  const jobByFileName = new Map<string, (typeof jobs)[number]>();
  for (const job of jobs) {
    if (job.fileName && !jobByFileName.has(job.fileName)) {
      jobByFileName.set(job.fileName, job);
    }
  }

  return merged.map((summary) => {
    const job = jobByFileName.get(summary.fileName);
    if (!job) return summary;
    return {
      ...summary,
      status: (job.status === "FAILED" ? "FAILED" : "SUCCESS") as BackupSummary["status"],
      github: {
        verified: Boolean(job.githubSha && job.githubUrl && job.status === "SUCCESS"),
        commitSha: job.githubSha,
        fileUrl: job.githubUrl,
        repoPath: null,
      },
    };
  });
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

function backupTypeLabel(type: string | null | undefined): "Manual" | "Scheduled" | string {
  const clean = (type || "").toLowerCase();
  if (clean === "manual" || clean === "manual-verify") return "Manual";
  if (clean === "scheduled") return "Scheduled";
  return type || "Unknown";
}

function backupPathFor(fileName: string) {
  return path.join(backupDir, fileName);
}

function iso(value: Date | null | undefined) {
  return value ? value.toISOString() : null;
}

async function readBackupJobByFileName(fileName: string) {
  if (!prisma) return null;
  return prisma.backupJob.findFirst({
    where: { fileName },
    orderBy: { createdAt: "desc" },
  });
}

function serializeBackupJob(job: Awaited<ReturnType<typeof readBackupJobByFileName>>) {
  if (!job) return null;
  return {
    id: job.id,
    type: job.type,
    status: job.status,
    fileName: job.fileName,
    startedAt: iso(job.startedAt),
    finishedAt: iso(job.finishedAt),
    sizeBytes: job.sizeBytes?.toString() ?? null,
    githubSha: job.githubSha,
    githubUrl: job.githubUrl,
    error: job.error,
    createdAt: job.createdAt.toISOString(),
  };
}

async function readBackupPayload(fileName: string) {
  const filePath = backupPathFor(fileName);
  const safe = await parseJsonFileIfSafe<{
    runtimeData?: Record<string, unknown[]>;
    uploads?: Array<{ sizeBytes?: number }>;
    postgresDump?: unknown;
    metadata?: {
      uploads?: {
        files?: number;
        bytes?: number;
      };
    };
  }>(filePath, fileName, maxBackupSummaryBytes);
  if (!safe.value) {
    throw new Error(safe.skipped ? "Backup file is too large to verify with the configured summary limit." : "Backup file is not valid JSON.");
  }
  return safe.value;
}

export async function getBackupRuntimeStatus(): Promise<BackupRuntimeStatus> {
  noStore();
  const backups = await listBackupSnapshots();
  const latestSuccessfulJob = prisma
    ? await prisma.backupJob.findFirst({ where: { status: "SUCCESS" }, orderBy: { createdAt: "desc" } }).catch(() => null)
    : null;
  const failedJob = prisma
    ? await prisma.backupJob.findFirst({ where: { status: "FAILED" }, orderBy: { createdAt: "desc" } }).catch(() => null)
    : null;
  const lastScheduled = prisma
    ? await prisma.backupJob.findFirst({ where: { type: "scheduled" }, orderBy: { createdAt: "desc" } }).catch(() => null)
    : null;
  const latestSuccessfulFileName = latestSuccessfulJob?.fileName || null;
  const latestSuccessfulFilePath = latestSuccessfulFileName ? backupPathFor(latestSuccessfulFileName) : null;
  const latestSuccessfulFileExists = latestSuccessfulFilePath ? await exists(latestSuccessfulFilePath) : false;
  const latestSuccessfulSummary = latestSuccessfulFileName
    ? backups.find((backup) => backup.fileName === latestSuccessfulFileName) ?? null
    : null;

  let uploadsBackup: BackupRuntimeStatus["uploadsBackup"] = {
    status: latestSuccessfulFileName ? "unknown" : "missing",
    files: null,
    bytes: null,
    detail: latestSuccessfulFileName ? "لم يتم فتح ملف آخر نسخة ناجحة بعد." : "لا توجد نسخة احتياطية.",
  };
  let postgresDump: BackupRuntimeStatus["postgresDump"] = {
    status: "unknown",
    detail: latestSuccessfulFileName ? "لم يتم فتح ملف آخر نسخة ناجحة بعد." : "لا توجد نسخة احتياطية.",
  };

  if (latestSuccessfulFileName) {
    try {
      const payload = await readBackupPayload(latestSuccessfulFileName);
      const uploads = Array.isArray(payload.uploads) ? payload.uploads : [];
      const uploadBytes = uploads.reduce((sum, upload) => sum + (typeof upload.sizeBytes === "number" ? upload.sizeBytes : 0), 0);
      uploadsBackup = {
        status: "ok",
        files: payload.metadata?.uploads?.files ?? uploads.length,
        bytes: payload.metadata?.uploads?.bytes ?? uploadBytes,
        detail: "تم فتح ملف آخر نسخة وقراءة uploads payload.",
      };
      postgresDump = payload.postgresDump
        ? { status: "unknown", detail: "الملف يحتوي postgresDump legacy." }
        : { status: "not_included", detail: "النظام الحالي يحفظ Runtime Data JSON ولا يستخدم pg_dump داخل هذه النسخة." };
    } catch (error) {
      uploadsBackup = {
        status: "unknown",
        files: null,
        bytes: null,
        detail: toErrorMessage(error),
      };
    }
  }

  const durationMs =
    latestSuccessfulJob?.startedAt && latestSuccessfulJob.finishedAt
      ? Math.max(0, latestSuccessfulJob.finishedAt.getTime() - latestSuccessfulJob.startedAt.getTime())
      : null;
  const nextScheduledAt = lastScheduled?.finishedAt
    ? new Date(lastScheduled.finishedAt.getTime() + 3 * 60 * 60 * 1000).toISOString()
    : null;
  const gitHubConfigured = Boolean(process.env.GITHUB_SYNC_ENABLED !== "false" && (process.env.GITHUB_SYNC_REPO || "").trim() && (process.env.GITHUB_SYNC_TOKEN || process.env.GITHUB_TOKEN || process.env.GH_TOKEN));
  const latestGitHubSuccess = Boolean(latestSuccessfulJob?.githubSha && latestSuccessfulJob?.githubUrl);

  return {
    latestSuccessful: latestSuccessfulJob && latestSuccessfulFileName
      ? {
          fileName: latestSuccessfulFileName,
          type: backupTypeLabel(latestSuccessfulJob.type),
          createdAt: latestSuccessfulJob.createdAt.toISOString(),
          sizeBytes: latestSuccessfulSummary?.sizeBytes ?? (latestSuccessfulJob.sizeBytes ? Number(latestSuccessfulJob.sizeBytes) : 0),
          durationMs,
          storagePath: latestSuccessfulFilePath || backupPathFor(latestSuccessfulFileName),
          localFileExists: latestSuccessfulFileExists,
          commitSha: latestSuccessfulJob.githubSha,
          githubFileUrl: latestSuccessfulJob.githubUrl,
          githubUploadSuccess: latestGitHubSuccess,
        }
      : null,
    postgresDump,
    uploadsBackup,
    githubBackup: {
      status: latestGitHubSuccess ? "ok" : gitHubConfigured ? "failed" : "not_configured",
      detail: latestGitHubSuccess
        ? "تم رفع آخر نسخة ناجحة إلى GitHub والتحقق من وجودها."
        : gitHubConfigured
          ? "GitHub مهيأ لكن لا توجد نسخة ناجحة مرفوعة ومتحقق منها حالياً."
          : "متغيرات GitHub Backup غير مكتملة.",
      commitSha: latestSuccessfulJob?.githubSha ?? null,
      githubFileUrl: latestSuccessfulJob?.githubUrl ?? null,
    },
    lastError: failedJob
      ? {
          message: failedJob.error || "Backup failed without stored error.",
          createdAt: failedJob.createdAt.toISOString(),
          type: failedJob.type,
        }
      : null,
    nextScheduledAt,
    backupsCount: backups.length,
  };
}

export type ScheduledBackupInfo = {
  lastScheduled: {
    createdAt: string;
    status: string;
    fileName: string | null;
  } | null;
  lastScheduledSuccess: {
    createdAt: string;
    status: string;
    fileName: string | null;
  } | null;
  recentScheduled: Array<{
    createdAt: string;
    status: string;
    fileName: string | null;
  }>;
  nextScheduledAt: string | null;
};

export async function getScheduledBackupInfo(): Promise<ScheduledBackupInfo> {
  noStore();
  if (!prisma) {
    return { lastScheduled: null, lastScheduledSuccess: null, recentScheduled: [], nextScheduledAt: null };
  }
  const [lastScheduled, lastScheduledSuccess, recentScheduled] = await Promise.all([
    prisma.backupJob
      .findFirst({ where: { type: "scheduled" }, orderBy: { createdAt: "desc" } })
      .catch(() => null),
    prisma.backupJob
      .findFirst({ where: { type: "scheduled", status: "SUCCESS" }, orderBy: { createdAt: "desc" } })
      .catch(() => null),
    prisma.backupJob
      .findMany({ where: { type: "scheduled" }, orderBy: { createdAt: "desc" }, take: 5 })
      .catch(() => []),
  ]);
  const nextScheduledAt = lastScheduled?.finishedAt
    ? new Date(lastScheduled.finishedAt.getTime() + 3 * 60 * 60 * 1000).toISOString()
    : null;
  return {
    lastScheduled: lastScheduled
      ? { createdAt: lastScheduled.createdAt.toISOString(), status: lastScheduled.status, fileName: lastScheduled.fileName }
      : null,
    lastScheduledSuccess: lastScheduledSuccess
      ? { createdAt: lastScheduledSuccess.createdAt.toISOString(), status: lastScheduledSuccess.status, fileName: lastScheduledSuccess.fileName }
      : null,
    recentScheduled: recentScheduled.map((job) => ({
      createdAt: job.createdAt.toISOString(),
      status: job.status,
      fileName: job.fileName,
    })),
    nextScheduledAt,
  };
}

export async function verifyBackupNow(): Promise<BackupVerificationResult> {
  noStore();
  const startedAt = new Date();
  const steps: BackupVerificationResult["steps"] = [];
  const addStep = (name: string, ok: boolean, detail: string) => {
    steps.push({ name, ok, detail, timestamp: new Date().toISOString() });
  };

  let fileName: string | null = null;
  let storagePath: string | null = null;
  let sizeBytes: number | null = null;
  let backupJob: BackupVerificationResult["backupJob"] = null;

  try {
    const summary = await createBackupSnapshot("manual-verify");
    fileName = summary.fileName;
    storagePath = backupPathFor(fileName);
    addStep("create-backup", true, `Backup created: ${fileName}`);

    const fileStat = await stat(storagePath);
    if (!fileStat.isFile()) throw new Error("Backup path exists but is not a file.");
    sizeBytes = fileStat.size;
    addStep("file-exists", true, `File exists at ${storagePath}.`);
    addStep("file-size", fileStat.size > 0, `File size: ${fileStat.size} bytes.`);
    if (fileStat.size <= 0) throw new Error("Backup file is empty.");

    const payload = await readBackupPayload(fileName);
    addStep("open-json", true, "Backup file opened and parsed as JSON.");

    const hasRuntimeData = payload.runtimeData && typeof payload.runtimeData === "object";
    addStep("runtime-data", Boolean(hasRuntimeData), hasRuntimeData ? "runtimeData object exists." : "runtimeData object is missing.");
    if (!hasRuntimeData) throw new Error("Backup file does not contain runtimeData.");

    const uploads = Array.isArray(payload.uploads) ? payload.uploads : null;
    addStep("uploads-backup", Boolean(uploads), uploads ? `uploads array exists with ${uploads.length} item(s).` : "uploads array is missing.");
    if (!uploads) throw new Error("Backup file does not contain uploads array.");

    backupJob = serializeBackupJob(await readBackupJobByFileName(fileName));
    addStep("backup-job", Boolean(backupJob), backupJob ? `BackupJob ${backupJob.id} status=${backupJob.status}.` : "BackupJob was not found.");
    const githubVerified = Boolean(backupJob?.githubSha && backupJob?.githubUrl);
    addStep(
      "github-upload",
      githubVerified,
      githubVerified
        ? `GitHub upload verified: ${backupJob?.githubSha}`
        : "GitHub upload verification details are missing from BackupJob.",
    );
    if (!githubVerified) throw new Error("BackupJob does not contain verified GitHub upload metadata.");

    const finishedAt = new Date();
    return {
      ok: steps.every((step) => step.ok),
      startedAt: startedAt.toISOString(),
      finishedAt: finishedAt.toISOString(),
      durationMs: finishedAt.getTime() - startedAt.getTime(),
      fileName,
      storagePath,
      sizeBytes,
      backupJob,
      steps,
      error: steps.every((step) => step.ok) ? null : "One or more verification steps failed.",
    };
  } catch (error) {
    const runtimeError = error as Error & {
      backupFileName?: string | null;
      backupSizeBytes?: number | null;
      backupStoragePath?: string | null;
    };
    if (!fileName && runtimeError.backupFileName) fileName = runtimeError.backupFileName;
    if (!storagePath && runtimeError.backupStoragePath) storagePath = runtimeError.backupStoragePath;
    if (sizeBytes === null && typeof runtimeError.backupSizeBytes === "number") sizeBytes = runtimeError.backupSizeBytes;
    if (storagePath && (await exists(storagePath))) {
      const localStat = await stat(storagePath).catch(() => null);
      addStep(
        "local-file",
        Boolean(localStat?.isFile()),
        localStat ? `Local backup file exists: ${fileName || storagePath} (${localStat.size} bytes).` : "Local backup file could not be read.",
      );
      if (localStat) sizeBytes = localStat.size;
    }
    addStep("failure", false, toErrorMessage(error));
    if (fileName && !backupJob) {
      backupJob = serializeBackupJob(await readBackupJobByFileName(fileName).catch(() => null));
    }
    const finishedAt = new Date();
    return {
      ok: false,
      startedAt: startedAt.toISOString(),
      finishedAt: finishedAt.toISOString(),
      durationMs: finishedAt.getTime() - startedAt.getTime(),
      fileName,
      storagePath,
      sizeBytes,
      backupJob,
      steps,
      error: toErrorMessage(error),
    };
  }
}

export type RestoreResult = {
  ok: boolean;
  fileName: string;
  itemsRestored: number;
  uploadsRestored: number;
  steps: Array<{ table: string; deleted: number; inserted: number }>;
  durationMs: number;
  error: string | null;
};

function restoreTableOrder(): string[] {
  return [
    "adminUsers",
    "customers",
    "weddingTemplates",
    "dynamicPages",
    "invitations",
    "orderRequests",
    "guestRsvps",
    "analyticsEvents",
    "appSettings",
    "guestBookMessages",
    "coupleMessagesSettings",
    "clientMessages",
    "invitationCheckIns",
    "weddingLiveModes",
    "internalNotes",
    "auditLogs",
    "backupJobs",
    "syncLogs",
  ];
}

function deleteTableOrder(): string[] {
  return [
    "syncLogs",
    "backupJobs",
    "auditLogs",
    "internalNotes",
    "weddingLiveModes",
    "invitationCheckIns",
    "clientMessages",
    "coupleMessagesSettings",
    "guestBookMessages",
    "appSettings",
    "analyticsEvents",
    "guestRsvps",
    "orderRequests",
    "invitations",
    "weddingTemplates",
    "dynamicPages",
    "customers",
    "adminUsers",
  ];
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type TxClient = any;

function prismaModelForTable(tx: TxClient, table: string) {
  const map: Record<string, unknown> = {
    adminUsers: tx.adminUser,
    customers: tx.customer,
    invitations: tx.invitation,
    guestRsvps: tx.guestRsvp,
    orderRequests: tx.orderRequest,
    analyticsEvents: tx.analyticsEvent,
    appSettings: tx.appSetting,
    guestBookMessages: tx.guestBookMessage,
    coupleMessagesSettings: tx.coupleMessagesSetting,
    clientMessages: tx.clientMessage,
    invitationCheckIns: tx.invitationCheckIn,
    weddingLiveModes: tx.weddingLiveMode,
    internalNotes: tx.internalNote,
    auditLogs: tx.auditLog,
    backupJobs: tx.backupJob,
    syncLogs: tx.syncLog,
    dynamicPages: tx.dynamicPage,
    weddingTemplates: tx.weddingTemplate,
  };
  return map[table];
}

async function deleteTableData(tx: TxClient, table: string): Promise<number> {
  const model = prismaModelForTable(tx, table) as { deleteMany: () => Promise<{ count: number }> } | undefined;
  if (!model?.deleteMany) return 0;
  const result = await model.deleteMany();
  return result.count;
}

async function insertTableData(tx: TxClient, table: string, rows: unknown[]): Promise<number> {
  if (!rows.length) return 0;
  const model = prismaModelForTable(tx, table) as { createMany: (args: { data: unknown[] }) => Promise<{ count: number }> } | undefined;
  if (!model?.createMany) return 0;
  const BATCH_SIZE = 500;
  let inserted = 0;
  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);
    const result = await model.createMany({ data: batch });
    inserted += result.count;
  }
  return inserted;
}

type V1Payload = {
  version: number;
  database?: Record<string, unknown[]>;
  dataFiles?: Record<string, unknown>;
  uploads?: Array<Record<string, unknown>>;
};

function normalizeV1Payload(v1: V1Payload): { runtimeData: Record<string, unknown[]>; uploads: Array<Record<string, unknown>> } {
  const db = v1.database ?? {};
  const dataFiles = v1.dataFiles ?? {};
  const runtimeData: Record<string, unknown[]> = {};
  const now = new Date().toISOString();

  runtimeData.customers = (db.customers as Record<string, unknown>[]) ?? [];
  runtimeData.analyticsEvents = (db.analyticsEvents as Record<string, unknown>[]) ?? [];
  runtimeData.backupJobs = (db.backupJobs as Record<string, unknown>[]) ?? [];

  const templates = (db.templates as Record<string, unknown>[]) ?? [];
  runtimeData.weddingTemplates = templates.map((t) => ({
    ...t,
    category: t.category ?? "migrated",
    style: t.style ?? "classic",
    concept: t.concept ?? "",
    opening: t.opening ?? "",
    layout: t.layout ?? "",
    typography: t.typography ?? "",
    palette: t.palette ?? {},
    previewUrl: t.previewUrl ?? "",
    createdAt: t.createdAt ?? now,
    updatedAt: t.updatedAt ?? now,
  }));

  const customers = runtimeData.customers as Record<string, unknown>[];
  type Rec = Record<string, unknown>;
  const firstCustomerId = (customers[0]?.id as string) ?? "v1-migration-customer";
  const firstTemplateId = ((runtimeData.weddingTemplates[0] as Rec)?.id as string) ?? "v1-migration-template";

  const invitations = (db.invitations as Record<string, unknown>[]) ?? [];
  runtimeData.invitations = invitations.map((inv) => ({
    ...inv,
    weddingTime: inv.weddingTime ?? "",
    customerId: inv.customerId ?? firstCustomerId,
    templateId: inv.templateId ?? firstTemplateId,
    language: inv.language ?? "ar",
    city: inv.city ?? null,
    mapUrl: inv.mapUrl ?? null,
    manageToken: inv.manageToken ?? null,
    manageTokenExpiresAt: inv.manageTokenExpiresAt ?? null,
    qrCodeUrl: inv.qrCodeUrl ?? null,
    viewCount: inv.viewCount ?? 0,
    deletedAt: inv.deletedAt ?? null,
  }));

  const orders = (db.orders as Record<string, unknown>[]) ?? [];
  runtimeData.orderRequests = orders.map((o) => ({
    ...o,
    weddingDate: o.weddingDate ?? o.submittedAt ?? o.createdAt ?? now,
    venue: o.venue ?? "",
    orderNumber: o.orderNumber ?? null,
    dedupeKey: o.dedupeKey ?? null,
    mapUrl: o.mapUrl ?? null,
    notes: o.notes ?? null,
    rejectionReason: o.rejectionReason ?? null,
    publishedInvitationCode: o.publishedInvitationCode ?? null,
    manageToken: o.manageToken ?? null,
    manageTokenExpiresAt: o.manageTokenExpiresAt ?? null,
    language: o.language ?? "ar",
    templateId: o.templateId ?? null,
    customerId: o.customerId ?? null,
    deletedAt: o.deletedAt ?? null,
    submittedAt: o.submittedAt ?? o.createdAt ?? now,
  }));

  const invitationByCode: Record<string, string> = {};
  for (const inv of runtimeData.invitations as Record<string, unknown>[]) {
    if (inv.code) invitationByCode[inv.code as string] = inv.id as string;
  }
  const guests = (db.guests as Record<string, unknown>[]) ?? [];
  runtimeData.guestRsvps = guests.map((g) => ({
    ...g,
    attendees: g.attendees ?? 1,
    note: g.note ?? null,
    ipHash: g.ipHash ?? null,
    userAgent: g.userAgent ?? null,
    invitationId: g.invitationId
      ? (g.invitationId as string)
      : g.invitationCode
        ? (invitationByCode[g.invitationCode as string] ?? "v1-missing-invitation")
        : "v1-missing-invitation",
  }));

  const auditItems = dataFiles["audit-log.json"];
  if (Array.isArray(auditItems)) {
    runtimeData.auditLogs = (auditItems as Record<string, unknown>[]).map((a) => ({
      id: a.id,
      createdAt: a.createdAt ?? now,
      actorType: (a.actor as Record<string, unknown>)?.type ?? "unknown",
      actorId: (a.actor as Record<string, unknown>)?.id ?? null,
      actorLabel: (a.actor as Record<string, unknown>)?.label ?? "Unknown",
      action: a.action,
      entityType: (a.entity as Record<string, unknown>)?.type ?? "Unknown",
      entityId: (a.entity as Record<string, unknown>)?.id ?? "",
      entityLabel: (a.entity as Record<string, unknown>)?.label ?? null,
      oldValues: a.oldValues ?? null,
      newValues: a.newValues ?? null,
      metadata: a.metadata ?? null,
    }));
  }

  const gbData = dataFiles["guest-book.json"] as Record<string, unknown> | undefined;
  const messages = Array.isArray(gbData?.messages) ? (gbData.messages as Record<string, unknown>[]) : [];
  if (messages.length > 0) {
    runtimeData.guestBookMessages = messages.map((m) => ({
      ...m,
      updatedAt: m.updatedAt ?? m.createdAt ?? now,
      reviewedAt: m.reviewedAt ?? null,
    }));
  }

  const projectContentMap: Record<string, string> = {
    "home-content.json": "project-content:home-content",
    "music-library.json": "project-content:music-library",
    "template-settings.json": "project-content:template-settings",
    "templates-preview-music.json": "project-content:templates-preview-music",
  };
  const appSettings: Record<string, unknown>[] = [];
  for (const [fileName, appSettingKey] of Object.entries(projectContentMap)) {
    const value = (dataFiles as Record<string, unknown>)[fileName];
    if (value !== undefined && value !== null) {
      appSettings.push({
        key: appSettingKey,
        value: JSON.parse(JSON.stringify(value)),
        createdAt: now,
        updatedAt: now,
      });
    }
  }
  runtimeData.appSettings = appSettings;

  return {
    runtimeData,
    uploads: (v1.uploads ?? []) as Array<Record<string, unknown>>,
  };
}

export async function restoreFromBackup(fileName: string): Promise<RestoreResult> {
  noStore();
  const startedAt = Date.now();
  const steps: RestoreResult["steps"] = [];

  if (!/^[a-z0-9-]+\.json$/i.test(fileName)) {
    return { ok: false, fileName, itemsRestored: 0, uploadsRestored: 0, steps, durationMs: Date.now() - startedAt, error: "Invalid file name." };
  }

  const filePath = path.join(backupDir, fileName);
  if (!filePath.startsWith(backupDir)) {
    return { ok: false, fileName, itemsRestored: 0, uploadsRestored: 0, steps, durationMs: Date.now() - startedAt, error: "Invalid file path." };
  }

  if (!(await exists(filePath))) {
    return { ok: false, fileName, itemsRestored: 0, uploadsRestored: 0, steps, durationMs: Date.now() - startedAt, error: "Backup file not found on disk. It may only exist on GitHub — download it first." };
  }

  const safe = await parseJsonFileIfSafe<Record<string, unknown>>(filePath, fileName, maxBackupSummaryBytes);
  if (!safe.value) {
    return { ok: false, fileName, itemsRestored: 0, uploadsRestored: 0, steps, durationMs: Date.now() - startedAt, error: safe.skipped ? "Backup file is too large." : "Backup file is not valid JSON." };
  }

  const { version, database } = safe.value;
  const isV1 = version === 1 && database && typeof database === "object";

  let runtimeData: Record<string, unknown[]> | undefined;
  let uploads: Array<Record<string, unknown>> | undefined;

  if (isV1) {
    console.log(`[Restore] Detected version 1 backup — normalizing to version 2 format.`);
    const normalized = normalizeV1Payload(safe.value as V1Payload);
    runtimeData = normalized.runtimeData;
    uploads = normalized.uploads;
  } else {
    const v = safe.value as { runtimeData?: Record<string, unknown[]>; uploads?: Array<Record<string, unknown>> };
    runtimeData = v.runtimeData;
    uploads = v.uploads;
  }

  if (!runtimeData || typeof runtimeData !== "object") {
    return { ok: false, fileName, itemsRestored: 0, uploadsRestored: 0, steps, durationMs: Date.now() - startedAt, error: "Backup file does not contain runtimeData." };
  }

  if (!prisma) {
    return { ok: false, fileName, itemsRestored: 0, uploadsRestored: 0, steps, durationMs: Date.now() - startedAt, error: "Database is not available." };
  }

  try {
    // Steps 1 & 2: Delete + Insert runtime data in a single transaction
    if (prisma) {
      await prisma.$transaction(async (tx) => {
        const deleteOrder = deleteTableOrder();
        for (const table of deleteOrder) {
          const data = runtimeData[table];
          if (!data) continue;
          const deleted = await deleteTableData(tx, table);
          steps.push({ table, deleted, inserted: 0 });
        }

        const insertOrder = restoreTableOrder();
        for (const table of insertOrder) {
          const rows = runtimeData[table];
          if (!rows || !rows.length) continue;
          const inserted = await insertTableData(tx, table, rows);
          const existingStep = steps.find((s) => s.table === table);
          if (existingStep) {
            existingStep.inserted = inserted;
          } else {
            steps.push({ table, deleted: 0, inserted });
          }
        }
      });
    }

    // Step 3: Restore upload files
    let uploadsRestored = 0;
    if (Array.isArray(uploads) && uploads.length > 0) {
      const { writeUploadFile } = await import("./storage-provider");
      for (const upload of uploads) {
        const b64 = upload.base64 as string | undefined;
        const rp = upload.relativePath as string | undefined;
        if (!b64 || !rp) continue;
        try {
          const bytes = Buffer.from(b64, "base64");
          await writeUploadFile(rp, bytes, upload.contentType as string | undefined);
          uploadsRestored++;
        } catch (uploadError) {
          console.error(`[Restore] Failed to restore upload: ${rp}`, uploadError);
        }
      }
    }

    const itemsRestored = steps.reduce((sum, s) => sum + s.inserted, 0);
    return {
      ok: true,
      fileName,
      itemsRestored,
      uploadsRestored,
      steps,
      durationMs: Date.now() - startedAt,
      error: null,
    };
  } catch (error) {
    const message = toErrorMessage(error);
    return {
      ok: false,
      fileName,
      itemsRestored: steps.reduce((sum, s) => sum + s.inserted, 0),
      uploadsRestored: 0,
      steps,
      durationMs: Date.now() - startedAt,
      error: message,
    };
  }
}

export type GitHubRestoreResult = {
  ok: boolean;
  fileName: string;
  itemsRestored: number;
  uploadsRestored: number;
  durationMs: number;
  error: string | null;
};

export async function downloadAndRestoreFromGitHub(
  backupFileName: string,
  options?: { githubSha?: string; createdAt?: Date },
): Promise<GitHubRestoreResult> {
  const startedAt = Date.now();

  let githubSha: string;
  let createdAt: Date;
  if (options?.githubSha) {
    githubSha = options.githubSha;
    createdAt = options.createdAt ?? new Date();
  } else {
    if (!prisma) {
      return { ok: false, fileName: backupFileName, itemsRestored: 0, uploadsRestored: 0, durationMs: Date.now() - startedAt, error: "Database not available" };
    }
    const job = await prisma.backupJob.findFirst({ where: { fileName: backupFileName }, orderBy: { createdAt: "desc" } });
    if (!job) {
      return { ok: false, fileName: backupFileName, itemsRestored: 0, uploadsRestored: 0, durationMs: Date.now() - startedAt, error: "Backup job not found" };
    }
    if (!job.githubSha) {
      return { ok: false, fileName: backupFileName, itemsRestored: 0, uploadsRestored: 0, durationMs: Date.now() - startedAt, error: "Backup has no GitHub commit SHA" };
    }
    githubSha = job.githubSha;
    createdAt = job.createdAt;
  }

  const { readGitHubBackupFile } = await import("./github-content");
  const { formatBackupRepoPath } = await import("./github-sync");
  const repoPath = formatBackupRepoPath(backupFileName, createdAt);
  const repoPathGz = `${repoPath}.gz`;

  let rawBytes: Buffer | null = null;

  rawBytes = await readGitHubBackupFile(repoPath, githubSha);
  if (!rawBytes) {
    rawBytes = await readGitHubBackupFile(repoPathGz, githubSha);
  }
  if (!rawBytes) {
    return { ok: false, fileName: backupFileName, itemsRestored: 0, uploadsRestored: 0, durationMs: Date.now() - startedAt, error: "Backup file not found on GitHub" };
  }

  let payload: Record<string, unknown>;
  try {
    const text = repoPathGz.endsWith(".gz") ? gunzipSync(rawBytes).toString("utf8") : rawBytes.toString("utf8");
    payload = JSON.parse(text);
  } catch (e) {
    return { ok: false, fileName: backupFileName, itemsRestored: 0, uploadsRestored: 0, durationMs: Date.now() - startedAt, error: `Failed to parse backup: ${e instanceof Error ? e.message : String(e)}` };
  }

  const runtimeData = payload.runtimeData as Record<string, unknown[]> | undefined;
  const uploads = payload.uploads as Array<Record<string, unknown>> | undefined;
  if (!runtimeData || typeof runtimeData !== "object") {
    return { ok: false, fileName: backupFileName, itemsRestored: 0, uploadsRestored: 0, durationMs: Date.now() - startedAt, error: "Backup file does not contain runtimeData" };
  }

  const steps: RestoreResult["steps"] = [];
  try {
    if (prisma) {
      await prisma.$transaction(async (tx) => {
        const deleteOrder = deleteTableOrder();
        for (const table of deleteOrder) {
          const data = runtimeData[table];
          if (!data) continue;
          const deleted = await deleteTableData(tx, table);
          steps.push({ table, deleted, inserted: 0 });
        }

        const insertOrder = restoreTableOrder();
        for (const table of insertOrder) {
          const rows = runtimeData[table];
          if (!rows || !rows.length) continue;
          const inserted = await insertTableData(tx, table, rows);
          const existingStep = steps.find((s) => s.table === table);
          if (existingStep) {
            existingStep.inserted = inserted;
          } else {
            steps.push({ table, deleted: 0, inserted });
          }
        }
      });
    }

    let uploadsRestored = 0;
    if (Array.isArray(uploads) && uploads.length > 0) {
      const { writeUploadFile } = await import("./storage-provider");
      for (const upload of uploads) {
        const b64 = upload.base64 as string | undefined;
        const rp = upload.relativePath as string | undefined;
        if (!b64 || !rp) continue;
        try {
          const bytes = Buffer.from(b64, "base64");
          await writeUploadFile(rp, bytes, upload.contentType as string | undefined);
          uploadsRestored++;
        } catch (uploadError) {
          console.error(`[GitHub Restore] Failed to restore upload: ${rp}`, uploadError);
        }
      }
    }

    const itemsRestored = steps.reduce((sum, s) => sum + s.inserted, 0);
    return { ok: true, fileName: backupFileName, itemsRestored, uploadsRestored, durationMs: Date.now() - startedAt, error: null };
  } catch (error) {
    return { ok: false, fileName: backupFileName, itemsRestored: steps.reduce((sum, s) => sum + s.inserted, 0), uploadsRestored: 0, durationMs: Date.now() - startedAt, error: error instanceof Error ? error.message : String(error) };
  }
}

export async function getBackupDiagnostics(): Promise<BackupDiagnostics> {
  noStore();
  const backups = await listBackupSnapshots().catch(() => []);
  const databaseUrlPresent = Boolean(getDatabaseUrl());
  let postgresqlConnected = false;
  let postgresqlError: string | null = null;

  if (prisma) {
    try {
      await prisma.$queryRaw`SELECT 1`;
      postgresqlConnected = true;
    } catch (error) {
      postgresqlError = toErrorMessage(error);
    }
  } else if (databaseUrlPresent) {
    postgresqlError = "Prisma client is not initialized.";
  } else {
    postgresqlError = "DATABASE_URL/POSTGRES_URL/DATABASE_PRIVATE_URL is missing.";
  }

  const lastCronInvocation = prisma
    ? await prisma.backupJob
        .findFirst({ where: { type: "scheduled" }, orderBy: { createdAt: "desc" } })
        .then((job) =>
          job
            ? {
                createdAt: job.createdAt.toISOString(),
                status: job.status,
                fileName: job.fileName,
                githubSha: job.githubSha,
                githubUrl: job.githubUrl,
                error: job.error,
              }
            : null,
        )
        .catch(() => null)
    : null;

  const lastScheduledSuccess = prisma
    ? await prisma.backupJob
        .findFirst({ where: { type: "scheduled", status: "SUCCESS" }, orderBy: { createdAt: "desc" } })
        .then((job) =>
          job
            ? {
                createdAt: job.createdAt.toISOString(),
                fileName: job.fileName,
                sizeBytes: job.sizeBytes?.toString() ?? null,
                githubSha: job.githubSha,
                githubUrl: job.githubUrl,
              }
            : null,
        )
        .catch(() => null)
    : null;

  const rawSecret = (process.env.BACKUP_CRON_SECRET || process.env.CRON_SECRET || "").trim();
  const cronSecretSha256 = rawSecret ? createHash("sha256").update(rawSecret).digest("hex").slice(0, 8) : null;

  return {
    databaseUrlPresent,
    postgresqlConnected,
    postgresqlError,
    cronSecretPresent: Boolean(rawSecret),
    cronSecretSha256,
    lastCronInvocation,
    lastScheduledSuccess,
    backupsCount: backups.length,
  };
}

export type SafeBackupEntry = {
  id: string;
  backupFileName: string;
  label: string | null;
  notes: string | null;
  markedAt: string;
  markedBy: string | null;
};

export async function markBackupAsSafe(
  backupFileName: string,
  options?: { label?: string; notes?: string; markedBy?: string }
): Promise<SafeBackupEntry> {
  if (!prisma) throw new Error("Database not configured");
  const record = await prisma.safeBackup.create({
    data: {
      backupFileName,
      label: options?.label ?? null,
      notes: options?.notes ?? null,
      markedAt: new Date(),
      markedBy: options?.markedBy ?? null,
    },
  });
  return {
    id: record.id,
    backupFileName: record.backupFileName,
    label: record.label,
    notes: record.notes,
    markedAt: record.markedAt.toISOString(),
    markedBy: record.markedBy,
  };
}

export async function unmarkBackupAsSafe(backupFileName: string): Promise<void> {
  if (!prisma) throw new Error("Database not configured");
  await prisma.safeBackup.deleteMany({
    where: { backupFileName },
  });
}

export async function getSafeBackups(): Promise<SafeBackupEntry[]> {
  if (!prisma) throw new Error("Database not configured");
  const records = await prisma.safeBackup.findMany({
    orderBy: { markedAt: "desc" },
  });
  return records.map((r) => ({
    id: r.id,
    backupFileName: r.backupFileName,
    label: r.label,
    notes: r.notes,
    markedAt: r.markedAt.toISOString(),
    markedBy: r.markedBy,
  }));
}

export async function isBackupSafe(backupFileName: string): Promise<boolean> {
  if (!prisma) throw new Error("Database not configured");
  const count = await prisma.safeBackup.count({
    where: { backupFileName },
  });
  return count > 0;
}
