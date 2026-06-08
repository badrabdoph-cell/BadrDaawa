export type VisitSource = "WhatsApp" | "Facebook" | "Instagram" | "Telegram" | "Direct" | "Unknown";

export const visitSources: VisitSource[] = ["WhatsApp", "Facebook", "Instagram", "Telegram", "Direct", "Unknown"];

export const visitSourceLabels: Record<VisitSource, string> = {
  WhatsApp: "واتساب",
  Facebook: "فيسبوك",
  Instagram: "إنستجرام",
  Telegram: "تيليجرام",
  Direct: "مباشر",
  Unknown: "غير معروف",
};

const sourceSlugs: Record<VisitSource, string> = {
  WhatsApp: "whatsapp",
  Facebook: "facebook",
  Instagram: "instagram",
  Telegram: "telegram",
  Direct: "direct",
  Unknown: "unknown",
};

type VisitSourceSearchParams = Record<string, string | string[] | undefined>;

type DetectVisitSourceInput = {
  searchParams?: VisitSourceSearchParams | null;
  referrer?: string | null;
  userAgent?: string | null;
};

function firstParam(searchParams: VisitSourceSearchParams | null | undefined, keys: string[]) {
  if (!searchParams) return "";
  for (const key of keys) {
    const value = searchParams[key];
    const first = Array.isArray(value) ? value[0] : value;
    if (first?.trim()) return first.trim();
  }
  return "";
}

export function normalizeVisitSource(value?: string | null): VisitSource | "" {
  const clean = value?.trim().toLowerCase() || "";
  if (!clean) return "";
  if (/(whatsapp|wa\.me|\bwa\b)/i.test(clean)) return "WhatsApp";
  if (/(facebook|\bfb\b|messenger|meta)/i.test(clean)) return "Facebook";
  if (/(instagram|\big\b|igshid)/i.test(clean)) return "Instagram";
  if (/(telegram|\btg\b|t\.me)/i.test(clean)) return "Telegram";
  if (/direct/i.test(clean)) return "Direct";
  if (/unknown/i.test(clean)) return "Unknown";
  return "";
}

function sourceFromReferrer(referrer?: string | null): VisitSource | "" {
  if (!referrer?.trim()) return "";
  try {
    const hostname = new URL(referrer).hostname.replace(/^www\./, "").toLowerCase();
    if (hostname.includes("whatsapp.com") || hostname === "wa.me") return "WhatsApp";
    if (hostname.includes("facebook.com") || hostname === "fb.com" || hostname.includes("messenger.com")) return "Facebook";
    if (hostname.includes("instagram.com")) return "Instagram";
    if (hostname === "t.me" || hostname.includes("telegram.")) return "Telegram";
  } catch {
    return normalizeVisitSource(referrer);
  }
  return "";
}

function sourceFromQueryIndicators(searchParams?: VisitSourceSearchParams | null): VisitSource | "" {
  if (!searchParams) return "";
  if (firstParam(searchParams, ["fbclid"])) return "Facebook";
  if (firstParam(searchParams, ["igshid", "ig_rid"])) return "Instagram";
  if (firstParam(searchParams, ["tgWebAppData", "telegram"])) return "Telegram";
  return "";
}

export function detectVisitSource(input: DetectVisitSourceInput): VisitSource {
  const explicit = firstParam(input.searchParams, ["utm_source", "source", "src", "ref", "from"]);
  const normalizedExplicit = normalizeVisitSource(explicit);
  if (normalizedExplicit) return normalizedExplicit;
  if (explicit) return "Unknown";

  const querySource = sourceFromQueryIndicators(input.searchParams);
  if (querySource) return querySource;

  const referrerSource = sourceFromReferrer(input.referrer);
  if (referrerSource) return referrerSource;

  return input.referrer?.trim() ? "Unknown" : "Direct";
}

export function getVisitSourceSlug(source: VisitSource) {
  return sourceSlugs[source];
}

export function withVisitSource(url: string, source: Exclude<VisitSource, "Unknown">) {
  try {
    const nextUrl = new URL(url);
    nextUrl.searchParams.set("utm_source", getVisitSourceSlug(source));
    nextUrl.searchParams.set("utm_medium", "share");
    return nextUrl.toString();
  } catch {
    const separator = url.includes("?") ? "&" : "?";
    return `${url}${separator}utm_source=${encodeURIComponent(getVisitSourceSlug(source))}&utm_medium=share`;
  }
}

export function createVisitEventMetadata(input: DetectVisitSourceInput & { source: VisitSource }) {
  const explicit = firstParam(input.searchParams, ["utm_source", "source", "src", "ref", "from"]);
  return {
    source: input.source,
    sourceLabel: visitSourceLabels[input.source],
    utmSource: firstParam(input.searchParams, ["utm_source"]) || undefined,
    explicitSource: explicit || undefined,
    referrer: input.referrer?.slice(0, 500) || undefined,
    userAgent: input.userAgent?.slice(0, 500) || undefined,
  };
}
