#!/usr/bin/env node

import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";

const rootDir = process.cwd();
const dataDir = path.join(rootDir, "data");
const uploadDir = process.env.STORAGE_LOCAL_ROOT
  ? path.resolve(process.env.STORAGE_LOCAL_ROOT)
  : path.join(rootDir, "public", "uploads");
const backupDirs = [path.join(rootDir, "backups"), path.join(dataDir, "backups")];
const now = new Date();

const OPERATIONAL_ENTITY_TYPES = new Set(["order", "invitation", "customer"]);
const STALE_JOB_MS = 2 * 60 * 60 * 1000;
const OLD_BACKUP_DAYS = Number(process.env.BACKUP_RETENTION_DAYS || 30);
const BACKUP_RETENTION_COUNT = Number(process.env.BACKUP_RETENTION_COUNT || 20);

function cleanEnv(value) {
  if (!value) return "";
  return value.trim().replace(/^['"]|['"]$/g, "");
}

function getDatabaseUrl() {
  const url = cleanEnv(process.env.DATABASE_URL);
  if (url) return url;
  const host = cleanEnv(process.env.PGHOST);
  const database = cleanEnv(process.env.PGDATABASE);
  const user = cleanEnv(process.env.PGUSER);
  const password = cleanEnv(process.env.PGPASSWORD);
  if (!host || !database || !user) return "";
  const port = cleanEnv(process.env.PGPORT) || "5432";
  const ssl = cleanEnv(process.env.PGSSLMODE) === "disable" ? "" : "?sslmode=require";
  return `postgresql://${encodeURIComponent(user)}:${encodeURIComponent(password)}@${host}:${port}/${database}${ssl}`;
}

async function exists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function readJson(filePath) {
  try {
    const raw = await fs.readFile(filePath, "utf8");
    return { ok: true, value: JSON.parse(raw), bytes: Buffer.byteLength(raw) };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error), bytes: 0 };
  }
}

async function walkFiles(dir) {
  if (!(await exists(dir))) return [];
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await walkFiles(fullPath)));
    } else if (entry.isFile()) {
      files.push(fullPath);
    }
  }
  return files;
}

function normalizeString(value) {
  return typeof value === "string" ? value.trim() : "";
}

