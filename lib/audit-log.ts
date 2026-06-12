import { Prisma } from "@prisma/client";
import type { NextRequest } from "next/server";
import { ADMIN_SESSION_COOKIE, getAdminSessionUser } from "./admin-session";
import { prisma } from "./db";

export type AuditActorType = "admin" | "client" | "public" | "system";

export type AuditAction =
  | "invitation.create"
  | "invitation.update"
  | "invitation.delete"
  | "invitation.pause"
  | "invitation.resume"
  | "invitation.archive"
  | "order.create"
  | "order.publish"
  | "template.change"
  | "media.image.upload"
  | "media.image.delete"
  | "guestbook.bulk.approve"
  | "guestbook.bulk.delete"
  | "cleanup.database.delete"
  | "cleanup.storage.delete"
  | "github.sync"
  | "backup.restore";

export type AuditEntityType = "Invitation" | "Order" | "Template" | "Media" | "GuestBookMessage" | "Cleanup" | "GitHubSync" | "Backup";

export type AuditLogEntry = {
  id: string;
  createdAt: string;
  actor: {
    type: AuditActorType;
    id?: string;
    label: string;
  };
  action: AuditAction;
  entity: {
    type: AuditEntityType;
    id: string;
    label?: string;
  };
  oldValues?: unknown;
  newValues?: unknown;
  metadata?: Record<string, unknown>;
};

export type AuditLogFilters = {
  q?: string;
  action?: string;
  entityType?: string;
  actor?: string;
  from?: string;
  to?: string;
};

type AuditLogInput = Omit<AuditLogEntry, "id" | "createdAt"> & {
  createdAt?: string;
};

const maxStoredEntries = 5000;
const maxStringLength = 900;

