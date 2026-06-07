import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { unstable_noStore as noStore } from "next/cache";
import { isBrowserDisplayImageUrl } from "./image-formats";
import { hashPassword, verifyPassword } from "./password";
import { makeNumberedInvitationSlug } from "./slug";
import type { GuestRsvp, Invitation, OrderRequest } from "./types";
import { normalizeInternalAssetUrl } from "./utils";

type FileCustomer = {
  id: string;
  name: string;
  phone: string;
  username: string;
  passwordHash: string;
  isActive: boolean;
  createdAt: string;
};

type FileStoreData = {
  invitations: Invitation[];
  guests: GuestRsvp[];
  customers: FileCustomer[];
  orders: OrderRequest[];
};

type CreateFileInvitationInput = {
  baseSlug: string;
  templateSlug: string;
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
  musicUrl: string;
  musicEnabled?: boolean;
  photographer?: Invitation["photographer"];
};

type FileInvitationUpdate = Partial<
  Pick<Invitation, "templateSlug" | "groomName" | "brideName" | "weddingDate" | "weddingTime" | "venue" | "city" | "mapUrl" | "musicUrl" | "musicEnabled" | "photographer" | "gallery" | "heroPhoto" | "isActive">
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
    | "photographer"
    | "rejectionReason"
    | "publishedInvitationCode"
    | "orderNumber"
    | "dedupeKey"
    | "submittedAt"
  >
>;

const storePath = path.join(process.cwd(), "data", "runtime-store.json");

function createEmptyStore(): FileStoreData {
  return {
    invitations: [],
    guests: [],
    customers: [],
    orders: [],
  };
}

async function readStore(): Promise<FileStoreData> {
  noStore();

  try {
    const raw = await readFile(storePath, "utf8");
    const parsed = JSON.parse(raw) as Partial<FileStoreData>;
    return {
      invitations: Array.isArray(parsed.invitations) ? parsed.invitations : [],
      guests: Array.isArray(parsed.guests) ? parsed.guests : [],
      customers: Array.isArray(parsed.customers) ? parsed.customers : [],
      orders: Array.isArray(parsed.orders) ? parsed.orders : [],
    };
  } catch {
    return createEmptyStore();
  }
}

async function writeStore(store: FileStoreData) {
  await mkdir(path.dirname(storePath), { recursive: true });
  await writeFile(storePath, `${JSON.stringify(store, null, 2)}\n`, "utf8");
}

function normalizeInvitationImages(invitation: Invitation): Invitation {
  const cleanImage = (value?: string | null) => {
    const url = normalizeInternalAssetUrl(value);
    return url && isBrowserDisplayImageUrl(url) ? url : "";
  };
  const gallery = invitation.gallery.map(cleanImage).filter(Boolean);
  const heroPhoto = cleanImage(invitation.heroPhoto) || gallery[0] || invitation.heroPhoto;
  return { ...invitation, heroPhoto, gallery: gallery.length ? gallery : invitation.gallery };
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
  const store = await readStore();
  return store.invitations.map(normalizeInvitationImages);
}

export async function getFileOrders() {
  const store = await readStore();
  return store.orders
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
  const store = await readStore();
  const nextOrders = store.orders.filter((order) => order.id !== id);
  if (nextOrders.length === store.orders.length) return false;
  store.orders = nextOrders;
  await writeStore(store);
  return true;
}

export async function getFileOrder(id: string) {
  const store = await readStore();
  const order = store.orders.find((order) => order.id === id);
  return order ? normalizeOrderImages(order) : null;
}

export async function getFileCustomers() {
  const store = await readStore();
  return store.customers.map((customer) => ({
    id: customer.id,
    name: customer.name,
    phone: customer.phone,
    username: customer.username,
    isActive: customer.isActive,
    invitations: store.invitations.filter((invitation) => invitation.customerId === customer.id).length,
    createdAt: customer.createdAt,
  }));
}

export async function getFileInvitationByCode(code: string) {
  const store = await readStore();
  const invitation = store.invitations.find((invitation) => invitation.code.toLowerCase() === code.toLowerCase());
  return invitation ? normalizeInvitationImages(invitation) : undefined;
}

export async function getFileGuestsByInvitation(code: string) {
  const store = await readStore();
  return store.guests.filter((guest) => guest.invitationCode.toLowerCase() === code.toLowerCase());
}

export async function createFileInvitation(input: CreateFileInvitationInput) {
  const store = await readStore();
  const code = makeNumberedInvitationSlug(
    input.baseSlug,
    store.invitations.map((invitation) => invitation.code),
  );
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
    templateSlug: input.templateSlug,
    language: "ar",
    groomName: input.groomName,
    brideName: input.brideName,
    weddingDate: input.weddingDate,
    weddingTime: input.weddingTime,
    venue: input.venue,
    city: input.city,
    mapUrl: input.mapUrl,
    heroPhoto: input.gallery[0] || "/assets/invite/badr-sarah-1.jpeg",
    gallery: input.gallery,
    musicUrl: input.musicUrl || undefined,
    musicEnabled: input.musicEnabled !== false,
    photographer: input.photographer,
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

export async function setFileInvitationActive(code: string, isActive: boolean) {
  return updateFileInvitation(code, { isActive });
}

export async function deleteFileInvitation(code: string) {
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

export async function recordFileInvitationView(code: string) {
  const store = await readStore();
  const index = store.invitations.findIndex((invitation) => invitation.code.toLowerCase() === code.toLowerCase());
  if (index < 0) return;
  store.invitations[index] = { ...store.invitations[index], views: store.invitations[index].views + 1 };
  await writeStore(store);
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

export async function validateFileClientLogin(code: string, username: string, password: string) {
  const store = await readStore();
  const invitation = store.invitations.find((item) => item.code.toLowerCase() === code.toLowerCase());
  if (!invitation) return false;

  const customer = store.customers.find((item) => item.id === invitation.customerId && item.username === username);
  return Boolean(customer?.isActive && verifyPassword(password, customer.passwordHash));
}
