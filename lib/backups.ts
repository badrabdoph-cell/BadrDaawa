import { createHash } from "node:crypto";
import { spawn } from "node:child_process";
import { readFile, readdir, stat, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { unstable_noStore as noStore } from "next/cache";
import { prisma } from "./db";
import { getDatabaseUrl } from "./database-url";
import { parseJsonFileIfSafe } from "./json-file-safety";
import { ensureParentDirectory, ensureRuntimeDirectories, runtimeBackupDir } from "./runtime-paths";

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
};

const backupDir = runtimeBackupDir;
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
      metadata: {
        database,
        dump: {
          fileName: postgresDump.fileName,
          format: postgresDump.format,
          sizeBytes: postgresDump.sizeBytes,
          sha256: postgresDump.sha256,
        },
      },
      database,
      postgresDump,
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

    return toBackupSummary(fileName, sizeBytes, createdAt.toISOString(), "database", 1);
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
              postgresDump?: unknown;
            }>(filePath, entry.name, maxBackupSummaryBytes);
            const parsed = safe.value;
            if (!parsed) throw new Error(safe.skipped ? "oversized-backup" : "invalid-backup");
            source = "database";
            items = parsed.postgresDump ? 1 : 0;
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
