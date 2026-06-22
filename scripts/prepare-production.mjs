import { spawnSync } from "node:child_process";
import { mkdirSync, existsSync, readFileSync, writeFileSync } from "node:fs";
import { randomBytes } from "node:crypto";
import path from "node:path";

const root = process.cwd();
const prismaBin = path.join(root, "node_modules", ".bin", "prisma");
const dirs = [
  path.join(root, "data"),
  path.join(root, "data", "backups"),
  path.join(root, "public", "uploads"),
  path.join(root, "public", "assets", "admin"),
  ...["client-invitations", "order-requests", "order-previews", "music"].map((subdir) =>
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
    env: { ...process.env, PRISMA_HIDE_UPDATE_MESSAGE: "true", ...options.env },
  });

  if (result.status !== 0) {
    process.exit(result.status || 1);
  }
}

function logPostgresToolAvailability(command) {
  const result = spawnSync(command, ["--version"], {
    cwd: root,
    encoding: "utf8",
    env: process.env,
  });

  const output = `${result.stdout || result.stderr || ""}`.trim();
  if (result.error) {
    console.warn(`[prepare] ${command} is not available in PATH. Manual restore actions that need it will fail: ${result.error.message}`);
    return;
  }

  if (result.status !== 0) {
    console.warn(`[prepare] ${command} --version exited with code ${result.status || 1}${output ? `: ${output}` : ""}`);
    return;
  }

  console.log(`[prepare] ${command} is available: ${output || "version detected"}`);
}

function generateSecret(bytes = 32) {
  return randomBytes(bytes).toString("hex");
}

function autoGenerateMissingSecrets() {
  const secretsFile = path.join(root, "data", ".secrets.env");

  const generated = existsSync(secretsFile)
    ? Object.fromEntries(
        readFileSync(secretsFile, "utf8")
          .split("\n")
          .filter(Boolean)
          .map((line) => {
            const idx = line.indexOf("=");
            return idx === -1 ? null : [line.slice(0, idx), line.slice(idx + 1)];
          })
          .filter(Boolean),
      )
    : {};

  const SECRETS = {
    AUTH_SECRET: { gen: () => generateSecret(32) },
    ADMIN_SESSION_SECRET: { gen: () => generateSecret(32) },
    CLIENT_ADMIN_USERNAME: { gen: () => "admin" },
    CLIENT_ADMIN_PASSWORD: { gen: () => generateSecret(16) },
    CLIENT_SESSION_SECRET: { gen: () => generateSecret(32) },
    BACKUP_CRON_SECRET: { gen: () => generateSecret(32) },
  };

  let changed = false;
  for (const [key, config] of Object.entries(SECRETS)) {
    if (process.env[key]) continue;
    if (!generated[key]) {
      generated[key] = config.gen();
      changed = true;
    }
    process.env[key] = generated[key];
  }

  if (changed) {
    const lines = Object.entries(generated).map(([k, v]) => `${k}=${v}`);
    writeFileSync(secretsFile, lines.join("\n") + "\n", "utf8");
    console.log(`[prepare] Generated and persisted ${Object.keys(SECRETS).length} missing secrets`);
  }
}

for (const dir of dirs) {
  mkdirSync(dir, { recursive: true });
}
console.log(`[prepare] Runtime directories are ready: ${dirs.length}`);

autoGenerateMissingSecrets();

logPostgresToolAvailability("pg_restore");

runPrisma(["generate"]);

const databaseUrl = getDatabaseUrl();
if (!databaseUrl) {
  console.warn("[prepare] No DATABASE_URL/Postgres variables found. Warning: schema changes without migrations will cause errors at runtime.");
  process.exit(0);
}

console.log("[prepare] Running prisma migrate deploy.");
runPrisma(["migrate", "deploy"], { env: { DATABASE_URL: databaseUrl } });

try {
  const diffResult = spawnSync(prismaBin, ["migrate", "diff", "--from-local-migrations", "--to-schema-datasource", "prisma/schema.prisma"], {
    cwd: root,
    encoding: "utf8",
    env: { ...process.env, DATABASE_URL: databaseUrl, PRISMA_HIDE_UPDATE_MESSAGE: "true" },
    timeout: 15000,
  });
  if (diffResult.status !== 0 && diffResult.stderr?.includes("P3014")) {
    console.warn("[prepare] ⚠️ SCHEMA DRIFT: Schema has changes not yet migrated. Create migration:\n  pnpm dlx prisma migrate dev --create-only --name <description>");
  } else if (diffResult.stdout?.trim() && diffResult.stdout.trim() !== "-- This is an empty migration") {
    console.warn(`[prepare] ⚠️ SCHEMA DRIFT: ${diffResult.stdout.trim().length} bytes of unapplied changes. Create migration: pnpm dlx prisma migrate dev --create-only --name <description>`);
  }
} catch {
}

console.log("[prepare] Startup restore and legacy JSON backfills are disabled permanently.");
