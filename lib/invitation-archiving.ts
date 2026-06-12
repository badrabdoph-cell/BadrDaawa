import { unstable_noStore as noStore } from "next/cache";
import { prisma } from "./db";

const archiveAfterMs = 2 * 24 * 60 * 60 * 1000;

export function getArchiveCutoffDate(now = Date.now()) {
  return new Date(now - archiveAfterMs);
}

export async function archiveExpiredInvitations(code?: string) {
  noStore();
  const cutoff = getArchiveCutoffDate();
  if (!prisma) return 0;
  try {
    const result = await prisma.invitation.updateMany({
      where: {
        ...(code ? { code } : {}),
        deletedAt: null,
        weddingDate: { lte: cutoff },
        status: { not: "ARCHIVED" },
      },
      data: { status: "ARCHIVED" },
    });
    return result.count;
  } catch (error) {
    console.error("Failed to auto archive database invitations", error);
    return 0;
  }
}
