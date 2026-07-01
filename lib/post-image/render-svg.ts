import type { PostImageRenderPayload } from "./types";

function xml(value: string | number | null | undefined) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function dataUrl(value: string) {
  return value.replace(/&/g, "&amp;");
}

function coupleFontSize(coupleLine: string, scale: number) {
  const length = coupleLine.replace(/\s+/g, "").length;
  if (length > 34) return 56 * scale;
  if (length > 26) return 64 * scale;
  if (length > 18) return 72 * scale;
  return 82 * scale;
}

function renderWhatsAppChatSvg(payload: PostImageRenderPayload): string {
  const { width, height } = payload.size;
  const drawableDate = payload.curiosityDate.replace("❤️", "♥");
  const sx = width / 1080;
  const sy = height / 1350;
  const s = Math.min(sx, sy);
  const headerH = 124 * sy;
  const avatarSize = 62 * s;
  const bubbleX = 88 * sx;
  const bubbleW = 690 * sx;
  const photoX = 132 * sx;
  const photoY = 690 * sy;
  const photoW = 712 * sx;
  const photoH = 360 * sy;
  const qrSize = 98 * s;
  const qrX = 138 * sx;
  const qrY = 1178 * sy;

  const bubble = (x: number, y: number, w: number, h: number, text: string, options: { large?: boolean; center?: boolean; fill?: string } = {}) => `
    <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${24 * s}" fill="${options.fill || "#ffffff"}" stroke="#d9eadf" stroke-width="${1.4 * s}"/>
    <text x="${options.center ? x + w / 2 : x + w - 30 * sx}" y="${y + h * 0.62}" text-anchor="${options.center ? "middle" : "end"}" direction="rtl" font-family="'Noto Naskh Arabic', Tahoma, Arial, sans-serif" font-size="${options.large ? 43 * s : 31 * s}" font-weight="${options.large ? 900 : 750}" fill="#1f2b24">${xml(text)}</text>
  `;

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg class="whatsapp-chat-template" xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" direction="rtl">
  <defs>
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
  <text x="${width - 160 * sx}" y="${92 * sy}" text-anchor="end" direction="rtl" font-family="'Noto Naskh Arabic', Tahoma, Arial, sans-serif" font-size="${36 * s}" font-weight="900" fill="#fffaf3">❤️ ${xml(payload.groomName)} &amp; ${xml(payload.brideName)}</text>
  <text x="${width - 160 * sx}" y="${130 * sy}" text-anchor="end" direction="rtl" font-family="'Noto Naskh Arabic', Tahoma, Arial, sans-serif" font-size="${19 * s}" fill="#d8f1e5">دعوة زفاف رقمية</text>

  ${bubble(bubbleX, 205 * sy, 320 * sx, 70 * sy, "مساء الخير ❤️")}
  ${bubble(bubbleX, 302 * sy, 395 * sx, 72 * sy, "عندنا خبر حلو…")}
  ${bubble(bubbleX, 400 * sy, 510 * sx, 76 * sy, "أخيرًا قررنا نتجوز 🎉", { fill: "#dcf8c6" })}
  ${bubble(240 * sx, 520 * sy, 600 * sx, 105 * sy, "SAVE THE DATE", { large: true, center: true, fill: "#fff8e7" })}

  <rect x="${photoX - 8 * sx}" y="${photoY - 8 * sy}" width="${photoW + 16 * sx}" height="${photoH + 16 * sy}" rx="${30 * s}" fill="#ffffff" stroke="#dce8dd" stroke-width="${2 * s}" filter="url(#chatShadow)"/>
  ${
    payload.coverImageDataUrl
      ? `<image href="${dataUrl(payload.coverImageDataUrl)}" x="${photoX}" y="${photoY}" width="${photoW}" height="${photoH}" preserveAspectRatio="xMidYMid slice" clip-path="url(#chatCoverClip)"/>`
      : `<rect x="${photoX}" y="${photoY}" width="${photoW}" height="${photoH}" rx="${26 * s}" fill="#d9e4d9"/><text x="${photoX + photoW / 2}" y="${photoY + photoH / 2}" text-anchor="middle" direction="rtl" font-family="'Noto Naskh Arabic', Tahoma, Arial, sans-serif" font-size="${38 * s}" fill="#65776b">صورة الدعوة</text>`
  }
  <rect x="${photoX}" y="${photoY}" width="${photoW}" height="${photoH}" rx="${26 * s}" fill="none" stroke="#ffffff" stroke-width="${5 * s}"/>

  ${bubble(346 * sx, 1068 * sy, 500 * sx, 76 * sy, `📅 ${drawableDate}`, { fill: "#ffffff" })}
  <rect x="${120 * sx}" y="${1162 * sy}" width="${800 * sx}" height="${128 * sy}" rx="${26 * s}" fill="#dcf8c6" stroke="#cfe8c3" stroke-width="${1.6 * s}"/>
  <text x="${width - 196 * sx}" y="${1237 * sy}" text-anchor="end" direction="rtl" font-family="'Noto Naskh Arabic', Tahoma, Arial, sans-serif" font-size="${31 * s}" font-weight="850" fill="#1f2b24">👇 اضغط على الصورة وشوف الدعوة كاملة</text>
  <rect x="${qrX - 12 * s}" y="${qrY - 12 * s}" width="${qrSize + 24 * s}" height="${qrSize + 24 * s}" rx="${14 * s}" fill="#ffffff" stroke="#0f5d43" stroke-width="${2 * s}"/>
  <image href="${dataUrl(payload.qrCodeDataUrl)}" x="${qrX}" y="${qrY}" width="${qrSize}" height="${qrSize}"/>
  <text x="${width / 2}" y="${height - 36 * sy}" text-anchor="middle" direction="ltr" font-family="Arial, sans-serif" font-size="${20 * s}" font-weight="800" letter-spacing="${2 * s}" fill="#0f5d43">BADR DAAWA</text>
</svg>`;
}

function renderBreakingNewsSvg(payload: PostImageRenderPayload): string {
  const { width, height } = payload.size;
  const drawableDate = payload.curiosityDate.replace("❤️", "♥");
  const sx = width / 1080;
  const sy = height / 1350;
  const s = Math.min(sx, sy);
  const mastheadY = 55 * sy;
  const topRuleY = 86 * sy;
  const titleY = 240 * sy;
  const titleSize = 122 * s;
  const namesY = 430 * sy;
  const namesSize = coupleFontSize(payload.coupleLine, s);
  const imageX = 160 * sx;
  const imageY = 525 * sy;
  const imageW = 760 * sx;
  const imageH = 470 * sy;
  const dateLabelY = 1083 * sy;
  const dateY = 1170 * sy;
  const qrSize = 108 * s;
  const qrX = width - 154 * sx;
  const qrY = height - 235 * sy;

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" direction="rtl">
  <defs>
    <pattern id="paperMarks" width="${140 * s}" height="${120 * s}" patternUnits="userSpaceOnUse" patternTransform="rotate(-8)">
      <path d="M12 28 C38 6, 58 54, 92 22 S132 38, 146 18" fill="none" stroke="#777064" stroke-width="${1.1 * s}" opacity="0.16" stroke-linecap="round"/>
      <path d="M8 88 C36 66, 62 104, 104 78" fill="none" stroke="#777064" stroke-width="${0.9 * s}" opacity="0.12" stroke-linecap="round"/>
    </pattern>
    <clipPath id="coverClip">
      <rect x="${imageX}" y="${imageY}" width="${imageW}" height="${imageH}" rx="${3 * s}" ry="${3 * s}"/>
    </clipPath>
    <filter id="softShadow" x="-10%" y="-10%" width="120%" height="120%">
      <feDropShadow dx="0" dy="${4 * s}" stdDeviation="${4 * s}" flood-color="#2b2522" flood-opacity="0.22"/>
    </filter>
  </defs>
  <rect width="100%" height="100%" fill="#eee8dc"/>
  <rect width="100%" height="100%" fill="url(#paperMarks)" opacity="0.8"/>
  <rect x="${48 * sx}" y="${26 * sy}" width="${width - 96 * sx}" height="${height - 52 * sy}" fill="none" stroke="#d9d0bf" stroke-width="${1 * s}" opacity="0.3"/>

  <text x="${74 * sx}" y="${mastheadY}" text-anchor="start" direction="ltr" font-family="Georgia, Times New Roman, serif" font-size="${34 * s}" fill="#211b1c">Wedding invitation</text>
  <text x="${width - 70 * sx}" y="${mastheadY}" text-anchor="end" direction="ltr" font-family="Arial, sans-serif" font-size="${24 * s}" font-weight="800" letter-spacing="${3 * s}" fill="#2e2929">${xml(payload.mastheadRight || "BADR_DAAWA")}</text>

  <line x1="${70 * sx}" x2="${width - 70 * sx}" y1="${topRuleY}" y2="${topRuleY}" stroke="#2a2221" stroke-width="${6 * s}"/>
  <line x1="${70 * sx}" x2="${width - 70 * sx}" y1="${topRuleY + 14 * sy}" y2="${topRuleY + 14 * sy}" stroke="#2a2221" stroke-width="${2 * s}"/>

  <text x="${width / 2}" y="${titleY}" text-anchor="middle" direction="rtl" font-family="'Noto Naskh Arabic', Tahoma, Arial, sans-serif" font-size="${titleSize}" font-weight="900" fill="#d50a0a" stroke="#d50a0a" stroke-width="${1.5 * s}">${xml(payload.title)}</text>

  <line x1="${82 * sx}" x2="${width - 82 * sx}" y1="${315 * sy}" y2="${315 * sy}" stroke="#2a2221" stroke-width="${4 * s}"/>
  <line x1="${82 * sx}" x2="${width - 82 * sx}" y1="${328 * sy}" y2="${328 * sy}" stroke="#2a2221" stroke-width="${2 * s}"/>

  <text x="${width / 2}" y="${namesY}" text-anchor="middle" direction="rtl" font-family="'Noto Naskh Arabic', Tahoma, Arial, sans-serif" font-size="${namesSize}" font-weight="800" fill="#332b30">${xml(payload.coupleLine)}</text>
  <line x1="${82 * sx}" x2="${width - 82 * sx}" y1="${488 * sy}" y2="${488 * sy}" stroke="#2a2221" stroke-width="${2 * s}"/>

  <rect x="${imageX - 8 * sx}" y="${imageY - 8 * sy}" width="${imageW + 16 * sx}" height="${imageH + 16 * sy}" fill="#2b2524" filter="url(#softShadow)"/>
  ${
    payload.coverImageDataUrl
      ? `<image href="${dataUrl(payload.coverImageDataUrl)}" x="${imageX}" y="${imageY}" width="${imageW}" height="${imageH}" preserveAspectRatio="xMidYMid slice" clip-path="url(#coverClip)"/>`
      : `<rect x="${imageX}" y="${imageY}" width="${imageW}" height="${imageH}" fill="#d8d0c1"/><text x="${width / 2}" y="${imageY + imageH / 2}" text-anchor="middle" font-family="'Noto Naskh Arabic', Tahoma, Arial, sans-serif" font-size="${40 * s}" fill="#5f554d">صورة الدعوة</text>`
  }
  <rect x="${imageX}" y="${imageY}" width="${imageW}" height="${imageH}" fill="none" stroke="#2b2524" stroke-width="${5 * s}"/>

  <text x="${width / 2}" y="${dateLabelY}" text-anchor="middle" direction="ltr" font-family="Georgia, Times New Roman, serif" font-size="${39 * s}" fill="#30282a" letter-spacing="${2 * s}">SAVE THE DATE</text>
  <text x="${195 * sx}" y="${dateY}" text-anchor="middle" font-family="Arial, sans-serif" font-size="${66 * s}" fill="#0d0b0a">♥</text>
  <rect x="${345 * sx}" y="${1122 * sy}" width="${390 * sx}" height="${92 * sy}" fill="none" stroke="#2b2524" stroke-width="${3 * s}"/>
  <text x="${width / 2}" y="${1184 * sy}" text-anchor="middle" direction="ltr" font-family="Georgia, Times New Roman, serif" font-size="${53 * s}" fill="#30282a">${xml(drawableDate)}</text>
  <text x="${width - 195 * sx}" y="${dateY}" text-anchor="middle" font-family="Arial, sans-serif" font-size="${66 * s}" fill="#0d0b0a">♥</text>

  <rect x="${qrX - 16 * s}" y="${qrY - 42 * s}" width="${qrSize + 32 * s}" height="${qrSize + 58 * s}" rx="${8 * s}" fill="#eee8dc" stroke="#2b2524" stroke-width="${2 * s}" opacity="0.97"/>
  <text x="${qrX + qrSize / 2}" y="${qrY - 16 * s}" text-anchor="middle" direction="ltr" font-family="Arial, sans-serif" font-size="${15 * s}" font-weight="700" fill="#2b2524">SCAN INVITE</text>
  <image href="${dataUrl(payload.qrCodeDataUrl)}" x="${qrX}" y="${qrY}" width="${qrSize}" height="${qrSize}"/>

  <line x1="${70 * sx}" x2="${width - 70 * sx}" y1="${height - 80 * sy}" y2="${height - 80 * sy}" stroke="#2a2221" stroke-width="${5 * s}"/>
  <line x1="${70 * sx}" x2="${width - 70 * sx}" y1="${height - 66 * sy}" y2="${height - 66 * sy}" stroke="#2a2221" stroke-width="${2 * s}"/>
  <text x="${width / 2}" y="${height - 26 * sy}" text-anchor="middle" direction="ltr" font-family="Arial, sans-serif" font-size="${22 * s}" font-weight="900" letter-spacing="${3 * s}" fill="#2e2929">${xml(payload.footerLabel || "BADR DAAWA")}</text>
</svg>`;
}

export function renderPostImageSvg(payload: PostImageRenderPayload): string {
  if (payload.templateId === "whatsapp-chat") return renderWhatsAppChatSvg(payload);
  return renderBreakingNewsSvg(payload);
}
