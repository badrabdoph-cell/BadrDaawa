import { PrismaClient } from "@prisma/client";
import { getDatabaseUrl } from "./database-url";

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

const databaseUrl = getDatabaseUrl();

export const prisma =
  databaseUrl
    ? globalForPrisma.prisma ??
      new PrismaClient({
        datasources: { db: { url: databaseUrl } },
        log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
      })
    : null;

if (process.env.NODE_ENV !== "production" && prisma) {
  globalForPrisma.prisma = prisma;
}
