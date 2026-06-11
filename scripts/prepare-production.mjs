import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, rmSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
const prismaBin = path.join(root, "node_modules", ".bin", "prisma");
const autoRestoreScript = path.join(root, "scripts", "auto-restore-from-github.mjs");
const autoRestoreMarker = path.join(root, "data", ".auto-restore-from-github-restored");
const dirs = [
  path.join(root, "data"),
  path.join(root, "data", "backups"),
  path.join(root, "public", "uploads"),
  ...["client-invitations", "order-requests", "order-previews", "music", "previews", "template-previews"].map((subdir) =>
    path.join(root, "public", "uploads", subdir),
  ),
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

function runPrisma(args, options = {}) {
  const result = spawnSync(prismaBin, args, {
    cwd: root,
    stdio: "inherit",
    env: { ...process.env, ...options.env },
  });

  if (result.status !== 0) {
    process.exit(result.status || 1);
  }
}

for (const dir of dirs) {
  mkdirSync(dir, { recursive: true });
}
console.log(`[prepare] Runtime directories are ready: ${dirs.length}`);

runPrisma(["generate"]);

const databaseUrl = getDatabaseUrl();
if (!databaseUrl) {
  console.warn("[prepare] No DATABASE_URL/Postgres variables found. Skipping prisma migrate deploy.");
  process.exit(0);
}

console.log("[prepare] Running prisma migrate deploy.");
runPrisma(["migrate", "deploy"], { env: { DATABASE_URL: databaseUrl } });

rmSync(autoRestoreMarker, { force: true });
if (process.env.AUTO_RESTORE_FROM_GITHUB === "true" && process.env.AUTO_RESTORE_ONLY_IF_DB_EMPTY === "true") {
  console.log("[prepare] Checking GitHub auto restore before legacy backfills.");
  const result = spawnSync(process.execPath, [autoRestoreScript], {
    cwd: root,
    stdio: "inherit",
    env: { ...process.env, DATABASE_URL: databaseUrl },
  });

  if (result.status !== 0) {
    console.warn(`[prepare] GitHub auto restore failed with exit code ${result.status || 1}. Continuing startup without restore.`);
  }
}

const autoRestoreCompleted = existsSync(autoRestoreMarker);
if (autoRestoreCompleted) {
  console.log("[prepare] GitHub auto restore completed. Skipping legacy JSON backfills to avoid mixing restored data with stale local files.");
}

if (process.env.SKIP_RUNTIME_STORE_BACKFILL === "true") {
  console.log("[prepare] Runtime-store backfill skipped by SKIP_RUNTIME_STORE_BACKFILL=true.");
} else if (autoRestoreCompleted) {
  console.log("[prepare] Runtime-store backfill skipped after GitHub auto restore.");
} else {
  console.log("[prepare] Backfilling legacy runtime-store data into PostgreSQL.");
  const result = spawnSync(process.execPath, [path.join(root, "scripts", "backfill-runtime-store-to-postgres.mjs")], {
    cwd: root,
    stdio: "inherit",
    env: { ...process.env, DATABASE_URL: databaseUrl },
  });

  if (result.status !== 0) {
    process.exit(result.status || 1);
  }
}

if (process.env.SKIP_OPERATIONAL_JSON_BACKFILL === "true") {
  console.log("[prepare] Operational JSON backfill skipped by SKIP_OPERATIONAL_JSON_BACKFILL=true.");
} else if (autoRestoreCompleted) {
  console.log("[prepare] Operational JSON backfill skipped after GitHub auto restore.");
} else {
  console.log("[prepare] Backfilling operational JSON data into PostgreSQL.");
  const result = spawnSync(process.execPath, [path.join(root, "scripts", "backfill-operational-json-to-postgres.mjs")], {
    cwd: root,
    stdio: "inherit",
    env: { ...process.env, DATABASE_URL: databaseUrl },
  });

  if (result.status !== 0) {
    process.exit(result.status || 1);
  }
}
