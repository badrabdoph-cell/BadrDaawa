import type { Prisma } from "@prisma/client";
import { unstable_noStore as noStore } from "next/cache";
import { prisma } from "./db";

export async function readAppSetting<T>(key: string): Promise<T | null> {
  noStore();
  if (!prisma) {
    throw new Error("DATABASE_URL is required. PostgreSQL is the only live source of truth.");
  }

  try {
    const row = await prisma.appSetting.findUnique({ where: { key } });
    if (row) {
      console.log(`[AppSettings] Loaded: ${key}`);
      return (row.value as T) || null;
    }
    console.log(`[AppSettings] Not found: ${key}`);
    return null;
  } catch (error) {
    console.error(`[AppSettings] CRITICAL ERROR reading ${key}:`, error instanceof Error ? error.message : String(error));
    throw error;
  }
}

export async function readAppSettingOrSeed<T>(key: string, seed: () => Promise<T> | T): Promise<T> {
  const saved = await readAppSetting<T>(key);
  if (saved !== null) return saved;
  return seed();
}

export async function writeAppSetting<T>(key: string, value: T): Promise<T> {
  noStore();
  if (!prisma) {
    throw new Error("DATABASE_URL is required. PostgreSQL is the only live source of truth.");
  }

  try {
    const upserted = await prisma.appSetting.upsert({
      where: { key },
      create: { key, value: value as Prisma.InputJsonValue },
      update: { value: value as Prisma.InputJsonValue },
    });
    console.log(`[AppSettings] Successfully saved: ${key}`);
    return (upserted.value as T) || value;
  } catch (error) {
    console.error(`[AppSettings] CRITICAL: Failed to save ${key}:`, error);
    throw error;
  }
}
