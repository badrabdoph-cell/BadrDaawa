function cleanEnvValue(value?: string | null) {
  return value
    ?.trim()
    .replace(/^["']|["']$/g, "")
    .replace(/^database_url=/i, "")
    .replace(/^DATABASE_URL=/, "")
    .trim();
}

function isPostgresUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "postgresql:" || url.protocol === "postgres:";
  } catch {
    return false;
  }
}

function fromUrlEnv() {
  const names = [
    "DATABASE_URL",
    "POSTGRES_PRISMA_URL",
    "POSTGRES_URL",
    "DATABASE_PRIVATE_URL",
    "DATABASE_PUBLIC_URL",
  ];

  for (const name of names) {
    const raw = process.env[name];
    const clean = cleanEnvValue(raw);
    if (clean && isPostgresUrl(clean)) return { url: clean, source: name };
  }

  return { url: "", source: null };
}

function fromPgParts() {
  const host = cleanEnvValue(process.env.PGHOST);
  const port = cleanEnvValue(process.env.PGPORT) || "5432";
  const user = cleanEnvValue(process.env.PGUSER);
  const password = cleanEnvValue(process.env.PGPASSWORD);
  const database = cleanEnvValue(process.env.PGDATABASE);
  if (!host || !user || !password || !database) return { url: "", source: null };

  const url = new URL(`postgresql://${host}:${port}/${database}`);
  url.username = user;
  url.password = password;
  url.searchParams.set("schema", "public");
  return { url: url.toString(), source: "PGHOST/PGPORT/PGUSER/PGPASSWORD/PGDATABASE" };
}

function maskUrl(urlStr: string): string {
  try {
    const u = new URL(urlStr);
    return `${u.protocol}//${u.username}:****@${u.host}${u.pathname}${u.search}`;
  } catch {
    return "(unparseable)";
  }
}

export function getDatabaseUrl() {
  const urlResult = fromUrlEnv();
  const partsResult = fromPgParts();
  const result = urlResult.url || partsResult.url;
  const source = urlResult.source || partsResult.source;

  if (result) {
  } else {
    console.warn("[DB] No DATABASE_URL found via any source.");
  }

  return result;
}

export function hasDatabaseConfig() {
  return Boolean(getDatabaseUrl());
}
