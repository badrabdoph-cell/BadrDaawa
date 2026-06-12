import type { Prisma } from "@prisma/client";
import { unstable_noStore as noStore } from "next/cache";
import { prisma } from "./db";

export async function readAppSetting<T>(key: string): Promise<T | null> {
  noStore();
  if (!prisma) {
    throw new Error("DATABASE_URL is required. PostgreSQL is the only live source of truth.");
  }

  const row = await prisma.appSetting.findUnique({ where: { key } });
  return row ? (row.value as T) : null;
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

  await prisma.appSetting.upsert({
    where: { key },
    create: { key, value: value as Prisma.InputJsonValue },
    update: { value: value as Prisma.InputJsonValue },
  });
  return value;
}
