import { createHash } from "crypto";

function getPasswordSalt() {
  return process.env.AUTH_SECRET || process.env.ADMIN_SESSION_SECRET || "badrdaawa-local-secret";
}

export function hashPassword(password: string) {
  return createHash("sha256").update(`${getPasswordSalt()}:${password}`).digest("hex");
}

export function verifyPassword(password: string, storedHash: string) {
  if (!storedHash) return false;
  return storedHash === hashPassword(password) || storedHash === password;
}
