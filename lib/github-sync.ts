import { createHash } from "node:crypto";
import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";
import { ensureRuntimeDirectories, runtimeBackupDir } from "./runtime-paths";

type GitHubSyncStatus = "synced" | "skipped" | "unchanged" | "failed";

export type GitHubSyncResult = {
  status: GitHubSyncStatus;
  message: string;
  authFailed?: boolean;
  commitUrl?: string;
  commitSha?: string;
  files?: number;
  duration?: number;
};

type GitHubRef = {
  object: {
    sha: string;
  };
};

type GitHubCommit = {
  sha: string;
  tree: {
    sha: string;
  };
};

type GitHubBlob = {
  sha: string;
};

type GitHubTree = {
  sha: string;
};

type GitHubTreeResponse = {
  tree: Array<{
    path: string;
    type: string;
    sha: string;
  }>;
};

type GitHubCreatedCommit = {
  sha: string;
  html_url?: string;
};

type SyncFile = {
  absolutePath: string;
  repoPath: string;
  size: number;
};

type BackupPayloadForSync = {
  source?: string;
  postgresDump?: {
    tool?: string;
    format?: string;
    encoding?: string;
    sizeBytes?: number;
    sha256?: string;
    base64?: string;
  };
};

type SyncConfig = {
  token: string;
  tokenSource: string;
  repo: {
    owner: string;
    repo: string;
  };
  repoSource: string;
  branch: string;
};

export type SyncLogEntry = {
  id: string;
  timestamp: Date;
  reason: string;
  status: string;
  filesCount: number | null;
  commitSha: string | null;
  commitUrl: string | null;
  errorMessage: string | null;
  duration: number | null;
  retryCount: number;
  createdAt: Date;
  updatedAt: Date;
};

const syncRoots = [
  { absolutePath: runtimeBackupDir, repoPath: (process.env.GITHUB_BACKUP_REPO_PATH || "backups").replace(/^\/+|\/+$/g, "") || "backups" },
];
const projectAssetRoots = [
  { absolutePath: path.join(process.cwd(), "public", "assets", "admin"), repoPath: "public/assets/admin" },
];
const projectSyncFiles = [
  "data/site-settings.json",
  "data/home-content.json",
  "data/home-preview-settings.json",
  "data/template-settings.json",
  "data/template-preview-info.json",
  "data/templates-preview-music.json",
  "data/music-library.json",
  "data/legal-pages.json",
  "data/message-templates.json",
  "data/content-presets.json",
  "data/custom-templates.json",
];

// Project files are always synced to GitHub as part of the project configuration.
// Operational data (customers, invitations, etc.) is NEVER synced to GitHub directly.
// GitHub is NOT a database for operational data.
const backupRetentionCount = Math.max(1, Number(process.env.BACKUP_RETENTION_COUNT) || 20);
const maxSyncFileBytes = (Number(process.env.BACKUP_GITHUB_MAX_FILE_MB || process.env.GITHUB_SYNC_MAX_FILE_MB) || 95) * 1024 * 1024;
const maxSyncTotalBytes = (Number(process.env.BACKUP_GITHUB_MAX_TOTAL_MB || process.env.GITHUB_SYNC_MAX_TOTAL_MB) || 180) * 1024 * 1024;

class GitHubSyncHttpError extends Error {
  status: number;
  body: string;

  constructor(status: number, body: string) {
    super(`GitHub sync failed ${status}: ${body.slice(0, 300)}`);
    this.name = "GitHubSyncHttpError";
    this.status = status;
    this.body = body;
  }
}

function normalizeGitHubToken(value: string | undefined) {
  if (!value) return "";
  let token = value.trim().replace(/[\u200B-\u200D\uFEFF\r\n\t ]+/g, "");

  const assignmentMatch = token.match(/^(?:GITHUB_SYNC_TOKEN|BACKUP_GITHUB_TOKEN|GITHUB_TOKEN|GH_TOKEN)=(.+)$/);
  if (assignmentMatch) token = assignmentMatch[1];

  if (
    (token.startsWith('"') && token.endsWith('"')) ||
    (token.startsWith("'") && token.endsWith("'")) ||
    (token.startsWith("“") && token.endsWith("”")) ||
    (token.startsWith("‘") && token.endsWith("’"))
  ) {
    token = token.slice(1, -1).trim();
  }

  return token;
}

