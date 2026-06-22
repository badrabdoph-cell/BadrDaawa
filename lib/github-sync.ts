import { createHash } from "crypto";
import { readdir, readFile, stat } from "fs/promises";
import path from "path";
import { readProjectContentExportFiles } from "./project-content-store";
import { runtimeUploadsDir } from "./runtime-paths";

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

export type GitHubBackupUploadResult = {
  status: "synced" | "failed";
  message: string;
  commitSha: string | null;
  fileUrl: string | null;
  repoPath: string | null;
  verified: boolean;
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

type GitHubTreeEntry = {
  path: string;
  mode?: string;
  type: string;
  sha?: string;
  size?: number;
};

type GitHubRecursiveTree = {
  sha: string;
  tree: GitHubTreeEntry[];
  truncated?: boolean;
};

type GitHubContentItem = {
  path: string;
  sha: string;
  size: number;
  html_url?: string;
};

type GitHubPutContentsResponse = {
  content?: GitHubContentItem;
  commit: GitHubCreatedCommit;
};

type SyncFile = {
  absolutePath: string;
  repoPath: string;
  size: number;
  bytes?: Buffer;
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

// Project files are always synced to GitHub as part of the project configuration.
// Operational data (customers, invitations, etc.) is NEVER synced to GitHub directly.
// GitHub is NOT a database for operational data.
const maxSyncFileBytes = (Number(process.env.GITHUB_SYNC_MAX_FILE_MB) || 95) * 1024 * 1024;

function getProjectAssetRoots() {
  return [
    { absolutePath: path.join(runtimeUploadsDir, "assets", "admin"), repoPath: "public/assets/admin" },
  ];
}

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

  const assignmentMatch = token.match(/^(?:GITHUB_SYNC_TOKEN|GITHUB_TOKEN|GH_TOKEN)=(.+)$/);
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
  const rawRepo = process.env.GITHUB_SYNC_REPO || "";
  const repoSource = process.env.GITHUB_SYNC_REPO ? "GITHUB_SYNC_REPO" : "none";
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
  const rawRepo = process.env.GITHUB_SYNC_REPO || "";
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
  console.warn("[GitHub Sync] Runtime backups are intentionally excluded from GitHub sync.");
  return [];
}

async function collectProjectSyncFiles() {
  const exported = await readProjectContentExportFiles();
  const files: SyncFile[] = exported
    .filter((file) => file.bytes.length > 0 && file.bytes.length <= maxSyncFileBytes)
    .map((file) => ({
      absolutePath: `[postgresql:${file.repoPath}]`,
      repoPath: file.repoPath,
      size: file.bytes.length,
      bytes: file.bytes,
    }));
  files.push(...(await collectDatabaseProjectContentFiles()));
  const assetGroups = await Promise.all(getProjectAssetRoots().map((assetRoot) => walkFiles(assetRoot.absolutePath, assetRoot)));
  return [...files, ...assetGroups.flat()];
}

async function collectDatabaseProjectContentFiles(): Promise<SyncFile[]> {
  const prisma = await getPrisma();
  if (!prisma) return [];

  const [dynamicPages, weddingTemplates] = await Promise.all([
    prisma.dynamicPage.findMany({ orderBy: [{ slug: "asc" }] }),
    prisma.weddingTemplate.findMany({ orderBy: [{ sortOrder: "asc" }, { slug: "asc" }] }),
  ]);

  const exports = [
    { repoPath: "data/dynamic-pages.json", value: dynamicPages },
    { repoPath: "data/wedding-templates.json", value: weddingTemplates },
  ];

  return exports.map((file) => {
    const bytes = Buffer.from(`${JSON.stringify(file.value, null, 2)}\n`, "utf8");
    return {
      absolutePath: `[postgresql:${file.repoPath}]`,
      repoPath: file.repoPath,
      size: bytes.length,
      bytes,
    };
  }).filter((file) => file.size > 0 && file.size <= maxSyncFileBytes);
}

/**
 * Compute a hash of all file contents to detect changes before committing.
 */
export async function hashSyncFiles(files: SyncFile[]): Promise<string> {
  const hash = createHash("sha256");
  for (const file of files) {
    hash.update(file.repoPath);
    hash.update(":");
    const bytes = file.bytes ?? (await readFile(file.absolutePath));
    hash.update(bytes);
    hash.update("\n");
  }
  return hash.digest("hex");
}

function branchRefPath(branch: string) {
  return branch.split("/").map(encodeURIComponent).join("/");
}

function repoContentPath(repoPath: string) {
  return repoPath.split("/").map(encodeURIComponent).join("/");
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

export function formatBackupRepoPath(fileName: string, createdAt: Date) {
  const year = String(createdAt.getUTCFullYear());
  const month = String(createdAt.getUTCMonth() + 1).padStart(2, "0");
  return `backups/${year}/${month}/${fileName}`;
}

function buildGitHubBlobUrl(config: SyncConfig, repoPath: string) {
  return `https://github.com/${config.repo.owner}/${config.repo.repo}/blob/${encodeURIComponent(config.branch).replace(/%2F/g, "/")}/${repoPath}`;
}

function backupTimestampFromPath(repoPath: string) {
  const match = repoPath.match(/(\d{8}T\d{6}Z)\.json(?:\.gz)?$/i);
  if (!match) return 0;
  const stamp = match[1];
  const iso = `${stamp.slice(0, 4)}-${stamp.slice(4, 6)}-${stamp.slice(6, 8)}T${stamp.slice(9, 11)}:${stamp.slice(11, 13)}:${stamp.slice(13, 15)}Z`;
  const time = Date.parse(iso);
  return Number.isNaN(time) ? 0 : time;
}

export type GitHubBackupDiscoveryResult = {
  fileName: string;
  commitSha: string;
  repoPath: string;
  createdAt: Date;
};

export async function findLatestBackupOnGitHub(): Promise<GitHubBackupDiscoveryResult | null> {
  const config = getSyncConfig();
  if (!config) return null;

  const { owner, repo } = config.repo;

  try {
    const ref = await githubRequest<GitHubRef>(
      `/repos/${owner}/${repo}/git/ref/heads/${branchRefPath(config.branch)}`,
      { method: "GET" },
      config.token,
    );

    const headCommit = await githubRequest<GitHubCommit>(
      `/repos/${owner}/${repo}/git/commits/${ref.object.sha}`,
      { method: "GET" },
      config.token,
    );

    const tree = await githubRequest<GitHubRecursiveTree>(
      `/repos/${owner}/${repo}/git/trees/${headCommit.tree.sha}?recursive=1`,
      { method: "GET" },
      config.token,
    );

    if (tree.truncated) {
      console.warn("[findLatestBackupOnGitHub] Tree truncated, result may be incomplete");
    }

    const backupFiles = tree.tree
      .filter((entry) => entry.type === "blob" && entry.path.startsWith("backups/"))
      .sort((a, b) => {
        const timeDiff = backupTimestampFromPath(b.path) - backupTimestampFromPath(a.path);
        return timeDiff !== 0 ? timeDiff : b.path.localeCompare(a.path);
      });

    const latest = backupFiles[0];
    if (!latest || !latest.sha) return null;

    const pathParts = latest.path.replace(/\.gz$/, "").split("/");
    const fileName = pathParts[pathParts.length - 1];

    const match = latest.path.match(/(\d{8}T\d{6}Z)\.json(?:\.gz)?$/i);
    const stamp = match?.[1];
    let createdAt = new Date();
    if (stamp) {
      const iso = `${stamp.slice(0, 4)}-${stamp.slice(4, 6)}-${stamp.slice(6, 8)}T${stamp.slice(9, 11)}:${stamp.slice(11, 13)}:${stamp.slice(13, 15)}Z`;
      const parsed = Date.parse(iso);
      if (!Number.isNaN(parsed)) {
        createdAt = new Date(parsed);
      }
    }

    return {
      fileName,
      commitSha: headCommit.sha,
      repoPath: latest.path,
      createdAt,
    };
  } catch (error) {
    console.error("[findLatestBackupOnGitHub]", error instanceof Error ? error.message : String(error));
    return null;
  }
}

async function pruneOldRuntimeBackups(config: SyncConfig, keepLast: number) {
  const { owner, repo } = config.repo;
  const ref = await githubRequest<GitHubRef>(`/repos/${owner}/${repo}/git/ref/heads/${branchRefPath(config.branch)}`, { method: "GET" }, config.token);
  const headCommit = await githubRequest<GitHubCommit>(`/repos/${owner}/${repo}/git/commits/${ref.object.sha}`, { method: "GET" }, config.token);
  const tree = await githubRequest<GitHubRecursiveTree>(
    `/repos/${owner}/${repo}/git/trees/${headCommit.tree.sha}?recursive=1`,
    { method: "GET" },
    config.token,
  );

  const backupFiles = tree.tree
    .filter((entry) => entry.type === "blob" && entry.path.startsWith("backups/") && (entry.path.endsWith(".json") || entry.path.endsWith(".json.gz")))
    .sort((a, b) => {
      const timeDiff = backupTimestampFromPath(b.path) - backupTimestampFromPath(a.path);
      return timeDiff !== 0 ? timeDiff : b.path.localeCompare(a.path);
    });

  for (const entry of backupFiles.slice(keepLast)) {
    const fileSha = entry.sha;
    if (!fileSha) continue;

    const encodedPath = repoContentPath(entry.path);
    await githubRequest<GitHubPutContentsResponse>(
      `/repos/${owner}/${repo}/contents/${encodedPath}`,
      {
        method: "DELETE",
        body: JSON.stringify({
          message: `chore(backup): prune runtime backup ${path.basename(entry.path)}`.slice(0, 500),
          sha: fileSha,
          branch: config.branch,
        }),
      },
      config.token,
    );
  }
}

export async function uploadRuntimeBackupToGitHub(input: {
  fileName: string;
  bytes: Buffer;
  createdAt: Date;
  reason: string;
  keepLast?: number;
}): Promise<GitHubBackupUploadResult> {
  const config = getSyncConfig();
  if (!config) {
    return {
      status: "failed",
      message: "GitHub backup variables are not configured.",
      commitSha: null,
      fileUrl: null,
      repoPath: null,
      verified: false,
    };
  }

  const { owner, repo } = config.repo;
  const repoPath = formatBackupRepoPath(input.fileName, input.createdAt);

  try {
    // Use Git Data API (blob) which supports files up to 100MB instead of Contents API (1MB limit)
    const blob = await githubRequest<GitHubBlob>(
      `/repos/${owner}/${repo}/git/blobs`,
      {
        method: "POST",
        body: JSON.stringify({
          content: input.bytes.toString("base64"),
          encoding: "base64",
        }),
      },
      config.token,
    );

    const ref = await githubRequest<GitHubRef>(
      `/repos/${owner}/${repo}/git/ref/heads/${branchRefPath(config.branch)}`,
      { method: "GET" },
      config.token,
    );

    const headCommit = await githubRequest<GitHubCommit>(
      `/repos/${owner}/${repo}/git/commits/${ref.object.sha}`,
      { method: "GET" },
      config.token,
    );

    const tree = await githubRequest<GitHubTree>(
      `/repos/${owner}/${repo}/git/trees`,
      {
        method: "POST",
        body: JSON.stringify({
          base_tree: headCommit.tree.sha,
          tree: [
            {
              path: repoPath,
              mode: "100644",
              type: "blob",
              sha: blob.sha,
            },
          ],
        }),
      },
      config.token,
    );

    const commit = await githubRequest<GitHubCreatedCommit>(
      `/repos/${owner}/${repo}/git/commits`,
      {
        method: "POST",
        body: JSON.stringify({
          message: `chore(backup): upload runtime backup ${input.fileName}\n\n${input.reason}`.slice(0, 500),
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
        body: JSON.stringify({ sha: commit.sha, force: false }),
      },
      config.token,
    );

    const fileUrl = buildGitHubBlobUrl(config, repoPath);

    await pruneOldRuntimeBackups(config, input.keepLast ?? 60);

    return {
      status: "synced",
      message: "Runtime backup uploaded to GitHub via Git Data API.",
      commitSha: commit.sha,
      fileUrl,
      repoPath,
      verified: true,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown GitHub backup upload error.";
    return {
      status: "failed",
      message,
      commitSha: null,
      fileUrl: null,
      repoPath,
      verified: false,
    };
  }
}

async function createBlob(owner: string, repo: string, token: string, file: SyncFile) {
  const bytes = file.bytes ?? (await readFile(file.absolutePath).catch((error: unknown) => {
    console.warn(`[GitHub Sync] Skipping missing/unreadable file: ${file.repoPath}`, error);
    return null;
  }));
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

  if (!options.uploadProjectFiles) {
    return {
      startedAt,
      status: "skipped",
      message: "Runtime backups are intentionally not uploaded to GitHub.",
      duration: Date.now() - startedAt,
    };
  }

  const files = options.uploadProjectFiles ? await collectProjectSyncFiles() : await collectSyncFiles();
  if (!files.length) {
    return {
      startedAt,
      status: "skipped",
      message: "No project content files found to sync.",
      duration: Date.now() - startedAt,
    };
  }

  const { owner, repo } = config.repo;
  const ref = await githubRequest<GitHubRef>(`/repos/${owner}/${repo}/git/ref/heads/${branchRefPath(config.branch)}`, { method: "GET" }, config.token);
  const headCommit = await githubRequest<GitHubCommit>(`/repos/${owner}/${repo}/git/commits/${ref.object.sha}`, { method: "GET" }, config.token);
  console.log("[GitHub Project Content] GitHub Upload Started");
  const treeItems: NonNullable<Awaited<ReturnType<typeof createBlob>>>[] = [];
  for (const file of files) {
    const item = await createBlob(owner, repo, config.token, file);
    if (item) treeItems.push(item);
  }
  if (!treeItems.length) {
    return {
      startedAt,
      status: "skipped",
      message: "No readable project content files found to sync.",
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
      message: "GitHub already has the latest project content.",
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
        message: `chore(content): sync project content\n\n${reason}`.slice(0, 500),
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
    message: "Project content files uploaded to GitHub.",
    commitUrl: commit.html_url,
    commitSha: commit.sha,
    files: treeItems.length,
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
