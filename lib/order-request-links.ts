import { randomBytes } from "node:crypto";
import { prisma } from "./db";
import { getFileInvitations, getFileOrders } from "./file-store";
import { buildInvitationBaseSlug, getCustomerAdminPath, makeNumberedInvitationSlug } from "./slug";
import type { OrderRequest } from "./types";

type PendingOrderSummary = {
  id: string;
  code: string;
  groomName: string;
  brideName: string;
  status: OrderRequest["status"];
};

function normalizeOrderStatus(status: string): OrderRequest["status"] {
  const clean = status.toLowerCase();
  if (clean === "accepted") return "reviewing";
  if (clean === "converted") return "published";
  if (["new", "reviewing", "edited", "published", "rejected"].includes(clean)) return clean as OrderRequest["status"];
  return "new";
}

function isPendingOrderStatus(status: string) {
  const normalized = normalizeOrderStatus(status);
  return normalized !== "published" && normalized !== "converted";
}

export function buildReservedInvitationLinks(siteUrl: string, code: string, manageToken?: string) {
  const cleanSiteUrl = siteUrl.replace(/\/$/, "");
  return {
    publicUrl: `${cleanSiteUrl}/${code}`,
    adminUrl: manageToken ? `${cleanSiteUrl}/manage/invitation/${manageToken}` : `${cleanSiteUrl}${getCustomerAdminPath(code)}`,
  };
}

function generateOrderManageToken() {
  return randomBytes(48).toString("base64url");
}

async function collectManageTokens() {
  const tokens: string[] = [];

  if (prisma) {
    try {
      const [invitations, orders] = await Promise.all([
        prisma.invitation.findMany({ where: { manageToken: { not: null } }, select: { manageToken: true } }),
        prisma.orderRequest.findMany({ where: { manageToken: { not: null }, deletedAt: null }, select: { manageToken: true } }),
      ]);
      tokens.push(...invitations.map((item) => item.manageToken || "").filter(Boolean));
      tokens.push(...orders.map((item) => item.manageToken || "").filter(Boolean));
    } catch (error) {
      console.error("Failed to collect database manage tokens", error);
    }
  }

  const [fileInvitations, fileOrders] = await Promise.all([
    getFileInvitations().catch(() => []),
    getFileOrders().catch(() => []),
  ]);
  tokens.push(...fileInvitations.map((item) => item.manageToken || "").filter(Boolean));
  tokens.push(...fileOrders.map((item) => item.manageToken || "").filter(Boolean));

  return new Set(tokens);
}

export async function createReservedManageToken() {
  const used = await collectManageTokens();
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const token = generateOrderManageToken();
    if (!used.has(token)) return token;
  }
  throw new Error("Unable to generate a unique order manage token.");
}

export async function createReservedInvitationCode(groomName: string, brideName: string) {
  const baseSlug = buildInvitationBaseSlug(groomName, brideName);
  const existingCodes: string[] = [];

  if (prisma) {
    try {
      const [invitations, orders] = await Promise.all([
        prisma.invitation.findMany({
          where: {
            OR: [
              { code: { startsWith: baseSlug } },
              { customSlug: { startsWith: baseSlug } },
            ],
          },
          select: { code: true, customSlug: true },
        }),
        prisma.orderRequest.findMany({
          where: { publishedInvitationCode: { startsWith: baseSlug }, deletedAt: null },
          select: { publishedInvitationCode: true },
        }),
      ]);
      existingCodes.push(...invitations.flatMap((item) => [item.code, item.customSlug || ""]).filter(Boolean));
      existingCodes.push(...orders.map((item) => item.publishedInvitationCode || "").filter(Boolean));
    } catch (error) {
      console.error("Failed to collect database reserved invitation codes", error);
    }
  }

  const [fileInvitations, fileOrders] = await Promise.all([
    getFileInvitations().catch(() => []),
    getFileOrders().catch(() => []),
  ]);
  existingCodes.push(...fileInvitations.flatMap((item) => [item.code, item.customSlug || ""]).filter(Boolean));
  existingCodes.push(...fileOrders.map((item) => item.publishedInvitationCode || "").filter(Boolean));

  return makeNumberedInvitationSlug(baseSlug, existingCodes);
}

export async function getPendingOrderByManageToken(token: string): Promise<PendingOrderSummary | null> {
  const cleanToken = token.trim();
  if (!cleanToken) return null;

  if (prisma) {
    try {
      const order = await prisma.orderRequest.findFirst({
        where: {
          manageToken: cleanToken,
          deletedAt: null,
          status: { notIn: ["PUBLISHED", "CONVERTED"] },
        },
        select: {
          id: true,
          groomName: true,
          brideName: true,
          status: true,
          publishedInvitationCode: true,
        },
      });
      if (order?.publishedInvitationCode) {
        return {
          id: order.id,
          code: order.publishedInvitationCode,
          groomName: order.groomName,
          brideName: order.brideName,
          status: normalizeOrderStatus(String(order.status)),
        };
      }
    } catch (error) {
      console.error("Failed to load pending order by manage token", error);
    }
  }

  const fileOrders = await getFileOrders().catch(() => []);
  const order = fileOrders.find((item) => item.manageToken === cleanToken && isPendingOrderStatus(item.status));
  return order?.publishedInvitationCode
    ? {
        id: order.id,
        code: order.publishedInvitationCode,
        groomName: order.groomName,
        brideName: order.brideName,
        status: normalizeOrderStatus(order.status),
      }
    : null;
}

export async function getPendingOrderByInvitationCode(code: string): Promise<PendingOrderSummary | null> {
  const cleanCode = code.trim();
  if (!cleanCode) return null;

  if (prisma) {
    try {
      const order = await prisma.orderRequest.findFirst({
        where: {
          publishedInvitationCode: cleanCode,
          deletedAt: null,
          status: { notIn: ["PUBLISHED", "CONVERTED"] },
        },
        select: {
          id: true,
          groomName: true,
          brideName: true,
          status: true,
          publishedInvitationCode: true,
        },
      });
      if (order?.publishedInvitationCode) {
        return {
          id: order.id,
          code: order.publishedInvitationCode,
          groomName: order.groomName,
          brideName: order.brideName,
          status: normalizeOrderStatus(String(order.status)),
        };
      }
    } catch (error) {
      console.error("Failed to load pending order by invitation code", error);
    }
  }

  const fileOrders = await getFileOrders().catch(() => []);
  const order = fileOrders.find((item) => item.publishedInvitationCode === cleanCode && isPendingOrderStatus(item.status));
  return order?.publishedInvitationCode
    ? {
        id: order.id,
        code: order.publishedInvitationCode,
        groomName: order.groomName,
        brideName: order.brideName,
        status: normalizeOrderStatus(order.status),
      }
    : null;
}