function getTokenDiagnostics(rawValue: string | undefined, token: string) {
  return {
    rawLength: rawValue?.length ?? 0,
    normalizedLength: token.length,
    normalizedChanged: Boolean(rawValue && rawValue !== token),
    fingerprint: token ? createHash("sha256").update(token).digest("hex").slice(0, 12) : "",
  };
}

function getGitHubTokenConfig() {
  const candidates = [
    ["GITHUB_SYNC_TOKEN", process.env.GITHUB_SYNC_TOKEN],
    ["BACKUP_GITHUB_TOKEN", process.env.BACKUP_GITHUB_TOKEN],
    ["GITHUB_TOKEN", process.env.GITHUB_TOKEN],
    ["GH_TOKEN", process.env.GH_TOKEN],
  ] as const;

  const match = candidates
    .map(([source, rawValue]) => ({
      source,
      rawValue,
      token: normalizeGitHubToken(rawValue),
    }))
    .find(({ token }) => Boolean(token));

  const token = match?.token || "";
  return {
    token,
    source: match?.source || "none",
    diagnostics: getTokenDiagnostics(match?.rawValue, token),
  };
}

function getGitHubToken() {
  return getGitHubTokenConfig().token;
}

export function isGitHubSyncAuthFailure(error: unknown) {
  if (error instanceof GitHubSyncHttpError) {
    return error.status === 401 || error.status === 403 || /bad credentials|requires authentication|resource not accessible/i.test(error.body);
  }
  return error instanceof Error && /GitHub sync failed (401|403)|bad credentials|requires authentication|resource not accessible/i.test(error.message);
}

function gitHubAuthFailureMessage(details: string, config: SyncConfig | null) {
  const target = config ? `${config.repo.owner}/${config.repo.repo}:${config.branch}` : "the configured repo";
  const tokenSource = config ? config.tokenSource : "GITHUB_SYNC_TOKEN";
  if (/GitHub sync failed 401|bad credentials/i.test(details)) {
    return `GitHub rejected ${tokenSource} for ${target} because the credentials are invalid. Generate a new GitHub token, paste the full token into Railway as GITHUB_SYNC_TOKEN, then redeploy. Details: ${details}`;
  }
  if (/GitHub sync failed 403|resource not accessible/i.test(details)) {
    return `GitHub accepted ${tokenSource} but it cannot write to ${target}. Give the token Contents: Read and write access to that repository, set it as GITHUB_SYNC_TOKEN, then redeploy. Details: ${details}`;
  }
  return `GitHub rejected the sync token for ${target}. Railway is using ${tokenSource}. Create or update a token that has write access to that repository, set it as GITHUB_SYNC_TOKEN, then redeploy. Details: ${details}`;
}

