import { createHash } from "node:crypto";
import { spawn } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { PrismaClient } from "@prisma/client";

const root = process.cwd();
const markerPath = path.join(root, "data", ".auto-restore-from-github-restored");
const backupRepoPath = String(process.env.GITHUB_BACKUP_REPO_PATH || "backups").replace(/^\/+|\/+$/g, "") || "backups";
const requiredRestoreFlag = process.env.AUTO_RESTORE_FROM_GITHUB === "true";
const requiredEmptyFlag = process.env.AUTO_RESTORE_ONLY_IF_DB_EMPTY === "true";

const operationalModels = [
  "adminUser",
  "customer",
  "weddingTemplate",
  "invitation",
  "guestRsvp",
  "orderRequest",
  "analyticsEvent",
  "dynamicPage",
  "guestBookMessage",
  "coupleMessagesSetting",
  "clientMessage",
  "invitationCheckIn",
  "weddingLiveMode",
  "internalNote",
  "auditLog",
];

function cleanEnvValue(value) {
  return String(value || "")
    .trim()
    .replace(/^["']|["']$/g, "")
    .replace(/^database_url=/i, "")
    .replace(/^DATABASE_URL=/, "")
    .trim();
}

function getDatabaseUrl() {
  const direct = [
    process.env.DATABASE_URL,
    process.env.POSTGRES_PRISMA_URL,
    process.env.POSTGRES_URL,
    process.env.DATABASE_PRIVATE_URL,
    process.env.DATABASE_PUBLIC_URL,
  ]
    .map(cleanEnvValue)
    .find((value) => /^postgres(?:ql)?:\/\//i.test(value));

  if (direct) return direct;

  const host = cleanEnvValue(process.env.PGHOST);
  const port = cleanEnvValue(process.env.PGPORT) || "5432";
  const user = cleanEnvValue(process.env.PGUSER);
  const password = cleanEnvValue(process.env.PGPASSWORD);
  const database = cleanEnvValue(process.env.PGDATABASE);
  if (!host || !user || !password || !database) return "";

  const url = new URL(`postgresql://${host}:${port}/${database}`);
  url.username = user;
  url.password = password;
  url.searchParams.set("schema", "public");
  return url.toString();
}

function normalizeGitHubToken(value) {
  if (!value) return "";
  let token = String(value).trim().replace(/[\u200B-\u200D\uFEFF\r\n\t ]+/g, "");
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

function parseRepo(value) {
  const clean = String(value || "")
    .trim()
    .replace(/^https:\/\/github\.com\//i, "")
    .replace(/\.git$/i, "")
    .replace(/^\/+|\/+$/g, "");
  const [owner, repo] = clean.split("/");
  return owner && repo ? { owner, repo } : null;
}

function getGitHubConfig() {
  const token = normalizeGitHubToken(process.env.GITHUB_SYNC_TOKEN || process.env.BACKUP_GITHUB_TOKEN || process.env.GITHUB_TOKEN || process.env.GH_TOKEN);
  const repo = parseRepo(process.env.GITHUB_SYNC_REPO || process.env.BACKUP_GITHUB_REPO || "");
  const branch = process.env.GITHUB_SYNC_BRANCH || process.env.RAILWAY_GIT_BRANCH || "main";
  if (!token || !repo || !branch) return null;
  return { token, repo, branch };
}

function branchRefPath(branch) {
  return branch.split("/").map(encodeURIComponent).join("/");
}

async function githubRequest(pathName, init, token) {
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
    throw new Error(`GitHub auto-restore request failed ${response.status}: ${body.slice(0, 300)}`);
  }

  return await response.json();
}

function backupTimeFromPath(repoPath) {
  const match = repoPath.match(/(\d{8}T\d{6}Z)/);
  if (!match) return 0;
  const value = match[1];
  const iso = `${value.slice(0, 4)}-${value.slice(4, 6)}-${value.slice(6, 8)}T${value.slice(9, 11)}:${value.slice(11, 13)}:${value.slice(13, 15)}Z`;
  const time = Date.parse(iso);
  return Number.isFinite(time) ? time : 0;
}

async function fetchLatestGitHubBackup(config) {
  const { owner, repo } = config.repo;
  const ref = await githubRequest(`/repos/${owner}/${repo}/git/ref/heads/${branchRefPath(config.branch)}`, { method: "GET" }, config.token);
  const commit = await githubRequest(`/repos/${owner}/${repo}/git/commits/${ref.object.sha}`, { method: "GET" }, config.token);
  const tree = await githubRequest(`/repos/${owner}/${repo}/git/trees/${commit.tree.sha}?recursive=1`, { method: "GET" }, config.token);
  const prefix = `${backupRepoPath}/`;
  const backups = tree.tree
    .filter((item) => {
      if (item.type !== "blob" || !item.path.startsWith(prefix) || !item.path.endsWith(".json")) return false;
      const relativePath = item.path.slice(prefix.length);
      return Boolean(relativePath) && !relativePath.includes("/") && backupTimeFromPath(item.path) > 0;
    })
    .sort((a, b) => backupTimeFromPath(b.path) - backupTimeFromPath(a.path) || b.path.localeCompare(a.path));

  for (const backup of backups) {
    try {
      const blob = await githubRequest(`/repos/${owner}/${repo}/git/blobs/${backup.sha}`, { method: "GET" }, config.token);
      if (blob.encoding !== "base64" || !blob.content) {
        console.warn(`[Auto Restore] Skipping non-base64 GitHub backup candidate: ${backup.path}`);
        continue;
      }

      const jsonBytes = Buffer.from(String(blob.content).replace(/\n/g, ""), "base64");
      const payload = JSON.parse(jsonBytes.toString("utf8"));
      const candidate = {
        path: backup.path,
        sha: backup.sha,
        size: backup.size,
        jsonBytes,
        payload,
      };
      validateBackupPayload(candidate);
      return candidate;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error || "Unknown validation error");
      console.warn(`[Auto Restore] Skipping invalid GitHub backup candidate: ${backup.path}. ${message}`);
    }
  }

  return null;
}

function validateBackupPayload(backup) {
  const dump = backup.payload?.postgresDump;
  if (backup.payload?.source !== "database") {
    throw new Error(`Latest GitHub backup is not a database backup: ${backup.path}`);
  }
  if (!dump || dump.encoding !== "base64" || dump.tool !== "pg_dump" || dump.format !== "custom" || !dump.base64) {
    throw new Error(`Latest GitHub backup does not contain a valid PostgreSQL dump: ${backup.path}`);
  }

  const dumpBytes = Buffer.from(String(dump.base64), "base64");
  if (!dumpBytes.length) {
    throw new Error(`PostgreSQL dump is empty: ${backup.path}`);
  }
  if (Number(dump.sizeBytes) && Number(dump.sizeBytes) !== dumpBytes.length) {
    throw new Error(`PostgreSQL dump size mismatch: ${backup.path}`);
  }
  if (dump.sha256) {
    const sha256 = createHash("sha256").update(dumpBytes).digest("hex");
    if (sha256 !== dump.sha256) {
      throw new Error(`PostgreSQL dump sha256 mismatch: ${backup.path}`);
    }
  }

  return {
    dumpBytes,
    dumpFileName: /^[a-z0-9._-]+\.dump$/i.test(dump.fileName || "") ? dump.fileName : "backup.dump",
  };
}

async function getOperationalCounts(prisma) {
  const counts = {};
  for (const model of operationalModels) {
    counts[model] = await prisma[model].count();
  }
  return counts;
}

function totalOperationalRows(counts) {
  return Object.values(counts).reduce((sum, count) => sum + Number(count || 0), 0);
}

async function runPgRestore(dumpBytes, dumpFileName, databaseUrl) {
  const tempDir = await mkdtemp(path.join(tmpdir(), "badrdaawa-auto-restore-"));
  const dumpPath = path.join(tempDir, dumpFileName);

  try {
    await writeFile(dumpPath, dumpBytes);
    await new Promise((resolve, reject) => {
      const child = spawn(
        "pg_restore",
        [
          "--clean",
          "--if-exists",
          "--no-owner",
          "--no-privileges",
          "--single-transaction",
          "--exit-on-error",
          dumpPath,
        ],
        { env: { ...process.env, PGDATABASE: databaseUrl }, stdio: ["ignore", "inherit", "pipe"] },
      );
      const stderr = [];
      child.stderr.on("data", (chunk) => stderr.push(chunk));
      child.on("error", (error) => reject(new Error(`pg_restore failed to start: ${error.message}`)));
      child.on("close", (code) => {
        const errorOutput = Buffer.concat(stderr).toString("utf8").trim();
        if (code === 0) resolve();
        else reject(new Error(`pg_restore exited with code ${code}${errorOutput ? `: ${errorOutput}` : ""}`));
      });
    });
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
}

async function assertPgRestoreAvailable() {
  await new Promise((resolve, reject) => {
    const child = spawn("pg_restore", ["--version"], { stdio: ["ignore", "pipe", "pipe"] });
    const stdout = [];
    const stderr = [];
    child.stdout.on("data", (chunk) => stdout.push(chunk));
    child.stderr.on("data", (chunk) => stderr.push(chunk));
    child.on("error", (error) => reject(new Error(`pg_restore is required for auto restore but is not available: ${error.message}`)));
    child.on("close", (code) => {
      const output = Buffer.concat([...stdout, ...stderr]).toString("utf8").trim().split("\n")[0] || "";
      if (code === 0) {
        console.log(`[Auto Restore] pg_restore is available: ${output || "version detected"}`);
        resolve();
        return;
      }
      reject(new Error(`pg_restore is required for auto restore but exited with code ${code}${output ? `: ${output}` : ""}`));
    });
  });
}

async function recordRestoreSuccess(databaseUrl, backup, startedAt, jsonSizeBytes) {
  const prisma = new PrismaClient({ datasources: { db: { url: databaseUrl } } });
  try {
    await prisma.backupJob.create({
      data: {
        type: "auto-restore-github",
        status: "SUCCESS",
        fileName: path.basename(backup.path),
        githubSha: backup.sha,
        sizeBytes: BigInt(jsonSizeBytes),
        startedAt,
        finishedAt: new Date(),
      },
    });
    await prisma.syncLog.create({
      data: {
        reason: `Auto restore from GitHub backup: ${backup.path}`,
        status: "completed",
        filesCount: 1,
        commitSha: backup.sha,
        duration: Date.now() - startedAt.getTime(),
      },
    });
  } catch (error) {
    console.error("[Auto Restore] Restore succeeded but database logging failed.", error);
  } finally {
    await prisma.$disconnect();
  }
}

async function recordRestoreFailure(databaseUrl, startedAt, message) {
  const prisma = new PrismaClient({ datasources: { db: { url: databaseUrl } } });
  try {
    await prisma.backupJob.create({
      data: {
        type: "auto-restore-github",
        status: "FAILED",
        startedAt,
        finishedAt: new Date(),
        error: message.slice(0, 5000),
      },
    });
    await prisma.syncLog.create({
      data: {
        reason: "Auto restore from GitHub backup",
        status: "failed",
        errorMessage: message.slice(0, 5000),
        duration: Date.now() - startedAt.getTime(),
      },
    });
  } catch (error) {
    console.error("[Auto Restore] Failed to write failure logs.", error);
  } finally {
    await prisma.$disconnect();
  }
}

async function main() {
  if (!requiredRestoreFlag || !requiredEmptyFlag) {
    console.log("[Auto Restore] Skipped. AUTO_RESTORE_FROM_GITHUB and AUTO_RESTORE_ONLY_IF_DB_EMPTY must both be true.");
    return;
  }

  const databaseUrl = getDatabaseUrl();
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required for GitHub auto restore.");
  }

  const config = getGitHubConfig();
  if (!config) {
    throw new Error("GitHub backup repository variables are required for auto restore.");
  }

  const startedAt = new Date();
  const prisma = new PrismaClient({ datasources: { db: { url: databaseUrl } } });
  try {
    const counts = await getOperationalCounts(prisma);
    const rows = totalOperationalRows(counts);
    if (rows > 0) {
      console.log(`[Auto Restore] Skipped. PostgreSQL already contains operational data (${rows} row(s)).`);
      return;
    }
  } finally {
    await prisma.$disconnect();
  }

  console.log("[Auto Restore] Database is empty. Fetching latest GitHub backup.");
  const backup = await fetchLatestGitHubBackup(config);
  if (!backup) {
    console.warn(`[Auto Restore] Skipped. No valid top-level database backups were found under ${backupRepoPath}/.`);
    return;
  }

  const { dumpBytes, dumpFileName } = validateBackupPayload(backup);
  await assertPgRestoreAvailable();

  const verifyPrisma = new PrismaClient({ datasources: { db: { url: databaseUrl } } });
  try {
    const counts = await getOperationalCounts(verifyPrisma);
    const rows = totalOperationalRows(counts);
    if (rows > 0) {
      console.log(`[Auto Restore] Skipped. PostgreSQL received operational data before restore (${rows} row(s)).`);
      return;
    }
  } finally {
    await verifyPrisma.$disconnect();
  }

  try {
    console.log(`[Auto Restore] Restoring PostgreSQL from GitHub backup: ${backup.path}`);
    await runPgRestore(dumpBytes, dumpFileName, databaseUrl);
    await recordRestoreSuccess(databaseUrl, backup, startedAt, backup.jsonBytes.length);
    await writeFile(markerPath, `${JSON.stringify({ restoredAt: new Date().toISOString(), backupPath: backup.path, githubSha: backup.sha }, null, 2)}\n`, "utf8");
    console.log(`[Auto Restore] Completed successfully from ${backup.path}.`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error || "Unknown auto restore error");
    await recordRestoreFailure(databaseUrl, startedAt, message);
    throw error;
  }
}

main().catch((error) => {
  console.error("[Auto Restore] Failed.", error);
  process.exit(1);
});
