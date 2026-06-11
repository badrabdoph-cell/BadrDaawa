import path from "node:path";
import { unstable_noStore as noStore } from "next/cache";
import { writeJsonFileAtomic } from "./atomic-file";
import { isBrowserDisplayImageUrl } from "./image-formats";
import { cleanInvitationHeroVideoUrl } from "./invitation-media";
import { parseJsonFileIfSafe } from "./json-file-safety";
import { hashPassword } from "./password";
import { makeNumberedInvitationSlug } from "./slug";
import type { GuestRsvp, Invitation, OrderRequest } from "./types";
import type { VisitSource } from "./visit-source";
import { normalizeInternalAssetUrl } from "./utils";

type FileCustomer = {
  id: string;
  name: string;
  phone: string;
  username: string;
  passwordHash: string;
  isActive: boolean;
  createdAt: string;
  deletedAt?: string;
};

type FileStoreData = {
  invitations: Invitation[];
  guests: GuestRsvp[];
  customers: FileCustomer[];
  orders: OrderRequest[];
  analyticsEvents: FileAnalyticsEvent[];
};

export type FileAnalyticsEvent = {
  id: string;
  invitationCode: string;
  eventType: string;
  metadata?: {
    source?: VisitSource;
    sourceLabel?: string;
    utmSource?: string;
    explicitSource?: string;
    referrer?: string;
    userAgent?: string;
  };
  createdAt: string;
};

type CreateFileInvitationInput = {
  baseSlug: string;
  code?: string;
  templateSlug: string;
  language?: Invitation["language"];
  groomName: string;
  brideName: string;
  phone: string;
  username: string;
  password: string;
  weddingDate: string;
  weddingTime: string;
  venue: string;
  city: string;
  mapUrl: string;
  gallery: string[];
  heroVideoUrl?: string;
  musicUrl: string;
  musicEnabled?: boolean;
  manageToken?: string;
  manageTokenExpiresAt?: string;
  texts?: Invitation["texts"];
  photographer?: Invitation["photographer"];
  customSlug?: string;
};

type FileInvitationUpdate = Partial<
  Pick<Invitation, "templateSlug" | "customSlug" | "status" | "language" | "groomName" | "brideName" | "weddingDate" | "weddingTime" | "venue" | "city" | "mapUrl" | "musicUrl" | "musicEnabled" | "manageToken" | "manageTokenExpiresAt" | "texts" | "photographer" | "gallery" | "heroPhoto" | "heroVideoUrl" | "isActive">
>;

type CreateFileOrderInput = Omit<OrderRequest, "id" | "status" | "createdAt"> & {
  status?: OrderRequest["status"];
};

type FileOrderUpdate = Partial<
  Pick<
    OrderRequest,
    | "groomName"
    | "brideName"
    | "phone"
    | "weddingDate"
    | "venue"
    | "mapUrl"
    | "notes"
    | "imageUrls"
    | "templateSlug"
    | "status"
    | "musicEnabled"
    | "musicChoice"
    | "musicUrl"
    | "texts"
    | "photographer"
    | "rejectionReason"
    | "publishedInvitationCode"
    | "manageToken"
    | "manageTokenExpiresAt"
    | "orderNumber"
    | "dedupeKey"
    | "submittedAt"
  >
>;

const storePath = path.join(process.cwd(), "data", "runtime-store.json");

export function isLegacyFileStoreEnabled() {
  return process.env.ENABLE_LEGACY_FILE_STORE === "true";
}

function assertLegacyFileStoreWriteEnabled() {
  if (isLegacyFileStoreEnabled()) return;
  throw new Error("Legacy runtime-store writes are disabled. PostgreSQL is the operational source of truth.");
}

function createEmptyStore(): FileStoreData {
  return {
    invitations: [],
    guests: [],
    customers: [],
    orders: [],
    analyticsEvents: [],
  };
}

async function readStore(): Promise<FileStoreData> {
  noStore();

  try {
    const { value: parsed, skipped } = await parseJsonFileIfSafe<Partial<FileStoreData>>(storePath, "runtime-store.json");
    if (skipped || !parsed) return createEmptyStore();
    return {
      invitations: Array.isArray(parsed.invitations) ? parsed.invitations : [],
      guests: Array.isArray(parsed.guests) ? parsed.guests : [],
      customers: Array.isArray(parsed.customers) ? parsed.customers : [],
      orders: Array.isArray(parsed.orders) ? parsed.orders : [],
      analyticsEvents: Array.isArray(parsed.analyticsEvents) ? parsed.analyticsEvents : [],
    };
  } catch {
    return createEmptyStore();
  }
}