function parseRepo(value: string) {
  const clean = value.trim().replace(/^https:\/\/github\.com\//i, "").replace(/\.git$/i, "").replace(/^\/+|\/+$/g, "");
  const [owner, repo] = clean.split("/");
  return owner && repo ? { owner, repo } : null;
}

function getSyncConfig() {
  if (process.env.GITHUB_SYNC_ENABLED === "false") return null;

  const { token, source: tokenSource } = getGitHubTokenConfig();
  const rawRepo = process.env.GITHUB_SYNC_REPO || process.env.BACKUP_GITHUB_REPO || "";
  const repoSource = process.env.GITHUB_SYNC_REPO ? "GITHUB_SYNC_REPO" : process.env.BACKUP_GITHUB_REPO ? "BACKUP_GITHUB_REPO" : "none";
  const repo = parseRepo(rawRepo);
  const branch = process.env.GITHUB_SYNC_BRANCH || process.env.RAILWAY_GIT_BRANCH || "main";

  if (!token || !repo || !branch) return null;
  return { token, tokenSource, repo, repoSource, branch };
}

export function getGitHubSyncReadiness() {
  if (process.env.GITHUB_SYNC_ENABLED === "false") {
    return {
      configured: false,
      label: "متوقفة",
      detail: "GITHUB_SYNC_ENABLED=false",
    };
  }

  const { token, source: tokenSource, diagnostics: tokenDiagnostics } = getGitHubTokenConfig();
  const rawRepo = process.env.GITHUB_SYNC_REPO || process.env.BACKUP_GITHUB_REPO || "";
  const repo = parseRepo(rawRepo);
  const branch = process.env.GITHUB_SYNC_BRANCH || process.env.RAILWAY_GIT_BRANCH || "main";

  if (!token || !repo || !branch) {
    const missing = [
      !token ? "Token" : "",
      !repo ? "Repo" : "",
      !branch ? "Branch" : "",
    ].filter(Boolean);

    return {
      configured: false,
      label: "غير مكتملة",
      detail: `ناقص: ${missing.join(" / ") || "إعدادات GitHub"}`,
      tokenSource,
      tokenDiagnostics,
    };
  }

  return {
    configured: true,
    label: "جاهزة",
    detail: `${repo.owner}/${repo.repo} - ${branch}`,
    tokenSource,
    tokenDiagnostics,
  };
}

async function exists(filePath: string) {
  try {
    await stat(filePath);
    return true;
  } catch {
    return false;
  }
}

function toRepoPath(absolutePath: string, root: { absolutePath: string; repoPath: string }) {
  const relativePath = path.relative(root.absolutePath, absolutePath).split(path.sep).join("/");
  return path.join(root.repoPath, relativePath).split(path.sep).join("/");
}

async function walkFiles(dir: string, root: { absolutePath: string; repoPath: string }): Promise<SyncFile[]> {
  ensureRuntimeDirectories();
  if (!(await exists(dir))) return [];
  const entries = await readdir(dir, { withFileTypes: true }).catch((error: unknown) => {
    console.error(`[GitHub Sync] Failed to read sync directory: ${dir}`, error);
    return [];
  });
  const files: SyncFile[] = [];

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await walkFiles(fullPath, root)));
      continue;
    }

    if (!entry.isFile()) continue;
    const fileStat = await stat(fullPath).catch((error: unknown) => {
      console.error(`[GitHub Sync] Failed to stat sync file: ${fullPath}`, error);
      return null;
    });
    if (!fileStat) continue;
    if (!fileStat.size || fileStat.size > maxSyncFileBytes) {
      console.warn(`[GitHub Sync] Skipping oversized file: ${toRepoPath(fullPath, root)} (${fileStat.size} bytes).`);
      continue;
    }
    files.push({
      absolutePath: fullPath,
      repoPath: toRepoPath(fullPath, root),
      size: fileStat.size,
    });
  }

  return files;
}

async function collectSyncFiles() {
  ensureRuntimeDirectories();
  const groups = await Promise.all(syncRoots.map((root) => walkFiles(root.absolutePath, root)));
  const files = groups
    .flat()
    .filter((file) => isTopLevelBackupJson(file.repoPath))
    .sort((a, b) => backupTimeFromPath(b.repoPath) - backupTimeFromPath(a.repoPath) || b.repoPath.localeCompare(a.repoPath));
  const selected: SyncFile[] = [];
  let totalBytes = 0;
  for (const file of files) {
    const valid = await isValidDatabaseBackupFile(file);
    if (!valid) continue;
    if (totalBytes + file.size > maxSyncTotalBytes) {
      console.warn(`[GitHub Sync] Skipping file because sync payload limit was reached: ${file.repoPath} (${file.size} bytes).`);
      continue;
    }
    selected.push(file);
    totalBytes += file.size;
    break;
  }
  return selected;
}

async function collectProjectSyncFiles() {
  const root = process.cwd();
  const files: SyncFile[] = [];
  for (const repoPath of projectSyncFiles) {
    const absolutePath = path.join(root, repoPath);
    const fileStat = await stat(absolutePath).catch(() => null);
    if (!fileStat?.isFile() || !fileStat.size || fileStat.size > maxSyncFileBytes) continue;
    files.push({ absolutePath, repoPath, size: fileStat.size });
  }
  const assetGroups = await Promise.all(projectAssetRoots.map((assetRoot) => walkFiles(assetRoot.absolutePath, assetRoot)));
  return [...files, ...assetGroups.flat()];
}

