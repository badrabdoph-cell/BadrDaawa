import { createHash, pbkdf2Sync, randomBytes, timingSafeEqual } from "crypto";

function getPasswordSalt() {
  return process.env.AUTH_SECRET || process.env.ADMIN_SESSION_SECRET || "badrdaawa-local-secret";
}

function safeEqual(a: string, b: string) {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}

function legacyHashPassword(password: string) {
  return createHash("sha256").update(`${getPasswordSalt()}:${password}`).digest("hex");
}

export function hashPassword(password: string) {
  const iterations = 210000;
  const salt = randomBytes(16).toString("hex");
  const derived = pbkdf2Sync(password, `${getPasswordSalt()}:${salt}`, iterations, 32, "sha256").toString("hex");
  return `pbkdf2-sha256:${iterations}:${salt}:${derived}`;
}

export function verifyPassword(password: string, storedHash: string) {
  if (!storedHash) return false;
  const [scheme, iterationsValue, salt, expected] = storedHash.split(":");
  if (scheme === "pbkdf2-sha256" && iterationsValue && salt && expected) {
    const iterations = Number(iterationsValue);
    if (!Number.isInteger(iterations) || iterations < 100000) return false;
    const derived = pbkdf2Sync(password, `${getPasswordSalt()}:${salt}`, iterations, 32, "sha256").toString("hex");
    return safeEqual(derived, expected);
  }

  if (/^[a-f0-9]{64}$/i.test(storedHash)) {
    return safeEqual(legacyHashPassword(password), storedHash);
  }

  return false;
}
