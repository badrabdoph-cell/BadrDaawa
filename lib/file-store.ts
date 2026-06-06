import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { unstable_noStore as noStore } from "next/cache";
import { hashPassword, verifyPassword } from "./password";
import { makeNumberedInvitationSlug } from "./slug";
import type { GuestRsvp, Invitation, OrderRequest } from "./types";

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
};

type FileInvitationUpdate = Partial<
  Pick<Invitation, "groomName" | "brideName" | "weddingDate" | "weddingTime" | "venue" | "city" | "mapUrl" | "musicUrl" | "gallery" | "heroPhoto">
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

export async function getFileInvitations() {
  const store = await readStore();
  return store.invitations;
}

export async function getFileOrders() {
  const store = await readStore();
  return store.orders;
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
  return store.invitations.find((invitation) => invitation.code.toLowerCase() === code.toLowerCase());
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
