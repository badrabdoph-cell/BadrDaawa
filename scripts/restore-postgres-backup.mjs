import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";

function usage() {
  console.error("Usage: DATABASE_URL=postgresql://... node scripts/restore-postgres-backup.mjs /path/to/backup.json");
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

const backupPath = process.argv[2];
const databaseUrl = process.env.DATABASE_URL;

if (!backupPath || !databaseUrl) {
  usage();
  process.exit(1);
}

const payload = JSON.parse(await readFile(backupPath, "utf8"));
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
  ], { ...process.env, PGDATABASE: databaseUrl });
  console.log("PostgreSQL restore completed.");
} finally {
  await rm(tempDir, { recursive: true, force: true });
}
