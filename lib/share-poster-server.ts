import crypto from "crypto";
import QRCode from "qrcode";
import sharp from "sharp";
import { readPublicMediaFile, writeUploadFile } from "./storage-provider";

export type ServerSharePosterInput = {
  selectedShareTemplate?: string;
  groomName: string;
  brideName: string;
  coverImage?: string;
  weddingDate: string;
  weddingTime?: string;
  venueName: string;
  venueAddress?: string;
  invitationUrl: string;
};

const MONTHS_EN = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

function escapeXml(value: string) {
  return (value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function parseWeddingDate(value: string) {
  const date = new Date(value);
  const safeDate = Number.isNaN(date.getTime()) ? new Date() : date;
  return {
    day: String(safeDate.getDate()),
    month: MONTHS_EN[safeDate.getMonth()] || "June",
    year: String(safeDate.getFullYear()),
    headerDate: `${safeDate.getDate()}/${safeDate.getMonth() + 1}/${safeDate.getFullYear()}`,
  };
}

function headlineFor(_template?: string) {
  return "خبر عاجل!!!";
}

function shortUrl(value: string) {
  try {
    const parsed = new URL(value);
    return `${parsed.host}${parsed.pathname}`.replace(/\/$/, "");
  } catch {
    return value.replace(/^https?:\/\//, "").replace(/\/$/, "");
  }
}

async function imageDataUrl(value?: string) {
  if (!value) return "";
  if (value.startsWith("data:image/")) return value;
  try {
    const bytes = await readPublicMediaFile(value);
    if (!bytes) return "";
    const normalized = await sharp(bytes).resize(820, 520, { fit: "cover" }).jpeg({ quality: 86 }).toBuffer();
    return `data:image/jpeg;base64,${normalized.toString("base64")}`;
  } catch {
    return "";
  }
}

function fallbackPhotoSvg() {
  return `data:image/svg+xml;base64,${Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="820" height="520"><rect width="820" height="520" fill="#251b13"/><text x="410" y="250" fill="#fff7e8" font-size="48" font-family="Arial" font-weight="700" text-anchor="middle">Wedding Photo</text><text x="410" y="310" fill="#d7b76b" font-size="26" font-family="Arial" font-weight="700" text-anchor="middle">BadrDaawa</text></svg>`).toString("base64")}`;
}

function posterSvg(input: ServerSharePosterInput, qrDataUrl: string, coverDataUrl: string) {
  const date = parseWeddingDate(input.weddingDate);
  const headline = headlineFor(input.selectedShareTemplate);
  const couple = `${input.groomName} ${input.brideName}`.trim();
  const venue = input.venueName || "Wedding Hall";
  const time = input.weddingTime || "8 pm";
  const urlText = shortUrl(input.invitationUrl);

  return `
<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1350" viewBox="0 0 1080 1350">
  <defs>
    <radialGradient id="bg" cx="50%" cy="18%" r="80%"><stop offset="0%" stop-color="#fffaf2"/><stop offset="62%" stop-color="#f8efe3"/><stop offset="100%" stop-color="#efe0cc"/></radialGradient>
    <pattern id="paper" width="320" height="260" patternUnits="userSpaceOnUse"><g opacity=".12" fill="#4a3526" font-family="Georgia" font-size="15"><text x="4" y="18">The beautiful glamour</text><text x="4" y="42">Wedding invitation template</text><text x="4" y="66">Love story and celebration</text><text x="4" y="90">Save the date and venue</text></g><g opacity=".08" stroke="#4a3526"><line x1="0" y1="176" x2="220" y2="176"/><line x1="0" y1="194" x2="250" y2="194"/><line x1="0" y1="212" x2="180" y2="212"/></g></pattern>
    <clipPath id="photoClip"><rect x="182" y="448" width="716" height="442" rx="26"/></clipPath>
  </defs>
  <rect width="1080" height="1350" fill="url(#bg)"/>
  <rect x="-70" y="-10" width="310" height="1400" fill="url(#paper)" opacity=".42" transform="rotate(-8 85 675)"/>
  <rect x="830" y="-50" width="320" height="1450" fill="url(#paper)" opacity=".42" transform="rotate(12 990 675)"/>
  <text x="92" y="74" font-family="Georgia" font-size="31" font-weight="900" fill="#120d09">Wedding invitation</text>
  <text x="540" y="76" font-family="Georgia" font-size="38" font-weight="900" text-anchor="middle" fill="#4c2b11">♥</text>
  <text x="988" y="74" font-family="Georgia" font-size="32" font-weight="900" text-anchor="end" fill="#120d09">${escapeXml(date.headerDate)}</text>
  <rect x="112" y="92" width="856" height="5" fill="#000"/>
  <text x="540" y="188" direction="rtl" unicode-bidi="bidi-override" font-family="Arial, sans-serif" font-size="98" font-weight="900" text-anchor="middle" fill="#e73539">${escapeXml(headline)}</text>
  <rect x="112" y="254" width="856" height="5" fill="#000"/><rect x="112" y="267" width="856" height="5" fill="#000"/>
  <text x="540" y="383" direction="rtl" unicode-bidi="bidi-override" font-family="Arial, sans-serif" font-size="76" font-weight="900" text-anchor="middle" fill="#4b2b10">${escapeXml(couple)}</text>
  <rect x="112" y="408" width="856" height="5" fill="#000"/>
  <image href="${coverDataUrl || fallbackPhotoSvg()}" x="182" y="448" width="716" height="442" preserveAspectRatio="xMidYMid slice" clip-path="url(#photoClip)"/>
  <rect x="112" y="916" width="856" height="5" fill="#000"/>
  <path d="M84 972H406V1282H84V972ZM84 1048C127 1048 160 1015 160 972H84V1048ZM330 972C330 1015 363 1048 406 1048V972H330ZM406 1206C363 1206 330 1239 330 1282H406V1206ZM160 1282C160 1239 127 1206 84 1206V1282H160Z" fill="#000"/>
  <path d="M84 1048C127 1048 160 1015 160 972H84V1048ZM330 972C330 1015 363 1048 406 1048V972H330ZM406 1206C363 1206 330 1239 330 1282H406V1206ZM160 1282C160 1239 127 1206 84 1206V1282H160Z" fill="#f8efe3"/>
  <text x="245" y="1062" font-family="Georgia" font-size="70" font-weight="900" text-anchor="middle" fill="#fff">${escapeXml(date.day)}</text>
  <text x="245" y="1158" font-family="Georgia" font-size="48" text-anchor="middle" fill="#fff">${escapeXml(date.month)}</text>
  <text x="245" y="1248" font-family="Georgia" font-size="56" font-weight="900" text-anchor="middle" fill="#fff">${escapeXml(date.year)}</text>
  <rect x="480" y="954" width="3" height="392" fill="#000"/>
  <text x="744" y="1008" font-family="Georgia" font-size="58" font-weight="900" text-anchor="middle" fill="#000">Save the date</text>
  <rect x="566" y="1025" width="356" height="4" fill="#000"/>
  <rect x="588" y="1082" width="430" height="246" fill="#fffaf1" opacity=".82" stroke="#16120f" stroke-width="3"/>
  <rect x="595" y="1089" width="416" height="232" fill="none" stroke="#16120f" stroke-width="2"/>
  <text x="802" y="1142" font-family="Georgia" font-size="54" text-anchor="middle" fill="#000">${escapeXml(date.month)}</text>
  <text x="802" y="1194" font-family="Arial" font-size="28" font-weight="900" text-anchor="middle" fill="#000">„${escapeXml(venue.toUpperCase())}„</text>
  <text x="802" y="1256" font-family="Georgia" font-size="34" font-weight="900" text-anchor="middle" fill="#000">At ${escapeXml(time)}</text>
  <image href="${qrDataUrl}" x="612" y="1190" width="116" height="116"/>
  <text x="670" y="1320" direction="rtl" unicode-bidi="bidi-override" font-family="Arial" font-size="15" font-weight="900" text-anchor="middle" fill="#20140d">امسح الكود لمشاهدة الدعوة كاملة</text>
  <text x="900" y="1306" font-family="Arial" font-size="20" font-weight="900" text-anchor="middle" fill="#13100d">${escapeXml(urlText)}</text>
</svg>`;
}

export async function generateSharePosterPng(input: ServerSharePosterInput) {
  const qrDataUrl = await QRCode.toDataURL(input.invitationUrl || "https://badrdaawa.com", { errorCorrectionLevel: "H", margin: 0, width: 220, color: { dark: "#111111", light: "#ffffff" } });
  const coverDataUrl = await imageDataUrl(input.coverImage);
  const svg = posterSvg(input, qrDataUrl, coverDataUrl);
  const png = await sharp(Buffer.from(svg)).png().toBuffer();
  const key = `share-posters/share-poster-${Date.now()}-${crypto.randomBytes(4).toString("hex")}.png`;
  const saved = await writeUploadFile(key, png, "image/png");
  return saved.url;
}

export async function generateShareQrPng(invitationUrl: string) {
  const dataUrl = await QRCode.toDataURL(invitationUrl || "https://badrdaawa.com", { errorCorrectionLevel: "H", margin: 1, width: 900, color: { dark: "#111111", light: "#ffffff" } });
  const base64 = dataUrl.split(",")[1] || "";
  const bytes = Buffer.from(base64, "base64");
  const key = `share-posters/share-qr-${Date.now()}-${crypto.randomBytes(4).toString("hex")}.png`;
  const saved = await writeUploadFile(key, bytes, "image/png");
  return saved.url;
}
