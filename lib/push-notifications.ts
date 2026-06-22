import { createPrivateKey, createSign } from "crypto";
import { prisma } from "@/lib/db";

type StoredSubscription = {
  endpoint: string;
  p256dh: string;
  auth: string;
};

export type BrowserPushSubscription = {
  endpoint?: string;
  keys?: {
    p256dh?: string;
    auth?: string;
  };
};

const DEFAULT_NOTIFICATION = {
  title: "BadrDaawa",
  body: "عندك إشعار جديد من الدعوة.",
  url: "/",
};

function base64UrlEncode(input: Buffer | string) {
  return Buffer.from(input).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function base64UrlDecode(input: string) {
  const normalized = input.replace(/-/g, "+").replace(/_/g, "/");
  return Buffer.from(normalized + "=".repeat((4 - (normalized.length % 4)) % 4), "base64");
}

async function ensurePushTables() {
  if (!prisma) return false;

  try {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS push_subscriptions (
        endpoint TEXT PRIMARY KEY,
        p256dh TEXT NOT NULL,
        auth TEXT NOT NULL,
        invitation_code TEXT,
        user_agent TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS push_notifications (
        id BIGSERIAL PRIMARY KEY,
        title TEXT NOT NULL,
        body TEXT NOT NULL,
        url TEXT NOT NULL DEFAULT '/',
        success_count INTEGER NOT NULL DEFAULT 0,
        failure_count INTEGER NOT NULL DEFAULT 0,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    return true;
  } catch (error) {
    console.error("Failed to prepare push notification tables", error);
    return false;
  }
}

export async function savePushSubscription(subscription: BrowserPushSubscription, invitationCode: string, userAgent?: string) {
  const endpoint = subscription.endpoint?.trim();
  const p256dh = subscription.keys?.p256dh?.trim();
  const auth = subscription.keys?.auth?.trim();

  if (!endpoint || !p256dh || !auth) {
    return { ok: false, reason: "invalid-subscription" };
  }

  try {
    if (!(await ensurePushTables())) {
      return { ok: false, reason: "database-disabled" };
    }

    await prisma!.$executeRawUnsafe(
      `
        INSERT INTO push_subscriptions (endpoint, p256dh, auth, invitation_code, user_agent, updated_at)
        VALUES ($1, $2, $3, $4, $5, NOW())
        ON CONFLICT (endpoint)
        DO UPDATE SET
          p256dh = EXCLUDED.p256dh,
          auth = EXCLUDED.auth,
          invitation_code = EXCLUDED.invitation_code,
          user_agent = EXCLUDED.user_agent,
          updated_at = NOW()
      `,
      endpoint,
      p256dh,
      auth,
      invitationCode || null,
      userAgent || null,
    );
  } catch (error) {
    console.error("Failed to save push subscription", error);
    return { ok: false, reason: "database-error" };
  }

  return { ok: true };
}

export async function getPushSubscriptionCount() {
  try {
    if (!(await ensurePushTables())) return 0;
    const rows = await prisma!.$queryRawUnsafe<Array<{ count: bigint | number | string }>>(`SELECT COUNT(*) AS count FROM push_subscriptions`);
    return Number(rows[0]?.count || 0);
  } catch (error) {
    console.error("Failed to count push subscriptions", error);
    return 0;
  }
}

export async function getLatestNotification() {
  try {
    if (!(await ensurePushTables())) return DEFAULT_NOTIFICATION;
    const rows = await prisma!.$queryRawUnsafe<Array<{ title: string; body: string; url: string }>>(
      `SELECT title, body, url FROM push_notifications ORDER BY created_at DESC LIMIT 1`,
    );
    return rows[0] || DEFAULT_NOTIFICATION;
  } catch (error) {
    console.error("Failed to load latest push notification", error);
    return DEFAULT_NOTIFICATION;
  }
}

function getVapidJwt(endpoint: string) {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;

  if (!publicKey || !privateKey) {
    throw new Error("NEXT_PUBLIC_VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY are required.");
  }

  const publicBytes = base64UrlDecode(publicKey);
  if (publicBytes.length !== 65 || publicBytes[0] !== 4) {
    throw new Error("NEXT_PUBLIC_VAPID_PUBLIC_KEY must be an uncompressed P-256 public key.");
  }

  const jwk = {
    kty: "EC",
    crv: "P-256",
    x: base64UrlEncode(publicBytes.subarray(1, 33)),
    y: base64UrlEncode(publicBytes.subarray(33, 65)),
    d: privateKey,
  };

  const header = base64UrlEncode(JSON.stringify({ typ: "JWT", alg: "ES256" }));
  const payload = base64UrlEncode(
    JSON.stringify({
      aud: new URL(endpoint).origin,
      exp: Math.floor(Date.now() / 1000) + 12 * 60 * 60,
      sub: process.env.VAPID_SUBJECT || `mailto:${process.env.ADMIN_EMAIL || "admin@badrdaawa.com"}`,
    }),
  );
  const input = `${header}.${payload}`;
  const signer = createSign("SHA256");
  signer.update(input);
  signer.end();

  const signature = signer.sign({ key: createPrivateKey({ key: jwk, format: "jwk" }), dsaEncoding: "ieee-p1363" });
  return `${input}.${base64UrlEncode(signature)}`;
}

async function notifySubscription(subscription: StoredSubscription) {
  const jwt = getVapidJwt(subscription.endpoint);
  return fetch(subscription.endpoint, {
    method: "POST",
    headers: {
      Authorization: `vapid t=${jwt}, k=${process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY}`,
      TTL: "86400",
      Urgency: "normal",
      "Content-Length": "0",
    },
  });
}

export async function sendPushNotification({ title, body, url }: { title: string; body: string; url: string }) {
  if (!(await ensurePushTables())) {
    return { ok: false, successCount: 0, failureCount: 0, total: 0 };
  }

  await prisma!.$executeRawUnsafe(
    `INSERT INTO push_notifications (title, body, url) VALUES ($1, $2, $3)`,
    title.trim() || DEFAULT_NOTIFICATION.title,
    body.trim(),
    url.trim() || "/",
  );

  const subscriptions = await prisma!.$queryRawUnsafe<StoredSubscription[]>(`SELECT endpoint, p256dh, auth FROM push_subscriptions`);
  let successCount = 0;
  let failureCount = 0;

  await Promise.all(
    subscriptions.map(async (subscription: StoredSubscription) => {
      try {
        const response = await notifySubscription(subscription);
        if (response.ok) {
          successCount += 1;
          return;
        }

        failureCount += 1;
        if (response.status === 404 || response.status === 410) {
          await prisma!.$executeRawUnsafe(`DELETE FROM push_subscriptions WHERE endpoint = $1`, subscription.endpoint);
        }
      } catch {
        failureCount += 1;
      }
    }),
  );

  await prisma!.$executeRawUnsafe(
    `
      UPDATE push_notifications
      SET success_count = $1, failure_count = $2
      WHERE id = (SELECT id FROM push_notifications ORDER BY created_at DESC LIMIT 1)
    `,
    successCount,
    failureCount,
  );

  return { ok: true, successCount, failureCount, total: subscriptions.length };
}