async function isValidDatabaseBackupFile(file: SyncFile) {
  try {
    const bytes = await readFile(file.absolutePath);
    const payload = JSON.parse(bytes.toString("utf8")) as BackupPayloadForSync;
    const dump = payload.postgresDump;
    if (payload.source !== "database" || !dump) {
      console.warn(`[GitHub Sync] Skipping non-database backup: ${file.repoPath}`);
      return false;
    }
    if (dump.tool !== "pg_dump" || dump.format !== "custom" || dump.encoding !== "base64" || !dump.base64) {
      console.warn(`[GitHub Sync] Skipping backup without a valid PostgreSQL dump: ${file.repoPath}`);
      return false;
    }
    const dumpBytes = Buffer.from(dump.base64, "base64");
    if (!dumpBytes.length) {
      console.warn(`[GitHub Sync] Skipping backup with an empty PostgreSQL dump: ${file.repoPath}`);
      return false;
    }
    if (Number(dump.sizeBytes) && Number(dump.sizeBytes) !== dumpBytes.length) {
      console.warn(`[GitHub Sync] Skipping backup with dump size mismatch: ${file.repoPath}`);
      return false;
    }
    if (dump.sha256) {
      const sha256 = createHash("sha256").update(dumpBytes).digest("hex");
      if (sha256 !== dump.sha256) {
        console.warn(`[GitHub Sync] Skipping backup with dump hash mismatch: ${file.repoPath}`);
        return false;
      }
    }
    return true;
  } catch (error) {
    console.warn(`[GitHub Sync] Skipping invalid backup file: ${file.repoPath}`, error);
    return false;
  }
}

/**
 * Compute a hash of all file contents to detect changes before committing.
 */
export async function hashSyncFiles(files: { absolutePath: string; repoPath: string }[]): Promise<string> {
  const hash = createHash("sha256");
  for (const file of files) {
    hash.update(file.repoPath);
    hash.update(":");
    const bytes = await readFile(file.absolutePath);
    hash.update(bytes);
    hash.update("\n");
  }
  return hash.digest("hex");
}

function branchRefPath(branch: string) {
  return branch.split("/").map(encodeURIComponent).join("/");
}

async function githubRequest<T>(pathName: string, init: RequestInit, token: string): Promise<T> {
  const response = await fetch(`https://api.github.com${pathName}`, {
    ...init,
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "X-GitHub-Api-Version": "2022-11-28",
      ...(init.headers || {}),
    },
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new GitHubSyncHttpError(response.status, body);
  }

  return (await response.json()) as T;
}

async function createBlob(owner: string, repo: string, token: string, file: SyncFile) {
  const bytes = await readFile(file.absolutePath).catch((error: unknown) => {
    console.warn(`[GitHub Sync] Skipping missing/unreadable file: ${file.repoPath}`, error);
    return null;
  });
  if (!bytes) return null;

  const blob = await githubRequest<GitHubBlob>(
    `/repos/${owner}/${repo}/git/blobs`,
    {
      method: "POST",
      body: JSON.stringify({
        content: bytes.toString("base64"),
        encoding: "base64",
      }),
    },
    token,
  );
  return {
    path: file.repoPath,
    mode: "100644",
    type: "blob",
    sha: blob.sha,
  };
}

function backupTimeFromPath(repoPath: string) {
  const match = repoPath.match(/(\d{8}T\d{6}Z)/);
  if (!match) return 0;
  const value = match[1];
  const iso = `${value.slice(0, 4)}-${value.slice(4, 6)}-${value.slice(6, 8)}T${value.slice(9, 11)}:${value.slice(11, 13)}:${value.slice(13, 15)}Z`;
  const time = Date.parse(iso);
  return Number.isFinite(time) ? time : 0;
}

function isTopLevelBackupJson(repoPath: string) {
  for (const root of syncRoots) {
    const prefix = `${root.repoPath.replace(/^\/+|\/+$/g, "")}/`;
    if (!repoPath.startsWith(prefix) || !repoPath.endsWith(".json")) continue;
    const relativePath = repoPath.slice(prefix.length);
    return Boolean(relativePath) && !relativePath.includes("/") && backupTimeFromPath(repoPath) > 0;
  }
  return false;
}

async function listRemoteBackupFiles(owner: string, repo: string, branch: string, token: string, treeSha: string) {
  const response = await githubRequest<GitHubTreeResponse>(
    `/repos/${owner}/${repo}/git/trees/${treeSha}?recursive=1`,
    { method: "GET" },
    token,
  );
  const roots = syncRoots.map((root) => `${root.repoPath.replace(/^\/+|\/+$/g, "")}/`);
  return response.tree.filter((item) => item.type === "blob" && roots.some((root) => item.path.startsWith(root)) && isTopLevelBackupJson(item.path));
}

function buildRetentionDeletes(remoteFiles: Awaited<ReturnType<typeof listRemoteBackupFiles>>, uploadedPaths: Set<string>) {
  const allPaths = Array.from(new Set([...remoteFiles.map((file) => file.path), ...uploadedPaths]));
  const sorted = allPaths.sort((a, b) => {
    const byTime = backupTimeFromPath(b) - backupTimeFromPath(a);
    return byTime || b.localeCompare(a);
  });
  const keep = new Set(sorted.slice(0, backupRetentionCount));
  return remoteFiles
    .filter((file) => !keep.has(file.path) && !uploadedPaths.has(file.path))
    .map((file) => ({
      path: file.path,
      mode: "100644",
      type: "blob",
      sha: null,
    }));
}

