import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";

function usage() {
  console.error("Usage: ALLOW_DESTRUCTIVE_RESTORE=I_UNDERSTAND_THIS_OVERWRITES_POSTGRESQL DATABASE_URL=postgresql://... node scripts/restore-postgres-backup.mjs /path/to/backup.json --confirm-manual-restore");
}

function run(command, args, env = process.env) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { env, stdio: "inherit" });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${command} exited with code ${code}`));
    });
  });
}

function safeDecode(value) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function postgresToolEnv(urlValue) {
  const env = { ...process.env };
  try {
    const url = new URL(urlValue);
    if (url.protocol !== "postgresql:" && url.protocol !== "postgres:") return env;
    env.PGHOST = url.hostname;
    env.PGPORT = url.port || "5432";
    env.PGUSER = safeDecode(url.username);
    env.PGPASSWORD = safeDecode(url.password);
    env.PGDATABASE = safeDecode(url.pathname.replace(/^\/+/, ""));
    const sslMode = url.searchParams.get("sslmode");
    if (sslMode) env.PGSSLMODE = sslMode;
    env.PGCONNECT_TIMEOUT = env.PGCONNECT_TIMEOUT || "20";
    return env;
  } catch {
    return env;
  }
}

const backupPath = process.argv[2];
const confirmed = process.argv.includes("--confirm-manual-restore");
const databaseUrl = process.env.DATABASE_URL;

if (!backupPath || !databaseUrl || !confirmed) {
  usage();
  process.exit(1);
}

if (process.env.ALLOW_DESTRUCTIVE_RESTORE !== "I_UNDERSTAND_THIS_OVERWRITES_POSTGRESQL") {
  throw new Error("Restore is manual-only. Set ALLOW_DESTRUCTIVE_RESTORE=I_UNDERSTAND_THIS_OVERWRITES_POSTGRESQL to continue.");
}

if ((process.env.RAILWAY_ENVIRONMENT || process.env.NODE_ENV) === "production" && process.env.ALLOW_PRODUCTION_RESTORE !== "I_UNDERSTAND_THIS_IS_PRODUCTION") {
  throw new Error("Production restore is blocked without ALLOW_PRODUCTION_RESTORE=I_UNDERSTAND_THIS_IS_PRODUCTION.");
}

const payload = JSON.parse(await readFile(backupPath, "utf8"));
if (payload?.runtimeData || payload?.uploads) {
  throw new Error("This is a Runtime Data backup package. Automatic restore is disabled; restore must be performed manually with an explicit reviewed plan.");
}

if (!payload?.postgresDump?.base64 || payload.postgresDump.encoding !== "base64") {
  throw new Error("Backup file does not contain a PostgreSQL dump.");
}

const tempDir = await mkdtemp(path.join(tmpdir(), "badrdaawa-restore-"));
const dumpPath = path.join(tempDir, payload.postgresDump.fileName || "backup.dump");

try {
  await writeFile(dumpPath, Buffer.from(payload.postgresDump.base64, "base64"));
  await run("pg_restore", [
    "--clean",
    "--if-exists",
    "--no-owner",
    "--no-privileges",
    dumpPath,
  ], postgresToolEnv(databaseUrl));
  console.log("PostgreSQL restore completed.");
} finally {
  await rm(tempDir, { recursive: true, force: true });
}
