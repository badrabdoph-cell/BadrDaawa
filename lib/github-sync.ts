import { createHash } from "node:crypto";
import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";
import { ensureRuntimeDirectories } from "./runtime-paths";

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

type GitHubCreatedCommit = {
  sha: string;
  html_url?: string;
};

type SyncFile = {
  absolutePath: string;
  repoPath: string;
  size: number;
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
  nextRetryAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

const syncRoots = ["data", path.join("public", "uploads")];
const maxSyncFileBytes = 90 * 1024 * 1024;

// Retry delays in milliseconds: 5s, 15s, 45s
const retryDelays = [5_000, 15_000, 45_000];
const maxRetries = 3;

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

function getGitHubTokenConfig() {
  const candidates = [
    ["GITHUB_SYNC_TOKEN", process.env.GITHUB_SYNC_TOKEN],
    ["BACKUP_GITHUB_TOKEN", process.env.BACKUP_GITHUB_TOKEN],
    ["GITHUB_TOKEN", process.env.GITHUB_TOKEN],
    ["GH_TOKEN", process.env.GH_TOKEN],
  ] as const;

  const match = candidates.find(([, value]) => Boolean(value));
  return {
    token: match?.[1] || "",
    source: match?.[0] || "none",
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

  const token = getGitHubToken();
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
    };
  }

  return {
    configured: true,
    label: "جاهزة",
    detail: `${repo.owner}/${repo.repo} - ${branch}`,
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

function toRepoPath(absolutePath: string) {
  return path.relative(process.cwd(), absolutePath).split(path.sep).join("/");
}

async function walkFiles(dir: string): Promise<SyncFile[]> {
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
      files.push(...(await walkFiles(fullPath)));
      continue;
    }

    if (!entry.isFile()) continue;
    const fileStat = await stat(fullPath).catch((error: unknown) => {
      console.error(`[GitHub Sync] Failed to stat sync file: ${fullPath}`, error);
      return null;
    });
    if (!fileStat) continue;
    if (!fileStat.size || fileStat.size > maxSyncFileBytes) continue;
    files.push({
      absolutePath: fullPath,
      repoPath: toRepoPath(fullPath),
      size: fileStat.size,
    });
  }

  return files;
}

async function collectSyncFiles() {
  ensureRuntimeDirectories();
  const groups = await Promise.all(syncRoots.map((root) => walkFiles(path.join(process.cwd(), root))));
  return groups.flat().sort((a, b) => a.repoPath.localeCompare(b.repoPath));
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
    errorMessage: string;
    duration: number;
    retryCount: number;
    nextRetryAt: Date;
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

// ─── Core sync function ───────────────────────────────────────────────────────

async function attemptSync(
  reason: string,
  options: { createSnapshot?: boolean } = {},
): Promise<GitHubSyncResult & { startedAt: number }> {
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

  if (options.createSnapshot) {
    const { createBackupSnapshot } = await import("./backups");
    await createBackupSnapshot("admin-auto").catch((error) => console.error("Failed to create admin sync backup snapshot", error));
  }

  const files = await collectSyncFiles();
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
  const treeItems = (await Promise.all(files.map((file) => createBlob(owner, repo, config.token, file)))).filter(
    (item): item is NonNullable<typeof item> => Boolean(item),
  );
  if (!treeItems.length) {
    return {
      startedAt,
      status: "skipped",
      message: "No readable data or uploaded files found to sync.",
      duration: Date.now() - startedAt,
    };
  }
  const tree = await githubRequest<GitHubTree>(
    `/repos/${owner}/${repo}/git/trees`,
    {
      method: "POST",
      body: JSON.stringify({
        base_tree: headCommit.tree.sha,
        tree: treeItems,
      }),
    },
    config.token,
  );

  if (tree.sha === headCommit.tree.sha) {
    return {
      startedAt,
      status: "unchanged",
      message: "GitHub already has the latest admin data.",
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

  return {
    startedAt,
    status: "synced",
    message: "Admin data synced to GitHub.",
    commitUrl: commit.html_url,
    commitSha: commit.sha,
    files: treeItems.length,
    duration: Date.now() - startedAt,
  };
}

export async function syncAdminStateToGitHub(
  reason: string,
  options: { createSnapshot?: boolean; logId?: string; retryCount?: number } = {},
): Promise<GitHubSyncResult> {
  const logId = options.logId ?? (await createSyncLog({ reason, status: "processing", retryCount: options.retryCount ?? 0 }));
  const ts = () => new Date().toISOString();

  console.log(`[GitHub Sync ${ts()}] Starting: ${reason}`);

  try {
    const result = await attemptSync(reason, options);
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

    console.log(`[GitHub Sync ${ts()}] Done (${duration}ms): ${result.status} — ${result.message}`);
    return result;
  } catch (error) {
    const rawMessage = error instanceof Error ? error.message : "Unknown GitHub sync error.";
    const authFailed = isGitHubSyncAuthFailure(error);
    const message = authFailed ? gitHubAuthFailureMessage(rawMessage, getSyncConfig()) : rawMessage;
    const retryCount = options.retryCount ?? 0;
    const canRetry = !authFailed && retryCount < maxRetries;
    const nextRetryDelay = canRetry ? retryDelays[retryCount] : null;
    const nextRetryAt = nextRetryDelay ? new Date(Date.now() + nextRetryDelay) : null;

    console.error(`[GitHub Sync ${ts()}] Failed (retry ${retryCount}/${maxRetries}, authFailed=${authFailed}): ${message}`);

    if (logId) {
      await updateSyncLog(logId, {
        status: canRetry ? "pending" : "failed",
        errorMessage: message,
        retryCount,
        ...(nextRetryAt ? { nextRetryAt } : {}),
      });
    }

    return {
      status: "failed",
      message,
      authFailed,
    };
  }
}
