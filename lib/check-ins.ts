import { readFile } from "node:fs/promises";
import path from "node:path";
import { unstable_noStore as noStore } from "next/cache";
import { writeJsonFileAtomic } from "./atomic-file";
import { prisma } from "./db";
import type { InvitationCheckIn } from "./types";

type CheckInStore = {
  checkIns: InvitationCheckIn[];
};

const storePath = path.join(process.cwd(), "data", "check-ins.json");

function cleanText(value: unknown, limit: number) {
  return (typeof value === "string" ? value : "").trim().slice(0, limit);
}

function createEmptyStore(): CheckInStore {
  return { checkIns: [] };
}

function normalizeCheckIn(value: unknown): InvitationCheckIn | null {
  if (!value || typeof value !== "object") return null;
  const raw = value as Partial<InvitationCheckIn>;
  const id = cleanText(raw.id, 120);
  const invitationCode = cleanText(raw.invitationCode, 160);
  const visitorKey = cleanText(raw.visitorKey, 160);
  const createdAt = cleanText(raw.createdAt, 80);
  if (!id || !invitationCode || !visitorKey || !createdAt) return null;
  return {
    id,
    invitationCode,
    visitorKey,
    createdAt,
    ...(raw.userAgent ? { userAgent: cleanText(raw.userAgent, 240) } : {}),
  };
}

async function readStore(): Promise<CheckInStore> {
  noStore();
  try {
    const raw = await readFile(storePath, "utf8");
    const parsed = JSON.parse(raw) as Partial<CheckInStore>;
    return {
      checkIns: Array.isArray(parsed.checkIns) ? parsed.checkIns.map(normalizeCheckIn).filter((item): item is InvitationCheckIn => Boolean(item)) : [],
    };
  } catch {
    return createEmptyStore();
  }
}

async function writeStore(store: CheckInStore) {
  await writeJsonFileAtomic(storePath, store);
}

function createId() {
  return `ci_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function toCheckIn(row: { id: string; invitationCode: string; visitorKey: string; createdAt: Date; userAgent: string | null }): InvitationCheckIn {
  return {
    id: row.id,
    invitationCode: row.invitationCode,
    visitorKey: row.visitorKey,
    createdAt: row.createdAt.toISOString(),
    ...(row.userAgent ? { userAgent: row.userAgent } : {}),
  };
}

export async function getAllCheckIns() {
  if (prisma) {
    try {
      const checkIns = await prisma.invitationCheckIn.findMany({ orderBy: { createdAt: "desc" } });
      if (checkIns.length) return checkIns.map(toCheckIn);
    } catch (error) {
      console.error("Failed to load check-ins from PostgreSQL", error);
    }
  }
  const store = await readStore();
  return store.checkIns.sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
}

export async function getCheckInsByInvitation(invitationCode: string) {
  const cleanCode = invitationCode.trim().toLowerCase();
  const checkIns = await getAllCheckIns();
  return checkIns.filter((item) => item.invitationCode.toLowerCase() === cleanCode);
}

export async function hasCheckIn(invitationCode: string, visitorKey: string) {
  const cleanCode = invitationCode.trim().toLowerCase();
  const cleanVisitor = visitorKey.trim();
  if (!cleanCode || !cleanVisitor) return false;
  const checkIns = await getAllCheckIns();
  return checkIns.some((item) => item.invitationCode.toLowerCase() === cleanCode && item.visitorKey === cleanVisitor);
}

export async function createCheckIn(input: { invitationCode: unknown; visitorKey: unknown; userAgent?: unknown }) {
  const invitationCode = cleanText(input.invitationCode, 160);
  const visitorKey = cleanText(input.visitorKey, 160) || createId();
  if (!invitationCode) return null;

  if (!prisma) {
    console.error("[Check-ins] PostgreSQL is not configured. Refusing JSON write.");
    return null;
  }

  const existing = await prisma.invitationCheckIn.findUnique({
    where: { invitationCode_visitorKey: { invitationCode, visitorKey } },
  }).catch(() => null);
  if (existing) return { checkIn: toCheckIn(existing), duplicate: true };

  const saved = await prisma.invitationCheckIn.create({
    data: {
      id: createId(),
      invitationCode,
      visitorKey,
      userAgent: input.userAgent ? cleanText(input.userAgent, 240) : null,
    },
  });
  return { checkIn: toCheckIn(saved), duplicate: false };
}

export async function getCheckInDashboard() {
  const checkIns = await getAllCheckIns();
  const todayKey = new Date().toISOString().slice(0, 10);
  const invitationCounts = new Map<string, number>();
  checkIns.forEach((item) => {
    invitationCounts.set(item.invitationCode, (invitationCounts.get(item.invitationCode) || 0) + 1);
  });
  const topInvitation = Array.from(invitationCounts.entries()).sort((a, b) => b[1] - a[1])[0];
  return {
    checkIns,
    totals: {
      checkIns: checkIns.length,
      invitations: invitationCounts.size,
      today: checkIns.filter((item) => item.createdAt.slice(0, 10) === todayKey).length,
      topInvitationCode: topInvitation?.[0] || "",
      topInvitationCount: topInvitation?.[1] || 0,
    },
    invitationCounts,
  };
}