async function writeStore(store: FileStoreData) {
  assertLegacyFileStoreWriteEnabled();
  await writeJsonFileAtomic(storePath, store);
}

function normalizeInvitationImages(invitation: Invitation): Invitation {
  const cleanImage = (value?: string | null) => {
    const url = normalizeInternalAssetUrl(value);
    return url && isBrowserDisplayImageUrl(url) ? url : "";
  };
  const gallery = invitation.gallery.map(cleanImage).filter(Boolean);
  const heroPhoto = cleanImage(invitation.heroPhoto) || gallery[0] || invitation.heroPhoto;
  const heroVideoUrl = cleanInvitationHeroVideoUrl(invitation.heroVideoUrl || (invitation.texts as Record<string, unknown> | undefined)?.heroVideoUrl);
  return { ...invitation, manageToken: undefined, manageTokenExpiresAt: undefined, status: invitation.status || (invitation.isActive ? "active" : "paused"), heroPhoto, heroVideoUrl: heroVideoUrl || undefined, gallery: gallery.length ? gallery : invitation.gallery };
}

function normalizeOrderImages(order: OrderRequest): OrderRequest {
  return {
    ...order,
    imageUrls: order.imageUrls
      ?.map(normalizeInternalAssetUrl)
      .filter((url): url is string => Boolean(url && isBrowserDisplayImageUrl(url))),
  };
}

export async function getFileInvitations() {
  await archiveExpiredFileInvitations();
  const store = await readStore();
  return store.invitations.filter((invitation) => !invitation.deletedAt).map(normalizeInvitationImages);
}

export async function getFileOrders() {
  const store = await readStore();
  return store.orders
    .filter((order) => !order.deletedAt)
    .map(normalizeOrderImages)
    .sort((a, b) => new Date(b.submittedAt || b.createdAt).getTime() - new Date(a.submittedAt || a.createdAt).getTime());
}

export async function createFileOrder(input: CreateFileOrderInput) {
  const store = await readStore();
  if (input.dedupeKey) {
    const existing = store.orders.find((order) => order.dedupeKey === input.dedupeKey);
    if (existing) return normalizeOrderImages(existing);
  }
  const submittedAt = input.submittedAt || new Date().toISOString();
  const orderNumber = input.orderNumber || `ORD-${Date.now().toString(36).toUpperCase()}`;
  const order: OrderRequest = {
    ...input,
    id: `ord_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`,
    orderNumber,
    status: input.status || "new",
    submittedAt,
    createdAt: submittedAt,
  };
  store.orders.unshift(order);
  await writeStore(store);
  return order;
}

export async function updateFileOrder(id: string, update: FileOrderUpdate) {
  const store = await readStore();
  const index = store.orders.findIndex((order) => order.id === id);
  if (index < 0) return null;
  store.orders[index] = { ...store.orders[index], ...update };
  await writeStore(store);
  return store.orders[index];
}

export async function deleteFileOrder(id: string) {
  return softDeleteFileOrder(id);
}

export async function softDeleteFileOrder(id: string) {
  const store = await readStore();
  const index = store.orders.findIndex((order) => order.id === id && !order.deletedAt);
  if (index < 0) return false;
  store.orders[index] = { ...store.orders[index], deletedAt: new Date().toISOString() };
  await writeStore(store);
  return true;
}

export async function hardDeleteFileOrder(id: string) {
  const store = await readStore();
  const nextOrders = store.orders.filter((order) => order.id !== id);
  if (nextOrders.length === store.orders.length) return false;
  store.orders = nextOrders;
  await writeStore(store);
  return true;
}

export async function getFileOrder(id: string) {
  const store = await readStore();
  const order = store.orders.find((order) => order.id === id && !order.deletedAt);
  return order ? normalizeOrderImages(order) : null;
}

export async function getFileCustomers() {
  const store = await readStore();
  return store.customers.filter((customer) => !customer.deletedAt).map((customer) => ({
    id: customer.id,
    name: customer.name,
    phone: customer.phone,
    username: customer.username,
    isActive: customer.isActive,
    invitations: store.invitations.filter((invitation) => invitation.customerId === customer.id && !invitation.deletedAt).length,
    createdAt: customer.createdAt,
  }));
}

export async function getFileInvitationByCode(code: string) {
  await archiveExpiredFileInvitations(code);
  const store = await readStore();
  const lookup = code.toLowerCase();
  const invitation = store.invitations.find((invitation) => (invitation.code.toLowerCase() === lookup || invitation.customSlug?.toLowerCase() === lookup) && !invitation.deletedAt);
  return invitation ? normalizeInvitationImages(invitation) : undefined;
}

