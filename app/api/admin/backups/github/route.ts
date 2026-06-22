import { NextRequest, NextResponse } from "next/server";
import { ADMIN_SESSION_COOKIE, verifyAdminSessionCookie } from "@/lib/admin-session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type GitHubBlobEntry = {
  path: string;
  mode: string;
  type: "blob" | "tree";
  sha: string;
  size: number;
};

type GitHubTreeResponse = {
  sha: string;
  truncated: boolean;
  tree: GitHubBlobEntry[];
};

type CommitResponse = {
  sha: string;
  tree: { sha: string };
};

type RefResponse = {
  object: { sha: string };
};

type BackupEntry = {
  fileName: string;
  repoPath: string;
  sha: string;
  size: number;
  createdAt: string;
  type: string;
};

function normalizeGitHubToken(value: string | undefined): string {
  if (!value) return "";
  const t = value.trim().replace(/[\u200B-\u200D\uFEFF\r\n\t ]+/g, "");
  const m = t.match(/^(?:GITHUB_SYNC_TOKEN|GITHUB_TOKEN|GH_TOKEN)=(.+)$/);
  return m ? m[1] : t;
}

function getToken(): string | null {
  const candidates = ["GITHUB_SYNC_TOKEN", "GITHUB_TOKEN", "GH_TOKEN"] as const;
  for (const key of candidates) {
    const v = normalizeGitHubToken(process.env[key]);
    if (v) return v;
  }
  return null;
}

function parseRepo(raw: string): { owner: string; repo: string } | null {
  const clean = raw.trim()
    .replace(/^https:\/\/github\.com\//i, "")
    .replace(/\.git$/i, "")
    .replace(/^\/+|\/+$/g, "");
  const parts = clean.split("/");
  if (parts.length >= 2) return { owner: parts[0], repo: parts[1] };
  return null;
}

function backupTimestampFromPath(repoPath: string): number {
  const match = repoPath.match(/(\d{8}T\d{6}Z)\.json(?:\.gz)?$/i);
  if (!match) return 0;
  const stamp = match[1];
  const iso = `${stamp.slice(0, 4)}-${stamp.slice(4, 6)}-${stamp.slice(6, 8)}T${stamp.slice(9, 11)}:${stamp.slice(11, 13)}:${stamp.slice(13, 15)}Z`;
  const time = Date.parse(iso);
  return Number.isNaN(time) ? 0 : time;
}

function formatBackupDate(stamp: string): string {
  const iso = `${stamp.slice(0, 4)}-${stamp.slice(4, 6)}-${stamp.slice(6, 8)}T${stamp.slice(9, 11)}:${stamp.slice(11, 13)}:${stamp.slice(13, 15)}Z`;
  return iso;
}

async function isAdmin(request: NextRequest) {
  return verifyAdminSessionCookie(request.cookies.get(ADMIN_SESSION_COOKIE)?.value);
}

export async function GET(request: NextRequest) {
  if (!(await isAdmin(request))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const token = getToken();
  const rawRepo = process.env.GITHUB_SYNC_REPO || "";
  const repo = parseRepo(rawRepo);
  const branch = process.env.GITHUB_SYNC_BRANCH || process.env.RAILWAY_GIT_BRANCH || "main";

  if (!token || !repo) {
    return NextResponse.json({ backups: [], totalSize: 0, error: "GitHub sync not configured" });
  }

  const { owner, repo: repoName } = repo;
  const branchEncoded = branch.split("/").map(encodeURIComponent).join("/");

  try {
    const refRes = await fetch(
      `https://api.github.com/repos/${owner}/${repoName}/git/ref/heads/${branchEncoded}`,
      {
        headers: {
          Accept: "application/vnd.github+json",
          Authorization: `Bearer ${token}`,
          "X-GitHub-Api-Version": "2022-11-28",
        },
      },
    );
    if (!refRes.ok) {
      const body = await refRes.text().catch(() => "");
      return NextResponse.json({ backups: [], totalSize: 0, error: `GitHub ref failed: ${refRes.status}` });
    }
    const ref = (await refRes.json()) as RefResponse;

    const commitRes = await fetch(
      `https://api.github.com/repos/${owner}/${repoName}/git/commits/${ref.object.sha}`,
      {
        headers: {
          Accept: "application/vnd.github+json",
          Authorization: `Bearer ${token}`,
          "X-GitHub-Api-Version": "2022-11-28",
        },
      },
    );
    if (!commitRes.ok) {
      return NextResponse.json({ backups: [], totalSize: 0, error: "Failed to get commit" });
    }
    const commit = (await commitRes.json()) as CommitResponse;

    const treeRes = await fetch(
      `https://api.github.com/repos/${owner}/${repoName}/git/trees/${commit.tree.sha}?recursive=1`,
      {
        headers: {
          Accept: "application/vnd.github+json",
          Authorization: `Bearer ${token}`,
          "X-GitHub-Api-Version": "2022-11-28",
        },
      },
    );
    if (!treeRes.ok) {
      return NextResponse.json({ backups: [], totalSize: 0, error: "Failed to get tree" });
    }
    const tree = (await treeRes.json()) as GitHubTreeResponse;

    const backupFiles = tree.tree
      .filter((entry) => entry.type === "blob" && entry.path.startsWith("backups/") && entry.path.endsWith(".json.gz"))
      .sort((a, b) => {
        const timeDiff = backupTimestampFromPath(b.path) - backupTimestampFromPath(a.path);
        return timeDiff !== 0 ? timeDiff : b.path.localeCompare(a.path);
      });

    const backups: BackupEntry[] = backupFiles.map((entry) => {
      const pathParts = entry.path.replace(/\.gz$/, "").split("/");
      const fileName = pathParts[pathParts.length - 1];
      const match = entry.path.match(/(\d{8}T\d{6}Z)\.json(?:\.gz)?$/i);
      const stamp = match?.[1] || "";
      const createdAt = stamp ? formatBackupDate(stamp) : new Date().toISOString();
      const type = extractBackupType(fileName);

      return {
        fileName,
        repoPath: entry.path,
        sha: entry.sha,
        size: entry.size,
        createdAt,
        type,
      };
    });

    const totalSize = backups.reduce((sum, b) => sum + b.size, 0);

    return NextResponse.json({
      backups,
      totalSize,
      commitSha: ref.object.sha,
    });
  } catch (error) {
    return NextResponse.json(
      { backups: [], totalSize: 0, error: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    );
  }
}

function extractBackupType(fileName: string): string {
  if (fileName.startsWith("scheduled-")) return "scheduled";
  if (fileName.startsWith("manual-")) return "manual";
  if (fileName.startsWith("verify-")) return "verify";
  if (fileName.startsWith("storage-cleanup-orphans-")) return "storage-cleanup-orphans";
  if (fileName.startsWith("storage-cleanup-duplicates-")) return "storage-cleanup-duplicates";
  if (fileName.startsWith("storage-cleanup-")) return "storage-cleanup";
  return "unknown";
}
