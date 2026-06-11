import { readFile } from "node:fs/promises";
import path from "node:path";
import { PrismaClient } from "@prisma/client";

const root = process.cwd();
const dataDir = path.join(root, "data");

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

async function readJsonFile(name, fallback) {
  const raw = await readFile(path.join(dataDir, name), "utf8").catch((error) => {
    if (error?.code === "ENOENT") return "";
    throw error;
  });
  if (!raw.trim()) return fallback;
  return JSON.parse(raw);
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function asDate(value, fallback = new Date()) {
  const date = value ? new Date(value) : fallback;
  return Number.isNaN(date.getTime()) ? fallback : date;
}

function status(value) {
  return value === "approved" || value === "rejected" || value === "pending" ? value : "pending";
}

function mode(value) {
  return value === "disabled" || value === "auto" || value === "moderated" ? value : "moderated";
}

async function backfillGuestBook(prisma) {
  const store = await readJsonFile("guest-book.json", { messages: [] });
  let upserted = 0;
  for (const message of asArray(store.messages)) {
    if (!message?.id || !message.invitationCode || !message.message || !message.createdAt) continue;
    await prisma.guestBookMessage.upsert({
      where: { id: String(message.id) },
      update: {
        invitationCode: String(message.invitationCode),
        name: String(message.name || "ضيف عزيز"),
        message: String(message.message),
        status: status(message.status),
        reviewedAt: message.reviewedAt ? asDate(message.reviewedAt) : null,
      },
      create: {
        id: String(message.id),
        invitationCode: String(message.invitationCode),
        name: String(message.name || "ضيف عزيز"),
        message: String(message.message),
        status: status(message.status),
        reviewedAt: message.reviewedAt ? asDate(message.reviewedAt) : null,
        createdAt: asDate(message.createdAt),
      },
    });
    upserted += 1;
  }
  return { upserted };
}

async function backfillCoupleSettings(prisma) {
  const store = await readJsonFile("couple-messages-settings.json", { settings: [] });
  let upserted = 0;
  for (const setting of asArray(store.settings)) {
    if (!setting?.invitationCode) continue;
    await prisma.coupleMessagesSetting.upsert({
      where: { invitationCode: String(setting.invitationCode) },
      update: { mode: mode(setting.mode), ...(setting.updatedAt ? { updatedAt: asDate(setting.updatedAt) } : {}) },
      create: { invitationCode: String(setting.invitationCode), mode: mode(setting.mode), ...(setting.updatedAt ? { updatedAt: asDate(setting.updatedAt) } : {}) },
    });
    upserted += 1;
  }
  return { upserted };
}

async function backfillClientMessages(prisma) {
  const store = await readJsonFile("client-messages.json", { messages: [] });
  let upserted = 0;
  for (const message of asArray(store.messages)) {
    if (!message?.id || !message.invitationCode || !message.body || !message.createdAt) continue;
    await prisma.clientMessage.upsert({
      where: { id: String(message.id) },
      update: {
        invitationCode: String(message.invitationCode),
        title: String(message.title || "رسالة من الإدارة"),
        body: String(message.body),
        sender: "admin",
        readAt: message.readAt ? asDate(message.readAt) : null,
      },
      create: {
        id: String(message.id),
        invitationCode: String(message.invitationCode),
        title: String(message.title || "رسالة من الإدارة"),
        body: String(message.body),
        sender: "admin",
        readAt: message.readAt ? asDate(message.readAt) : null,
        createdAt: asDate(message.createdAt),
      },
    });
    upserted += 1;
  }
  return { upserted };
}

async function backfillCheckIns(prisma) {
  const store = await readJsonFile("check-ins.json", { checkIns: [] });
  let upserted = 0;
  for (const checkIn of asArray(store.checkIns)) {
    if (!checkIn?.id || !checkIn.invitationCode || !checkIn.visitorKey || !checkIn.createdAt) continue;
    await prisma.invitationCheckIn.upsert({
      where: { invitationCode_visitorKey: { invitationCode: String(checkIn.invitationCode), visitorKey: String(checkIn.visitorKey) } },
      update: {
        id: String(checkIn.id),
        userAgent: checkIn.userAgent ? String(checkIn.userAgent) : null,
      },
      create: {
        id: String(checkIn.id),
        invitationCode: String(checkIn.invitationCode),
        visitorKey: String(checkIn.visitorKey),
        userAgent: checkIn.userAgent ? String(checkIn.userAgent) : null,
        createdAt: asDate(checkIn.createdAt),
      },
    });
    upserted += 1;
  }
  return { upserted };
}

async function backfillLiveMode(prisma) {
  const store = await readJsonFile("wedding-live-mode.json", { liveModes: [] });
  let upserted = 0;
  for (const config of asArray(store.liveModes)) {
    if (!config?.invitationCode) continue;
    await prisma.weddingLiveMode.upsert({
      where: { invitationCode: String(config.invitationCode).toLowerCase() },
      update: {
        enabled: config.enabled === true,
        announcement: config.announcement ? String(config.announcement) : null,
        events: asArray(config.events),
        updatedBy: config.updatedBy === "client" ? "client" : "admin",
        ...(config.updatedAt ? { updatedAt: asDate(config.updatedAt) } : {}),
      },
      create: {
        invitationCode: String(config.invitationCode).toLowerCase(),
        enabled: config.enabled === true,
        announcement: config.announcement ? String(config.announcement) : null,
        events: asArray(config.events),
        updatedBy: config.updatedBy === "client" ? "client" : "admin",
        ...(config.updatedAt ? { updatedAt: asDate(config.updatedAt) } : {}),
      },
    });
    upserted += 1;
  }
  return { upserted };
}

async function backfillInternalNotes(prisma) {
  const notes = await readJsonFile("internal-notes.json", []);
  let upserted = 0;
  for (const note of asArray(notes)) {
    if (!note?.id || !note.entityType || !note.entityId || !note.body) continue;
    await prisma.internalNote.upsert({
      where: { id: String(note.id) },
      update: {
        entityType: String(note.entityType),
        entityId: String(note.entityId),
        body: String(note.body),
        authorLabel: String(note.authorLabel || "Admin"),
        updatedAt: note.updatedAt ? asDate(note.updatedAt) : new Date(),
      },
      create: {
        id: String(note.id),
        entityType: String(note.entityType),
        entityId: String(note.entityId),
        body: String(note.body),
        authorLabel: String(note.authorLabel || "Admin"),
        createdAt: note.createdAt ? asDate(note.createdAt) : new Date(),
        updatedAt: note.updatedAt ? asDate(note.updatedAt) : new Date(),
      },
    });
    upserted += 1;
  }
  return { upserted };
}

async function backfillAuditLog(prisma) {
  const entries = await readJsonFile("audit-log.json", []);
  let upserted = 0;
  for (const entry of asArray(entries)) {
    if (!entry?.id || !entry.actor || !entry.action || !entry.entity || !entry.createdAt) continue;
    await prisma.auditLog.upsert({
      where: { id: String(entry.id) },
      update: {
        actorType: String(entry.actor.type || "system"),
        actorId: entry.actor.id ? String(entry.actor.id) : null,
        actorLabel: String(entry.actor.label || "System"),
        action: String(entry.action),
        entityType: String(entry.entity.type || "Unknown"),
        entityId: String(entry.entity.id || ""),
        entityLabel: entry.entity.label ? String(entry.entity.label) : null,
        oldValues: entry.oldValues === undefined ? undefined : entry.oldValues,
        newValues: entry.newValues === undefined ? undefined : entry.newValues,
        metadata: entry.metadata === undefined ? undefined : entry.metadata,
      },
      create: {
        id: String(entry.id),
        actorType: String(entry.actor.type || "system"),
        actorId: entry.actor.id ? String(entry.actor.id) : null,
        actorLabel: String(entry.actor.label || "System"),
        action: String(entry.action),
        entityType: String(entry.entity.type || "Unknown"),
        entityId: String(entry.entity.id || ""),
        entityLabel: entry.entity.label ? String(entry.entity.label) : null,
        oldValues: entry.oldValues === undefined ? undefined : entry.oldValues,
        newValues: entry.newValues === undefined ? undefined : entry.newValues,
        metadata: entry.metadata === undefined ? undefined : entry.metadata,
        createdAt: asDate(entry.createdAt),
      },
    });
    upserted += 1;
  }
  return { upserted };
}

async function main() {
  const databaseUrl = getDatabaseUrl();
  if (!databaseUrl) throw new Error("DATABASE_URL or PostgreSQL environment variables are required for operational JSON backfill.");
  const prisma = new PrismaClient({ datasources: { db: { url: databaseUrl } } });
  try {
    await prisma.$queryRaw`SELECT 1`;
    const result = {
      guestBook: await backfillGuestBook(prisma),
      coupleSettings: await backfillCoupleSettings(prisma),
      clientMessages: await backfillClientMessages(prisma),
      checkIns: await backfillCheckIns(prisma),
      liveMode: await backfillLiveMode(prisma),
      internalNotes: await backfillInternalNotes(prisma),
      auditLog: await backfillAuditLog(prisma),
    };
    console.log(JSON.stringify({ ok: true, ...result }, null, 2));
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error("[operational JSON backfill] failed", error);
  process.exit(1);
});