export async function getFileInvitationManageToken(code: string) {
  const store = await readStore();
  const invitation = store.invitations.find((item) => item.code.toLowerCase() === code.toLowerCase() && !item.deletedAt);
  return invitation ? { code: invitation.code, manageToken: invitation.manageToken || "", manageTokenExpiresAt: invitation.manageTokenExpiresAt || "" } : null;
}

export async function getFileInvitationByManageToken(token: string) {
  const store = await readStore();
  const invitation = store.invitations.find((item) => item.manageToken === token && !item.deletedAt);
  return invitation ? { code: invitation.code, manageTokenExpiresAt: invitation.manageTokenExpiresAt || "" } : null;
}

export async function isFileInvitationManageTokenAvailable(token: string, currentCode = "") {
  const store = await readStore();
  const current = currentCode.toLowerCase();
  return !store.invitations.some((invitation) => invitation.manageToken === token && invitation.code.toLowerCase() !== current);
}

export async function setFileInvitationManageToken(code: string, token: string, expiresAt?: string) {
  const store = await readStore();
  const index = store.invitations.findIndex((invitation) => invitation.code.toLowerCase() === code.toLowerCase() && !invitation.deletedAt);
  if (index < 0) return null;
  store.invitations[index] = { ...store.invitations[index], manageToken: token, manageTokenExpiresAt: expiresAt || undefined };
  await writeStore(store);
  return { code: store.invitations[index].code, manageToken: token, manageTokenExpiresAt: expiresAt || "" };
}

export async function isFileInvitationSlugAvailable(slug: string, currentCode = "") {
  const lookup = slug.toLowerCase();
  const current = currentCode.toLowerCase();
  const store = await readStore();
  return !store.invitations.some((invitation) => {
    if (invitation.deletedAt) return false;
    if (current && invitation.code.toLowerCase() === current) return false;
    return invitation.code.toLowerCase() === lookup || invitation.customSlug?.toLowerCase() === lookup;
  });
}

export async function getFileGuestsByInvitation(code: string) {
  const store = await readStore();
  return store.guests.filter((guest) => guest.invitationCode.toLowerCase() === code.toLowerCase());
}

export async function createFileInvitation(input: CreateFileInvitationInput) {
  const store = await readStore();
  const existingCodes = store.invitations.map((invitation) => invitation.code);
  const requestedCode = input.code?.trim();
  const code = requestedCode && !existingCodes.some((item) => item.toLowerCase() === requestedCode.toLowerCase())
    ? requestedCode
    : makeNumberedInvitationSlug(input.baseSlug, existingCodes);
  const now = new Date().toISOString();
  const customerId = `cus_${input.username.toLowerCase().replace(/[^a-z0-9]+/g, "_") || Date.now().toString(36)}`;
  const existingCustomerIndex = store.customers.findIndex((customer) => customer.username.toLowerCase() === input.username.toLowerCase());
  const customer: FileCustomer = {
    id: existingCustomerIndex >= 0 ? store.customers[existingCustomerIndex].id : customerId,
    name: `${input.groomName} و ${input.brideName}`,
    phone: input.phone,
    username: input.username,
    passwordHash: hashPassword(input.password),
    isActive: true,
    createdAt: existingCustomerIndex >= 0 ? store.customers[existingCustomerIndex].createdAt : now,
  };

  if (existingCustomerIndex >= 0) {
    store.customers[existingCustomerIndex] = customer;
  } else {
    store.customers.unshift(customer);
  }

  const invitation: Invitation = {
    id: `inv_${code.replace(/[^a-z0-9]+/gi, "_")}`,
    code,
    customSlug: input.customSlug || undefined,
    templateSlug: input.templateSlug,
    language: input.language === "en" ? "en" : "ar",
    groomName: input.groomName,
    brideName: input.brideName,
    weddingDate: input.weddingDate,
    weddingTime: input.weddingTime,
    venue: input.venue,
    city: input.city,
    mapUrl: input.mapUrl,
    heroPhoto: input.gallery[0] || "/assets/invite/badr-sarah-1.jpeg",
    heroVideoUrl: cleanInvitationHeroVideoUrl(input.heroVideoUrl) || undefined,
    gallery: input.gallery,
    musicUrl: input.musicUrl || undefined,
    musicEnabled: input.musicEnabled === true,
    manageToken: input.manageToken || undefined,
    manageTokenExpiresAt: input.manageTokenExpiresAt || undefined,
    texts: input.texts,
    photographer: input.photographer,
    status: "active",
    isActive: true,
    views: 0,
    customerId: customer.id,
  };

  store.invitations.unshift(invitation);
  await writeStore(store);
  return invitation;
}

