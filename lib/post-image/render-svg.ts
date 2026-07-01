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

export function renderPostImageSvg(payload: PostImageRenderPayload): string {
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
