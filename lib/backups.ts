import { mkdir, readFile, readdir, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { unstable_noStore as noStore } from "next/cache";
import { prisma } from "./db";

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

const backupDir = path.join(process.cwd(), "data", "backups");
const dataDir = path.join(process.cwd(), "data");
const uploadsDir = path.join(process.cwd(), "public", "uploads");
const maxUploadFileBytes = 10 * 1024 * 1024;
const maxUploadsTotalBytes = 80 * 1024 * 1024;

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
  if (!(await exists(dataDir))) return [];
  const entries = await readdir(dataDir, { withFileTypes: true });
  return entries.filter((entry) => entry.isFile() && entry.name.endsWith(".json")).map((entry) => entry.name);
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

async function walkUploads(dir = uploadsDir, root = uploadsDir): Promise<BackupUploadFile[]> {
  if (!(await exists(dir))) return [];
  const entries = await readdir(dir, { withFileTypes: true });
  const files: BackupUploadFile[] = [];

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await walkUploads(fullPath, root)));
      continue;
    }
    if (!entry.isFile()) continue;

    const fileStat = await stat(fullPath);
    if (fileStat.size > maxUploadFileBytes) continue;
    const currentTotal = files.reduce((sum, file) => sum + file.sizeBytes, 0);
    if (currentTotal + fileStat.size > maxUploadsTotalBytes) continue;

    files.push({
      path: path.relative(root, fullPath),
      sizeBytes: fileStat.size,
      modifiedAt: fileStat.mtime.toISOString(),
      base64: (await readFile(fullPath)).toString("base64"),
    });
  }

  return files;
}

async function readDatabaseSnapshot() {
  if (!prisma) return null;

  try {
    const [customers, templates, invitations, guests, orders, analyticsEvents, backupJobs] = await Promise.all([
      prisma.customer.findMany({ orderBy: { createdAt: "desc" } }),
      prisma.weddingTemplate.findMany({ orderBy: { sortOrder: "asc" } }),
      prisma.invitation.findMany({ orderBy: { createdAt: "desc" } }),
      prisma.guestRsvp.findMany({ orderBy: { createdAt: "desc" } }),
      prisma.orderRequest.findMany({ orderBy: { createdAt: "desc" } }),
      prisma.analyticsEvent.findMany({ orderBy: { createdAt: "desc" } }),
      prisma.backupJob.findMany({ orderBy: { createdAt: "desc" } }),
    ]);
    return { customers, templates, invitations, guests, orders, analyticsEvents, backupJobs };
  } catch (error) {
    console.error("Failed to read database backup snapshot", error);
    return null;
  }
}

export async function createBackupSnapshot(type = "manual") {
  noStore();

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

  await mkdir(backupDir, { recursive: true });
  await writeFile(path.join(backupDir, fileName), json, "utf8");

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
      .catch((error) => console.error("Failed to record backup job", error));
  }

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
