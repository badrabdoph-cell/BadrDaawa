import { unstable_noStore as noStore } from "next/cache";
import { readProjectContentSetting, writeProjectContentSetting } from "./project-content-store";
import { normalizePhoneForWhatsApp } from "./utils";

export type SiteSocialLinks = {
  facebook: string;
  instagram: string;
  tiktok: string;
  youtube: string;
  telegram: string;
};

export type SiteSeoSettings = {
  title: string;
  description: string;
  keywords: string;
  ogTitle: string;
  ogDescription: string;
};

export type SiteHomepageSettings = {
  showFeatures: boolean;
  showPreview: boolean;
  showPricing: boolean;
  primaryCtaLabel: string;
  secondaryCtaLabel: string;
};

export type SitePhotographerSettings = {
  showPhotographerCard: boolean;
  defaultName: string;
  defaultInstagramUrl: string;
  defaultFacebookUrl: string;
};

export type SiteSettings = {
  siteName: string;
  logoUrl: string;
  siteDescription: string;
  contactPhones: string[];
  whatsappUrl: string;
  email: string;
  socialLinks: SiteSocialLinks;
  seo: SiteSeoSettings;
  homepage: SiteHomepageSettings;
  photographer: SitePhotographerSettings;
  updatedAt: string;
};

export const defaultSiteSettings: SiteSettings = {
  siteName: "BadrDaawa",
  logoUrl: "",
  siteDescription: "Royal Envelope. دعوة رقمية أنيقة وسهلة المشاركة مع ضيوفك.",
  contactPhones: ["01038434472"],
  whatsappUrl: "https://wa.me/201038434472",
  email: "",
  socialLinks: {
    facebook: "",
    instagram: "",
    tiktok: "",
    youtube: "",
    telegram: "",
  },
  seo: {
    title: "BadrDaawa | دعوات زفاف رقمية فاخرة",
    description: "منصة عربية فاخرة لإنشاء دعوات زفاف رقمية، RSVP، QR Code، ولوحات متابعة للحضور.",
    keywords: "دعوة فرح, دعوات زفاف رقمية, RSVP, QR Code, BadrDaawa",
    ogTitle: "BadrDaawa | دعوة تليق بأجمل يوم في حياتكم",
    ogDescription: "دعوة رقمية أنيقة وسهلة المشاركة مع ضيوفك، مع RSVP وQR Code ولوحة متابعة مباشرة.",
  },
  homepage: {
    showFeatures: true,
    showPreview: true,
    showPricing: true,
    primaryCtaLabel: "ابدأ تصميم دعوتك",
    secondaryCtaLabel: "استعرض التصاميم",
  },
  photographer: {
    showPhotographerCard: process.env.SHOW_PHOTOGRAPHER_CARD !== "false",
    defaultName: "badrabdoph",
    defaultInstagramUrl: "https://www.instagram.com/",
    defaultFacebookUrl: "https://www.facebook.com/",
  },
  updatedAt: "",
};

function cleanText(value: unknown, fallback = "") {
  if (typeof value !== "string") return fallback;
  const text = value.trim();
  return text || fallback;
}

function cleanOptionalText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function cleanUrl(value: unknown, fallback = "") {
  const text = cleanOptionalText(value);
  if (!text) return fallback;
  if (text.startsWith("/uploads/") || text.startsWith("/assets/")) return text;
  try {
    const url = new URL(text);
    return url.protocol === "http:" || url.protocol === "https:" ? url.toString() : fallback;
  } catch {
    return fallback;
  }
}

function cleanPhoneList(value: unknown, fallback: string[]) {
  const raw = Array.isArray(value) ? value : typeof value === "string" ? value.split(/\r?\n|,/) : [];
  const phones = raw
    .map((item) => (typeof item === "string" ? item.trim() : ""))
    .filter(Boolean)
    .slice(0, 8);
  return phones.length ? phones : fallback;
}

function normalizeBoolean(value: unknown, fallback: boolean) {
  return typeof value === "boolean" ? value : fallback;
}

function normalizeSocialLinks(input: Partial<SiteSocialLinks> | undefined): SiteSocialLinks {
  return {
    facebook: cleanUrl(input?.facebook, ""),
    instagram: cleanUrl(input?.instagram, ""),
    tiktok: cleanUrl(input?.tiktok, ""),
    youtube: cleanUrl(input?.youtube, ""),
    telegram: cleanUrl(input?.telegram, ""),
  };
}