function createAuditId() {
  return `audit-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function trimString(value: string) {
  if (value.length <= maxStringLength) return value;
  return `${value.slice(0, maxStringLength)}... [trimmed ${value.length - maxStringLength} chars]`;
}

function safeSnapshot(value: unknown, depth = 0): unknown {
  if (value === null || value === undefined) return value;
  if (typeof value === "string") return trimString(value);
  if (typeof value === "number" || typeof value === "boolean") return value;
  if (value instanceof Date) return value.toISOString();
  if (depth >= 4) return "[nested]";
  if (Array.isArray(value)) return value.slice(0, 25).map((item) => safeSnapshot(item, depth + 1));
  if (typeof value === "object") {
    const output: Record<string, unknown> = {};
    for (const [key, item] of Object.entries(value as Record<string, unknown>).slice(0, 80)) {
      output[key] = safeSnapshot(item, depth + 1);
    }
    return output;
  }
  return String(value);
}

function toPrismaJson(value: unknown) {
  if (value === undefined) return undefined;
  if (value === null) return Prisma.JsonNull;
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

export async function getAuditActorFromAdminRequest(request: NextRequest) {
  const username = await getAdminSessionUser(request.cookies.get(ADMIN_SESSION_COOKIE)?.value);
  return {
    type: "admin" as const,
    id: username || "admin",
    label: username || "Admin",
  };
}

export function getPublicAuditActor(label = "Public visitor") {
  return {
    type: "public" as const,
    label,
  };
}

export function getSystemAuditActor(label = "System") {
  return {
    type: "system" as const,
    label,
  };
}

export async function recordAuditLog(input: AuditLogInput) {
  const entry: AuditLogEntry = {
    id: createAuditId(),
    createdAt: input.createdAt || new Date().toISOString(),
    actor: input.actor,
    action: input.action,
    entity: input.entity,
    ...(input.oldValues !== undefined ? { oldValues: safeSnapshot(input.oldValues) } : {}),
    ...(input.newValues !== undefined ? { newValues: safeSnapshot(input.newValues) } : {}),
    ...(input.metadata ? { metadata: safeSnapshot(input.metadata) as Record<string, unknown> } : {}),
  };

  if (!prisma) {
    console.error("[Audit Log] PostgreSQL is not configured. Refusing JSON write.");
    return entry;
  }

  try {
    await prisma.auditLog.create({
      data: {
        id: entry.id,
        actorType: entry.actor.type,
        actorId: entry.actor.id || null,
        actorLabel: entry.actor.label,
        action: entry.action,
        entityType: entry.entity.type,
        entityId: entry.entity.id,
        entityLabel: entry.entity.label || null,
        oldValues: toPrismaJson(entry.oldValues),
        newValues: toPrismaJson(entry.newValues),
        metadata: toPrismaJson(entry.metadata),
        createdAt: new Date(entry.createdAt),
      },
    });
  } catch (error) {
    console.error("Failed to write audit log to PostgreSQL", error);
  }
  return entry;
}

function normalizeText(value: unknown) {
  return String(value || "").toLowerCase();
}

function dateValue(value?: string) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.getTime();
}

export async function listAuditLogEntries(filters: AuditLogFilters = {}) {
  let entries: AuditLogEntry[] = [];
  if (prisma) {
    try {
      const rows = await prisma.auditLog.findMany({ orderBy: { createdAt: "desc" }, take: maxStoredEntries });
      entries = rows.map((row) => ({
        id: row.id,
        createdAt: row.createdAt.toISOString(),
        actor: { type: row.actorType as AuditActorType, ...(row.actorId ? { id: row.actorId } : {}), label: row.actorLabel },
        action: row.action as AuditAction,
        entity: { type: row.entityType as AuditEntityType, id: row.entityId, ...(row.entityLabel ? { label: row.entityLabel } : {}) },
        ...(row.oldValues !== null ? { oldValues: row.oldValues } : {}),
        ...(row.newValues !== null ? { newValues: row.newValues } : {}),
        ...(row.metadata !== null ? { metadata: row.metadata as Record<string, unknown> } : {}),
      }));
    } catch (error) {
      console.error("Failed to read audit log from PostgreSQL", error);
    }
  }
  const query = normalizeText(filters.q).trim();
  const from = dateValue(filters.from);
  const to = dateValue(filters.to);

  return entries.filter((entry) => {
    const timestamp = Date.parse(entry.createdAt);
    const haystack = [
      entry.actor.label,
      entry.actor.id,
      entry.action,
      entry.entity.type,
      entry.entity.id,
      entry.entity.label,
      entry.oldValues ? JSON.stringify(entry.oldValues) : "",
      entry.newValues ? JSON.stringify(entry.newValues) : "",
      entry.metadata ? JSON.stringify(entry.metadata) : "",
    ]
      .join(" ")
      .toLowerCase();

    return (
      (!query || haystack.includes(query)) &&
      (!filters.action || filters.action === "all" || entry.action === filters.action) &&
      (!filters.entityType || filters.entityType === "all" || entry.entity.type === filters.entityType) &&
      (!filters.actor || filters.actor === "all" || entry.actor.type === filters.actor || entry.actor.label.toLowerCase().includes(filters.actor.toLowerCase())) &&
      (from === null || timestamp >= from) &&
      (to === null || timestamp <= to + 86_399_999)
    );
  });
}

function csvCell(value: unknown) {
  const text = typeof value === "string" ? value : value === undefined ? "" : JSON.stringify(value);
  return `"${text.replace(/"/g, '""')}"`;
}

export function auditLogEntriesToCsv(entries: AuditLogEntry[]) {
  const rows = [
    ["time", "actor", "actor_type", "action", "entity_type", "entity_id", "entity_label", "old_values", "new_values", "metadata"],
    ...entries.map((entry) => [
      entry.createdAt,
      entry.actor.label,
      entry.actor.type,
      entry.action,
      entry.entity.type,
      entry.entity.id,
      entry.entity.label || "",
      entry.oldValues,
      entry.newValues,
      entry.metadata,
    ]),
  ];

  return rows.map((row) => row.map(csvCell).join(",")).join("\n");
}

export const auditActionLabels: Record<AuditAction, string> = {
  "invitation.create": "إنشاء دعوة",
  "invitation.update": "تعديل دعوة",
  "invitation.delete": "حذف دعوة",
  "invitation.pause": "إيقاف دعوة",
  "invitation.resume": "تشغيل دعوة",
  "invitation.archive": "أرشفة دعوة",
  "order.create": "إنشاء طلب",
  "order.publish": "نشر طلب",
  "template.change": "تغيير قالب",
  "media.image.upload": "رفع صورة",
  "media.image.delete": "حذف صورة",
  "guestbook.bulk.approve": "اعتماد رسائل تهنئة جماعي",
  "guestbook.bulk.delete": "حذف رسائل تهنئة جماعي",
  "cleanup.database.delete": "تنظيف قاعدة البيانات",
  "cleanup.storage.delete": "تنظيف التخزين",
  "github.sync": "مزامنة GitHub",
  "backup.restore": "استعادة Backup",
};
