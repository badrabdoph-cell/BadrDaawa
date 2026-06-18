const WHATSAPP_API_KEY = process.env.WHATSAPP_API_KEY || "";
const WHATSAPP_PHONE_ID = process.env.WHATSAPP_PHONE_ID || "";
const WHATSAPP_API_URL = process.env.WHATSAPP_API_URL || "https://graph.facebook.com/v18.0";

interface WhatsAppMessage {
  to: string;
  templateName: string;
  parameters: Record<string, string>;
}

export async function sendWhatsAppMessage(message: WhatsAppMessage): Promise<boolean> {
  if (!WHATSAPP_API_KEY || !WHATSAPP_PHONE_ID) {
    console.warn("WhatsApp API not configured - skipping message");
    return false;
  }
  
  try {
    const response = await fetch(`${WHATSAPP_API_URL}/${WHATSAPP_PHONE_ID}/messages`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${WHATSAPP_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: message.to.startsWith("+") ? message.to : `+${message.to}`,
        type: "template",
        template: {
          name: message.templateName,
          language: { code: "ar" },
          components: [{
            type: "body",
            parameters: Object.entries(message.parameters).map(([key, value]) => ({
              type: "text",
              text: value,
            })),
          }],
        },
      }),
    });
    
    if (!response.ok) {
      const error = await response.text();
      console.error("WhatsApp API error:", error);
      return false;
    }
    
    return true;
  } catch (err) {
    console.error("WhatsApp send failed:", err);
    return false;
  }
}

export const WHATSAPP_TEMPLATES = {
  INVITATION_READY: "invitation_ready",
  RSVP_REMINDER: "rsvp_reminder",
  WEDDING_REMINDER: "wedding_reminder",
  THANK_YOU: "thank_you",
} as const;
