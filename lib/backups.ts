import { createHash } from "node:crypto";
import { spawn } from "node:child_process";
import { mkdir, readFile, readdir, stat, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { unstable_noStore as noStore } from "next/cache";
import { prisma } from "./db";
import { getDatabaseUrl } from "./database-url";
import { maxSafeJsonFileBytes, parseJsonFileIfSafe, readJsonFileIfSafe } from "./json-file-safety";
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
  metadata?: unknown;
  postgresDump?: {
    fileName: string;
    format: "custom";
    tool: "pg_dump";
    encoding: "base64";
    sizeBytes: number;
    sha256: string;
    base64: string;
  };
  dataFiles?: Record<string, unknown>;
  uploads?: BackupUploadFile[];
};

const backupDir = runtimeBackupDir;
const dataDir = runtimeDataDir;
const maxUploadFileBytes = (Number(process.env.BACKUP_MAX_UPLOAD_FILE_MB) || (process.env.RAILWAY_ENVIRONMENT ? 2 : 5)) * 1024 * 1024;
const maxUploadsTotalBytes = (Number(process.env.BACKUP_MAX_UPLOADS_TOTAL_MB) || (process.env.RAILWAY_ENVIRONMENT ? 8 : 40)) * 1024 * 1024;
const maxDataFileSnapshotBytes = maxSafeJsonFileBytes();
const backupRetentionCount = Math.max(1, Number(process.env.BACKUP_RETENTION_COUNT) || 20);
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

function formatDumpName(type: string) {
  const cleanType = type.toLowerCase().replace(/[^a-z0-9]+/g, "-") || "manual";
  return `${cleanType}-${formatStamp()}.dump`;
}

function toErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error || "Unknown error");
}

