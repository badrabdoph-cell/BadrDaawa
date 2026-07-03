import { dataUrl, xml } from "../svg-utils";
import type { PostImageRenderPayload, PostImageTemplate } from "../types";

function renderWhatsAppChatSvg(payload: PostImageRenderPayload): string {
  const { width, height } = payload.size;
  const drawableDate = payload.curiosityDate.replace("❤️", "♥");
  const sx = width / 1080;
  const sy = height / 1350;
  const s = Math.min(sx, sy);
  const headerH = 124 * sy;
  const avatarSize = 62 * s;
  const bubbleX = 88 * sx;
  const photoX = 132 * sx;
  const photoY = 690 * sy;
  const photoW = 712 * sx;
  const photoH = 360 * sy;
  const qrSize = 98 * s;
  const qrX = 138 * sx;
  const qrY = 1178 * sy;
  const arabicFont = "BadrDaawaArabic, Tahoma, Arial, sans-serif";

  const bubble = (x: number, y: number, w: number, h: number, text: string, options: { large?: boolean; center?: boolean; fill?: string } = {}) => `
    <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${24 * s}" fill="${options.fill || "#ffffff"}" stroke="#d9eadf" stroke-width="${1.4 * s}"/>
    <text x="${options.center ? x + w / 2 : x + w - 30 * sx}" y="${y + h * 0.62}" text-anchor="${options.center ? "middle" : "end"}" direction="rtl" font-family="${arabicFont}" font-size="${options.large ? 43 * s : 31 * s}" font-weight="${options.large ? 900 : 750}" fill="#1f2b24">${xml(text)}</text>
  `;

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg class="whatsapp-chat-template" xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" direction="rtl">
  <defs>
    ${payload.fontCss || ""}
    <pattern id="chatPattern" width="${95 * s}" height="${95 * s}" patternUnits="userSpaceOnUse">
      <path d="M12 28 h20 M23 17 v22 M58 62 c12 -18 28 -18 40 0" fill="none" stroke="#2f7a56" stroke-width="${1.1 * s}" opacity="0.08" stroke-linecap="round"/>
      <circle cx="${72 * s}" cy="${22 * s}" r="${5 * s}" fill="#d9b86a" opacity="0.12"/>
    </pattern>
    <clipPath id="chatCoverClip">
      <rect x="${photoX}" y="${photoY}" width="${photoW}" height="${photoH}" rx="${26 * s}"/>
    </clipPath>
    <filter id="chatShadow" x="-15%" y="-15%" width="130%" height="130%">
      <feDropShadow dx="0" dy="${8 * s}" stdDeviation="${10 * s}" flood-color="#123326" flood-opacity="0.15"/>
    </filter>
  </defs>
  <rect width="100%" height="100%" fill="#e9f1e8"/>
  <rect width="100%" height="100%" fill="url(#chatPattern)"/>
  <rect x="${42 * sx}" y="${36 * sy}" width="${width - 84 * sx}" height="${height - 72 * sy}" rx="${42 * s}" fill="#f7fbf6" stroke="#c9ddcf" stroke-width="${2 * s}" filter="url(#chatShadow)"/>
  <rect x="${42 * sx}" y="${36 * sy}" width="${width - 84 * sx}" height="${headerH}" rx="${42 * s}" fill="#0f5d43"/>
  <rect x="${42 * sx}" y="${98 * sy}" width="${width - 84 * sx}" height="${headerH - 62 * sy}" fill="#0f5d43"/>
  <circle cx="${width - 106 * sx}" cy="${98 * sy}" r="${avatarSize / 2}" fill="#f9efe5"/>
  <text x="${width - 106 * sx}" y="${112 * sy}" text-anchor="middle" font-family="Arial, sans-serif" font-size="${35 * s}" fill="#0f5d43">♥</text>
  <text x="${width - 160 * sx}" y="${92 * sy}" text-anchor="end" direction="rtl" font-family="${arabicFont}" font-size="${36 * s}" font-weight="900" fill="#fffaf3">❤️ ${xml(payload.groomName)} &amp; ${xml(payload.brideName)}</text>
  <text x="${width - 160 * sx}" y="${130 * sy}" text-anchor="end" direction="rtl" font-family="${arabicFont}" font-size="${19 * s}" fill="#d8f1e5">دعوة زفاف رقمية</text>

  ${bubble(bubbleX, 205 * sy, 320 * sx, 70 * sy, "مساء الخير ❤️")}
  ${bubble(bubbleX, 302 * sy, 395 * sx, 72 * sy, "عندنا خبر حلو…")}
  ${bubble(bubbleX, 400 * sy, 510 * sx, 76 * sy, "أخيرًا قررنا نتجوز 🎉", { fill: "#dcf8c6" })}
  ${bubble(240 * sx, 520 * sy, 600 * sx, 105 * sy, "SAVE THE DATE", { large: true, center: true, fill: "#fff8e7" })}

  <rect x="${photoX - 8 * sx}" y="${photoY - 8 * sy}" width="${photoW + 16 * sx}" height="${photoH + 16 * sy}" rx="${30 * s}" fill="#ffffff" stroke="#dce8dd" stroke-width="${2 * s}" filter="url(#chatShadow)"/>
  ${
    payload.coverImageDataUrl
      ? `<image href="${dataUrl(payload.coverImageDataUrl)}" x="${photoX}" y="${photoY}" width="${photoW}" height="${photoH}" preserveAspectRatio="xMidYMid slice" clip-path="url(#chatCoverClip)"/>`
      : `<rect x="${photoX}" y="${photoY}" width="${photoW}" height="${photoH}" rx="${26 * s}" fill="#d9e4d9"/><text x="${photoX + photoW / 2}" y="${photoY + photoH / 2}" text-anchor="middle" direction="rtl" font-family="${arabicFont}" font-size="${38 * s}" fill="#65776b">صورة الدعوة</text>`
  }
  <rect x="${photoX}" y="${photoY}" width="${photoW}" height="${photoH}" rx="${26 * s}" fill="none" stroke="#ffffff" stroke-width="${5 * s}"/>

  ${bubble(346 * sx, 1068 * sy, 500 * sx, 76 * sy, `📅 ${drawableDate}`, { fill: "#ffffff" })}
  <rect x="${120 * sx}" y="${1162 * sy}" width="${800 * sx}" height="${128 * sy}" rx="${26 * s}" fill="#dcf8c6" stroke="#cfe8c3" stroke-width="${1.6 * s}"/>
  <text x="${width - 196 * sx}" y="${1237 * sy}" text-anchor="end" direction="rtl" font-family="${arabicFont}" font-size="${31 * s}" font-weight="850" fill="#1f2b24">👇 اضغط على الصورة وشوف الدعوة كاملة</text>
  <rect x="${qrX - 12 * s}" y="${qrY - 12 * s}" width="${qrSize + 24 * s}" height="${qrSize + 24 * s}" rx="${14 * s}" fill="#ffffff" stroke="#0f5d43" stroke-width="${2 * s}"/>
  <image href="${dataUrl(payload.qrCodeDataUrl)}" x="${qrX}" y="${qrY}" width="${qrSize}" height="${qrSize}"/>
  <text x="${width / 2}" y="${height - 36 * sy}" text-anchor="middle" direction="ltr" font-family="Arial, sans-serif" font-size="${20 * s}" font-weight="800" letter-spacing="${2 * s}" fill="#0f5d43">BADR DAAWA</text>
</svg>`;
}

const supportedSizes = [
  { id: "portrait-4x5", width: 1080, height: 1350 },
  { id: "square", width: 1080, height: 1080 },
  { id: "open-graph", width: 1200, height: 630 },
] as const;

export const whatsappChatPostImageTemplate: PostImageTemplate = {
  id: "whatsapp-chat",
  name: "WhatsApp Chat",
  manifest: {
    id: "whatsapp-chat",
    name: "WhatsApp Chat",
    previewId: "whatsapp-chat",
    version: "1.0.0",
    description: "Chat-inspired social sharing poster with wedding messages, cover image, curiosity date, and QR code.",
    defaultSizeId: "portrait-4x5",
    supportedSizes: [...supportedSizes],
  },
  defaultSize: supportedSizes[0],
  supportedSizes: [...supportedSizes],
  renderSvg: renderWhatsAppChatSvg,
};