function toIso(value) {
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function groupDuplicates(items, keyFn) {
  const groups = new Map();
  for (const item of items) {
    const key = keyFn(item);
    if (!key) continue;
    const list = groups.get(key) || [];
    list.push(item);
    groups.set(key, list);
  }
  return [...groups.entries()]
    .filter(([, list]) => list.length > 1)
    .map(([key, list]) => ({ key, count: list.length, items: list }));
}

function collectUploadRefs(value, refs = new Set()) {
  if (value == null) return refs;
  if (typeof value === "string") {
    const regex = /\/uploads\/[A-Za-z0-9._~:/?#@!$&'()*+,;=%-]+/g;
    for (const match of value.matchAll(regex)) {
      refs.add(decodeURIComponent(match[0].split(/[?#]/)[0]));
    }
    return refs;
  }
  if (Array.isArray(value)) {
    for (const item of value) collectUploadRefs(item, refs);
    return refs;
  }
  if (typeof value === "object") {
    for (const item of Object.values(value)) collectUploadRefs(item, refs);
  }
  return refs;
}

function collectAllStrings(value, output = []) {
  if (value == null) return output;
  if (typeof value === "string") {
    output.push(value);
    return output;
  }
  if (Array.isArray(value)) {
    for (const item of value) collectAllStrings(item, output);
    return output;
  }
  if (typeof value === "object") {
    for (const item of Object.values(value)) collectAllStrings(item, output);
  }
  return output;
}

async function auditLegacyJson() {
  const result = {
    files: [],
    summaries: {},
    duplicates: {},
    orphans: {},
    invalidFiles: [],
    emptyOrCorruptFields: [],
  };

  if (!(await exists(dataDir))) return result;
  const files = (await walkFiles(dataDir)).filter((file) => file.endsWith(".json") && !file.includes(`${path.sep}backups${path.sep}`));

  for (const filePath of files) {
    const parsed = await readJson(filePath);
    const rel = path.relative(rootDir, filePath);
    result.files.push({ path: rel, ok: parsed.ok, bytes: parsed.bytes });
    if (!parsed.ok) {
      result.invalidFiles.push({ path: rel, error: parsed.error });
      continue;
    }
    const value = parsed.value;
    if (Array.isArray(value)) {
      result.summaries[rel] = { kind: "array", count: value.length };
    } else if (value && typeof value === "object") {
      result.summaries[rel] = Object.fromEntries(
        Object.entries(value).map(([key, item]) => [key, Array.isArray(item) ? item.length : typeof item]),
      );
    } else {
      result.summaries[rel] = { kind: typeof value };
    }
  }

  const runtime = await readJson(path.join(dataDir, "runtime-store.json"));
  const guestBook = await readJson(path.join(dataDir, "guest-book.json"));
  const runtimeValue = runtime.ok && runtime.value && typeof runtime.value === "object" ? runtime.value : {};
  const invitations = Array.isArray(runtimeValue.invitations) ? runtimeValue.invitations : [];
  const guests = Array.isArray(runtimeValue.guests) ? runtimeValue.guests : [];
  const customers = Array.isArray(runtimeValue.customers) ? runtimeValue.customers : [];
  const orders = Array.isArray(runtimeValue.orders) ? runtimeValue.orders : [];
  const analyticsEvents = Array.isArray(runtimeValue.analyticsEvents) ? runtimeValue.analyticsEvents : [];
  const guestBookMessages =
    guestBook.ok && guestBook.value && Array.isArray(guestBook.value.messages) ? guestBook.value.messages : [];
  const invitationCodes = new Set(invitations.map((item) => normalizeString(item.code)).filter(Boolean));
  const invitationIds = new Set(invitations.map((item) => normalizeString(item.id)).filter(Boolean));
  const customerIds = new Set(customers.map((item) => normalizeString(item.id)).filter(Boolean));

  result.duplicates = {
    invitationsByCode: groupDuplicates(invitations, (item) => normalizeString(item.code)),
    ordersById: groupDuplicates(orders, (item) => normalizeString(item.id)),
    ordersByDedupeKey: groupDuplicates(orders, (item) => normalizeString(item.dedupeKey)),
    customersByUsername: groupDuplicates(customers, (item) => normalizeString(item.username)),
    customersByPhone: groupDuplicates(customers, (item) => normalizeString(item.phone)),
    guestsByInvitationPhone: groupDuplicates(guests, (item) => `${normalizeString(item.invitationId)}|${normalizeString(item.phone)}`),
    guestBookByNameMessageCode: groupDuplicates(
      guestBookMessages,
      (item) => `${normalizeString(item.invitationCode)}|${normalizeString(item.name)}|${normalizeString(item.message)}`,
    ),
  };

  result.orphans = {
    guests: guests.filter((item) => !invitationIds.has(normalizeString(item.invitationId))),
    analytics: analyticsEvents.filter((item) => !invitationIds.has(normalizeString(item.invitationId))),
    orders: orders.filter((item) => normalizeString(item.customerId) && !customerIds.has(normalizeString(item.customerId))),
    guestBook: guestBookMessages.filter((item) => !invitationCodes.has(normalizeString(item.invitationCode))),
  };

  for (const invitation of invitations) {
    if (!normalizeString(invitation.code)) result.emptyOrCorruptFields.push({ table: "legacy.invitations", id: invitation.id, field: "code" });
    if (!normalizeString(invitation.groomName)) result.emptyOrCorruptFields.push({ table: "legacy.invitations", id: invitation.id, field: "groomName" });
    if (!normalizeString(invitation.brideName)) result.emptyOrCorruptFields.push({ table: "legacy.invitations", id: invitation.id, field: "brideName" });
  }
  for (const order of orders) {
    if (!normalizeString(order.phone)) result.emptyOrCorruptFields.push({ table: "legacy.orders", id: order.id, field: "phone" });
    if (!normalizeString(order.groomName)) result.emptyOrCorruptFields.push({ table: "legacy.orders", id: order.id, field: "groomName" });
    if (!normalizeString(order.brideName)) result.emptyOrCorruptFields.push({ table: "legacy.orders", id: order.id, field: "brideName" });
  }
  for (const customer of customers) {
    if (!normalizeString(customer.phone)) result.emptyOrCorruptFields.push({ table: "legacy.customers", id: customer.id, field: "phone" });
    if (!normalizeString(customer.username)) result.emptyOrCorruptFields.push({ table: "legacy.customers", id: customer.id, field: "username" });
  }

  return result;
}

async function auditBackups() {
  const files = [];
  const invalidFiles = [];
  const hashGroups = new Map();

  for (const dir of backupDirs) {
    for (const filePath of (await walkFiles(dir)).filter((file) => file.endsWith(".json"))) {
      const stat = await fs.stat(filePath);
      const buffer = await fs.readFile(filePath);
      const hash = crypto.createHash("sha256").update(buffer).digest("hex");
      const rel = path.relative(rootDir, filePath);
      let validJson = true;
      let error = null;
      try {
        JSON.parse(buffer.toString("utf8"));
      } catch (jsonError) {
        validJson = false;
        error = jsonError instanceof Error ? jsonError.message : String(jsonError);
        invalidFiles.push({ path: rel, error });
      }
      const entry = {
        path: rel,
        name: path.basename(filePath),
        bytes: stat.size,
        mtime: stat.mtime.toISOString(),
        ageDays: Math.floor((now.getTime() - stat.mtime.getTime()) / 86400000),
        hash,
        validJson,
        error,
      };
      files.push(entry);
      const group = hashGroups.get(hash) || [];
      group.push({ path: rel, name: entry.name, bytes: entry.bytes });
      hashGroups.set(hash, group);
    }
  }

  const duplicateContent = [...hashGroups.values()].filter((group) => group.length > 1);
  const byDir = {};
  for (const file of files) {
    const top = file.path.startsWith("data/backups/") ? "data/backups" : file.path.split(path.sep)[0];
    byDir[top] = (byDir[top] || 0) + 1;
  }

  const oldByRetention = [...files]
    .sort((a, b) => new Date(b.mtime).getTime() - new Date(a.mtime).getTime())
    .slice(BACKUP_RETENTION_COUNT)
    .filter((file) => file.ageDays > OLD_BACKUP_DAYS)
    .map(({ hash, ...file }) => file);

  return {
    totalFiles: files.length,
    totalBytes: files.reduce((sum, file) => sum + file.bytes, 0),
    byDir,
    invalidFiles,
    duplicateContent,
    oldByRetention,
    largestFiles: [...files]
      .sort((a, b) => b.bytes - a.bytes)
      .slice(0, 10)
      .map(({ hash, ...file }) => file),
  };
}

async function auditMedia(legacyJsonAudit, dbRefs = []) {
  const files = [];
  const duplicateGroups = new Map();
  const references = new Set(dbRefs);

  if (legacyJsonAudit?.files?.length) {
    for (const jsonFile of legacyJsonAudit.files) {
      if (!jsonFile.ok) continue;
      const parsed = await readJson(path.join(rootDir, jsonFile.path));
      if (parsed.ok) collectUploadRefs(parsed.value, references);
    }
  }

  for (const filePath of await walkFiles(uploadDir)) {
    const stat = await fs.stat(filePath);
    const buffer = await fs.readFile(filePath);
    const hash = crypto.createHash("sha256").update(buffer).digest("hex");
    const rel = path.relative(uploadDir, filePath).split(path.sep).join("/");
    const uploadPath = `/uploads/${rel}`;
    const group = duplicateGroups.get(hash) || [];
    group.push({ path: uploadPath, bytes: stat.size });
    duplicateGroups.set(hash, group);
    const ageDays = Math.floor((now.getTime() - stat.mtime.getTime()) / 86400000);
    const used = references.has(uploadPath);
    files.push({
      path: uploadPath,
      bytes: stat.size,
      mtime: stat.mtime.toISOString(),
      ageDays,
      used,
      extension: path.extname(rel).toLowerCase(),
      hash,
    });
  }

  const duplicateContent = [...duplicateGroups.values()].filter((group) => group.length > 1);
  const unused = files.filter((file) => !file.used);
  const oldTemporary = unused.filter((file) => file.ageDays >= 7 && /\/(tmp|temp|preview|order-previews|order-requests)\//.test(file.path));

  return {
    uploadDir,
    totalFiles: files.length,
    totalBytes: files.reduce((sum, file) => sum + file.bytes, 0),
    usedFiles: files.filter((file) => file.used).length,
    unusedFiles: unused.map(({ hash, ...file }) => file),
    unusedBytes: unused.reduce((sum, file) => sum + file.bytes, 0),
    duplicateContent,
    oldTemporary,
    referencesCount: references.size,
    extensions: files.reduce((acc, file) => {
      acc[file.extension || "(none)"] = (acc[file.extension || "(none)"] || 0) + 1;
      return acc;
    }, {}),
  };
}

async function createPrisma() {
  const url = getDatabaseUrl();
  if (!url) return { prisma: null, reason: "DATABASE_URL/PG* environment variables are not configured." };
  try {
    const { PrismaClient } = await import("@prisma/client");
    const prisma = new PrismaClient({ datasources: { db: { url } } });
    await prisma.$queryRaw`SELECT 1`;
    return { prisma, reason: null };
  } catch (error) {
    return { prisma: null, reason: error instanceof Error ? error.message : String(error) };
  }
}

async function safeFindMany(model, args = {}) {
  try {
    return await model.findMany(args);
  } catch (error) {
    return { __error: error instanceof Error ? error.message : String(error) };
  }
}

async function safeCount(model) {
  try {
    return await model.count();
  } catch (error) {
    return { error: error instanceof Error ? error.message : String(error) };
  }
}

async function auditDatabase() {
  const { prisma, reason } = await createPrisma();
  if (!prisma) {
    return {
      available: false,
      reason,
      counts: {},
      duplicates: {},
      orphans: {},
      emptyOrCorruptFields: [],
      staleJobs: [],
      failedRepeatedJobs: [],
      uploadReferences: [],
    };
  }

  try {
    const counts = {};
    const models = {
      adminUser: prisma.adminUser,
      customer: prisma.customer,
      weddingTemplate: prisma.weddingTemplate,
      invitation: prisma.invitation,
      guestRsvp: prisma.guestRsvp,
      orderRequest: prisma.orderRequest,
      analyticsEvent: prisma.analyticsEvent,
      dynamicPage: prisma.dynamicPage,
      backupJob: prisma.backupJob,
      syncLog: prisma.syncLog,
      guestBookMessage: prisma.guestBookMessage,
      coupleMessagesSetting: prisma.coupleMessagesSetting,
      clientMessage: prisma.clientMessage,
      invitationCheckIn: prisma.invitationCheckIn,
      weddingLiveMode: prisma.weddingLiveMode,
      internalNote: prisma.internalNote,
      auditLog: prisma.auditLog,
    };
    for (const [name, model] of Object.entries(models)) counts[name] = await safeCount(model);

    const [
      customers,
      invitations,
      orders,
      guests,
      analyticsEvents,
      guestBookMessages,
      coupleSettings,
      clientMessages,
      checkIns,
      liveModes,
      internalNotes,
      backupJobs,
      syncLogs,
      dynamicPages,
      templates,
    ] = await Promise.all([
      safeFindMany(prisma.customer, { select: { id: true, phone: true, email: true, username: true, name: true, deletedAt: true } }),
      safeFindMany(prisma.invitation, {
        select: {
          id: true,
          code: true,
          customSlug: true,
          customerId: true,
          groomName: true,
          brideName: true,
          status: true,
          deletedAt: true,
          heroPhoto: true,
          gallery: true,
          musicUrl: true,
          photographer: true,
          qrCodeUrl: true,
        },
      }),
      safeFindMany(prisma.orderRequest, {
        select: {
          id: true,
          orderNumber: true,
          dedupeKey: true,
          groomName: true,
          brideName: true,
          phone: true,
          weddingDate: true,
          status: true,
          customerId: true,
          imageUrls: true,
          musicUrl: true,
          photographer: true,
          publishedInvitationCode: true,
          manageToken: true,
        },
      }),
      safeFindMany(prisma.guestRsvp, { select: { id: true, invitationId: true, name: true, phone: true, status: true, attendees: true } }),
      safeFindMany(prisma.analyticsEvent, { select: { id: true, invitationId: true, eventType: true, createdAt: true } }),
      safeFindMany(prisma.guestBookMessage, { select: { id: true, invitationCode: true, name: true, message: true, status: true, createdAt: true } }),
      safeFindMany(prisma.coupleMessagesSetting, { select: { invitationCode: true, mode: true } }),
      safeFindMany(prisma.clientMessage, { select: { id: true, invitationCode: true, title: true, body: true, readAt: true } }),
      safeFindMany(prisma.invitationCheckIn, { select: { id: true, invitationCode: true, visitorKey: true, createdAt: true } }),
      safeFindMany(prisma.weddingLiveMode, { select: { invitationCode: true, enabled: true, events: true } }),
      safeFindMany(prisma.internalNote, { select: { id: true, entityType: true, entityId: true, body: true, authorLabel: true } }),
      safeFindMany(prisma.backupJob, { select: { id: true, type: true, status: true, fileName: true, startedAt: true, finishedAt: true, error: true, createdAt: true } }),
      safeFindMany(prisma.syncLog, { select: { id: true, reason: true, status: true, errorMessage: true, retryCount: true, nextRetryAt: true, createdAt: true } }),
      safeFindMany(prisma.dynamicPage, { select: { id: true, slug: true, coverImageUrl: true } }),
      safeFindMany(prisma.weddingTemplate, { select: { id: true, slug: true, previewUrl: true } }),
    ]);

    const dbReadErrors = Object.entries({
      customers,
      invitations,
      orders,
      guests,
      analyticsEvents,
      guestBookMessages,
      coupleSettings,
      clientMessages,
      checkIns,
      liveModes,
      internalNotes,
      backupJobs,
      syncLogs,
      dynamicPages,
      templates,
    })
      .filter(([, value]) => value && !Array.isArray(value) && value.__error)
      .map(([name, value]) => ({ table: name, error: value.__error }));

    if (dbReadErrors.length) {
      return {
        available: true,
        readOnly: true,
        counts,
        dbReadErrors,
        duplicates: {},
        orphans: {},
        emptyOrCorruptFields: [],
        staleJobs: [],
        failedRepeatedJobs: [],
        uploadReferences: [],
      };
    }

    const customerIds = new Set(customers.map((item) => item.id));
    const invitationIds = new Set(invitations.map((item) => item.id));
    const invitationCodes = new Set(invitations.filter((item) => !item.deletedAt).map((item) => normalizeString(item.code)).filter(Boolean));
    const orderIds = new Set(orders.map((item) => item.id));

    const duplicates = {
      customerPhone: groupDuplicates(customers, (item) => normalizeString(item.phone)),
      customerEmail: groupDuplicates(customers, (item) => normalizeString(item.email).toLowerCase()),
      invitationCode: groupDuplicates(invitations, (item) => normalizeString(item.code)),
      invitationCustomSlug: groupDuplicates(invitations, (item) => normalizeString(item.customSlug)),
      orderPhoneDateNames: groupDuplicates(
        orders,
        (item) =>
          `${normalizeString(item.phone)}|${toIso(item.weddingDate) || ""}|${normalizeString(item.groomName)}|${normalizeString(item.brideName)}`,
      ),
      orderNumber: groupDuplicates(orders, (item) => normalizeString(item.orderNumber)),
      orderDedupeKey: groupDuplicates(orders, (item) => normalizeString(item.dedupeKey)),
      guestRsvpInvitationPhoneName: groupDuplicates(
        guests,
        (item) => `${normalizeString(item.invitationId)}|${normalizeString(item.phone)}|${normalizeString(item.name)}`,
      ),
      guestBookNameMessageCode: groupDuplicates(
        guestBookMessages,
        (item) => `${normalizeString(item.invitationCode)}|${normalizeString(item.name)}|${normalizeString(item.message)}`,
      ),
      checkInInvitationVisitor: groupDuplicates(
        checkIns,
        (item) => `${normalizeString(item.invitationCode)}|${normalizeString(item.visitorKey)}`,
      ),
    };

    const orphans = {
      invitations: invitations.filter((item) => !customerIds.has(item.customerId)),
      orders: orders.filter((item) => item.customerId && !customerIds.has(item.customerId)),
      guests: guests.filter((item) => !invitationIds.has(item.invitationId)),
      analytics: analyticsEvents.filter((item) => !invitationIds.has(item.invitationId)),
      guestBook: guestBookMessages.filter((item) => !invitationCodes.has(normalizeString(item.invitationCode))),
      coupleSettings: coupleSettings.filter((item) => !invitationCodes.has(normalizeString(item.invitationCode))),
      clientMessages: clientMessages.filter((item) => !invitationCodes.has(normalizeString(item.invitationCode))),
      checkIns: checkIns.filter((item) => !invitationCodes.has(normalizeString(item.invitationCode))),
      liveModes: liveModes.filter((item) => !invitationCodes.has(normalizeString(item.invitationCode))),
      internalNotes: internalNotes.filter((item) => {
        if (!OPERATIONAL_ENTITY_TYPES.has(item.entityType)) return false;
        if (item.entityType === "customer") return !customerIds.has(item.entityId);
        if (item.entityType === "invitation") return !invitationCodes.has(item.entityId) && !invitationIds.has(item.entityId);
        if (item.entityType === "order") return !orderIds.has(item.entityId);
        return false;
      }),
    };

    const emptyOrCorruptFields = [];
    for (const customer of customers) {
      if (!normalizeString(customer.name)) emptyOrCorruptFields.push({ table: "Customer", id: customer.id, field: "name" });
      if (!normalizeString(customer.phone)) emptyOrCorruptFields.push({ table: "Customer", id: customer.id, field: "phone" });
      if (!normalizeString(customer.username)) emptyOrCorruptFields.push({ table: "Customer", id: customer.id, field: "username" });
    }
    for (const invitation of invitations) {
      if (!normalizeString(invitation.code)) emptyOrCorruptFields.push({ table: "Invitation", id: invitation.id, field: "code" });
      if (!normalizeString(invitation.groomName)) emptyOrCorruptFields.push({ table: "Invitation", id: invitation.id, field: "groomName" });
      if (!normalizeString(invitation.brideName)) emptyOrCorruptFields.push({ table: "Invitation", id: invitation.id, field: "brideName" });
    }
    for (const order of orders) {
      if (!normalizeString(order.phone)) emptyOrCorruptFields.push({ table: "OrderRequest", id: order.id, field: "phone" });
      if (!normalizeString(order.groomName)) emptyOrCorruptFields.push({ table: "OrderRequest", id: order.id, field: "groomName" });
      if (!normalizeString(order.brideName)) emptyOrCorruptFields.push({ table: "OrderRequest", id: order.id, field: "brideName" });
    }

    const staleJobs = backupJobs.filter((job) => {
      if (!["QUEUED", "RUNNING"].includes(job.status)) return false;
      const date = job.startedAt || job.createdAt;
      return now.getTime() - new Date(date).getTime() > STALE_JOB_MS;
    });
    const failedRepeatedJobs = syncLogs.filter((log) => log.status === "failed" && log.retryCount >= 3);

    const uploadReferences = new Set();
    for (const item of [...invitations, ...orders, ...dynamicPages, ...templates]) {
      for (const text of collectAllStrings(item)) collectUploadRefs(text, uploadReferences);
      collectUploadRefs(item, uploadReferences);
    }

    return {
      available: true,
      readOnly: true,
      counts,
      duplicates,
      orphans,
      emptyOrCorruptFields,
      staleJobs,
      failedRepeatedJobs,
      uploadReferences: [...uploadReferences],
    };
  } finally {
    await prisma.$disconnect().catch(() => undefined);
  }
}

function compactIssueCounts(value) {
  if (Array.isArray(value)) return value.length;
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, compactIssueCounts(item)]));
  }
  return value;
}

async function main() {
  const database = await auditDatabase();
  const legacyJson = await auditLegacyJson();
  const media = await auditMedia(legacyJson, database.uploadReferences || []);
  const backups = await auditBackups();

  const report = {
    generatedAt: now.toISOString(),
    mode: "dry-run-read-only",
    safety: {
      deletesData: false,
      writesDatabase: false,
      writesFiles: false,
      notes: [
        "This audit only reads filesystem and database state.",
        "Any cleanup candidate must be reviewed before running a separate destructive action.",
      ],
    },
    database,
    legacyJson,
    media,
    backups,
    summary: {
      databaseAvailable: database.available,
      databaseIssueCounts: {
        duplicates: compactIssueCounts(database.duplicates || {}),
        orphans: compactIssueCounts(database.orphans || {}),
        emptyOrCorruptFields: compactIssueCounts(database.emptyOrCorruptFields || []),
        staleJobs: compactIssueCounts(database.staleJobs || []),
        failedRepeatedJobs: compactIssueCounts(database.failedRepeatedJobs || []),
      },
      legacyJsonIssueCounts: {
        duplicates: compactIssueCounts(legacyJson.duplicates || {}),
        orphans: compactIssueCounts(legacyJson.orphans || {}),
        invalidFiles: legacyJson.invalidFiles.length,
        emptyOrCorruptFields: legacyJson.emptyOrCorruptFields.length,
      },
      mediaIssueCounts: {
        unusedFiles: media.unusedFiles.length,
        duplicateContentGroups: media.duplicateContent.length,
        oldTemporary: media.oldTemporary.length,
      },
      backupIssueCounts: {
        invalidFiles: backups.invalidFiles.length,
        duplicateContentGroups: backups.duplicateContent.length,
        oldByRetention: backups.oldByRetention.length,
      },
    },
  };

  console.log(JSON.stringify(report, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack || error.message : String(error));
  process.exitCode = 1;
});