// ─── Database logging helpers ────────────────────────────────────────────────

async function getPrisma() {
  try {
    const { prisma } = await import("./db");
    return prisma;
  } catch {
    return null;
  }
}

export async function createSyncLog(data: {
  reason: string;
  status: string;
  retryCount?: number;
}): Promise<string | null> {
  try {
    const prisma = await getPrisma();
    if (!prisma) return null;
    const log = await prisma.syncLog.create({
      data: {
        reason: data.reason,
        status: data.status,
        retryCount: data.retryCount ?? 0,
      },
    });
    return log.id;
  } catch (error) {
    console.error("[SyncLog] Failed to create sync log:", error);
    return null;
  }
}

export async function updateSyncLog(
  id: string,
  data: Partial<{
    status: string;
    filesCount: number;
    commitSha: string;
    commitUrl: string;
    errorMessage: string | null;
    duration: number;
    retryCount: number;
  }>,
): Promise<void> {
  try {
    const prisma = await getPrisma();
    if (!prisma) return;
    await prisma.syncLog.update({ where: { id }, data });
  } catch (error) {
    console.error("[SyncLog] Failed to update sync log:", error);
  }
}

export async function getSyncHistory(options: {
  limit?: number;
  offset?: number;
  status?: string;
  reason?: string;
} = {}): Promise<{ logs: SyncLogEntry[]; total: number }> {
  try {
    const prisma = await getPrisma();
    if (!prisma) return { logs: [], total: 0 };

    const where: Record<string, unknown> = {};
    if (options.status && options.status !== "all") where.status = options.status;
    if (options.reason) where.reason = { contains: options.reason };

    const [logs, total] = await Promise.all([
      prisma.syncLog.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: options.limit ?? 20,
        skip: options.offset ?? 0,
      }),
      prisma.syncLog.count({ where }),
    ]);

    return { logs, total };
  } catch (error) {
    console.error("[SyncLog] Failed to fetch sync history:", error);
    return { logs: [], total: 0 };
  }
}

export async function getLastSuccessfulSync(): Promise<SyncLogEntry | null> {
  try {
    const prisma = await getPrisma();
    if (!prisma) return null;
    const log = await prisma.syncLog.findFirst({
      where: { status: "completed" },
      orderBy: { createdAt: "desc" },
    });
    return log ?? null;
  } catch {
    return null;
  }
}

async function markBackupJobsUploaded(files: SyncFile[], commitSha: string | undefined) {
  if (!commitSha) return;
  const fileNames = files
    .map((file) => path.basename(file.repoPath))
    .filter((fileName) => /^[a-z0-9-]+\.json$/i.test(fileName));
  if (!fileNames.length) return;

  try {
    const prisma = await getPrisma();
    if (!prisma) return;
    await prisma.backupJob.updateMany({
      where: { fileName: { in: fileNames } },
      data: { githubSha: commitSha },
    });
  } catch (error) {
    console.error("[BackupJob] Failed to mark GitHub upload commit.", error);
  }
}

// ─── Core sync function ───────────────────────────────────────────────────────

