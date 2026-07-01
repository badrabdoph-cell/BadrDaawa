"use server";

import crypto from "crypto";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { PromoCodeService } from "@/lib/promo-code-service";
import { getShareableSiteUrl } from "@/lib/utils";

type DiscountTypeInput = "NONE" | "PERCENTAGE" | "FIXED_AMOUNT" | "FREE_INVITATION";
type PromoStatusInput = "ACTIVE" | "PAUSED" | "EXPIRED" | "ARCHIVED";

const discountTypes = new Set<DiscountTypeInput>(["NONE", "PERCENTAGE", "FIXED_AMOUNT", "FREE_INVITATION"]);
const promoStatuses = new Set<PromoStatusInput>(["ACTIVE", "PAUSED", "EXPIRED", "ARCHIVED"]);

function formString(formData: FormData, key: string) {
  return String(formData.get(key) || "").trim();
}

function auditId() {
  return `audit-${Date.now().toString(36)}-${crypto.randomBytes(4).toString("hex")}`;
}

function safeReturnPath(value: string, fallback = "/admin/promo-codes/partners") {
  return value.startsWith("/") && !value.startsWith("//") ? value : fallback;
}

function promoActionErrorCode(error: unknown) {
  if (typeof error === "object" && error !== null && "code" in error && typeof (error as { code?: unknown }).code === "string") {
    return (error as { code: string }).code;
  }
  const message = error instanceof Error ? error.message : String(error || "unknown");
  if (/unique|already|duplicate/i.test(message)) return "duplicate";
  if (/displayMessage|column|does not exist/i.test(message)) return "migration_required";
  if (message === "name" || message === "discount" || message === "database_unavailable") return message;
  return message || "unknown";
}

export async function createQuickPromoCodeAction(formData: FormData) {
  if (!prisma) redirect("/admin/promo-codes?error=database");

  const returnTo = safeReturnPath(formString(formData, "returnTo"), "/admin/promo-codes/photographers");
  const siteUrl = getShareableSiteUrl(await headers()).replace(/\/$/, "");
  let redirectTo = returnTo;
  try {
    const created = await PromoCodeService.createPartnerPromo({ formData, siteUrl });
    redirectTo = `${returnTo}?created=${created.promo.id}&linkTest=${created.linkTest.ok ? "ok" : "failed"}`;
  } catch (error) {
    console.error("[Promo] Failed to create partner promo", error);
    redirectTo = `${returnTo}?error=${encodeURIComponent(promoActionErrorCode(error))}`;
  }
  redirect(redirectTo);
}

export async function createDiscountPromoCodeAction(formData: FormData) {
  if (!prisma) redirect("/admin/promo-codes/discounts/new?error=database");

  let redirectTo = "/admin/promo-codes/discounts";
  try {
    const displayMessage = formString(formData, "displayMessage");
    if (displayMessage) formData.set("displayMessage", displayMessage);
    const created = await PromoCodeService.createDiscountPromo({ formData });
    redirectTo = `/admin/promo-codes/discounts?created=${created.id}`;
  } catch (error) {
    console.error("[Promo] Failed to create discount promo", error);
    redirectTo = `/admin/promo-codes/discounts?error=${encodeURIComponent(promoActionErrorCode(error))}`;
  }
  redirect(redirectTo);
}

export async function updatePartnerPromoStatusAction(formData: FormData) {
  if (!prisma) redirect("/admin/promo-codes/partners?error=database");

  const id = formString(formData, "id");
  const returnTo = safeReturnPath(formString(formData, "returnTo"));
  const statusValue = formString(formData, "status") as PromoStatusInput;
  const status = promoStatuses.has(statusValue) ? statusValue : "PAUSED";
  if (!id) redirect(`${returnTo}?error=missing`);

  await prisma.$transaction(async (tx) => {
    const promo = await tx.partnerPromoCode.update({
      where: { id },
      data: {
        status,
        archivedAt: status === "ARCHIVED" ? new Date() : null,
        deletedAt: null,
      },
      select: { id: true, code: true, partnerId: true, status: true },
    });
    await tx.partnerActivityLog.create({
      data: {
        partnerId: promo.partnerId,
        action: `promo.${status.toLowerCase()}`,
        performedBy: "admin",
        newValue: { promoId: promo.id, code: promo.code, status },
      },
    });
    await tx.auditLog.create({
      data: {
        id: auditId(),
        actorType: "admin",
        actorId: "admin",
        actorLabel: "Admin",
        action: "promo.status",
        entityType: "PartnerPromoCode",
        entityId: promo.id,
        entityLabel: promo.code,
        newValues: { status },
        metadata: { source: "promo-code-admin" },
      },
    });
  });

  redirect(`${returnTo}?status=updated`);
}