export async function updateFileInvitation(code: string, update: FileInvitationUpdate) {
  const store = await readStore();
  const index = store.invitations.findIndex((invitation) => invitation.code.toLowerCase() === code.toLowerCase());
  if (index < 0) return false;

  store.invitations[index] = { ...store.invitations[index], ...update };
  await writeStore(store);
  return true;
}

export async function updateFileInvitationsMusicUrl(fromUrl: string, update: Pick<Invitation, "musicUrl" | "musicEnabled">) {
  const store = await readStore();
  let count = 0;
  store.invitations = store.invitations.map((invitation) => {
    if (invitation.musicUrl !== fromUrl) return invitation;
    count += 1;
    return { ...invitation, ...update };
  });
  if (count > 0) await writeStore(store);
  return count;
}

export async function setFileInvitationActive(code: string, isActive: boolean) {
  return updateFileInvitation(code, { isActive, status: isActive ? "active" : "paused" });
}

export async function setFileInvitationArchived(code: string, archived: boolean) {
  return updateFileInvitation(code, { isActive: !archived, status: archived ? "archived" : "active" });
}

function shouldArchiveInvitation(invitation: Invitation, now = Date.now()) {
  if (invitation.deletedAt || invitation.status === "archived") return false;
  const weddingDate = new Date(invitation.weddingDate);
  if (Number.isNaN(weddingDate.getTime())) return false;
  return weddingDate.getTime() + 2 * 24 * 60 * 60 * 1000 <= now;
}

export async function archiveExpiredFileInvitations(code?: string) {
  if (!isLegacyFileStoreEnabled()) return 0;
  const store = await readStore();
  let count = 0;
  const lookup = code?.toLowerCase();
  store.invitations = store.invitations.map((invitation) => {
    if (lookup && invitation.code.toLowerCase() !== lookup && invitation.customSlug?.toLowerCase() !== lookup) return invitation;
    if (!shouldArchiveInvitation(invitation)) return invitation;
    count += 1;
    return { ...invitation, isActive: false, status: "archived" };
  });
  if (count > 0) await writeStore(store);
  return count;
}

export async function deleteFileInvitation(code: string) {
  return softDeleteFileInvitation(code);
}

export async function softDeleteFileInvitation(code: string) {
  const store = await readStore();
  const index = store.invitations.findIndex((item) => item.code.toLowerCase() === code.toLowerCase() && !item.deletedAt);
  if (index < 0) return false;
  store.invitations[index] = { ...store.invitations[index], deletedAt: new Date().toISOString(), isActive: false, status: "archived" };
  await writeStore(store);
  return true;
}

export async function hardDeleteFileInvitation(code: string) {
  const store = await readStore();
  const invitation = store.invitations.find((item) => item.code.toLowerCase() === code.toLowerCase());
  if (!invitation) return false;

  store.invitations = store.invitations.filter((item) => item.code.toLowerCase() !== code.toLowerCase());
  store.guests = store.guests.filter((guest) => guest.invitationCode.toLowerCase() !== code.toLowerCase());
  const customerHasOtherInvitations = store.invitations.some((item) => item.customerId === invitation.customerId);
  if (!customerHasOtherInvitations) {
    store.customers = store.customers.filter((customer) => customer.id !== invitation.customerId);
  }
  await writeStore(store);
  return true;
}

export async function softDeleteFileCustomer(id: string) {
  const store = await readStore();
  const index = store.customers.findIndex((customer) => customer.id === id && !customer.deletedAt);
  if (index < 0) return false;
  store.customers[index] = { ...store.customers[index], isActive: false, deletedAt: new Date().toISOString() };
  await writeStore(store);
  return true;
}

export async function restoreFileTrashItem(type: "invitation" | "order" | "customer", id: string) {
  const store = await readStore();
  if (type === "invitation") {
    const index = store.invitations.findIndex((item) => item.code === id || item.id === id);
    if (index < 0) return false;
    const { deletedAt, ...invitation } = store.invitations[index];
    store.invitations[index] = { ...invitation, isActive: true, status: "active" };
  } else if (type === "order") {
    const index = store.orders.findIndex((item) => item.id === id);
    if (index < 0) return false;
    const { deletedAt, ...order } = store.orders[index];
    store.orders[index] = order;
  } else {
    const index = store.customers.findIndex((item) => item.id === id);
    if (index < 0) return false;
    const { deletedAt, ...customer } = store.customers[index];
    store.customers[index] = { ...customer, isActive: true };
  }
  await writeStore(store);
  return true;
}

