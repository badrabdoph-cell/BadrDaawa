import { randomBytes } from "node:crypto";
import { prisma } from "./db";

export type InvitationManageTokenResult =
  | { ok: true; code: string }
  | { ok: false; reason: "invalid" | "expired" | "missing" };

const tokenPattern = /^[A-Za-z0-9_-]{64,160}$/;

export function generateInvitationManageToken() {
  return randomBytes(48).toString("base64url");
}

export function isValidInvitationManageToken(value: string) {
  return tokenPattern.test(value);
}

function isExpired(expiresAt?: string | Date | null) {
  if (!expiresAt) return false;
  const date = expiresAt instanceof Date ? expiresAt : new Date(expiresAt);
  return Number.isNaN(date.getTime()) || date.getTime() <= Date.now();
}

async function isDatabaseTokenAvailable(token: string, currentCode = "") {
  if (!prisma) return true;
  try {
    const invitation = await prisma.invitation.findUnique({ where: { manageToken: token }, select: { code: true } });
    return !invitation || invitation.code === currentCode;
  } catch {
    return true;
  }
}

async function createUniqueToken(currentCode = "") {
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const token = generateInvitationManageToken();
    const databaseAvailable = await isDatabaseTokenAvailable(token, currentCode);
    if (databaseAvailable) return token;
  }
  throw new Error("Unable to generate a unique invitation management token.");
}

export async function ensureInvitationManageToken(code: string) {
  const cleanCode = code.trim();
  if (!cleanCode) return "";

  if (prisma) {
    try {
      const invitation = await prisma.invitation.findUnique({
        where: { code: cleanCode },
        select: { code: true, manageToken: true, manageTokenExpiresAt: true, deletedAt: true },
      });
      if (invitation && !invitation.deletedAt) {
        if (invitation.manageToken && !isExpired(invitation.manageTokenExpiresAt)) return invitation.manageToken;
        const token = await createUniqueToken(invitation.code);
        await prisma.invitation.update({ where: { code: invitation.code }, data: { manageToken: token, manageTokenExpiresAt: null } });
        return token;
      }
    } catch (error) {
      console.error("Failed to ensure database invitation manage token", error);
    }
  }

  return "";
}

export async function resolveInvitationManageToken(tokenValue: string): Promise<InvitationManageTokenResult> {
  const token = tokenValue.trim();
  if (!isValidInvitationManageToken(token)) return { ok: false, reason: "invalid" };

  if (prisma) {
    try {
      const invitation = await prisma.invitation.findUnique({
        where: { manageToken: token },
        select: { code: true, manageTokenExpiresAt: true, deletedAt: true },
      });
      if (invitation) {
        if (invitation.deletedAt) return { ok: false, reason: "missing" };
        if (isExpired(invitation.manageTokenExpiresAt)) return { ok: false, reason: "expired" };
        return { ok: true, code: invitation.code };
      }
    } catch (error) {
      console.error("Failed to resolve database invitation manage token", error);
    }
  }

  return { ok: false, reason: "missing" };
}

export async function getInvitationManagePath(code: string) {
  const token = await ensureInvitationManageToken(code);
  return token ? `/manage/invitation/${token}` : `/${code}/ad_3399`;
}

export async function getInvitationManageUrl(code: string, siteUrl: string) {
  const path = await getInvitationManagePath(code);
  return `${siteUrl.replace(/\/$/, "")}${path}`;
}