export async function softDeletePartnerPromoAction(formData: FormData) {
  if (!prisma) redirect("/admin/promo-codes/partners?error=database");

  const id = formString(formData, "id");
  const returnTo = safeReturnPath(formString(formData, "returnTo"));
  if (!id) redirect(`${returnTo}?error=missing`);

  await prisma.$transaction(async (tx) => {
    const now = new Date();
    const promo = await tx.partnerPromoCode.update({
      where: { id },
      data: { status: "ARCHIVED", archivedAt: now, deletedAt: null },
      select: { id: true, code: true, partnerId: true },
    });
    await tx.partnerActivityLog.create({
      data: {
        partnerId: promo.partnerId,
        action: "promo.deleted",
        performedBy: "admin",
        newValue: { promoId: promo.id, code: promo.code, status: "ARCHIVED", archivedAt: now.toISOString() },
      },
    });
    await tx.auditLog.create({
      data: {
        id: auditId(),
        actorType: "admin",
        actorId: "admin",
        actorLabel: "Admin",
        action: "promo.delete",
        entityType: "PartnerPromoCode",
        entityId: promo.id,
        entityLabel: promo.code,
        newValues: { archivedAt: now.toISOString(), status: "ARCHIVED" },
        metadata: { source: "promo-code-admin", deleteType: "archive" },
      },
    });
  });

  redirect(`${returnTo}?status=deleted`);
}

export async function pausePartnerPromoUntilAction(formData: FormData) {
  if (!prisma) redirect("/admin/promo-codes/history?error=database");

  const id = formString(formData, "id");
  const returnTo = safeReturnPath(formString(formData, "returnTo"), "/admin/promo-codes/history");
  const pauseUntilRaw = formString(formData, "pauseUntil");
  const pauseUntil = pauseUntilRaw ? new Date(`${pauseUntilRaw}T23:59:59`) : null;
  if (!id) redirect(`${returnTo}?error=missing`);

  await prisma.$transaction(async (tx) => {
    const promo = await tx.partnerPromoCode.update({
      where: { id },
      data: { status: "PAUSED", startDate: pauseUntil && !Number.isNaN(pauseUntil.getTime()) ? pauseUntil : undefined },
      select: { id: true, code: true, partnerId: true },
    });
    await tx.partnerActivityLog.create({
      data: {
        partnerId: promo.partnerId,
        action: "promo.paused_until",
        performedBy: "admin",
        newValue: { promoId: promo.id, code: promo.code, pauseUntil: pauseUntil?.toISOString() || null },
      },
    });
  });

  redirect(`${returnTo}?status=paused`);
}

export async function bulkPromoAction(formData: FormData) {
  if (!prisma) redirect("/admin/promo-codes/history?error=database");

  const ids = formData.getAll("promoIds").map((value) => String(value)).filter(Boolean);
  const action = formString(formData, "bulkAction");
  const returnTo = safeReturnPath(formString(formData, "returnTo"), "/admin/promo-codes/history");
  if (!ids.length) redirect(`${returnTo}?error=missing`);

  const status = action === "activate" || action === "restore" ? "ACTIVE" : action === "archive" || action === "delete" ? "ARCHIVED" : action === "pause" ? "PAUSED" : "";
  if (!status && action !== "export") redirect(`${returnTo}?error=action`);

  if (status) {
    await prisma.partnerPromoCode.updateMany({
      where: { id: { in: ids } },
      data: {
        status: status as never,
        archivedAt: status === "ARCHIVED" ? new Date() : null,
        deletedAt: null,
      },
    });
    await prisma.partnerActivityLog.createMany({
      data: ids.map((id) => ({
        action: `promo.bulk.${action}`,
        performedBy: "admin",
        newValue: { promoId: id, status },
      })),
    });
  }

  redirect(`${returnTo}?status=bulk`);
}

export async function logLegacyPromoRouteAction(route: string) {
  if (!prisma) return;
  await prisma.partnerActivityLog
    .create({
      data: {
        action: "promo.legacy_route_visit",
        performedBy: "admin",
        newValue: { route },
        metadata: { source: "legacy-admin-route" },
      },
    })
    .catch((error) => console.error("[Promo] Failed to log legacy route visit", error));
}

export async function restorePartnerPromoAction(formData: FormData) {
  if (!prisma) redirect("/admin/promo-codes/partners?error=database");

  const id = formString(formData, "id");
  const returnTo = safeReturnPath(formString(formData, "returnTo"), id ? `/admin/promo-codes/${id}` : "/admin/promo-codes/partners");
  if (!id) redirect(`${returnTo}?error=missing`);

  await prisma.$transaction(async (tx) => {
    const promo = await tx.partnerPromoCode.update({
      where: { id },
      data: { status: "ACTIVE", archivedAt: null, deletedAt: null },
      select: { id: true, code: true, partnerId: true },
    });
    await tx.partnerActivityLog.create({
      data: {
        partnerId: promo.partnerId,
        action: "promo.restored",
        performedBy: "admin",
        newValue: { promoId: promo.id, code: promo.code, status: "ACTIVE" },
      },
    });
    await tx.auditLog.create({
      data: {
        id: auditId(),
        actorType: "admin",
        actorId: "admin",
        actorLabel: "Admin",
        action: "promo.restore",
        entityType: "PartnerPromoCode",
        entityId: promo.id,
        entityLabel: promo.code,
        newValues: { status: "ACTIVE", deletedAt: null, archivedAt: null },
        metadata: { source: "promo-code-admin" },
      },
    });
  });

  redirect(`${returnTo}?status=restored`);
}
