import { prisma } from "./db";
import { getMediaCleanupReport } from "./media-cleanup";
import { removeAdminFavorite } from "./admin-favorites";
import { deleteUploadFile, storageKeyFromUploadUrl } from "./storage-provider";

type InvitationDeleteSummary = {
  ok: boolean;
  code: string;
  deletedInvitation: boolean;
  deletedRecords: Record<string, number>;
  deletedFiles: Array<{ url: string; sizeBytes: number; kind: string }>;
  skippedFiles: Array<{ url: string; reason: string; sources?: string[] }>;
};

const uploadUrlPattern = /(?:https?:\/\/[^"'\s<>)]+)?\/uploads\/[^"'\s<>)]+/gi;

function collectUploadUrls(value: unknown, output = new Set<string>()) {
  if (!value) return output;
  if (typeof value === "string") {
    for (const match of value.matchAll(uploadUrlPattern)) {
      const raw = match[0] || "";
      try {
        const pathname = raw.startsWith("http://") || raw.startsWith("https://") ? new URL(raw).pathname : raw.split("?")[0].split("#")[0];
        if (pathname.startsWith("/uploads/")) output.add(decodeURI(pathname));
      } catch {
        const pathname = raw.split("?")[0].split("#")[0];
        if (pathname.startsWith("/uploads/")) output.add(pathname);
      }
    }
    return output;
  }
  if (Array.isArray(value)) {
    value.forEach((item) => collectUploadUrls(item, output));
    return output;
  }
  if (typeof value === "object") {
    Object.values(value as Record<string, unknown>).forEach((item) => collectUploadUrls(item, output));
  }
  return output;
}

async function deleteUnreferencedUploadUrls(urls: string[]) {
  const report = await getMediaCleanupReport();
  const files = new Map(report.unusedFiles.concat(report.usedFiles).map((file) => [file.url, file]));
  const deletedFiles: InvitationDeleteSummary["deletedFiles"] = [];
  const skippedFiles: InvitationDeleteSummary["skippedFiles"] = [];

  for (const url of Array.from(new Set(urls))) {
    const file = files.get(url);
    if (!file) {
      skippedFiles.push({ url, reason: "missing" });
      continue;
    }
    if (file.sources.length > 0) {
      skippedFiles.push({ url, reason: "still-used", sources: file.sources });
      continue;
    }
    const key = storageKeyFromUploadUrl(file.url);
    if (!key) {
      skippedFiles.push({ url, reason: "invalid-key" });
      continue;
    }
    const deleted = await deleteUploadFile(key);
    if (deleted) deletedFiles.push({ url: file.url, sizeBytes: file.sizeBytes, kind: file.kind });
    else skippedFiles.push({ url, reason: "delete-failed" });
  }

  return { deletedFiles, skippedFiles };
}

export async function hardDeleteInvitationCompletely(code: string): Promise<InvitationDeleteSummary> {
  const cleanCode = code.trim();
  const empty: InvitationDeleteSummary = { ok: false, code: cleanCode, deletedInvitation: false, deletedRecords: {}, deletedFiles: [], skippedFiles: [] };
  if (!cleanCode || !prisma) return empty;

  const target = await prisma.invitation.findFirst({
    where: { code: cleanCode, deletedAt: { not: null } },
    select: {
      id: true,
      code: true,
      customSlug: true,
      heroPhoto: true,
      gallery: true,
      musicUrl: true,
      qrCodeUrl: true,
      postImageUrl: true,
      texts: true,
      photographer: true,
    },
  });
  if (!target) return empty;

  const aliases = Array.from(new Set([target.code, target.customSlug].filter((item): item is string => Boolean(item))));
  const noteEntityIds = Array.from(new Set([target.id, ...aliases]));
  const [guestBookMessages, clientMessages, liveModes, internalNotes, rsvps] = await Promise.all([
    prisma.guestBookMessage.findMany({ where: { invitationCode: { in: aliases } }, select: { message: true } }),
    prisma.clientMessage.findMany({ where: { invitationCode: { in: aliases } }, select: { title: true, body: true } }),
    prisma.weddingLiveMode.findMany({ where: { invitationCode: { in: aliases } }, select: { announcement: true, events: true } }),
    prisma.internalNote.findMany({ where: { entityType: "invitation", entityId: { in: noteEntityIds } }, select: { body: true } }),
    prisma.guestRsvp.findMany({ where: { invitationId: target.id }, select: { note: true } }),
  ]);
  const mediaUrls = Array.from(
    collectUploadUrls({
      heroPhoto: target.heroPhoto,
      gallery: target.gallery,
      musicUrl: target.musicUrl,
      qrCodeUrl: target.qrCodeUrl,
      postImageUrl: target.postImageUrl,
      texts: target.texts,
      photographer: target.photographer,
      guestBookMessages,
      clientMessages,
      liveModes,
      internalNotes,
      rsvps,
    }),
  );

  const deletedRecords = await prisma.$transaction(async (tx) => {
    const counts: Record<string, number> = {};
    counts.guestBookMessages = (await tx.guestBookMessage.deleteMany({ where: { invitationCode: { in: aliases } } })).count;
    counts.coupleMessagesSettings = (await tx.coupleMessagesSetting.deleteMany({ where: { invitationCode: { in: aliases } } })).count;
    counts.clientMessages = (await tx.clientMessage.deleteMany({ where: { invitationCode: { in: aliases } } })).count;
    counts.checkIns = (await tx.invitationCheckIn.deleteMany({ where: { invitationCode: { in: aliases } } })).count;
    counts.liveModes = (await tx.weddingLiveMode.deleteMany({ where: { invitationCode: { in: aliases } } })).count;
    counts.internalNotes = (await tx.internalNote.deleteMany({ where: { entityType: "invitation", entityId: { in: noteEntityIds } } })).count;
    counts.rsvp = await tx.guestRsvp.count({ where: { invitationId: target.id } });
    counts.analyticsEvents = await tx.analyticsEvent.count({ where: { invitationId: target.id } });
    counts.invitations = (await tx.invitation.deleteMany({ where: { id: target.id, deletedAt: { not: null } } })).count;
    return counts;
  });

  await removeAdminFavorite("invitation", target.code).catch(() => false);
  if (target.customSlug) await removeAdminFavorite("invitation", target.customSlug).catch(() => false);
  const media = await deleteUnreferencedUploadUrls(mediaUrls);

  return {
    ok: deletedRecords.invitations > 0,
    code: target.code,
    deletedInvitation: deletedRecords.invitations > 0,
    deletedRecords,
    deletedFiles: media.deletedFiles,
    skippedFiles: media.skippedFiles,
  };
}
