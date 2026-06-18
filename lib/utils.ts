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

export function formatDate(value: string | null | undefined, locale = "ar-SA"): string {
  if (!value) return "غير محدد";
  try {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "غير محدد";
    return new Intl.DateTimeFormat(locale, {
      year: "numeric",
      month: "short",
      day: "numeric",
    }).format(date);
  } catch {
    return "غير محدد";
  }
}

export function formatArabicNumber(value: number) {
  return new Intl.NumberFormat("en-US").format(value);
}

const defaultSiteUrl = "https://daawa.up.railway.app";
const templatePreviewQrUrl = "https://daawa.up.railway.app/";

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
  const forwardedHost = headers?.get("x-forwarded-host")?.split(",")[0]?.trim() || headers?.get("host")?.split(",")[0]?.trim();
  const forwardedProto = headers?.get("x-forwarded-proto")?.split(",")[0]?.trim();

  if (forwardedHost) {
    const protocol = forwardedProto || (/^(localhost|127\.0\.0\.1)(:\d+)?$/i.test(forwardedHost) ? "http" : "https");
    const requestSiteUrl = normalizeSiteUrl(`${protocol}://${forwardedHost}`);
    if (/^(localhost|127\.0\.0\.1)(:\d+)?$/i.test(forwardedHost) || !process.env.NEXT_PUBLIC_SITE_URL) {
      return requestSiteUrl;
    }
  }

  if (process.env.NEXT_PUBLIC_SITE_URL) {
    return normalizeSiteUrl(process.env.NEXT_PUBLIC_SITE_URL);
  }

  return normalizeSiteUrl(fallbackOrigin);
}

export function getPublicUrl(path: string, headers?: Headers, fallbackOrigin?: string) {
  return new URL(path, getPublicSiteUrl(headers, fallbackOrigin));
}

export function normalizeInternalAssetUrl(value?: string | null) {
  const raw = value?.trim();
  if (!raw) return "";
  if (raw.startsWith("/uploads/") || raw.startsWith("/assets/")) return raw;

  if (raw.startsWith("http://") || raw.startsWith("https://")) {
    try {
      const url = new URL(raw);
      if (url.pathname.startsWith("/uploads/") || url.pathname.startsWith("/assets/")) {
        return `${url.pathname}${url.search}${url.hash}`;
      }
      return url.toString();
    } catch {
      return "";
    }
  }

  return "";
}

function getHeaderOrigin(value?: string | null) {
  if (!value) return "";

  try {
    const url = new URL(value);
    if (url.protocol !== "http:" && url.protocol !== "https:") return "";
    const isLocalhost = url.hostname === "localhost" || url.hostname === "127.0.0.1";
    if (!url.hostname || url.hostname.includes("..") || (!isLocalhost && !url.hostname.includes("."))) return "";
    url.pathname = "/";
    url.hash = "";
    url.search = "";
    return url.toString().replace(/\/$/, "");
  } catch {
    return "";
  }
}

function isLocalhostOrigin(value: string) {
  try {
    const hostname = new URL(value).hostname;
    return hostname === "localhost" || hostname === "127.0.0.1";
  } catch {
    return false;
  }
}

export function getRedirectUrl(path: string, headers?: Headers, fallbackOrigin = "http://localhost:3000") {
  const safePath = path.startsWith("/") && !path.startsWith("//") ? path : "/";
  const publicSiteUrl = getPublicSiteUrl(headers, fallbackOrigin);
  const publicOrigin = new URL(publicSiteUrl).origin;
  const requestOrigin = getHeaderOrigin(fallbackOrigin);
  const browserOrigin = getHeaderOrigin(headers?.get("origin")) || getHeaderOrigin(headers?.get("referer"));
  const browserOriginValue = browserOrigin ? new URL(browserOrigin).origin : "";
  const requestOriginValue = requestOrigin ? new URL(requestOrigin).origin : "";
  const canUseBrowserOrigin =
    browserOrigin &&
    (browserOriginValue === publicOrigin ||
      browserOriginValue === requestOriginValue ||
      (isLocalhostOrigin(browserOrigin) && (isLocalhostOrigin(publicOrigin) || isLocalhostOrigin(requestOrigin))));
  return new URL(safePath, canUseBrowserOrigin ? browserOrigin : publicSiteUrl);
}

export function getMetadataBaseUrl() {
  return new URL(normalizeSiteUrl(process.env.NEXT_PUBLIC_SITE_URL));
}

export function getInvitationUrl(code: string, customSlug?: string | null) {
  if (code.startsWith("preview-")) return templatePreviewQrUrl;
  return `${getSiteUrl().replace(/\/$/, "")}/${(customSlug || code).replace(/^\/+/, "")}`;
}

export function normalizePhoneForWhatsApp(phone: string) {
  const digits = phone.replace(/[^\d]/g, "");
  if (digits.startsWith("00")) return digits.slice(2);
  if (digits.startsWith("0")) return `20${digits.slice(1)}`;
  if (digits.length === 10 && digits.startsWith("1")) return `20${digits}`;
  return digits;
}

const fallbackWhatsAppPhone = "01038434472";

function isWhatsAppHost(hostname: string) {
  return hostname === "wa.me" || hostname === "api.whatsapp.com" || hostname === "web.whatsapp.com" || hostname.endsWith(".whatsapp.com");
}

export function getWhatsAppOrderUrl(message: string, recipient?: string | null) {
  const configuredRecipient = recipient?.trim() || process.env.WHATSAPP_ORDER_PHONE?.trim() || fallbackWhatsAppPhone;

  if (/^https?:\/\//i.test(configuredRecipient)) {
    try {
      const url = new URL(configuredRecipient);
      if (url.protocol === "https:" && isWhatsAppHost(url.hostname)) {
        url.searchParams.set("text", message);
        return url.toString();
      }
    } catch {}
  }

  return `https://wa.me/${normalizePhoneForWhatsApp(configuredRecipient)}?text=${encodeURIComponent(message)}`;
}

export function canUseOptimizedImage(src: string): boolean {
  return typeof src === "string" && (src.startsWith("/") || src.startsWith("/_next/"));
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

export function formatDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("ar-EG-u-nu-latn", { dateStyle: "medium", timeStyle: "short" }).format(date);
}
