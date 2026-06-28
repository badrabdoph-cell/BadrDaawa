import { spawnSync } from "node:child_process";
import { mkdirSync, existsSync, readFileSync, writeFileSync } from "node:fs";
import { randomBytes, generateKeyPairSync } from "node:crypto";
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

function generateVapidKeys() {
  try {
    const { publicKey, privateKey } = generateKeyPairSync("ec", {
      namedCurve: "P-256",
      publicKeyEncoding: { type: "spki", format: "jwk" },
      privateKeyEncoding: { type: "pkcs8", format: "jwk" },
    });

    const xBytes = Buffer.from(publicKey.x, "base64url");
    const yBytes = Buffer.from(publicKey.y, "base64url");
    const uncompressed = Buffer.alloc(65);
    uncompressed[0] = 0x04;
    xBytes.copy(uncompressed, 1);
    yBytes.copy(uncompressed, 33);

    return {
      publicKey: uncompressed.toString("base64url"),
      privateKey: privateKey.d,
    };
  } catch (err) {
    console.warn(`[prepare] Failed to generate VAPID keys: ${err.message}. Push notifications will not work.`);
    return null;
  }
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

  const AUTO_VARS = {
    AUTH_SECRET: { gen: () => generateSecret(32) },
    ADMIN_USERNAME: { gen: () => "admin" },
    ADMIN_EMAIL: { gen: () => "admin@badrdaawa.com" },
    ADMIN_PASSWORD: { gen: () => generateSecret(16) },
    ADMIN_SESSION_SECRET: { gen: () => generateSecret(32) },
    CLIENT_ADMIN_USERNAME: { gen: () => "client" },
    CLIENT_ADMIN_PASSWORD: { gen: () => generateSecret(16) },
    CLIENT_SESSION_SECRET: { gen: () => generateSecret(32) },
    BACKUP_CRON_SECRET: { gen: () => generateSecret(32) },
    NEXTAUTH_SECRET: { gen: () => generateSecret(32) },
    WHATSAPP_ORDER_PHONE: { gen: () => "01000000000" },
    SHOW_PHOTOGRAPHER_CARD: { gen: () => "true" },
    ENABLE_LEGACY_FILE_STORE: { gen: () => "false" },
    STORAGE_PROVIDER: { gen: () => "local" },
    GITHUB_SYNC_REPO: { gen: () => "badrabdoph-cell/BadrDaawa" },
    GITHUB_SYNC_BRANCH: { gen: () => "main" },
    GITHUB_SYNC_ENABLED: { gen: () => "true" },
    AUTO_RESTORE_FROM_GITHUB: { gen: () => "true" },
    AUTO_RESTORE_ONLY_IF_DB_EMPTY: { gen: () => "true" },
    ALLOW_DESTRUCTIVE_RESTORE: { gen: () => "I_UNDERSTAND_THIS_OVERWRITES_POSTGRESQL" },
    BACKUP_GITHUB_REPO: { gen: () => "badrabdoph-cell/BadrDaawa" },
  };

  let changed = false;
  for (const [key, config] of Object.entries(AUTO_VARS)) {
    if (process.env[key]) continue;
    if (!generated[key]) {
      generated[key] = config.gen();
      changed = true;
    }
    process.env[key] = generated[key];
  }

  if (!process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && !process.env.VAPID_PRIVATE_KEY) {
    const vapid = generateVapidKeys();
    if (vapid) {
      generated.NEXT_PUBLIC_VAPID_PUBLIC_KEY = vapid.publicKey;
      generated.VAPID_PRIVATE_KEY = vapid.privateKey;
      process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY = vapid.publicKey;
      process.env.VAPID_PRIVATE_KEY = vapid.privateKey;
      changed = true;
    }
  }

  if (!process.env.VAPID_SUBJECT) {
    const email = generated.ADMIN_EMAIL || process.env.ADMIN_EMAIL || "admin@badrdaawa.com";
    generated.VAPID_SUBJECT = `mailto:${email}`;
    process.env.VAPID_SUBJECT = `mailto:${email}`;
    changed = true;
  }

  if (process.env.GITHUB_SYNC_TOKEN && !generated.BACKUP_GITHUB_TOKEN) {
    generated.BACKUP_GITHUB_TOKEN = process.env.GITHUB_SYNC_TOKEN;
  }

  if (!process.env.GITHUB_SYNC_TOKEN) {
    console.warn("[prepare] ⚠️ GITHUB_SYNC_TOKEN غير مضبوط. النسخ الاحتياطي على GitHub والمزامنة لن تعمل.");
    console.warn("[prepare] ⚠️ أنشئ GitHub Token (Settings → Developer settings → Personal access tokens → Fine-grained tokens)");
    console.warn("[prepare] ⚠️ أعطه صلاحية Contents: Read and write للمستودع badrabdoph-cell/BadrDaawa");
    console.warn("[prepare] ⚠️ ثم أضفه كـ GITHUB_SYNC_TOKEN في Railway Variables");
  }

  const backupCronSecret = generated.BACKUP_CRON_SECRET || process.env.BACKUP_CRON_SECRET;
  if (backupCronSecret) {
    console.log(`[prepare] BACKUP_CRON_SECRET: ${backupCronSecret.slice(0, 12)}... (احفظ هذه القيمة لإضافتها إلى Cron Job Service في Railway)`);
  }

  if (changed) {
    const lines = Object.entries(generated).map(([k, v]) => `${k}=${v}`);
    writeFileSync(secretsFile, lines.join("\n") + "\n", "utf8");
    console.log(`[prepare] Generated and persisted ${Object.keys(AUTO_VARS).length} missing secrets`);
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
  const hasDrift = (diffResult.status !== 0 && diffResult.stderr?.includes("P3014"))
    || (diffResult.stdout?.trim() && diffResult.stdout.trim() !== "-- This is an empty migration");
  if (hasDrift) {
    console.warn("[prepare] ⚠️ Schema drift detected. Running prisma db push to apply un-migrated changes.");
    const pushResult = spawnSync(prismaBin, ["db", "push", "--accept-data-loss"], {
      cwd: root,
      stdio: "inherit",
      env: { ...process.env, DATABASE_URL: databaseUrl, PRISMA_HIDE_UPDATE_MESSAGE: "true" },
      timeout: 30000,
    });
    if (pushResult.status === 0) {
      console.log("[prepare] prisma db push succeeded.");
    } else {
      console.warn(`[prepare] prisma db push exited with code ${pushResult.status}. Schema may not match.`);
    }
  }
} catch (e) {
  console.warn("[prepare] Schema drift check failed (non-fatal):", e.message);
}

console.log("[prepare] Checking for startup auto-restore...");
try {
  const tsxBin = path.join(root, "node_modules", ".bin", "tsx");
  const restoreScript = path.join(root, "scripts", "startup-restore.mjs");
  if (existsSync(tsxBin) && existsSync(restoreScript)) {
    const restoreResult = spawnSync(tsxBin, [restoreScript], {
      cwd: root,
      stdio: "inherit",
      env: { ...process.env, DATABASE_URL: databaseUrl },
      timeout: 180000,
    });
    if (restoreResult.status === 0) {
      console.log("[prepare] Startup auto-restore completed.");
    } else {
      console.warn(`[prepare] Startup auto-restore exited with code ${restoreResult.status} (non-fatal)`);
    }
  } else {
    console.log("[prepare] tsx or startup-restore.mjs not found, skipping auto-restore");
  }
} catch (e) {
  console.warn("[prepare] Startup auto-restore failed (non-fatal):", e.message);
}
