import type { Prisma, PrismaClient } from "@prisma/client";
import { hashPassword } from "./password";

type CustomerIdentityInput = {
  code: string;
  name: string;
  phone?: string | null;
  email?: string | null;
  existingCustomerId?: string | null;
  preferredUsername?: string | null;
  passwordSeed?: string | null;
};

function digitsOnly(value?: string | null) {
  return String(value || "").replace(/\D/g, "");
}

function cleanCode(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 80);
}

export function buildCustomerUsername({ phone, code }: { phone?: string | null; code: string }) {
  const digits = digitsOnly(phone);
  if (digits.length >= 7) return `client_${digits}`;
  return `client_${cleanCode(code) || "invitation"}`;
}

export function buildCustomerPasswordSeed({ phone, code }: { phone?: string | null; code: string }) {
  const digits = digitsOnly(phone);
  return digits.slice(-6) || `${code.trim().slice(0, 80) || "invitation"}-admin`;
}

export async function resolveOrCreateCustomerForInvitation(db: PrismaClient | Prisma.TransactionClient, input: CustomerIdentityInput) {
  const username = String(input.preferredUsername || "").trim() || buildCustomerUsername({ phone: input.phone, code: input.code });
  const passwordSeed = String(input.passwordSeed || "").trim() || buildCustomerPasswordSeed({ phone: input.phone, code: input.code });
  const phone = String(input.phone || "").trim();
  const email = String(input.email || "").trim() || null;
  const data = {
    name: input.name,
    phone,
    email,
    passwordHash: hashPassword(passwordSeed),
    isActive: true,
  };

  if (input.existingCustomerId) {
    const existing = await db.customer.findFirst({ where: { id: input.existingCustomerId, deletedAt: null } });
    if (existing) return db.customer.update({ where: { id: existing.id }, data });
  }

  if (phone) {
    const existingByPhone = await db.customer.findFirst({ where: { phone, deletedAt: null } });
    if (existingByPhone) return db.customer.update({ where: { id: existingByPhone.id }, data });
  }

  return db.customer.upsert({
    where: { username },
    update: data,
    create: { ...data, username },
  });
}
