import { createHash } from "crypto";
import path from "path";
import { gzipSync, gunzipSync } from "zlib";
import { prisma } from "./db";
import { getSyncConfig } from "./github-sync";
import { listUploadFiles, readUploadFile } from "./storage-provider";
import { githubRequest, branchRefPath } from "./github-sync";
import type { GitHubBlob, GitHubRef, GitHubCommit, GitHubTree, GitHubCreatedCommit, GitHubRecursiveTree } from "./github-sync";

export type BackupTypeV2 = "database" | "uploads" | "full";

export type DatabaseBackupPayload = {
  version: 2;
  type: "database";
  createdAt: string;
  source: "database";
  app: string;
  runtimeData: Record<string, unknown[]>;
};

export type UploadsBackupManifest = {
  version: 1;
  createdAt: string;
  type: "uploads";
  totalFiles: number;
  totalSizeBytes: number;
  largestFileBytes: number;
};

export type FullBackupManifest = {
  version: 1;
  createdAt: string;
  type: "full";
  db: { sizeBytes: number };
  uploads: { totalFiles: number; totalSizeBytes: number; largestFileBytes: number };
};

export type BackupFileEntry = {
  relativePath: string;
  bytes: Buffer;
  contentType: string;
  sha256: string;
};

export type V2RestoreResult = {
  ok: boolean;
  type: BackupTypeV2;
  fileName: string;
  itemsRestored: number;
  uploadsRestored: number;
  durationMs: number;
  error: string | null;
};

const BACKUP_GITHUB_MAX_BLOB_SIZE = 90 * 1024 * 1024;

