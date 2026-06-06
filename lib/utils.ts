import { clsx, type ClassValue } from "clsx";

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

export function formatArabicDate(date: string) {
  return new Intl.DateTimeFormat("ar-EG-u-nu-latn", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(date));
}

export function formatArabicNumber(value: number) {
  return new Intl.NumberFormat("en-US").format(value);
}

const defaultSiteUrl = "https://weddingdaawa.up.railway.app";
const templatePreviewQrUrl = "https://weddingdaawa.up.railway.app/";

export function normalizeSiteUrl(value?: string | null) {
  const raw = value
    ?.trim()
    .replace(/^["']|["']$/g, "")
    .replace(/[↗↘↙↖]+/g, "")
    .replace(/\s+/g, "");

  if (!raw) return defaultSiteUrl;

  const isLocalhostInput = /^(localhost|127\.0\.0\.1)(:\d+)?(\/.*)?$/i.test(raw);
  const withProtocol = /^https?:\/\//i.test(raw) ? raw : `${isLocalhostInput ? "http" : "https"}://${raw}`;

  try {
    const url = new URL(withProtocol);
    const isLocalhost = url.hostname === "localhost" || url.hostname === "127.0.0.1";
    if (!url.hostname || url.hostname.includes("..") || (!isLocalhost && !url.hostname.includes("."))) return defaultSiteUrl;
    url.pathname = "/";
    url.hash = "";
    url.search = "";
    return url.toString().replace(/\/$/, "");
  } catch {
    return defaultSiteUrl;
  }
}

export function getSiteUrl() {
  return normalizeSiteUrl(process.env.NEXT_PUBLIC_SITE_URL || (process.env.NODE_ENV === "development" ? "http://localhost:3000" : defaultSiteUrl));
}

export function getPublicSiteUrl(headers?: Headers, fallbackOrigin = "http://localhost:3000") {
  if (process.env.NEXT_PUBLIC_SITE_URL) {
    return normalizeSiteUrl(process.env.NEXT_PUBLIC_SITE_URL);
  }

  const forwardedHost = headers?.get("x-forwarded-host")?.split(",")[0]?.trim() || headers?.get("host")?.split(",")[0]?.trim();
  const forwardedProto = headers?.get("x-forwarded-proto")?.split(",")[0]?.trim();

  if (forwardedHost) {
    const protocol = forwardedProto || (/^(localhost|127\.0\.0\.1)(:\d+)?$/i.test(forwardedHost) ? "http" : "https");
    return normalizeSiteUrl(`${protocol}://${forwardedHost}`);
  }

  return normalizeSiteUrl(fallbackOrigin);
}

export function getPublicUrl(path: string, headers?: Headers, fallbackOrigin?: string) {
  return new URL(path, getPublicSiteUrl(headers, fallbackOrigin));
}

export function getMetadataBaseUrl() {
  return new URL(normalizeSiteUrl(process.env.NEXT_PUBLIC_SITE_URL));
}

export function getInvitationUrl(code: string) {
  if (code.startsWith("preview-")) return templatePreviewQrUrl;
  return `${getSiteUrl().replace(/\/$/, "")}/${code}`;
}

export function normalizePhoneForWhatsApp(phone: string) {
  const digits = phone.replace(/[^\d]/g, "");
  if (digits.startsWith("00")) return digits.slice(2);
  if (digits.startsWith("0")) return `20${digits.slice(1)}`;
  if (digits.length === 10 && digits.startsWith("1")) return `20${digits}`;
  return digits;
}

export function getWhatsAppOrderUrl(message: string) {
  const phone = process.env.WHATSAPP_ORDER_PHONE || "01011511561";
  return `https://wa.me/${normalizePhoneForWhatsApp(phone)}?text=${encodeURIComponent(message)}`;
}

export function calculateAttendance(guests: { attendees: number; status: string }[]) {
  return guests.reduce(
    (summary, guest) => {
      summary.totalResponses += 1;
      if (guest.status === "confirmed") {
        summary.confirmedGuests += guest.attendees;
      } else {
        summary.declinedGuests += guest.attendees;
      }
      return summary;
    },
    { totalResponses: 0, confirmedGuests: 0, declinedGuests: 0 },
  );
}
