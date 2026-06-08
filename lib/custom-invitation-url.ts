import { prisma } from "./db";
import { isFileInvitationSlugAvailable } from "./file-store";
import { validateCustomInvitationSlug } from "./slug";

export async function resolveCustomInvitationSlug(value: unknown, currentCode = "") {
  const raw = typeof value === "string" ? value : "";
  const result = validateCustomInvitationSlug(raw);
  if (result.error || !result.slug) return result;

  const current = currentCode.toLowerCase();
  if (prisma) {
    const existing = await prisma.invitation
      .findFirst({
        where: {
          deletedAt: null,
          OR: [{ code: result.slug }, { customSlug: result.slug }],
        },
        select: { code: true },
      })
      .catch(() => null);
    if (existing && existing.code.toLowerCase() !== current) {
      return { slug: result.slug, error: "هذا الرابط مستخدم بالفعل في دعوة أخرى." };
    }
  }

  const availableInFiles = await isFileInvitationSlugAvailable(result.slug, currentCode).catch(() => true);
  if (!availableInFiles) return { slug: result.slug, error: "هذا الرابط مستخدم بالفعل في دعوة أخرى." };

  return { slug: result.slug, error: "" };
}