async function attemptSync(reason: string, options: { uploadProjectFiles?: boolean } = {}): Promise<GitHubSyncResult & { startedAt: number }> {
  const startedAt = Date.now();
  const config = getSyncConfig();

  if (!config) {
    return {
      startedAt,
      status: "skipped",
      message: "GitHub sync variables are not configured.",
      duration: Date.now() - startedAt,
    };
  }

  const files = options.uploadProjectFiles ? await collectProjectSyncFiles() : await collectSyncFiles();
  if (!files.length) {
    return {
      startedAt,
      status: "skipped",
      message: "No data or uploaded files found to sync.",
      duration: Date.now() - startedAt,
    };
  }

  const { owner, repo } = config.repo;
  const ref = await githubRequest<GitHubRef>(`/repos/${owner}/${repo}/git/ref/heads/${branchRefPath(config.branch)}`, { method: "GET" }, config.token);
  const headCommit = await githubRequest<GitHubCommit>(`/repos/${owner}/${repo}/git/commits/${ref.object.sha}`, { method: "GET" }, config.token);
  console.log("[GitHub Backup] GitHub Upload Started");
  const treeItems: NonNullable<Awaited<ReturnType<typeof createBlob>>>[] = [];
  for (const file of files) {
    const item = await createBlob(owner, repo, config.token, file);
    if (item) treeItems.push(item);
  }
  if (!treeItems.length) {
    return {
      startedAt,
      status: "skipped",
      message: "No readable data or uploaded files found to sync.",
      duration: Date.now() - startedAt,
    };
  }
  const remoteBackupFiles = options.uploadProjectFiles ? [] : await listRemoteBackupFiles(owner, repo, config.branch, config.token, headCommit.tree.sha);
  const deleteItems = options.uploadProjectFiles ? [] : buildRetentionDeletes(remoteBackupFiles, new Set(treeItems.map((item) => item.path)));
  if (deleteItems.length) {
    console.log(`[GitHub Backup] Old Backups Deleted: ${deleteItems.length}`);
  }
  const tree = await githubRequest<GitHubTree>(
    `/repos/${owner}/${repo}/git/trees`,
    {
      method: "POST",
      body: JSON.stringify({
        base_tree: headCommit.tree.sha,
        tree: [...treeItems, ...deleteItems],
      }),
    },
    config.token,
  );

  if (tree.sha === headCommit.tree.sha) {
    await markBackupJobsUploaded(files, ref.object.sha);
    return {
      startedAt,
      status: "unchanged",
      message: "GitHub already has the latest admin data.",
      commitSha: ref.object.sha,
      files: treeItems.length,
      duration: Date.now() - startedAt,
    };
  }

  const commit = await githubRequest<GitHubCreatedCommit>(
    `/repos/${owner}/${repo}/git/commits`,
    {
      method: "POST",
      body: JSON.stringify({
        message: `chore(admin): sync admin changes\n\n${reason}`.slice(0, 500),
        tree: tree.sha,
        parents: [ref.object.sha],
      }),
    },
    config.token,
  );

  await githubRequest(
    `/repos/${owner}/${repo}/git/refs/heads/${branchRefPath(config.branch)}`,
    {
      method: "PATCH",
      body: JSON.stringify({
        sha: commit.sha,
        force: false,
      }),
    },
    config.token,
  );

  await markBackupJobsUploaded(files, commit.sha);

  return {
    startedAt,
    status: "synced",
    message: options.uploadProjectFiles ? "Project configuration files uploaded to GitHub." : `Database backup uploaded to GitHub. Retention keeps the latest ${backupRetentionCount} backup(s).`,
    commitUrl: commit.html_url,
    commitSha: commit.sha,
    files: treeItems.length + deleteItems.length,
    duration: Date.now() - startedAt,
  };
}

export async function syncAdminStateToGitHub(
  reason: string,
  options: { uploadProjectFiles?: boolean; logId?: string; retryCount?: number } = {},
): Promise<GitHubSyncResult> {
  const logId = options.logId ?? (await createSyncLog({ reason, status: "processing", retryCount: options.retryCount ?? 0 }));
  const ts = () => new Date().toISOString();

  console.log(`[GitHub Sync ${ts()}] GitHub Upload Started: ${reason}`);

  try {
    const result = await attemptSync(reason, { uploadProjectFiles: options.uploadProjectFiles });
    const duration = result.duration ?? 0;

    const dbStatus = result.status === "synced" || result.status === "unchanged" ? "completed" : result.status;

    if (logId) {
      await updateSyncLog(logId, {
        status: dbStatus,
        filesCount: result.files,
        commitSha: result.commitSha,
        commitUrl: result.commitUrl,
        duration,
      });
    }

    console.log(`[GitHub Sync ${ts()}] GitHub Upload Completed (${duration}ms): ${result.status} — ${result.message}`);
    return result;
  } catch (error) {
    const rawMessage = error instanceof Error ? error.message : "Unknown GitHub sync error.";
    const authFailed = isGitHubSyncAuthFailure(error);
    const message = authFailed ? gitHubAuthFailureMessage(rawMessage, getSyncConfig()) : rawMessage;
    const retryCount = options.retryCount ?? 0;

    console.error(`[GitHub Sync ${ts()}] Failed (manual retry only, authFailed=${authFailed}): ${message}`);

    if (logId) {
      await updateSyncLog(logId, {
        status: "failed",
        errorMessage: message,
        retryCount,
      });
    }

    return {
      status: "failed",
      message,
      authFailed,
    };
  }
}
