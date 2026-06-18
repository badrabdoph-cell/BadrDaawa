const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET || "";

type WebhookEvent = 
  | "invitation.created"
  | "invitation.published"
  | "rsvp.received"
  | "order.created"
  | "order.status_changed";

interface WebhookPayload {
  event: WebhookEvent;
  timestamp: string;
  data: Record<string, unknown>;
}

export async function dispatchWebhook(event: WebhookEvent, data: Record<string, unknown>): Promise<void> {
  const webhookUrls = (process.env.WEBHOOK_URLS || "").split(",").filter(Boolean);
  
  if (webhookUrls.length === 0) return;
  
  const payload: WebhookPayload = {
    event,
    timestamp: new Date().toISOString(),
    data,
  };

  const signature = WEBHOOK_SECRET 
    ? await createSignature(JSON.stringify(payload))
    : "";

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "X-Webhook-Signature": signature,
    "User-Agent": "BadrDaawa-Webhook/1.0",
  };

  await Promise.allSettled(
    webhookUrls.map(async (url) => {
      try {
        const response = await fetch(url.trim(), {
          method: "POST",
          headers,
          body: JSON.stringify(payload),
          signal: AbortSignal.timeout(5000),
        });
        if (!response.ok) {
          console.warn(`Webhook ${url} returned ${response.status}`);
        }
      } catch (err) {
        console.error(`Webhook ${url} failed:`, err);
      }
    })
  );
}

async function createSignature(payload: string): Promise<string> {
  const { createHmac } = await import("node:crypto");
  return createHmac("sha256", WEBHOOK_SECRET).update(payload).digest("hex");
}