export async function hardDeleteFileTrashItem(type: "invitation" | "order" | "customer", id: string) {
  const store = await readStore();
  if (type === "invitation") {
    const invitation = store.invitations.find((item) => (item.code === id || item.id === id) && item.deletedAt);
    if (!invitation) return false;
    store.invitations = store.invitations.filter((item) => item.code !== invitation.code);
    store.guests = store.guests.filter((guest) => guest.invitationCode !== invitation.code);
    await writeStore(store);
    return true;
  }
  if (type === "order") {
    const order = store.orders.find((item) => item.id === id && item.deletedAt);
    if (!order) return false;
    store.orders = store.orders.filter((item) => item.id !== id);
    await writeStore(store);
    return true;
  }
  const existing = store.customers.find((customer) => customer.id === id && customer.deletedAt);
  if (!existing) return false;
  const nextCustomers = store.customers.filter((customer) => customer.id !== id);
  store.customers = nextCustomers;
  await writeStore(store);
  return true;
}

export async function getFileTrashItems() {
  const store = await readStore();
  const invitations = store.invitations
    .filter((invitation) => invitation.deletedAt)
    .map((invitation) => ({
      type: "invitation" as const,
      id: invitation.code,
      title: `${invitation.groomName} و ${invitation.brideName}`,
      subtitle: invitation.code,
      deletedAt: invitation.deletedAt || "",
      createdAt: invitation.weddingDate,
      meta: invitation.venue,
    }));
  const orders = store.orders
    .filter((order) => order.deletedAt)
    .map((order) => ({
      type: "order" as const,
      id: order.id,
      title: `${order.groomName} و ${order.brideName}`,
      subtitle: order.orderNumber || order.id,
      deletedAt: order.deletedAt || "",
      createdAt: order.createdAt,
      meta: order.venue,
    }));
  const customers = store.customers
    .filter((customer) => customer.deletedAt)
    .map((customer) => ({
      type: "customer" as const,
      id: customer.id,
      title: customer.name,
      subtitle: customer.username,
      deletedAt: customer.deletedAt || "",
      createdAt: customer.createdAt,
      meta: customer.phone,
    }));
  return [...invitations, ...orders, ...customers].sort((a, b) => new Date(b.deletedAt).getTime() - new Date(a.deletedAt).getTime());
}

export async function recordFileInvitationView(code: string, metadata?: FileAnalyticsEvent["metadata"]) {
  const store = await readStore();
  const index = store.invitations.findIndex((invitation) => invitation.code.toLowerCase() === code.toLowerCase());
  if (index < 0) return;
  store.invitations[index] = { ...store.invitations[index], views: store.invitations[index].views + 1 };
  store.analyticsEvents = [
    {
      id: `evt_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
      invitationCode: store.invitations[index].code,
      eventType: "VIEW",
      metadata,
      createdAt: new Date().toISOString(),
    },
    ...store.analyticsEvents,
  ].slice(0, 5000);
  await writeStore(store);
}

export async function getFileAnalyticsEvents() {
  const store = await readStore();
  return store.analyticsEvents || [];
}

export async function addFileGuest(code: string, guest: Omit<GuestRsvp, "id" | "invitationCode" | "createdAt">) {
  const store = await readStore();
  const invitation = store.invitations.find((item) => item.code.toLowerCase() === code.toLowerCase());
  if (!invitation) return false;

  store.guests.unshift({
    id: `gst_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`,
    invitationCode: invitation.code,
    createdAt: new Date().toISOString(),
    ...guest,
  });
  await writeStore(store);
  return true;
}

export async function updateFileGuest(id: string, input: Omit<GuestRsvp, "id" | "invitationCode" | "createdAt">) {
  const store = await readStore();
  const index = store.guests.findIndex((guest) => guest.id === id);
  if (index < 0) return null;
  store.guests[index] = {
    ...store.guests[index],
    name: input.name,
    phone: input.phone,
    attendees: input.attendees,
    status: input.status,
    note: input.note,
  };
  await writeStore(store);
  return store.guests[index];
}

export async function deleteFileGuest(id: string) {
  const store = await readStore();
  const guest = store.guests.find((item) => item.id === id);
  if (!guest) return null;
  store.guests = store.guests.filter((item) => item.id !== id);
  await writeStore(store);
  return guest;
}
