import { NextRequest, NextResponse } from "next/server";
import { ADMIN_SESSION_COOKIE, verifyAdminSessionCookie } from "@/lib/admin-session";
import { getSyncConfig, githubRequest, branchRefPath } from "@/lib/github-sync";
import { readGitHubBlobBySha } from "@/lib/github-content";
import type { BackupDisplayRow } from "@/lib/backup-display";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BACKUP_PREFIXES: Record<string, string> = {
  database: "backups/database/",
  uploads: "backups/uploads/",
  full: "backups/full/",
};

interface TreeEntry {
  path: string;
  type: string;
  sha?: string;
  size?: number;
}

function timestampFromPath(path: string): number {
  const m = path.match(/(\d{4})-?(\d{2})-?(\d{2})T(\d{2})-?(\d{2})-?(\d{2})/);
  if (!m) return 0;
  const iso = `${m[1]}-${m[2]}-${m[3]}T${m[4]}:${m[5]}:${m[6]}Z`;
  return Date.parse(iso) || 0;
}

function groupByBackupDir(entries: TreeEntry[], type: string): Map<string, TreeEntry[]> {
  const groups = new Map<string, TreeEntry[]>();
  const prefix = BACKUP_PREFIXES[type] || "backups/";
  for (const e of entries) {
    if (e.type !== "blob") continue;
    let dir = prefix;
    if (type === "uploads") {
      const match = e.path.match(/^(backups\/uploads\/\d{4}\/\d{2}\/backup-[^/]+)/);
      if (match) dir = match[1];
    } else if (type === "full") {
      const match = e.path.match(/^(backups\/full\/[^/]+)/);
      if (match) dir = match[1];
    } else {
      dir = prefix;
    }
    const existing = groups.get(dir) || [];
    existing.push(e);
    groups.set(dir, existing);
  }
  return groups;
}

async function readManifest(entries: TreeEntry[]): Promise<Record<string, unknown> | null> {
  const manifestEntry = entries.find((e) => e.path.endsWith("/manifest.json.gz"));
  if (!manifestEntry?.sha) return null;
  try {
    const buf = await readGitHubBlobBySha(manifestEntry.sha);
    if (!buf) return null;
    const gunzip = (await import("zlib")).gunzipSync;
    const text = gunzip(buf).toString("utf8");
    return JSON.parse(text);
  } catch {
    return null;
  }
}

async function getBackupRows(type: string): Promise<BackupDisplayRow[]> {
  const config = getSyncConfig();
  if (!config) return [];
  const { owner, repo } = config.repo;

  try {
    const ref = await githubRequest<{ object: { sha: string } }>(
      `/repos/${owner}/${repo}/git/ref/heads/${branchRefPath(config.branch)}`,
      { method: "GET" }, config.token,
    );
    const headCommit = await githubRequest<{ tree: { sha: string } }>(
      `/repos/${owner}/${repo}/git/commits/${ref.object.sha}`,
      { method: "GET" }, config.token,
    );
    const tree = await githubRequest<{ tree: TreeEntry[] }>(
      `/repos/${owner}/${repo}/git/trees/${headCommit.tree.sha}?recursive=1`,
      { method: "GET" }, config.token,
    );

    const prefix = BACKUP_PREFIXES[type] || "backups/";
    const relevant = tree.tree.filter((e) => e.type === "blob" && e.path.startsWith(prefix));
    const groups = groupByBackupDir(relevant, type);

    const rows: BackupDisplayRow[] = [];
    for (const [dir, entries] of groups) {
      const ts = timestampFromPath(dir);
      const manifest = await readManifest(entries);

      const manifestBlob = entries.find((e) => e.path.endsWith("/manifest.json.gz"));
      const fileBlobs = (manifest?.fileBlobs as Record<string, string>) || {};
      const fileCount = Object.keys(fileBlobs).length;

      const totalSize = entries.reduce((sum, e) => sum + (e.size || 0), 0);
      const manifestSize = manifestBlob?.size || 0;

      const nameParts = dir.replace(/\.gz$/, "").split("/");
      const fileName = nameParts[nameParts.length - 1] || dir;

      const recordCounts: Record<string, number> = {};
      if (manifest?.type === "full" || type === "database") {
        const rd = (manifest as Record<string, unknown>)?.runtimeData as Record<string, unknown[]> | undefined;
        if (rd) {
          for (const [key, val] of Object.entries(rd)) {
            if (Array.isArray(val)) recordCounts[key] = val.length;
          }
        }
      }

      rows.push({
        id: dir,
        type,
        status: "SUCCESS",
        createdAt: new Date(ts || Date.now()).toISOString(),
        durationMs: null,
        sizeBytes: totalSize,
        compressedSizeBytes: manifestSize,
        items: Object.values(recordCounts).reduce((a, b) => a + b, 0),
        uploadsCount: fileCount,
        uploadsSizeBytes: totalSize,
        commitSha: ref.object.sha,
        repoPath: dir,
        fileName,
        error: null,
        recordCounts,
      });
    }

    rows.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return rows;
  } catch {
    return [];
  }
}

export async function GET(request: NextRequest) {
  if (!(await verifyAdminSessionCookie(request.cookies.get(ADMIN_SESSION_COOKIE)?.value))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const type = request.nextUrl.searchParams.get("type");
  const all = request.nextUrl.searchParams.get("all") === "true";

  try {
    if (all) {
      const [database, uploads, full] = await Promise.all([
        getBackupRows("database"),
        getBackupRows("uploads"),
        getBackupRows("full"),
      ]);
      return NextResponse.json({ backups: { database, uploads, full } });
    }

    if (type && BACKUP_PREFIXES[type]) {
      const rows = await getBackupRows(type);
      return NextResponse.json({ backups: rows });
    }

    return NextResponse.json({ error: "Provide ?type=database|uploads|full or ?all=true" }, { status: 400 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    );
  }
}