function jsonReplacer(_key: string, value: unknown) {
  if (typeof value === "bigint") return value.toString();
  if (value instanceof Date) return value.toISOString();
  return value;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type TxClient = any;

function restoreTableOrder(): string[] {
  return [
    "customers", "weddingTemplates", "dynamicPages",
    "invitations", "orderRequests", "guestRsvps", "analyticsEvents",
    "appSettings", "guestBookMessages", "coupleMessagesSettings",
    "clientMessages", "invitationCheckIns", "weddingLiveModes",
    "internalNotes", "auditLogs", "backupJobs", "syncLogs",
  ];
}

function deleteTableOrder(): string[] {
  return [
    "syncLogs", "backupJobs", "auditLogs", "internalNotes",
    "weddingLiveModes", "invitationCheckIns", "clientMessages",
    "coupleMessagesSettings", "guestBookMessages", "appSettings",
    "analyticsEvents", "guestRsvps", "orderRequests", "invitations",
    "weddingTemplates", "dynamicPages", "customers",
  ];
}

function prismaModelForTable(tx: TxClient, table: string) {
  const map: Record<string, unknown> = {
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

function filterContentFromAppSettingsRows(rows: unknown[]): unknown[] {
  return (rows as Array<{ key: string }>).filter((r) => !r.key.startsWith("project-content:"));
}

async function deleteTableData(tx: TxClient, table: string): Promise<number> {
  const model = prismaModelForTable(tx, table) as { deleteMany: (args?: unknown) => Promise<{ count: number }> } | undefined;
  if (!model?.deleteMany) return 0;
  if (table === "appSettings") {
    const result = await model.deleteMany({ where: { key: { not: { startsWith: "project-content:" } } } });
    return result.count;
  }
  const result = await model.deleteMany();
  return result.count;
}

async function insertTableData(tx: TxClient, table: string, rows: unknown[]): Promise<number> {
  if (!rows.length) return 0;
  const model = prismaModelForTable(tx, table) as { createMany: (args: { data: unknown[] }) => Promise<{ count: number }> } | undefined;
  if (!model?.createMany) return 0;
  const data = table === "appSettings" ? filterContentFromAppSettingsRows(rows) : rows;
  if (!data.length) return 0;
  const BATCH_SIZE = 500;
  let inserted = 0;
  for (let i = 0; i < data.length; i += BATCH_SIZE) {
    const batch = data.slice(i, i + BATCH_SIZE);
    const result = await model.createMany({ data: batch });
    inserted += result.count;
  }
  return inserted;
}

// ═══════════════════════════════════════════════════════════════════
// V2 Backup Schedule Helpers
// ═══════════════════════════════════════════════════════════════════

const V2_SCHEDULE: Record<BackupTypeV2, { intervalMs: number; keepCount: number }> = {
  database: { intervalMs: 50 * 60 * 60 * 1000, keepCount: 30 },
  uploads: { intervalMs: 100 * 60 * 60 * 1000, keepCount: 14 },
  full: { intervalMs: 300 * 60 * 60 * 1000, keepCount: 5 },
};

export function getV2BackupSchedule(type: BackupTypeV2) {
  return V2_SCHEDULE[type];
}

export async function getLastV2BackupTime(type: BackupTypeV2): Promise<Date | null> {
  try {
    const prefix = type === "database" ? "backups/database/" : type === "uploads" ? "backups/uploads/" : "backups/full/";
    const entries = await findBackupsOnGitHubByPrefix(prefix);
    if (!entries.length) return null;
    const sorted = entries.sort((a, b) => backupTimestampFromPathV2(b.path) - backupTimestampFromPathV2(a.path));
    const latest = sorted[0];
    const ts = backupTimestampFromPathV2(latest.path);
    if (!ts) return null;
    return new Date(ts);
  } catch {
    return null;
  }
}

export async function isV2BackupDue(type: BackupTypeV2): Promise<boolean> {
  const lastTime = await getLastV2BackupTime(type);
  if (!lastTime) return true;
  const elapsed = Date.now() - lastTime.getTime();
  return elapsed >= V2_SCHEDULE[type].intervalMs;
}

function repoContentPath(repoPath: string) {
  return repoPath.split("/").map(encodeURIComponent).join("/");
}

export async function pruneV2Backups(type: BackupTypeV2, keepCount?: number) {
  const config = getSyncConfig();
  if (!config) return;
  const { owner, repo } = config.repo;
  const branch = config.branch;
  const token = config.token;

  const prefix = type === "database" ? "backups/database/" : type === "uploads" ? "backups/uploads/" : "backups/full/";
  const keep = keepCount ?? V2_SCHEDULE[type].keepCount;

  const ref = await githubRequest<GitHubRef>(
    `/repos/${owner}/${repo}/git/ref/heads/${branchRefPath(branch)}`,
    { method: "GET" }, token,
  );
  const headCommit = await githubRequest<GitHubCommit>(
    `/repos/${owner}/${repo}/git/commits/${ref.object.sha}`,
    { method: "GET" }, token,
  );
  const tree = await githubRequest<GitHubRecursiveTree>(
    `/repos/${owner}/${repo}/git/trees/${headCommit.tree.sha}?recursive=1`,
    { method: "GET" }, token,
  );

  const entries = tree.tree.filter((e) => e.type === "blob" && e.path.startsWith(prefix));
  if (!entries.length) return;

  if (type === "database") {
    const sorted = entries.sort((a, b) => backupTimestampFromPathV2(b.path) - backupTimestampFromPathV2(a.path));
    const toDelete = sorted.slice(keep);
    for (const entry of toDelete) {
      if (!entry.sha) continue;
      try {
        await githubRequest(
          `/repos/${owner}/${repo}/contents/${repoContentPath(entry.path)}`,
          { method: "DELETE", body: JSON.stringify({
            message: `chore(backup): prune ${type} backup ${entry.path}`.slice(0, 500),
            sha: entry.sha,
            branch,
          })},
          token,
        );
      } catch (e) {
        console.error(`[Prune V2] Failed to delete ${entry.path}:`, e);
      }
    }
  } else {
    const folderMap = new Map<string, { ts: number; entries: typeof entries }>();
    for (const entry of entries) {
      let folder: string;
      if (type === "uploads") {
        const m = entry.path.match(/^(backups\/uploads\/\d{4}\/\d{2}\/backup-[^/]+)/);
        if (!m) continue;
        folder = m[1];
      } else {
        const m = entry.path.match(/^(backups\/full\/[^/]+)/);
        if (!m) continue;
        folder = m[1];
      }
      const ts = backupTimestampFromPathV2(entry.path);
      if (!ts) continue;
      const existing = folderMap.get(folder);
      if (existing) {
        existing.entries.push(entry);
      } else {
        folderMap.set(folder, { ts, entries: [entry] });
      }
    }
    const sorted = [...folderMap.entries()].sort((a, b) => b[1].ts - a[1].ts);
    const toDelete = sorted.slice(keep);
    for (const [, { entries: folderEntries }] of toDelete) {
      for (const entry of folderEntries) {
        if (!entry.sha) continue;
        try {
          await githubRequest(
            `/repos/${owner}/${repo}/contents/${repoContentPath(entry.path)}`,
            { method: "DELETE", body: JSON.stringify({
              message: `chore(backup): prune ${type} backup ${entry.path}`.slice(0, 500),
              sha: entry.sha,
              branch,
            })},
            token,
          );
        } catch (e) {
          console.error(`[Prune V2] Failed to delete ${entry.path}:`, e);
        }
      }
    }
  }
}

// ═══════════════════════════════════════════════════════════════════
// NEW BACKUP SYSTEM v2 — Database / Uploads / Full (separate)
// ═══════════════════════════════════════════════════════════════════

function formatBackupRepoPathV2(type: BackupTypeV2, fileName: string, createdAt: Date) {
  const year = String(createdAt.getUTCFullYear());
  const month = String(createdAt.getUTCMonth() + 1).padStart(2, "0");
  const timestamp = fileName.replace(/^(scheduled|manual|verify|database|storage-cleanup|storage-cleanup-orphans|storage-cleanup-duplicates)-/i, "");
  switch (type) {
    case "database":
      return `backups/database/${timestamp}`;
    case "uploads":
      return `backups/uploads/${year}/${month}/backup-${timestamp}`;
    case "full":
      return `backups/full/${timestamp}`;
  }
}

async function collectRuntimeData(): Promise<Record<string, unknown[]>> {
  if (!prisma) return {};
  const tables = restoreTableOrder();
  const runtimeData: Record<string, unknown[]> = {};
  for (const table of tables) {
    try {
      const model = prismaModelForTable(prisma, table) as { findMany: (args?: unknown) => Promise<unknown[]> } | undefined;
      if (model?.findMany) {
        runtimeData[table] = await model.findMany();
      }
    } catch {
      runtimeData[table] = [];
    }
  }
  if (runtimeData.appSettings) {
    runtimeData.appSettings = filterContentFromAppSettingsRows(runtimeData.appSettings);
  }
  return runtimeData;
}

// ── Create Database-only backup payload ──
export async function createDatabaseBackupPayload(): Promise<{ bytes: Buffer; fileName: string; createdAt: Date }> {
  const runtimeData = await collectRuntimeData();
  const payload: DatabaseBackupPayload = {
    version: 2,
    type: "database",
    createdAt: new Date().toISOString(),
    source: "database",
    app: "BadrDaawa",
    runtimeData,
  };
  const json = JSON.stringify(payload, jsonReplacer, 2);
  const bytes = gzipSync(Buffer.from(json, "utf8"), { level: 9 });
  const createdAt = new Date();
  const fileName = `database-${createdAt.toISOString().replace(/[:.]/g, "-").replace(/[^\w-]/g, "")}`;
  return { bytes, fileName, createdAt };
}

// ── Create Uploads-only backup payload ──
export async function createUploadsBackupPayload(): Promise<{
  manifest: UploadsBackupManifest;
  files: BackupFileEntry[];
  createdAt: Date;
}> {
  const uploadFiles = await listUploadFiles();
  const files: BackupFileEntry[] = [];
  for (const file of uploadFiles.sort((a, b) => a.key.localeCompare(b.key))) {
    const bytes = await readUploadFile(file.key);
    if (!bytes) continue;
    files.push({
      relativePath: file.key,
      bytes,
      contentType: file.contentType || "application/octet-stream",
      sha256: createHash("sha256").update(bytes).digest("hex"),
    });
  }
  const totalSizeBytes = files.reduce((sum, f) => sum + f.bytes.length, 0);
  const largestFileBytes = files.reduce((max, f) => Math.max(max, f.bytes.length), 0);
  const createdAt = new Date();
  const manifest: UploadsBackupManifest = { version: 1, createdAt: createdAt.toISOString(), type: "uploads", totalFiles: files.length, totalSizeBytes, largestFileBytes };
  return { manifest, files, createdAt };
}

// ── Create Full backup payload ──
export async function createFullBackupPayload(): Promise<{
  manifest: FullBackupManifest;
  files: BackupFileEntry[];
  createdAt: Date;
}> {
  const runtimeData = await collectRuntimeData();
  const dbPayload: DatabaseBackupPayload = { version: 2, type: "database", createdAt: new Date().toISOString(), source: "database", app: "BadrDaawa", runtimeData };
  const dbJson = JSON.stringify(dbPayload, jsonReplacer, 2);
  const dbBytes = gzipSync(Buffer.from(dbJson, "utf8"), { level: 9 });
  const createdAt = new Date();

  const uploadFiles = await listUploadFiles();
  const files: BackupFileEntry[] = [
    { relativePath: "db.json.gz", bytes: dbBytes, contentType: "application/gzip", sha256: createHash("sha256").update(dbBytes).digest("hex") },
  ];
  let uploadsTotalBytes = 0;
  let uploadsLargest = 0;
  for (const file of uploadFiles.sort((a, b) => a.key.localeCompare(b.key))) {
    const bytes = await readUploadFile(file.key);
    if (!bytes) continue;
    uploadsTotalBytes += bytes.length;
    uploadsLargest = Math.max(uploadsLargest, bytes.length);
    files.push({ relativePath: `uploads/${file.key}`, bytes, contentType: file.contentType || "application/octet-stream", sha256: createHash("sha256").update(bytes).digest("hex") });
  }
  const manifest: FullBackupManifest = { version: 1, createdAt: createdAt.toISOString(), type: "full", db: { sizeBytes: dbBytes.length }, uploads: { totalFiles: files.length - 1, totalSizeBytes: uploadsTotalBytes, largestFileBytes: uploadsLargest } };
  return { manifest, files, createdAt };
}

// ── Create composite manifest blob and upload all files as separate Git blobs ──
async function uploadMultiBlobBackupToGitHub(
  type: BackupTypeV2,
  fileName: string,
  createdAt: Date,
  manifest: Record<string, unknown>,
  files: BackupFileEntry[],
  reason: string,
): Promise<{ commitSha: string; repoPath: string } | null> {
  const { getSyncConfig } = await import("./github-sync");
  const config = getSyncConfig();
  if (!config) return null;
  const { owner, repo } = config.repo;

  const basePath = formatBackupRepoPathV2(type, fileName, createdAt);

  const fileBlobs: Record<string, string> = {};
  const treeEntries: Array<{ path: string; mode: string; type: string; sha: string }> = [];
  let skippedCount = 0;

  for (const file of files) {
    if (file.bytes.length > BACKUP_GITHUB_MAX_BLOB_SIZE) {
      console.warn(`[MultiBlobUpload] Skipping ${file.relativePath} (${file.bytes.length} bytes exceeds 90 MB limit)`);
      skippedCount++;
      continue;
    }
    const blob = await githubRequest<GitHubBlob>(
      `/repos/${owner}/${repo}/git/blobs`,
      { method: "POST", body: JSON.stringify({ content: file.bytes.toString("base64"), encoding: "base64" }) },
      config.token,
    );
    const entryPath = `${basePath}/${file.relativePath}`;
    fileBlobs[file.relativePath] = blob.sha;
    treeEntries.push({ path: entryPath, mode: "100644", type: "blob", sha: blob.sha });
  }

  const manifestWithBlobs = { ...manifest, fileBlobs, skippedFiles: skippedCount };
  const manifestBytes = gzipSync(Buffer.from(JSON.stringify(manifestWithBlobs), "utf8"), { level: 9 });

  const manifestBlob = await githubRequest<GitHubBlob>(
    `/repos/${owner}/${repo}/git/blobs`,
    { method: "POST", body: JSON.stringify({ content: manifestBytes.toString("base64"), encoding: "base64" }) },
    config.token,
  );
  treeEntries.unshift({ path: `${basePath}/manifest.json.gz`, mode: "100644", type: "blob", sha: manifestBlob.sha });

  const ref = await githubRequest<GitHubRef>(
    `/repos/${owner}/${repo}/git/ref/heads/${branchRefPath(config.branch)}`,
    { method: "GET" }, config.token,
  );
  const headCommit = await githubRequest<GitHubCommit>(
    `/repos/${owner}/${repo}/git/commits/${ref.object.sha}`,
    { method: "GET" }, config.token,
  );
  const tree = await githubRequest<GitHubTree>(
    `/repos/${owner}/${repo}/git/trees`,
    { method: "POST", body: JSON.stringify({ base_tree: headCommit.tree.sha, tree: treeEntries }) },
    config.token,
  );
  const commit = await githubRequest<GitHubCreatedCommit>(
    `/repos/${owner}/${repo}/git/commits`,
    { method: "POST", body: JSON.stringify({
      message: `chore(backup): ${type} backup ${fileName}\n\n${reason}`.slice(0, 500),
      tree: tree.sha, parents: [ref.object.sha],
    })},
    config.token,
  );
  await githubRequest(
    `/repos/${owner}/${repo}/git/refs/heads/${branchRefPath(config.branch)}`,
    { method: "PATCH", body: JSON.stringify({ sha: commit.sha, force: false }) },
    config.token,
  );
  return { commitSha: commit.sha, repoPath: basePath };
}

// ── Upload Database backup to GitHub ──
export async function uploadDatabaseBackupToGitHub(bytes: Buffer, fileName: string, createdAt: Date, reason: string) {
  const { getSyncConfig } = await import("./github-sync");
  const config = getSyncConfig();
  if (!config) return null;
  const { owner, repo } = config.repo;

  if (bytes.length > BACKUP_GITHUB_MAX_BLOB_SIZE) {
    console.warn(`[DB Backup] ${fileName} is ${bytes.length} bytes > 90 MB limit, skipping`);
    return null;
  }

  const repoPath = `backups/database/${fileName}.gz`;

  const blob = await githubRequest<GitHubBlob>(
    `/repos/${owner}/${repo}/git/blobs`,
    { method: "POST", body: JSON.stringify({ content: bytes.toString("base64"), encoding: "base64" }) },
    config.token,
  );

  const ref = await githubRequest<GitHubRef>(
    `/repos/${owner}/${repo}/git/ref/heads/${branchRefPath(config.branch)}`,
    { method: "GET" }, config.token,
  );
  const headCommit = await githubRequest<GitHubCommit>(
    `/repos/${owner}/${repo}/git/commits/${ref.object.sha}`,
    { method: "GET" }, config.token,
  );

  const tree = await githubRequest<GitHubTree>(
    `/repos/${owner}/${repo}/git/trees`,
    { method: "POST", body: JSON.stringify({ base_tree: headCommit.tree.sha, tree: [{ path: repoPath, mode: "100644", type: "blob", sha: blob.sha }] }) },
    config.token,
  );

  const commit = await githubRequest<GitHubCreatedCommit>(
    `/repos/${owner}/${repo}/git/commits`,
    { method: "POST", body: JSON.stringify({ message: `chore(backup): database backup ${fileName}\n\n${reason}`.slice(0, 500), tree: tree.sha, parents: [ref.object.sha] }) },
    config.token,
  );

  await githubRequest(
    `/repos/${owner}/${repo}/git/refs/heads/${branchRefPath(config.branch)}`,
    { method: "PATCH", body: JSON.stringify({ sha: commit.sha, force: false }) },
    config.token,
  );

  return { commitSha: commit.sha, repoPath };
}

// ── Upload Uploads backup to GitHub ──
export async function uploadUploadsBackupToGitHub(
  manifest: UploadsBackupManifest,
  files: BackupFileEntry[],
  fileName: string,
  createdAt: Date,
  reason: string,
) {
  const result = await uploadMultiBlobBackupToGitHub("uploads", fileName, createdAt, manifest as unknown as Record<string, unknown>, files, reason);
  return result;
}

// ── Upload Full backup to GitHub ──
export async function uploadFullBackupToGitHub(
  manifest: FullBackupManifest,
  files: BackupFileEntry[],
  fileName: string,
  createdAt: Date,
  reason: string,
) {
  const result = await uploadMultiBlobBackupToGitHub("full", fileName, createdAt, manifest as unknown as Record<string, unknown>, files, reason);
  return result;
}

// ── Find latest backup by type on GitHub ──
export type GitHubBackupDiscoveryResultV2 = {
  fileName: string;
  commitSha: string;
  repoPath: string;
  createdAt: Date;
  type: BackupTypeV2;
};

async function findBackupsOnGitHubByPrefix(prefix: string) {
  const { getSyncConfig, githubRequest, branchRefPath } = await import("./github-sync");
  const config = getSyncConfig();
  if (!config) return [];
  const { owner, repo } = config.repo;

  try {
    const ref = await githubRequest<GitHubRef>(
      `/repos/${owner}/${repo}/git/ref/heads/${branchRefPath(config.branch)}`,
      { method: "GET" }, config.token,
    );
    const headCommit = await githubRequest<GitHubCommit>(
      `/repos/${owner}/${repo}/git/commits/${ref.object.sha}`,
      { method: "GET" }, config.token,
    );
    const tree = await githubRequest<GitHubRecursiveTree>(
      `/repos/${owner}/${repo}/git/trees/${headCommit.tree.sha}?recursive=1`,
      { method: "GET" }, config.token,
    );
    return tree.tree.filter((e) => e.type === "blob" && e.path.startsWith(prefix));
  } catch {
    return [];
  }
}

function backupTimestampFromPathV2(repoPath: string): number {
  const match = repoPath.match(/(\d{4})-?(\d{2})-?(\d{2})T(\d{2})-?(\d{2})-?(\d{2})/);
  if (!match) return 0;
  const iso = `${match[1]}-${match[2]}-${match[3]}T${match[4]}:${match[5]}:${match[6]}Z`;
  const time = Date.parse(iso);
  return Number.isNaN(time) ? 0 : time;
}

export async function findLatestBackupOnGitHubByType(type: BackupTypeV2): Promise<GitHubBackupDiscoveryResultV2 | null> {
  const prefix = type === "database" ? "backups/database/" : type === "uploads" ? "backups/uploads/" : "backups/full/";
  const entries = await findBackupsOnGitHubByPrefix(prefix);
  if (!entries.length) return null;

  const sorted = entries.sort((a, b) => backupTimestampFromPathV2(b.path) - backupTimestampFromPathV2(a.path));
  const latest = sorted[0];

  const { getSyncConfig, githubRequest, branchRefPath } = await import("./github-sync");
  const config = getSyncConfig();
  if (!config) return null;
  const { owner, repo } = config.repo;

  try {
    const ref = await githubRequest<GitHubRef>(
      `/repos/${owner}/${repo}/git/ref/heads/${branchRefPath(config.branch)}`,
      { method: "GET" }, config.token,
    );
    const pathForMeta = type === "database" ? latest.path : latest.path.replace(/\/[^/]+$/, "/manifest.json.gz");
    const tsMatch = pathForMeta.match(/(\d{4})-?(\d{2})-?(\d{2})T(\d{2})-?(\d{2})-?(\d{2})/);
    let createdAt = new Date();
    if (tsMatch) {
      const iso = `${tsMatch[1]}-${tsMatch[2]}-${tsMatch[3]}T${tsMatch[4]}:${tsMatch[5]}:${tsMatch[6]}Z`;
      const parsed = Date.parse(iso);
      if (!Number.isNaN(parsed)) createdAt = new Date(parsed);
    }
    let fileName: string;
    if (type === "database") {
      const m = latest.path.match(/backups\/database\/([^/]+?)(?:\.json)?\.gz$/);
      fileName = m?.[1] ?? path.basename(latest.path).replace(/\.gz$/, "");
    } else if (type === "uploads") {
      const m = latest.path.match(/backups\/uploads\/\d{4}\/\d{2}\/(backup-[^/]+)/);
      fileName = m?.[1] ?? path.basename(latest.path).replace(/\.gz$/, "");
    } else {
      const m = latest.path.match(/backups\/full\/([^/]+)/);
      fileName = m?.[1] ?? path.basename(latest.path).replace(/\.gz$/, "");
    }
    return { fileName, commitSha: ref.object.sha, repoPath: latest.path, createdAt, type };
  } catch {
    return null;
  }
}

// ── Restore Database from GitHub ──
export async function restoreDatabaseFromGitHub(options: { fileName?: string; commitSha?: string } = {}): Promise<V2RestoreResult> {
  const startedAt = Date.now();
  const { readGitHubBackupFile, getGitHubContentReadiness } = await import("./github-content");
  const { getSyncConfig, formatBackupRepoPath: formatOld } = await import("./github-sync");

  try {
    let latest = options.fileName
      ? { fileName: options.fileName, commitSha: options.commitSha || "" }
      : await findLatestBackupOnGitHubByType("database");

    if (!latest) {
      return { ok: false, type: "database", fileName: "", itemsRestored: 0, uploadsRestored: 0, durationMs: Date.now() - startedAt, error: "لم يتم العثور على نسخة احتياطية لقاعدة البيانات" };
    }

    if (!latest.commitSha) {
      const full = await findLatestBackupOnGitHubByType("database");
      if (!full) return { ok: false, type: "database", fileName: "", itemsRestored: 0, uploadsRestored: 0, durationMs: Date.now() - startedAt, error: "لم يتم العثور على SHA" };
      latest = full;
    }

    const repoPath = `backups/database/${latest.fileName}.gz`;

    let rawBytes = await readGitHubBackupFile(repoPath, latest.commitSha);
    if (!rawBytes) {
      return { ok: false, type: "database", fileName: latest.fileName, itemsRestored: 0, uploadsRestored: 0, durationMs: Date.now() - startedAt, error: "ملف النسخة غير موجود على GitHub" };
    }

    const text = gunzipSync(rawBytes).toString("utf8");
    const payload: DatabaseBackupPayload = JSON.parse(text);
    if (!payload.runtimeData) {
      return { ok: false, type: "database", fileName: latest.fileName, itemsRestored: 0, uploadsRestored: 0, durationMs: Date.now() - startedAt, error: "النسخة لا تحتوي على runtimeData" };
    }

    const steps: Array<{ table: string; deleted: number; inserted: number }> = [];
    if (prisma) {
      await prisma.$transaction(async (tx) => {
        for (const table of deleteTableOrder()) {
          const data = payload.runtimeData[table];
          if (!data) continue;
          const deleted = await deleteTableData(tx, table);
          steps.push({ table, deleted, inserted: 0 });
        }
        for (const table of restoreTableOrder()) {
          const rows = payload.runtimeData[table];
          if (!rows?.length) continue;
          const inserted = await insertTableData(tx, table, rows);
          const existing = steps.find((s) => s.table === table);
          if (existing) existing.inserted = inserted;
          else steps.push({ table, deleted: 0, inserted });
        }
      });
    }

    const itemsRestored = steps.reduce((sum, s) => sum + s.inserted, 0);
    return { ok: true, type: "database", fileName: latest.fileName, itemsRestored, uploadsRestored: 0, durationMs: Date.now() - startedAt, error: null };
  } catch (error) {
    return { ok: false, type: "database", fileName: "", itemsRestored: 0, uploadsRestored: 0, durationMs: Date.now() - startedAt, error: error instanceof Error ? error.message : String(error) };
  }
}

// ── Restore Uploads from GitHub ──
export async function restoreUploadsFromGitHub(options: { fileName?: string; commitSha?: string } = {}): Promise<V2RestoreResult> {
  const startedAt = Date.now();

  try {
    let latest = options.fileName
      ? { fileName: options.fileName, commitSha: options.commitSha || "" }
      : await findLatestBackupOnGitHubByType("uploads");

    if (!latest) {
      return { ok: false, type: "uploads", fileName: "", itemsRestored: 0, uploadsRestored: 0, durationMs: Date.now() - startedAt, error: "لم يتم العثور على نسخة احتياطية للملفات" };
    }

    if (!latest.commitSha) {
      const full = await findLatestBackupOnGitHubByType("uploads");
      if (!full) return { ok: false, type: "uploads", fileName: "", itemsRestored: 0, uploadsRestored: 0, durationMs: Date.now() - startedAt, error: "لم يتم العثور على SHA" };
      latest = full;
    }

    const { readGitHubBlobBySha } = await import("./github-content");
    const { getSyncConfig, branchRefPath, githubRequest: ghReq } = await import("./github-sync");
    const config = getSyncConfig();
    if (!config) return { ok: false, type: "uploads", fileName: latest.fileName, itemsRestored: 0, uploadsRestored: 0, durationMs: Date.now() - startedAt, error: "GitHub sync غير مهيأ" };

    const { owner, repo } = config.repo;

    const ref = await ghReq<GitHubRef>(
      `/repos/${owner}/${repo}/git/ref/heads/${branchRefPath(config.branch)}`,
      { method: "GET" }, config.token,
    );
    const headCommit = await ghReq<GitHubCommit>(
      `/repos/${owner}/${repo}/git/commits/${ref.object.sha}`,
      { method: "GET" }, config.token,
    );
    const tree = await ghReq<GitHubRecursiveTree>(
      `/repos/${owner}/${repo}/git/trees/${headCommit.tree.sha}?recursive=1`,
      { method: "GET" }, config.token,
    );

    const baseDir = `backups/uploads/`;
    const uploadEntries = tree.tree.filter((e) => e.type === "blob" && e.path.startsWith(baseDir));

    let backupDir: string;
    if ("repoPath" in latest && latest.repoPath) {
      const m = latest.repoPath.match(/^(backups\/uploads\/\d{4}\/\d{2}\/backup-[^/]+)/);
      backupDir = m?.[1] ?? baseDir;
    } else if (options.fileName) {
      const raw = options.fileName;
      const ts = raw.startsWith("backup-") ? raw.slice("backup-".length) : raw;
      const year = ts.slice(0, 4);
      const month = ts.slice(5, 7);
      backupDir = `backups/uploads/${year}/${month}/backup-${ts}`;
    } else {
      backupDir = baseDir;
    }
    const manifestEntry = uploadEntries.find((e) => e.path.startsWith(backupDir) && e.path.endsWith("/manifest.json.gz"));
    if (!manifestEntry?.sha) return { ok: false, type: "uploads", fileName: latest.fileName, itemsRestored: 0, uploadsRestored: 0, durationMs: Date.now() - startedAt, error: "لم يتم العثور على manifest" };

    const manifestBlob = await readGitHubBlobBySha(manifestEntry.sha);
    if (!manifestBlob) return { ok: false, type: "uploads", fileName: latest.fileName, itemsRestored: 0, uploadsRestored: 0, durationMs: Date.now() - startedAt, error: "فشل قراءة manifest" };

    const manifestData = JSON.parse(gunzipSync(manifestBlob).toString("utf8"));
    const fileBlobs = manifestData.fileBlobs as Record<string, string> | undefined;
    if (!fileBlobs) return { ok: false, type: "uploads", fileName: latest.fileName, itemsRestored: 0, uploadsRestored: 0, durationMs: Date.now() - startedAt, error: "manifest لا يحتوي على fileBlobs" };

    const { writeUploadFile } = await import("./storage-provider");
    let uploadsRestored = 0;
    for (const [relativePath, blobSha] of Object.entries(fileBlobs) as Array<[string, string]>) {
      try {
        const blobBuffer = await readGitHubBlobBySha(blobSha);
        if (!blobBuffer) continue;
        await writeUploadFile(relativePath, blobBuffer);
        uploadsRestored++;
      } catch (e) {
        console.error(`[Uploads Restore] Failed to restore ${relativePath}:`, e);
      }
    }

    return { ok: true, type: "uploads", fileName: latest.fileName, itemsRestored: 0, uploadsRestored, durationMs: Date.now() - startedAt, error: null };
  } catch (error) {
    return { ok: false, type: "uploads", fileName: "", itemsRestored: 0, uploadsRestored: 0, durationMs: Date.now() - startedAt, error: error instanceof Error ? error.message : String(error) };
  }
}

// ── Restore Full from GitHub ──
export async function restoreFullFromGitHub(options: { fileName?: string; commitSha?: string } = {}): Promise<V2RestoreResult> {
  const startedAt = Date.now();

  try {
    const { getSyncConfig, githubRequest: ghReq, branchRefPath: brPath } = await import("./github-sync");
    const { readGitHubBlobBySha } = await import("./github-content");
    const config = getSyncConfig();
    if (!config) return { ok: false, type: "full", fileName: "", itemsRestored: 0, uploadsRestored: 0, durationMs: Date.now() - startedAt, error: "GitHub sync غير مهيأ" };
    const { owner, repo } = config.repo;

    let backupDir: string;
    let commitSha: string;

    if (options.fileName) {
      const ts = options.fileName.replace(/^full[-\/]?/i, "");
      backupDir = `backups/full/${ts}`;
      commitSha = options.commitSha || "";
    } else {
      const latest = await findLatestBackupOnGitHubByType("full");
      if (!latest) return { ok: false, type: "full", fileName: "", itemsRestored: 0, uploadsRestored: 0, durationMs: Date.now() - startedAt, error: "لم يتم العثور على نسخة كاملة" };
      const m = latest.repoPath.match(/^backups\/full\/([^/]+)/);
      if (!m) return { ok: false, type: "full", fileName: "", itemsRestored: 0, uploadsRestored: 0, durationMs: Date.now() - startedAt, error: "لم يتم العثور على مسار النسخة" };
      backupDir = `backups/full/${m[1]}`;
      commitSha = latest.commitSha;
    }

    if (!commitSha) {
      const ref = await ghReq<GitHubRef>(`/repos/${owner}/${repo}/git/ref/heads/${brPath(config.branch)}`, { method: "GET" }, config.token);
      commitSha = ref.object.sha;
    }

    const commit = await ghReq<GitHubCommit>(`/repos/${owner}/${repo}/git/commits/${commitSha}`, { method: "GET" }, config.token);
    const tree = await ghReq<GitHubRecursiveTree>(`/repos/${owner}/${repo}/git/trees/${commit.tree.sha}?recursive=1`, { method: "GET" }, config.token);
    const entries = tree.tree.filter((e) => e.type === "blob" && e.path.startsWith(backupDir));

    const manifestEntry = entries.find((e) => e.path.endsWith("/manifest.json.gz"));
    if (!manifestEntry?.sha) return { ok: false, type: "full", fileName: options.fileName || "", itemsRestored: 0, uploadsRestored: 0, durationMs: Date.now() - startedAt, error: "لم يتم العثور على manifest في النسخة الكاملة" };

    const manifestBuf = await readGitHubBlobBySha(manifestEntry.sha);
    if (!manifestBuf) return { ok: false, type: "full", fileName: options.fileName || "", itemsRestored: 0, uploadsRestored: 0, durationMs: Date.now() - startedAt, error: "فشل قراءة manifest" };

    const manifestData = JSON.parse(gunzipSync(manifestBuf).toString("utf8"));
    const fileBlobs = manifestData.fileBlobs as Record<string, string> | undefined;
    if (!fileBlobs) return { ok: false, type: "full", fileName: options.fileName || "", itemsRestored: 0, uploadsRestored: 0, durationMs: Date.now() - startedAt, error: "manifest لا يحتوي على fileBlobs" };

    const dbBlobSha = fileBlobs["db.json.gz"];
    if (!dbBlobSha) return { ok: false, type: "full", fileName: options.fileName || "", itemsRestored: 0, uploadsRestored: 0, durationMs: Date.now() - startedAt, error: "manifest لا يحتوي على db.json.gz" };

    const dbBlobBuf = await readGitHubBlobBySha(dbBlobSha);
    if (!dbBlobBuf) return { ok: false, type: "full", fileName: options.fileName || "", itemsRestored: 0, uploadsRestored: 0, durationMs: Date.now() - startedAt, error: "فشل تحميل db.json.gz" };

    const dbText = gunzipSync(dbBlobBuf).toString("utf8");
    const dbPayload: DatabaseBackupPayload = JSON.parse(dbText);
    if (!dbPayload.runtimeData) return { ok: false, type: "full", fileName: options.fileName || "", itemsRestored: 0, uploadsRestored: 0, durationMs: Date.now() - startedAt, error: "النسخة لا تحتوي على runtimeData" };

    const steps: Array<{ table: string; deleted: number; inserted: number }> = [];
    if (prisma) {
      await prisma.$transaction(async (tx) => {
        for (const table of deleteTableOrder()) {
          const data = dbPayload.runtimeData[table];
          if (!data) continue;
          steps.push({ table, deleted: await deleteTableData(tx, table), inserted: 0 });
        }
        for (const table of restoreTableOrder()) {
          const rows = dbPayload.runtimeData[table];
          if (!rows?.length) continue;
          const inserted = await insertTableData(tx, table, rows);
          const existing = steps.find((s) => s.table === table);
          if (existing) existing.inserted = inserted;
          else steps.push({ table, deleted: 0, inserted });
        }
      });
    }

    const itemsRestored = steps.reduce((sum, s) => sum + s.inserted, 0);

    let uploadsRestored = 0;
    const { writeUploadFile } = await import("./storage-provider");
    for (const [relativePath, blobSha] of Object.entries(fileBlobs) as Array<[string, string]>) {
      if (relativePath === "db.json.gz") continue;
      if (!relativePath.startsWith("uploads/")) continue;
      const uploadPath = relativePath.slice("uploads/".length);
      try {
        const blobBuf = await readGitHubBlobBySha(blobSha);
        if (!blobBuf) continue;
        await writeUploadFile(uploadPath, blobBuf);
        uploadsRestored++;
      } catch (e) {
        console.error(`[Full Restore] Failed to restore upload ${uploadPath}:`, e);
      }
    }

    return { ok: true, type: "full", fileName: options.fileName || "full", itemsRestored, uploadsRestored, durationMs: Date.now() - startedAt, error: null };
  } catch (error) {
    return { ok: false, type: "full", fileName: options.fileName || "", itemsRestored: 0, uploadsRestored: 0, durationMs: Date.now() - startedAt, error: error instanceof Error ? error.message : String(error) };
  }
}

// ── Check if uploads exist on disk ──
export async function checkUploadsOnDisk(): Promise<boolean> {
  try {
    const files = await listUploadFiles();
    return files.length > 0;
  } catch {
    return false;
  }
}

// ── Integrated auto-restore v2 ──
export type AutoRestoreDecision = {
  executed: boolean;
  restored: boolean;
  reason: string;
  dbRestored?: boolean;
  uploadsRestored?: boolean;
  itemsRestored?: number;
  uploadFilesRestored?: number;
};

export async function checkAndAutoRestoreV2(): Promise<AutoRestoreDecision> {
  const enabled = (process.env.AUTO_RESTORE_FROM_GITHUB || "").toLowerCase() === "true";
  if (!enabled) return { executed: false, restored: false, reason: "AUTO_RESTORE_FROM_GITHUB غير مفعّل" };

  if (!prisma) return { executed: false, restored: false, reason: "قاعدة البيانات غير متصلة" };

  let dbEmpty = false;
  try {
    const keysCount = await prisma.appSetting.count();
    dbEmpty = keysCount === 0;
  } catch {
    return { executed: false, restored: false, reason: "فشل التحقق من قاعدة البيانات" };
  }

  const onlyIfEmpty = (process.env.AUTO_RESTORE_ONLY_IF_DB_EMPTY || "").trim().toLowerCase() !== "false";
  if (onlyIfEmpty && !dbEmpty) {
    const uploadsExist = await checkUploadsOnDisk().catch(() => false);
    if (uploadsExist) {
      return { executed: false, restored: false, reason: `قاعدة البيانات غير فارغة والملفات موجودة (${await prisma.appSetting.count()} مفتاح)` };
    }
    console.log("[Auto Restore] قاعدة البيانات غير فارغة لكن الملفات مفقودة، استعادة الملفات فقط");
    const result = await restoreUploadsFromGitHub();
    return {
      executed: true,
      restored: result.ok,
      reason: result.ok ? `تمت استعادة ${result.uploadsRestored} ملف` : `فشلت استعادة الملفات: ${result.error}`,
      uploadFilesRestored: result.uploadsRestored,
      uploadsRestored: true,
    };
  }

  if (dbEmpty) {
    const uploadsExist = await checkUploadsOnDisk().catch(() => false);
    if (!uploadsExist) {
      console.log("[Auto Restore] قاعدة البيانات فارغة والملفات مفقودة، استعادة كاملة");
      const result = await restoreFullFromGitHub();
      return {
        executed: true,
        restored: result.ok,
        reason: result.ok ? `تمت استعادة ${result.itemsRestored} عنصر و ${result.uploadsRestored} ملف` : `فشلت الاستعادة الكاملة: ${result.error}`,
        itemsRestored: result.itemsRestored,
        uploadFilesRestored: result.uploadsRestored,
        dbRestored: result.itemsRestored > 0,
        uploadsRestored: result.uploadsRestored > 0,
      };
    }
    console.log("[Auto Restore] قاعدة البيانات فارغة، استعادة قاعدة البيانات فقط");
    const result = await restoreDatabaseFromGitHub();
    return {
      executed: true,
      restored: result.ok,
      reason: result.ok ? `تمت استعادة ${result.itemsRestored} عنصر` : `فشلت استعادة قاعدة البيانات: ${result.error}`,
      itemsRestored: result.itemsRestored,
      dbRestored: result.ok,
    };
  }

  return { executed: false, restored: false, reason: "لا حاجة للاستعادة" };
}

// ── Run a single scheduled v2 backup for a given type ──
export async function runScheduledV2Backup(type: BackupTypeV2): Promise<{ ok: boolean; fileName?: string; error?: string }> {
  try {
    if (type === "database") {
      const { bytes, fileName, createdAt } = await createDatabaseBackupPayload();
      const result = await uploadDatabaseBackupToGitHub(bytes, fileName, createdAt, "scheduled");
      if (!result) return { ok: false, error: "فشل رفع نسخة قاعدة البيانات إلى GitHub" };
      await pruneV2Backups("database");
      return { ok: true, fileName };
    }

    if (type === "uploads") {
      const { manifest, files, createdAt } = await createUploadsBackupPayload();
      const tsFileName = createdAt.toISOString().replace(/[:.]/g, "-").replace(/[^\w-]/g, "");
      const result = await uploadUploadsBackupToGitHub(manifest, files, tsFileName, createdAt, "scheduled");
      if (!result) return { ok: false, error: "فشل رفع نسخة الملفات إلى GitHub" };
      await pruneV2Backups("uploads");
      return { ok: true, fileName: tsFileName };
    }

    if (type === "full") {
      const { manifest, files, createdAt } = await createFullBackupPayload();
      const tsFileName = createdAt.toISOString().replace(/[:.]/g, "-").replace(/[^\w-]/g, "");
      const result = await uploadFullBackupToGitHub(manifest, files, tsFileName, createdAt, "scheduled");
      if (!result) return { ok: false, error: "فشل رفع النسخة الكاملة إلى GitHub" };
      await pruneV2Backups("full");
      return { ok: true, fileName: tsFileName };
    }

    return { ok: false, error: `نوع نسخة غير معروف: ${type}` };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) };
  }
}

// ── Backup Integrity Check ──
export type IntegrityCheckResult = {
  ok: boolean;
  type: BackupTypeV2;
  fileName: string;
  checks: {
    name: string;
    passed: boolean;
    detail: string;
  }[];
  error: string | null;
};

export async function verifyV2BackupIntegrity(type: BackupTypeV2): Promise<IntegrityCheckResult> {
  const startedAt = Date.now();
  const checks: IntegrityCheckResult["checks"] = [];

  try {
    const latest = await findLatestBackupOnGitHubByType(type);
    if (!latest) {
      return {
        ok: false,
        type,
        fileName: "",
        checks: [{ name: "exists", passed: false, detail: "لا توجد نسخة على GitHub" }],
        error: "لا توجد نسخة للفحص",
      };
    }

    checks.push({ name: "exists", passed: true, detail: `النسخة موجودة: ${latest.fileName}` });

    const { readGitHubBackupFile, readGitHubBlobBySha } = await import("./github-content");
    const { getSyncConfig, githubRequest: ghReq, branchRefPath } = await import("./github-sync");

    if (type === "database") {
      const repoPath = `backups/database/${latest.fileName}.gz`;
      const rawBytes = await readGitHubBackupFile(repoPath, latest.commitSha);
      if (!rawBytes) {
        checks.push({ name: "download", passed: false, detail: "فشل تحميل الملف" });
        return { ok: false, type, fileName: latest.fileName, checks, error: "فشل تحميل ملف النسخة" };
      }
      checks.push({ name: "download", passed: true, detail: `تم التحميل (${rawBytes.length} بايت)` });

      try {
        const text = gunzipSync(rawBytes).toString("utf8");
        const payload: DatabaseBackupPayload = JSON.parse(text);
        if (!payload.runtimeData) {
          checks.push({ name: "structure", passed: false, detail: "النسخة لا تحتوي على runtimeData" });
          return { ok: false, type, fileName: latest.fileName, checks, error: "بنية النسخة غير صالحة" };
        }
        const tableCount = Object.keys(payload.runtimeData).length;
        const totalRows = Object.values(payload.runtimeData).reduce((sum, rows) => sum + rows.length, 0);
        checks.push({ name: "structure", passed: true, detail: `JSON صالح، ${tableCount} جدول، ${totalRows} صف` });
      } catch {
        checks.push({ name: "structure", passed: false, detail: "فشل فك الضغط أو JSON غير صالح" });
        return { ok: false, type, fileName: latest.fileName, checks, error: "فشل فك ضغط أو تحليل JSON" };
      }
    }

    if (type === "uploads") {
      const config = getSyncConfig();
      if (!config) {
        checks.push({ name: "config", passed: false, detail: "GitHub غير مهيأ" });
        return { ok: false, type, fileName: latest.fileName, checks, error: "GitHub غير مهيأ" };
      }
      const { owner, repo } = config.repo;

      const ref = await ghReq<GitHubRef>(`/repos/${owner}/${repo}/git/ref/heads/${branchRefPath(config.branch)}`, { method: "GET" }, config.token);
      const headCommit = await ghReq<GitHubCommit>(`/repos/${owner}/${repo}/git/commits/${ref.object.sha}`, { method: "GET" }, config.token);
      const tree = await ghReq<GitHubRecursiveTree>(`/repos/${owner}/${repo}/git/trees/${headCommit.tree.sha}?recursive=1`, { method: "GET" }, config.token);

      const manifestEntry = tree.tree.find((e) => e.path === `${latest.repoPath}/manifest.json.gz`);
      if (!manifestEntry?.sha) {
        checks.push({ name: "manifest", passed: false, detail: "manifest غير موجود" });
        return { ok: false, type, fileName: latest.fileName, checks, error: "manifest غير موجود" };
      }
      checks.push({ name: "manifest", passed: true, detail: "manifest موجود" });

      const manifestBuf = await readGitHubBlobBySha(manifestEntry.sha);
      if (!manifestBuf) {
        checks.push({ name: "manifest_read", passed: false, detail: "فشل قراءة manifest" });
        return { ok: false, type, fileName: latest.fileName, checks, error: "فشل قراءة manifest" };
      }
      checks.push({ name: "manifest_read", passed: true, detail: `manifest مقروء (${manifestBuf.length} بايت)` });

      try {
        const manifestData = JSON.parse(gunzipSync(manifestBuf).toString("utf8"));
        const fileBlobs = manifestData.fileBlobs as Record<string, string> | undefined;
        if (!fileBlobs || typeof fileBlobs !== "object") {
          checks.push({ name: "fileBlobs", passed: false, detail: "manifest لا يحتوي على fileBlobs" });
          return { ok: false, type, fileName: latest.fileName, checks, error: "manifest لا يحتوي على fileBlobs" };
        }
        const fileCount = Object.keys(fileBlobs).length;
        const skippedCount = manifestData.skippedFiles ?? 0;
        checks.push({ name: "fileBlobs", passed: true, detail: `${fileCount} ملف, ${skippedCount} تم تخطيه` });

        if (skippedCount > 0) {
          checks.push({ name: "skipped_files", passed: true, detail: `${skippedCount} ملف تجاوز 90MB وتم تخطيه` });
        }
      } catch {
        checks.push({ name: "manifest_parse", passed: false, detail: "فشل تحليل manifest" });
        return { ok: false, type, fileName: latest.fileName, checks, error: "manifest تالف" };
      }
    }

    if (type === "full") {
      const config = getSyncConfig();
      if (!config) {
        checks.push({ name: "config", passed: false, detail: "GitHub غير مهيأ" });
        return { ok: false, type, fileName: latest.fileName, checks, error: "GitHub غير مهيأ" };
      }
      const { owner, repo } = config.repo;

      const ref = await ghReq<GitHubRef>(`/repos/${owner}/${repo}/git/ref/heads/${branchRefPath(config.branch)}`, { method: "GET" }, config.token);
      const commit = await ghReq<GitHubCommit>(`/repos/${owner}/${repo}/git/commits/${ref.object.sha}`, { method: "GET" }, config.token);
      const tree = await ghReq<GitHubRecursiveTree>(`/repos/${owner}/${repo}/git/trees/${commit.tree.sha}?recursive=1`, { method: "GET" }, config.token);

      const manifestEntry = tree.tree.find((e) => e.path === `${latest.repoPath}/manifest.json.gz`);
      if (!manifestEntry?.sha) {
        checks.push({ name: "manifest", passed: false, detail: "manifest غير موجود" });
        return { ok: false, type, fileName: latest.fileName, checks, error: "manifest غير موجود" };
      }
      checks.push({ name: "manifest", passed: true, detail: "manifest موجود" });

      const manifestBuf = await readGitHubBlobBySha(manifestEntry.sha);
      if (!manifestBuf) {
        checks.push({ name: "manifest_read", passed: false, detail: "فشل قراءة manifest" });
        return { ok: false, type, fileName: latest.fileName, checks, error: "فشل قراءة manifest" };
      }

      try {
        const manifestData = JSON.parse(gunzipSync(manifestBuf).toString("utf8"));
        const fileBlobs = manifestData.fileBlobs as Record<string, string> | undefined;
        if (!fileBlobs?.["db.json.gz"]) {
          checks.push({ name: "db_blob", passed: false, detail: "db.json.gz غير موجود في manifest" });
          return { ok: false, type, fileName: latest.fileName, checks, error: "db.json.gz مفقود" };
        }
        checks.push({ name: "db_blob", passed: true, detail: "db.json.gz موجود في manifest" });

        const dbBlob = await readGitHubBlobBySha(fileBlobs["db.json.gz"]);
        if (!dbBlob) {
          checks.push({ name: "db_download", passed: false, detail: "فشل تحميل db.json.gz" });
          return { ok: false, type, fileName: latest.fileName, checks, error: "فشل تحميل db.json.gz" };
        }
        checks.push({ name: "db_download", passed: true, detail: `db.json.gz محمل (${dbBlob.length} بايت)` });

        try {
          const dbText = gunzipSync(dbBlob).toString("utf8");
          const dbPayload: DatabaseBackupPayload = JSON.parse(dbText);
          const totalRows = Object.values(dbPayload.runtimeData || {}).reduce((sum, rows) => sum + rows.length, 0);
          checks.push({ name: "db_integrity", passed: true, detail: `DB صالح، ${totalRows} صف` });
        } catch {
          checks.push({ name: "db_integrity", passed: false, detail: "db.json.gz تالف" });
          return { ok: false, type, fileName: latest.fileName, checks, error: "db.json.gz تالف" };
        }
      } catch {
        checks.push({ name: "manifest_parse", passed: false, detail: "فشل تحليل manifest" });
        return { ok: false, type, fileName: latest.fileName, checks, error: "manifest تالف" };
      }
    }

    return { ok: true, type, fileName: latest.fileName, checks, error: null };
  } catch (error) {
    return { ok: false, type, fileName: "", checks, error: error instanceof Error ? error.message : String(error) };
  }
}
