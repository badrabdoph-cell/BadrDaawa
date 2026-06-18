import { randomBytes } from "node:crypto";

const TOKEN_BYTES = 24;
const TOKEN_EXPIRY_DAYS = 30;

export function generateManageToken(): string {
  return randomBytes(TOKEN_BYTES).toString("hex");
}

export function getManageTokenExpiry(): Date {
  const expires = new Date();
  expires.setDate(expires.getDate() + TOKEN_EXPIRY_DAYS);
  return expires;
}

export function isManageTokenValid(expiresAt: Date | null | undefined): boolean {
  if (!expiresAt) return false;
  return new Date() < expiresAt;
}
