import { createHash } from "crypto";

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

export type ContentFile = {
  repoPath: string;
  bytes: Buffer;
};

export type GitHubCommitResult = {
  success: boolean;
  commitSha: string | null;
  commitUrl: string | null;
  message: string;
};

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
  };
}

function parseRepo(value: string) {
  const clean = value.trim().replace(/^https:\/\/github\.com\//i, "").replace(/\.git$/i, "").replace(/^\/+|\/+$/g, "");
  const [owner, repo] = clean.split("/");
  return owner && repo ? { owner, repo } : null;
}

function getGitHubConfig() {
  const { token } = getGitHubTokenConfig();
  const rawRepo = process.env.GITHUB_SYNC_REPO || "";
  const repoInfo = parseRepo(rawRepo);
  const branch = process.env.GITHUB_SYNC_BRANCH || process.env.RAILWAY_GIT_BRANCH || "main";

  if (!token || !repoInfo || !branch) return null;
  return { token, repo: repoInfo, branch };
}

function branchRefPath(branch: string) {
  return branch.split("/").map(encodeURIComponent).join("/");
}

function repoContentPath(repoPath: string) {
  return repoPath.split("/").map(encodeURIComponent).join("/");
}

class GitHubHttpError extends Error {
  status: number;
  body: string;

  constructor(status: number, body: string) {
    super(`GitHub request failed ${status}: ${body.slice(0, 300)}`);
    this.name = "GitHubHttpError";
    this.status = status;
    this.body = body;
  }
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
    throw new GitHubHttpError(response.status, body);
  }

  return (await response.json()) as T;
}

async function createBlob(owner: string, repo: string, token: string, file: ContentFile) {
  const blob = await githubRequest<GitHubBlob>(
    `/repos/${owner}/${repo}/git/blobs`,
    {
      method: "POST",
      body: JSON.stringify({
        content: file.bytes.toString("base64"),
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

export async function commitContentFiles(files: ContentFile[], message: string): Promise<GitHubCommitResult> {
  const config = getGitHubConfig();
  if (!config) {
    return {
      success: false,
      commitSha: null,
      commitUrl: null,
      message: "GitHub sync variables are not configured.",
    };
  }

  const { token, repo: repoInfo, branch } = config;
  const { owner, repo } = repoInfo;

  try {
    // Get current branch reference
    const ref = await githubRequest<GitHubRef>(
      `/repos/${owner}/${repo}/git/ref/heads/${branchRefPath(branch)}`,
      { method: "GET" },
      token,
    );

    // Get current commit
    const headCommit = await githubRequest<GitHubCommit>(
      `/repos/${owner}/${repo}/git/commits/${ref.object.sha}`,
      { method: "GET" },
      token,
    );

    console.log(`[GitHub Content] Creating blobs for ${files.length} files`);
    const treeItems: NonNullable<Awaited<ReturnType<typeof createBlob>>>[] = [];
    for (const file of files) {
      const item = await createBlob(owner, repo, token, file);
      treeItems.push(item);
    }

    if (!treeItems.length) {
      return {
        success: false,
        commitSha: null,
        commitUrl: null,
        message: "No files to commit.",
      };
    }

    // Create new tree
    const tree = await githubRequest<GitHubTree>(
      `/repos/${owner}/${repo}/git/trees`,
      {
        method: "POST",
        body: JSON.stringify({
          base_tree: headCommit.tree.sha,
          tree: treeItems,
        }),
      },
      token,
    );

    // Check if tree changed
    if (tree.sha === headCommit.tree.sha) {
      return {
        success: true,
        commitSha: ref.object.sha,
        commitUrl: `https://github.com/${owner}/${repo}/commit/${ref.object.sha}`,
        message: "No changes detected (tree unchanged).",
      };
    }

    // Create commit
    const commit = await githubRequest<GitHubCreatedCommit>(
      `/repos/${owner}/${repo}/git/commits`,
      {
        method: "POST",
        body: JSON.stringify({
          message: message.slice(0, 500),
          tree: tree.sha,
          parents: [ref.object.sha],
        }),
      },
      token,
    );

    // Update branch reference
    await githubRequest(
      `/repos/${owner}/${repo}/git/refs/heads/${branchRefPath(branch)}`,
      {
        method: "PATCH",
        body: JSON.stringify({
          sha: commit.sha,
          force: false,
        }),
      },
      token,
    );

    console.log(`[GitHub Content] Committed ${files.length} files: ${commit.sha}`);
    return {
      success: true,
      commitSha: commit.sha,
      commitUrl: commit.html_url || `https://github.com/${owner}/${repo}/commit/${commit.sha}`,
      message: `Successfully committed ${files.length} files.`,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown GitHub error";
    console.error(`[GitHub Content] Failed to commit:`, errorMessage);
    return {
      success: false,
      commitSha: null,
      commitUrl: null,
      message: errorMessage,
    };
  }
}

export async function readGitHubFileAtCommit(repoPath: string, commitSha: string): Promise<Buffer | null> {
  const config = getGitHubConfig();
  if (!config) return null;

  const { token, repo: repoInfo } = config;
  const { owner, repo } = repoInfo;

  try {
    const data = await githubRequest<{ content: string; encoding: string }>(
      `/repos/${owner}/${repo}/contents/${repoContentPath(repoPath)}?ref=${commitSha}`,
      { method: "GET" },
      token,
    );

    if (data.encoding === "base64" && data.content) {
      return Buffer.from(data.content, "base64");
    }
    return null;
  } catch {
    return null;
  }
}

export async function downloadContentFromGitHubCommit(commitSha: string): Promise<Record<string, unknown> | null> {
  const { getProjectContentDefinitions } = await import("./project-content-store");
  const definitions = getProjectContentDefinitions();
  const result: Record<string, unknown> = {};

  for (const def of definitions) {
    const bytes = await readGitHubFileAtCommit(def.repoPath, commitSha);
    if (!bytes) continue;
    try {
      const parsed = JSON.parse(bytes.toString("utf8"));
      result[def.key] = parsed;
    } catch {
      console.warn(`[GitHub Content Read] Failed to parse ${def.repoPath} at ${commitSha}`);
    }
  }

  return Object.keys(result).length > 0 ? result : null;
}

export function getGitHubContentReadiness() {
  const config = getGitHubConfig();
  if (!config) {
    return {
      configured: false,
      label: "غير مكتملة",
      detail: "ناقص: Token / Repo / Branch",
    };
  }

  return {
    configured: true,
    label: "جاهزة",
    detail: `${config.repo.owner}/${config.repo.repo} - ${config.branch}`,
  };
}
