import { readFile } from "node:fs/promises";
import path from "node:path";
import { PrismaClient } from "@prisma/client";

const root = process.cwd();
const runtimeStorePath = path.join(root, "data", "runtime-store.json");

function cleanEnvValue(value) {
  return String(value || "")
    .trim()
    .replace(/^["']|["']$/g, "")
    .replace(/^database_url=/i, "")
    .replace(/^DATABASE_URL=/, "")
    .trim();
}

function getDatabaseUrl() {
  const direct = [
    process.env.DATABASE_URL,
    process.env.POSTGRES_PRISMA_URL,
    process.env.POSTGRES_URL,
    process.env.DATABASE_PRIVATE_URL,
    process.env.DATABASE_PUBLIC_URL,
  ]
    .map(cleanEnvValue)
    .find((value) => /^postgres(?:ql)?:\/\//i.test(value));

  if (direct) return direct;

  const host = cleanEnvValue(process.env.PGHOST);
  const port = cleanEnvValue(process.env.PGPORT) || "5432";
  const user = cleanEnvValue(process.env.PGUSER);
  const password = cleanEnvValue(process.env.PGPASSWORD);
  const database = cleanEnvValue(process.env.PGDATABASE);
  if (!host || !user || !password || !database) return "";

  const url = new URL(`postgresql://${host}:${port}/${database}`);
  url.username = user;
  url.password = password;
  url.searchParams.set("schema", "public");
  return url.toString();
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function asDate(value, fallback = new Date()) {
  const date = value ? new Date(value) : fallback;
  return Number.isNaN(date.getTime()) ? fallback : date;
}

function invitationStatus(value, isActive) {
  const clean = String(value || "").toLowerCase();
  if (clean === "draft") return "DRAFT";
  if (clean === "paused") return "PAUSED";
  if (clean === "archived") return "ARCHIVED";
  return isActive === false ? "PAUSED" : "ACTIVE";
}

function orderStatus(value) {
  const clean = String(value || "").toUpperCase();
  return ["NEW", "REVIEWING", "EDITED", "PUBLISHED", "ACCEPTED", "REJECTED", "CONVERTED"].includes(clean) ? clean : "NEW";
}

function rsvpStatus(value) {
  return String(value || "").toLowerCase() === "declined" ? "DECLINED" : "CONFIRMED";
}

function templateDefaults(slug) {
  const label = slug || "legacy-template";
  return {
    slug: label,
    name: label,
    arabicName: label,
    category: "Legacy",
    style: "legacy",
    concept: "Imported from runtime-store legacy data.",
    opening: "Legacy runtime-store import.",
    layout: "Legacy runtime-store import.",
    typography: "Legacy runtime-store import.",
    palette: {
      primary: "#111111",
      secondary: "#ffffff",
      accent: "#d4af37",
      ink: "#111111",
      surface: "#ffffff",
    },
    previewUrl: "/assets/templates/featured-1.svg",
    enabled: true,
    sortOrder: 999,
  };
}

async function readRuntimeStore() {
  const raw = await readFile(runtimeStorePath, "utf8").catch((error) => {
    if (error?.code === "ENOENT") return "";
    throw error;
  });
  if (!raw.trim()) {
    return { invitations: [], guests: [], customers: [], orders: [], analyticsEvents: [] };
  }
  const parsed = JSON.parse(raw);
  return {
    invitations: asArray(parsed.invitations),
    guests: asArray(parsed.guests),
    customers: asArray(parsed.customers),
    orders: asArray(parsed.orders),
    analyticsEvents: asArray(parsed.analyticsEvents),
  };
}

async function ensureTemplate(prisma, slug) {
  const templateSlug = slug || "featured-1";
  return prisma.weddingTemplate.upsert({
    where: { slug: templateSlug },
    update: {},
    create: templateDefaults(templateSlug),
    select: { id: true, slug: true },
  });
}

async function backfillCustomers(prisma, customers) {
  let created = 0;
  let updated = 0;
  const byLegacyId = new Map();

  for (const customer of customers) {
    if (!customer?.username) continue;
    const existing = await prisma.customer.findUnique({ where: { username: customer.username }, select: { id: true } });
    const data = {
      name: customer.name || customer.username,
      phone: customer.phone || "",
      isActive: customer.isActive !== false,
      deletedAt: customer.deletedAt ? asDate(customer.deletedAt) : null,
    };
    const saved = existing
      ? await prisma.customer.update({ where: { id: existing.id }, data: { ...data }, select: { id: true } })
      : await prisma.customer.create({
          data: {
            id: customer.id || undefined,
            ...data,
            username: customer.username,
            passwordHash: customer.passwordHash || "legacy-runtime-store-import",
            createdAt: customer.createdAt ? asDate(customer.createdAt) : undefined,
          },
          select: { id: true },
        });
    existing ? (updated += 1) : (created += 1);
    if (customer.id) byLegacyId.set(customer.id, saved.id);
  }

  return { created, updated, byLegacyId };
}

async function ensureCustomerForInvitation(prisma, invitation, customerMap) {
  if (invitation.customerId && customerMap.has(invitation.customerId)) return customerMap.get(invitation.customerId);
  const username = `legacy_${invitation.code}`;
  const saved = await prisma.customer.upsert({
    where: { username },
    update: {
      name: `${invitation.groomName || "Legacy"} و ${invitation.brideName || "Invitation"}`,
      phone: "",
      isActive: true,
    },
    create: {
      id: invitation.customerId || undefined,
      name: `${invitation.groomName || "Legacy"} و ${invitation.brideName || "Invitation"}`,
      phone: "",
      username,
      passwordHash: "legacy-runtime-store-import",
      isActive: true,
    },
    select: { id: true },
  });
  if (invitation.customerId) customerMap.set(invitation.customerId, saved.id);
  return saved.id;
}

async function backfillInvitations(prisma, invitations, customerMap) {
  let created = 0;
  let updated = 0;
  const byCode = new Map();

  for (const invitation of invitations) {
    if (!invitation?.code) continue;
    const template = await ensureTemplate(prisma, invitation.templateSlug);
    const customerId = await ensureCustomerForInvitation(prisma, invitation, customerMap);
    const existing = await prisma.invitation.findUnique({ where: { code: invitation.code }, select: { id: true, viewCount: true } });
    const data = {
      customSlug: invitation.customSlug || null,
      status: invitationStatus(invitation.status, invitation.isActive),
      language: invitation.language === "en" ? "en" : "ar",
      groomName: invitation.groomName || "",
      brideName: invitation.brideName || "",
      weddingDate: asDate(invitation.weddingDate),
      weddingTime: invitation.weddingTime || "",
      venue: invitation.venue || "",
      city: invitation.city || null,
      mapUrl: invitation.mapUrl || null,
      heroPhoto: invitation.heroPhoto || null,
      gallery: asArray(invitation.gallery),
      musicUrl: invitation.musicUrl || null,
      musicEnabled: invitation.musicEnabled === true,
      manageToken: invitation.manageToken || null,
      manageTokenExpiresAt: invitation.manageTokenExpiresAt ? asDate(invitation.manageTokenExpiresAt) : null,
      texts: invitation.texts || undefined,
      photographer: invitation.photographer || undefined,
      viewCount: Math.max(Number(existing?.viewCount || 0), Number(invitation.views || 0)),
      deletedAt: invitation.deletedAt ? asDate(invitation.deletedAt) : null,
      customerId,
      templateId: template.id,
    };

    const saved = existing
      ? await prisma.invitation.update({ where: { id: existing.id }, data, select: { id: true, code: true } })
      : await prisma.invitation.create({
          data: {
            id: invitation.id || undefined,
            code: invitation.code,
            ...data,
          },
          select: { id: true, code: true },
        });
    existing ? (updated += 1) : (created += 1);
    byCode.set(saved.code, saved.id);
  }

  return { created, updated, byCode };
}

async function backfillOrders(prisma, orders, invitationCodeMap) {
  let created = 0;
  let updated = 0;

  for (const order of orders) {
    if (!order?.id && !order?.orderNumber && !order?.dedupeKey) continue;
    const template = await ensureTemplate(prisma, order.templateSlug);
    const existing =
      (order.dedupeKey ? await prisma.orderRequest.findUnique({ where: { dedupeKey: order.dedupeKey }, select: { id: true } }).catch(() => null) : null) ||
      (order.orderNumber ? await prisma.orderRequest.findUnique({ where: { orderNumber: order.orderNumber }, select: { id: true } }).catch(() => null) : null) ||
      (order.id ? await prisma.orderRequest.findUnique({ where: { id: order.id }, select: { id: true } }).catch(() => null) : null);
    const publishedInvitationId = order.publishedInvitationCode ? invitationCodeMap.get(order.publishedInvitationCode) : null;
    const publishedInvitation = publishedInvitationId ? await prisma.invitation.findUnique({ where: { id: publishedInvitationId }, select: { customerId: true } }) : null;
    const data = {
      orderNumber: order.orderNumber || null,
      dedupeKey: order.dedupeKey || null,
      groomName: order.groomName || "",
      brideName: order.brideName || "",
      phone: order.phone || "",
      weddingDate: asDate(order.weddingDate),
      venue: order.venue || "",
      mapUrl: order.mapUrl || null,
      notes: order.notes || null,
      imageUrls: asArray(order.imageUrls),
      musicEnabled: order.musicEnabled === true,
      musicChoice: order.musicChoice || null,
      musicUrl: order.musicUrl || null,
      texts: order.texts || undefined,
      photographer: order.photographer || undefined,
      rejectionReason: order.rejectionReason || null,
      publishedInvitationCode: order.publishedInvitationCode || null,
      manageToken: order.manageToken || null,
      manageTokenExpiresAt: order.manageTokenExpiresAt ? asDate(order.manageTokenExpiresAt) : null,
      language: order.language === "en" ? "en" : "ar",
      status: orderStatus(order.status),
      submittedAt: order.submittedAt ? asDate(order.submittedAt) : order.createdAt ? asDate(order.createdAt) : undefined,
      deletedAt: order.deletedAt ? asDate(order.deletedAt) : null,
      templateId: template.id,
      customerId: publishedInvitation?.customerId || null,
    };

    if (existing) {
      await prisma.orderRequest.update({ where: { id: existing.id }, data });
      updated += 1;
    } else {
      await prisma.orderRequest.create({
        data: {
          id: order.id || undefined,
          ...data,
          createdAt: order.createdAt ? asDate(order.createdAt) : undefined,
        },
      });
      created += 1;
    }
  }

  return { created, updated };
}

async function backfillGuests(prisma, guests, invitationCodeMap) {
  let created = 0;
  let updated = 0;
  let skipped = 0;

  for (const guest of guests) {
    if (!guest?.invitationCode) {
      skipped += 1;
      continue;
    }
    const invitationId = invitationCodeMap.get(guest.invitationCode);
    if (!invitationId) {
      skipped += 1;
      continue;
    }
    const existing = guest.id ? await prisma.guestRsvp.findUnique({ where: { id: guest.id }, select: { id: true } }).catch(() => null) : null;
    const duplicate = existing
      ? null
      : await prisma.guestRsvp.findFirst({
          where: { invitationId, phone: guest.phone || "", createdAt: guest.createdAt ? asDate(guest.createdAt) : undefined },
          select: { id: true },
        });
    const data = {
      invitationId,
      name: guest.name || "",
      phone: guest.phone || "",
      attendees: Number(guest.attendees || 1),
      status: rsvpStatus(guest.status),
      note: guest.note || null,
    };
    if (existing || duplicate) {
      await prisma.guestRsvp.update({ where: { id: existing?.id || duplicate.id }, data });
      updated += 1;
    } else {
      await prisma.guestRsvp.create({
        data: {
          id: guest.id || undefined,
          ...data,
          createdAt: guest.createdAt ? asDate(guest.createdAt) : undefined,
        },
      });
      created += 1;
    }
  }

  return { created, updated, skipped };
}

async function backfillAnalyticsEvents(prisma, events, invitationCodeMap) {
  let created = 0;
  let updated = 0;
  let skipped = 0;

  for (const event of events) {
    if (!event?.invitationCode) {
      skipped += 1;
      continue;
    }
    const invitationId = invitationCodeMap.get(event.invitationCode);
    if (!invitationId) {
      skipped += 1;
      continue;
    }
    const existing = event.id ? await prisma.analyticsEvent.findUnique({ where: { id: event.id }, select: { id: true } }).catch(() => null) : null;
    const data = {
      invitationId,
      eventType: event.eventType || "VIEW",
      metadata: event.metadata || undefined,
      createdAt: event.createdAt ? asDate(event.createdAt) : undefined,
    };
    if (existing) {
      await prisma.analyticsEvent.update({ where: { id: existing.id }, data });
      updated += 1;
    } else {
      await prisma.analyticsEvent.create({
        data: {
          id: event.id || undefined,
          ...data,
        },
      });
      created += 1;
    }
  }

  return { created, updated, skipped };
}

async function main() {
  const databaseUrl = getDatabaseUrl();
  if (!databaseUrl) {
    throw new Error("DATABASE_URL or PostgreSQL environment variables are required for runtime-store backfill.");
  }

  const store = await readRuntimeStore();
  const prisma = new PrismaClient({ datasources: { db: { url: databaseUrl } } });

  try {
    await prisma.$queryRaw`SELECT 1`;
    const customers = await backfillCustomers(prisma, store.customers);
    const invitations = await backfillInvitations(prisma, store.invitations, customers.byLegacyId);
    const orders = await backfillOrders(prisma, store.orders, invitations.byCode);
    const guests = await backfillGuests(prisma, store.guests, invitations.byCode);
    const analyticsEvents = await backfillAnalyticsEvents(prisma, store.analyticsEvents, invitations.byCode);

    console.log(
      JSON.stringify(
        {
          ok: true,
          source: runtimeStorePath,
          customers: { created: customers.created, updated: customers.updated },
          invitations: { created: invitations.created, updated: invitations.updated },
          orders,
          guests,
          analyticsEvents,
        },
        null,
        2,
      ),
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error("[runtime-store backfill] failed", error);
  process.exit(1);
});