function safeDecode(value: string) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function postgresToolEnv(databaseUrl: string) {
  const env = { ...process.env };
  try {
    const url = new URL(databaseUrl);
    if (url.protocol !== "postgresql:" && url.protocol !== "postgres:") return env;
    env.PGHOST = url.hostname;
    env.PGPORT = url.port || "5432";
    env.PGUSER = safeDecode(url.username);
    env.PGPASSWORD = safeDecode(url.password);
    env.PGDATABASE = safeDecode(url.pathname.replace(/^\/+/, ""));
    const sslMode = url.searchParams.get("sslmode");
    if (sslMode) env.PGSSLMODE = sslMode;
    env.PGCONNECT_TIMEOUT = env.PGCONNECT_TIMEOUT || "20";
    return env;
  } catch {
    return env;
  }
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
    const filePath = path.join(dataDir, file);
    try {
      const parsed = await parseJsonFileIfSafe(filePath, file, maxDataFileSnapshotBytes);
      if (parsed.skipped) {
        output[file] = { skipped: true, reason: "oversized-json", sizeBytes: parsed.sizeBytes };
        continue;
      }
      output[file] = parsed.value ?? "";
    } catch {
      const raw = await readJsonFileIfSafe(filePath, file, maxDataFileSnapshotBytes);
      output[file] = raw.skipped ? { skipped: true, reason: "oversized-json", sizeBytes: raw.sizeBytes } : raw.raw;
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

async function readDatabaseMetadata() {
  if (!prisma) return null;

  try {
    const [
      customers,
      templates,
      invitations,
      guests,
      orders,
      analyticsEvents,
      guestBookMessages,
      checkIns,
      liveModes,
      clientMessages,
      internalNotes,
      auditLogs,
      backupJobs,
    ] = await Promise.all([
      prisma.customer.count(),
      prisma.weddingTemplate.count(),
      prisma.invitation.count(),
      prisma.guestRsvp.count(),
      prisma.orderRequest.count(),
      prisma.analyticsEvent.count(),
      prisma.guestBookMessage.count(),
      prisma.invitationCheckIn.count(),
      prisma.weddingLiveMode.count(),
      prisma.clientMessage.count(),
      prisma.internalNote.count(),
      prisma.auditLog.count(),
      prisma.backupJob.count(),
    ]);
    return {
      counts: {
        customers,
        templates,
        invitations,
        guestRsvp: guests,
        orders,
        analyticsEvents,
        guestBookMessages,
        checkIns,
        liveModes,
        clientMessages,
        internalNotes,
        auditLogs,
        backupJobs,
      },
    };
  } catch (error) {
    console.error("[Backup] Failed to read database metadata.", error);
    return null;
  }
}

async function createPostgresDump(type: string) {
  const databaseUrl = getDatabaseUrl();
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required to create a PostgreSQL backup.");
  }

  const args = [
    "--format=custom",
    "--compress=9",
    "--no-owner",
    "--no-privileges",
  ];

  return await new Promise<NonNullable<BackupPayload["postgresDump"]>>((resolve, reject) => {
    const child = spawn("pg_dump", args, { env: postgresToolEnv(databaseUrl), stdio: ["ignore", "pipe", "pipe"] });
    const stdout: Buffer[] = [];
    const stderr: Buffer[] = [];

    child.stdout.on("data", (chunk: Buffer) => stdout.push(chunk));
    child.stderr.on("data", (chunk: Buffer) => stderr.push(chunk));
    child.on("error", (error) => {
      reject(new Error(`pg_dump failed to start: ${error.message}`));
    });
    child.on("close", (code) => {
      const errorOutput = Buffer.concat(stderr).toString("utf8").trim();
      if (code !== 0) {
        reject(new Error(`pg_dump exited with code ${code}${errorOutput ? `: ${errorOutput}` : ""}`));
        return;
      }

      const bytes = Buffer.concat(stdout);
      if (!bytes.length) {
        reject(new Error("pg_dump produced an empty backup."));
        return;
      }

      resolve({
        fileName: formatDumpName(type),
        format: "custom",
        tool: "pg_dump",
        encoding: "base64",
        sizeBytes: bytes.length,
        sha256: createHash("sha256").update(bytes).digest("hex"),
        base64: bytes.toString("base64"),
      });
    });
  });
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
    const postgresDump = await createPostgresDump(type);
    const [database, dataFiles, uploads] = await Promise.all([readDatabaseMetadata(), readDataFiles(), walkUploads()]);
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
      metadata: {
        database,
        settingsFiles: Object.keys(dataFiles),
        uploadsCount: uploads.length,
        dump: {
          fileName: postgresDump.fileName,
          format: postgresDump.format,
          sizeBytes: postgresDump.sizeBytes,
          sha256: postgresDump.sha256,
        },
      },
      database,
      postgresDump,
      dataFiles,
      uploads,
    };
    const json = `${JSON.stringify(payload, jsonReplacer, 2)}\n`;
    const sizeBytes = Buffer.byteLength(json);

    const backupPath = path.join(backupDir, fileName);
    ensureParentDirectory(backupPath);
    await writeFile(backupPath, json, "utf8");
    await cleanupOldBackups();
    console.log(`[Backup] Backup Completed: ${fileName} (${sizeBytes} bytes, PostgreSQL dump: ${postgresDump.sizeBytes} bytes).`);

    await updateBackupJob(jobId, {
      status: "SUCCESS",
      fileName,
      sizeBytes,
    });

    return toBackupSummary(fileName, sizeBytes, createdAt.toISOString(), "database", Object.keys(dataFiles).length + uploads.length + 1);
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
        if (fileStat.size <= maxBackupSummaryBytes) {
          try {
            const safe = await parseJsonFileIfSafe<{
              source?: BackupSummary["source"];
              dataFiles?: Record<string, unknown>;
              uploads?: unknown[];
              postgresDump?: unknown;
            }>(filePath, entry.name, maxBackupSummaryBytes);
            const parsed = safe.value;
            if (!parsed) throw new Error(safe.skipped ? "oversized-backup" : "invalid-backup");
            source = parsed.source === "database" ? "database" : "files";
            items = Object.keys(parsed.dataFiles || {}).length + (Array.isArray(parsed.uploads) ? parsed.uploads.length : 0) + (parsed.postgresDump ? 1 : 0);
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

async function readBackupPayload(fileName: string): Promise<BackupPayload | null> {
  if (!/^[a-z0-9-]+\.json$/i.test(fileName)) return null;
  const filePath = path.join(backupDir, fileName);
  if (!filePath.startsWith(backupDir) || !(await exists(filePath))) return null;

  try {
    const { value: parsed } = await parseJsonFileIfSafe<unknown>(filePath, fileName, maxBackupSummaryBytes);
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
    includesDatabaseDump: Boolean(payload.source === "database" && payload.postgresDump),
  };
}
