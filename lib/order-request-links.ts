import { randomBytes } from "node:crypto";
import { prisma } from "./db";
import { buildInvitationBaseSlug, getCustomerAdminPath, makeNumberedInvitationSlug } from "./slug";
import type { OrderRequest } from "./types";

type PendingOrderSummary = {
  id: string;
  code: string;
  groomName: string;
  brideName: string;
  status: OrderRequest["status"];
};

type RejectedOrderSummary = PendingOrderSummary & {
  rejectionReason: string;
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

  return makeNumberedInvitationSlug(baseSlug, existingCodes);
}

import { OrderStatus } from "@prisma/client";
const pendingExclude: OrderStatus[] = ["PUBLISHED", "CONVERTED", "REJECTED"];

export async function getPendingOrderByManageToken(token: string): Promise<PendingOrderSummary | null> {
  const cleanToken = token.trim();
  if (!cleanToken) return null;

  if (prisma) {
    try {
      const order = await prisma.orderRequest.findFirst({
        where: {
          manageToken: cleanToken,
          deletedAt: null,
          status: { notIn: pendingExclude },
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

  return null;
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
          status: { notIn: pendingExclude },
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

  return null;
}

export async function getRejectedOrderByManageToken(token: string): Promise<RejectedOrderSummary | null> {
  const cleanToken = token.trim();
  if (!cleanToken) return null;

  if (prisma) {
    try {
      const order = await prisma.orderRequest.findFirst({
        where: {
          manageToken: cleanToken,
          deletedAt: null,
          status: "REJECTED",
        },
        select: {
          id: true,
          groomName: true,
          brideName: true,
          status: true,
          publishedInvitationCode: true,
          rejectionReason: true,
        },
      });
      if (order?.publishedInvitationCode) {
        return {
          id: order.id,
          code: order.publishedInvitationCode,
          groomName: order.groomName,
          brideName: order.brideName,
          status: "rejected",
          rejectionReason: order.rejectionReason || "تم رفض الطلب.",
        };
      }
    } catch (error) {
      console.error("Failed to load rejected order by manage token", error);
    }
  }

  return null;
}

export async function getRejectedOrderByInvitationCode(code: string): Promise<RejectedOrderSummary | null> {
  const cleanCode = code.trim();
  if (!cleanCode) return null;

  if (prisma) {
    try {
      const order = await prisma.orderRequest.findFirst({
        where: {
          publishedInvitationCode: cleanCode,
          deletedAt: null,
          status: "REJECTED",
        },
        select: {
          id: true,
          groomName: true,
          brideName: true,
          status: true,
          publishedInvitationCode: true,
          rejectionReason: true,
        },
      });
      if (order?.publishedInvitationCode) {
        return {
          id: order.id,
          code: order.publishedInvitationCode,
          groomName: order.groomName,
          brideName: order.brideName,
          status: "rejected",
          rejectionReason: order.rejectionReason || "تم رفض الطلب.",
        };
      }
    } catch (error) {
      console.error("Failed to load rejected order by invitation code", error);
    }
  }

  return null;
}