function normalizeSettings(input: Partial<SiteSettings>): SiteSettings {
  const fallback = defaultSiteSettings;
  const contactPhones = cleanPhoneList(input.contactPhones, fallback.contactPhones);
  const explicitWhatsapp = cleanUrl(input.whatsappUrl, "");
  const whatsappUrl = explicitWhatsapp || `https://wa.me/${normalizePhoneForWhatsApp(contactPhones[0] || fallback.contactPhones[0])}`;

  return {
    siteName: cleanText(input.siteName, fallback.siteName).slice(0, 80),
    logoUrl: cleanUrl(input.logoUrl, ""),
    siteDescription: cleanText(input.siteDescription, fallback.siteDescription).slice(0, 260),
    contactPhones,
    whatsappUrl,
    email: cleanOptionalText(input.email).slice(0, 120),
    socialLinks: normalizeSocialLinks(input.socialLinks),
    seo: {
      title: cleanText(input.seo?.title, fallback.seo.title).slice(0, 90),
      description: cleanText(input.seo?.description, fallback.seo.description).slice(0, 180),
      keywords: cleanText(input.seo?.keywords, fallback.seo.keywords).slice(0, 240),
      ogTitle: cleanText(input.seo?.ogTitle, input.seo?.title || fallback.seo.ogTitle).slice(0, 90),
      ogDescription: cleanText(input.seo?.ogDescription, input.seo?.description || fallback.seo.ogDescription).slice(0, 180),
    },
    homepage: {
      showFeatures: normalizeBoolean(input.homepage?.showFeatures, fallback.homepage.showFeatures),
      showPreview: normalizeBoolean(input.homepage?.showPreview, fallback.homepage.showPreview),
      showPricing: normalizeBoolean(input.homepage?.showPricing, fallback.homepage.showPricing),
      primaryCtaLabel: cleanText(input.homepage?.primaryCtaLabel, fallback.homepage.primaryCtaLabel).slice(0, 80),
      secondaryCtaLabel: cleanText(input.homepage?.secondaryCtaLabel, fallback.homepage.secondaryCtaLabel).slice(0, 80),
    },
    photographer: {
      showPhotographerCard: normalizeBoolean(input.photographer?.showPhotographerCard, fallback.photographer.showPhotographerCard),
      defaultName: cleanText(input.photographer?.defaultName, fallback.photographer.defaultName).slice(0, 80),
      defaultInstagramUrl: cleanUrl(input.photographer?.defaultInstagramUrl, fallback.photographer.defaultInstagramUrl),
      defaultFacebookUrl: cleanUrl(input.photographer?.defaultFacebookUrl, fallback.photographer.defaultFacebookUrl),
    },
    updatedAt: cleanOptionalText(input.updatedAt),
  };
}

export async function getSiteSettings() {
  noStore();
  const settings = await readProjectContentSetting("site-settings", defaultSiteSettings, (value) => normalizeSettings(value as Partial<SiteSettings>));
  console.log("[Site Settings] Loaded from PostgreSQL project content.");
  console.log("[Site Settings] Current updatedAt:", settings.updatedAt);
  return settings;
}

export async function updateSiteSettings(input: Partial<SiteSettings>) {
  const current = await getSiteSettings();
  const next = normalizeSettings({
    ...current,
    ...input,
    socialLinks: { ...current.socialLinks, ...input.socialLinks },
    seo: { ...current.seo, ...input.seo },
    homepage: { ...current.homepage, ...input.homepage },
    photographer: { ...current.photographer, ...input.photographer },
    updatedAt: new Date().toISOString(),
  });

  await writeProjectContentSetting("site-settings", next);
  console.log("[Site Settings] Updated and saved to PostgreSQL project content.");
  console.log("[Site Settings] New updatedAt:", next.updatedAt);
  return next;
}

export function shouldShowPhotographerCard() {
  return process.env.SHOW_PHOTOGRAPHER_CARD !== "false";
}

export function extractInvitationCodeFromInput(value: string) {
  const raw = value.trim();
  if (!raw) return "";

  try {
    const url = new URL(raw);
    return url.pathname.split("/").filter(Boolean)[0] || "";
  } catch {
    return raw.replace(/^\/+/, "").split("/")[0] || "";
  }
}
