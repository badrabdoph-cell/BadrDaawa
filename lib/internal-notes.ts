import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { unstable_noStore as noStore } from "next/cache";
import { prisma } from "./db";
import type { InternalNote, InternalNoteEntityType } from "./types";

const notesPath = path.join(process.cwd(), "data", "internal-notes.json");
const maxStoredNotes = 5000;

type InternalNoteInput = {
  id?: unknown;
  entityType?: unknown;
  entityId?: unknown;
  body?: unknown;
  authorLabel?: unknown;
  createdAt?: unknown;
  updatedAt?: unknown;
};

export type InternalNoteFilters = {
  entityType?: InternalNoteEntityType;
  entityId?: string;
  q?: string;
};

function nowIso() {
  return new Date().toISOString();
}

function createNoteId() {
  return `internal-note-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
}

function cleanText(value: unknown, maxLength: number) {
  return String(value || "").replace(/\r\n/g, "\n").trim().slice(0, maxLength);
}

function normalizeEntityType(value: unknown): InternalNoteEntityType | null {
  return value === "order" || value === "invitation" || value === "customer" ? value : null;
}

function normalizeNote(value: InternalNoteInput): InternalNote | null {
  const entityType = normalizeEntityType(value.entityType);
  const entityId = cleanText(value.entityId, 180);
  const body = cleanText(value.body, 4000);
  if (!entityType || !entityId || !body) return null;
  const timestamp = nowIso();
  return {
    id: cleanText(value.id, 120) || createNoteId(),
    entityType,
    entityId,
    body,
    authorLabel: cleanText(value.authorLabel, 120) || "Admin",
    createdAt: typeof value.createdAt === "string" && value.createdAt ? value.createdAt : timestamp,
    updatedAt: typeof value.updatedAt === "string" && value.updatedAt ? value.updatedAt : timestamp,
  };
}

function sortNotes(notes: InternalNote[]) {
  return [...notes].sort((first, second) => second.updatedAt.localeCompare(first.updatedAt));
}

async function readNotesRaw() {
  try {
    const raw = await readFile(notesPath, "utf8");
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return sortNotes(parsed.map((item) => normalizeNote(item as InternalNoteInput)).filter(Boolean) as InternalNote[]);
  } catch {
    return [];
  }
}

async function writeNotes(notes: InternalNote[]) {
  await mkdir(path.dirname(notesPath), { recursive: true });
  await writeFile(notesPath, `${JSON.stringify(sortNotes(notes).slice(0, maxStoredNotes), null, 2)}\n`, "utf8");
}

function matchesQuery(note: InternalNote, query: string) {
  if (!query) return true;
  const haystack = [note.body, note.authorLabel, note.entityType, note.entityId, note.createdAt, note.updatedAt].join(" ").toLowerCase();
  return haystack.includes(query);
}

function toInternalNote(row: { id: string; entityType: string; entityId: string; body: string; authorLabel: string; createdAt: Date; updatedAt: Date }): InternalNote {
  return {
    id: row.id,
    entityType: normalizeEntityType(row.entityType) || "order",
    entityId: row.entityId,
    body: row.body,
    authorLabel: row.authorLabel,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function getInternalNotes(filters: InternalNoteFilters = {}) {
  noStore();
  if (prisma) {
    try {
      const rows = await prisma.internalNote.findMany({
        where: {
          ...(filters.entityType ? { entityType: filters.entityType } : {}),
          ...(filters.entityId ? { entityId: filters.entityId } : {}),
        },
        orderBy: { updatedAt: "desc" },
        take: maxStoredNotes,
      });
      const notes = rows.map(toInternalNote);
      const query = cleanText(filters.q, 200).toLowerCase();
      if (notes.length) return notes.filter((note) => matchesQuery(note, query));
    } catch (error) {
      console.error("Failed to load internal notes from PostgreSQL", error);
    }
  }
  const notes = await readNotesRaw();
  const query = cleanText(filters.q, 200).toLowerCase();
  return notes.filter((note) => (!filters.entityType || note.entityType === filters.entityType) && (!filters.entityId || note.entityId === filters.entityId) && matchesQuery(note, query));
}

export async function getInternalNotesForEntity(entityType: InternalNoteEntityType, entityId: string, q?: string) {
  return getInternalNotes({ entityType, entityId, q });
}

export async function createInternalNote(input: {
  entityType: unknown;
  entityId: unknown;
  body: unknown;
  authorLabel?: unknown;
}) {
  const note = normalizeNote({
    id: createNoteId(),
    entityType: input.entityType,
    entityId: input.entityId,
    body: input.body,
    authorLabel: input.authorLabel,
    createdAt: nowIso(),
    updatedAt: nowIso(),
  });
  if (!note) return null;
  if (!prisma) {
    console.error("[Internal Notes] PostgreSQL is not configured. Refusing JSON write.");
    return null;
  }
  const saved = await prisma.internalNote.create({
    data: {
      id: note.id,
      entityType: note.entityType,
      entityId: note.entityId,
      body: note.body,
      authorLabel: note.authorLabel,
      createdAt: new Date(note.createdAt),
      updatedAt: new Date(note.updatedAt),
    },
  });
  return toInternalNote(saved);
}

export async function updateInternalNote(id: string, input: { body: unknown; authorLabel?: unknown }) {
  const noteId = cleanText(id, 120);
  if (!prisma) {
    console.error("[Internal Notes] PostgreSQL is not configured. Refusing JSON write.");
    return null;
  }
  const existing = await prisma.internalNote.findUnique({ where: { id: noteId } }).catch(() => null);
  if (!existing) return null;
  const updated = normalizeNote({
    ...toInternalNote(existing),
    body: input.body,
    authorLabel: input.authorLabel || existing.authorLabel,
    updatedAt: nowIso(),
  });
  if (!updated) return null;
  const saved = await prisma.internalNote.update({
    where: { id: noteId },
    data: { body: updated.body, authorLabel: updated.authorLabel, updatedAt: new Date(updated.updatedAt) },
  });
  return toInternalNote(saved);
}

export async function deleteInternalNote(id: string) {
  const noteId = cleanText(id, 120);
  if (!prisma) {
    console.error("[Internal Notes] PostgreSQL is not configured. Refusing JSON write.");
    return false;
  }
  const existing = await prisma.internalNote.findUnique({ where: { id: noteId }, select: { id: true } }).catch(() => null);
  if (!existing) return false;
  await prisma.internalNote.delete({ where: { id: noteId } });
  return true;
}

export function groupInternalNotesByEntity(notes: InternalNote[]) {
  return notes.reduce((map, note) => {
    const key = `${note.entityType}:${note.entityId}`;
    const current = map.get(key) || [];
    current.push(note);
    map.set(key, current);
    return map;
  }, new Map<string, InternalNote[]>());
}
