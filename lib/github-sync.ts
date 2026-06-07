import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";

type GitHubSyncStatus = "synced" | "skipped" | "unchanged" | "failed";

export type GitHubSyncResult = {
  status: GitHubSyncStatus;
  message: string;
  commitUrl?: string;
  files?: number;
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

const syncRoots = ["data", path.join("public", "uploads")];
const maxSyncFileBytes = 90 * 1024 * 1024;

function parseRepo(value: string) {
  const clean = value.trim().replace(/^https:\/\/github\.com\//i, "").replace(/\.git$/i, "").replace(/^\/+|\/+$/g, "");
  const [owner, repo] = clean.split("/");
  return owner && repo ? { owner, repo } : null;
}

function getSyncConfig() {
  if (process.env.GITHUB_SYNC_ENABLED === "false") return null;

  const token = process.env.GITHUB_SYNC_TOKEN || process.env.BACKUP_GITHUB_TOKEN || "";
  const repo = parseRepo(process.env.GITHUB_SYNC_REPO || process.env.BACKUP_GITHUB_REPO || "");
  const branch = process.env.GITHUB_SYNC_BRANCH || process.env.RAILWAY_GIT_BRANCH || "main";

  if (!token || !repo || !branch) return null;
  return { token, repo, branch };
}

export function getGitHubSyncReadiness() {
  if (process.env.GITHUB_SYNC_ENABLED === "false") {
    return {
      configured: false,
      label: "متوقفة",
      detail: "GITHUB_SYNC_ENABLED=false",
    };
  }

  const token = process.env.GITHUB_SYNC_TOKEN || process.env.BACKUP_GITHUB_TOKEN || "";
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
  if (!(await exists(dir))) return [];
  const entries = await readdir(dir, { withFileTypes: true });
  const files: SyncFile[] = [];

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await walkFiles(fullPath)));
      continue;
    }

    if (!entry.isFile()) continue;
    const fileStat = await stat(fullPath);
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
  const groups = await Promise.all(syncRoots.map((root) => walkFiles(path.join(process.cwd(), root))));
  return groups.flat().sort((a, b) => a.repoPath.localeCompare(b.repoPath));
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
    throw new Error(`GitHub sync failed ${response.status}: ${body.slice(0, 300)}`);
  }

  return (await response.json()) as T;
}

async function createBlob(owner: string, repo: string, token: string, file: SyncFile) {
  const bytes = await readFile(file.absolutePath);
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

export async function syncAdminStateToGitHub(reason: string, options: { createSnapshot?: boolean } = {}): Promise<GitHubSyncResult> {
  const config = getSyncConfig();
  if (!config) {
    return {
      status: "skipped",
      message: "GitHub sync variables are not configured.",
    };
  }

  try {
    if (options.createSnapshot) {
      const { createBackupSnapshot } = await import("./backups");
      await createBackupSnapshot("admin-auto").catch((error) => console.error("Failed to create admin sync backup snapshot", error));
    }

    const files = await collectSyncFiles();
    if (!files.length) {
      return {
        status: "skipped",
        message: "No data or uploaded files found to sync.",
      };
    }

    const { owner, repo } = config.repo;
    const ref = await githubRequest<GitHubRef>(`/repos/${owner}/${repo}/git/ref/heads/${branchRefPath(config.branch)}`, { method: "GET" }, config.token);
    const headCommit = await githubRequest<GitHubCommit>(`/repos/${owner}/${repo}/git/commits/${ref.object.sha}`, { method: "GET" }, config.token);
    const treeItems = await Promise.all(files.map((file) => createBlob(owner, repo, config.token, file)));
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
        status: "unchanged",
        message: "GitHub already has the latest admin data.",
        files: files.length,
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
      status: "synced",
      message: "Admin data synced to GitHub.",
      commitUrl: commit.html_url,
      files: files.length,
    };
  } catch (error) {
    console.error("Failed to sync admin data to GitHub", error);
    return {
      status: "failed",
      message: error instanceof Error ? error.message : "Unknown GitHub sync error.",
    };
  }
}
