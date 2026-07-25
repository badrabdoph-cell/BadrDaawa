import { unstable_noStore as noStore } from "next/cache";
import { readDraftContent, readPublishedContent, writeDraftContent } from "./project-content-store";
import { DEFAULT_ORDER_TRIAL_DAYS, normalizeOrderTrialDays } from "./order-trial-policy";
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
  sectionOrder?: string[];
};

export type SitePhotographerSettings = {
  showPhotographerCard: boolean;
  defaultName: string;
  defaultLogoUrl?: string;
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
  order: {
    showPaymentMethods: boolean;
    postImageEnabled: boolean;
    autoTrialPublishEnabled: boolean;
    defaultTrialDays: number;
  };
  maintenance: {
    enabled: boolean;
    message: string;
  };
  announcement: {
    enabled: boolean;
    text: string;
    ctaLabel: string;
    ctaUrl: string;
  };
  customHeadHtml: string;
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
    sectionOrder: [],
  },
  photographer: {
    showPhotographerCard: process.env.SHOW_PHOTOGRAPHER_CARD !== "false",
    defaultName: "badrabdoph",
    defaultLogoUrl: "",
    defaultInstagramUrl: "https://www.instagram.com/",
    defaultFacebookUrl: "https://www.facebook.com/",
  },
  order: {
    showPaymentMethods: true,
    postImageEnabled: false,
    autoTrialPublishEnabled: true,
    defaultTrialDays: DEFAULT_ORDER_TRIAL_DAYS,
  },
  maintenance: {
    enabled: false,
    message: "",
  },
  announcement: {
    enabled: false,
    text: "",
    ctaLabel: "",
    ctaUrl: "",
  },
  customHeadHtml: "",
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
      sectionOrder: Array.isArray(input.homepage?.sectionOrder) ? input.homepage.sectionOrder : fallback.homepage.sectionOrder,
    },
    photographer: {
      showPhotographerCard: normalizeBoolean(input.photographer?.showPhotographerCard, fallback.photographer.showPhotographerCard),
      defaultName: cleanText(input.photographer?.defaultName, fallback.photographer.defaultName).slice(0, 80),
      defaultLogoUrl: cleanUrl(input.photographer?.defaultLogoUrl, fallback.photographer.defaultLogoUrl),
      defaultInstagramUrl: cleanUrl(input.photographer?.defaultInstagramUrl, fallback.photographer.defaultInstagramUrl),
      defaultFacebookUrl: cleanUrl(input.photographer?.defaultFacebookUrl, fallback.photographer.defaultFacebookUrl),
    },
    order: {
      showPaymentMethods: normalizeBoolean(input.order?.showPaymentMethods, fallback.order.showPaymentMethods),
      postImageEnabled: normalizeBoolean(input.order?.postImageEnabled, fallback.order.postImageEnabled),
      autoTrialPublishEnabled: normalizeBoolean(input.order?.autoTrialPublishEnabled, fallback.order.autoTrialPublishEnabled),
      defaultTrialDays: normalizeOrderTrialDays(input.order?.defaultTrialDays, fallback.order.defaultTrialDays),
    },
    maintenance: {
      enabled: normalizeBoolean(input.maintenance?.enabled, fallback.maintenance.enabled),
      message: cleanText(input.maintenance?.message, fallback.maintenance.message).slice(0, 500),
    },
    announcement: {
      enabled: normalizeBoolean(input.announcement?.enabled, fallback.announcement.enabled),
      text: cleanText(input.announcement?.text, fallback.announcement.text).slice(0, 500),
      ctaLabel: cleanText(input.announcement?.ctaLabel, fallback.announcement.ctaLabel).slice(0, 80),
      ctaUrl: cleanUrl(input.announcement?.ctaUrl, fallback.announcement.ctaUrl),
    },
    customHeadHtml: cleanOptionalText(input.customHeadHtml),
    updatedAt: cleanOptionalText(input.updatedAt),
  };
}

export async function getSiteSettings() {
  noStore();
  const settings = await readDraftContent("site-settings", defaultSiteSettings, (value) => normalizeSettings(value as Partial<SiteSettings>));
  console.log("[Site Settings] Loaded successfully. Photographer:", {
    name: settings.photographer.defaultName,
    instagram: settings.photographer.defaultInstagramUrl,
    facebook: settings.photographer.defaultFacebookUrl,
  });
  return settings;
}

export async function getDraftSiteSettings(): Promise<SiteSettings> {
  noStore();
  return readDraftContent("site-settings", defaultSiteSettings, (value) =>
    normalizeSettings(value as Partial<SiteSettings>),
  );
}

export async function getPublishedSiteSettings(): Promise<SiteSettings> {
  noStore();
  return readPublishedContent("site-settings", defaultSiteSettings, (value) =>
    normalizeSettings(value as Partial<SiteSettings>),
  );
}

export async function updateSiteSettingsDraft(input: Partial<SiteSettings>): Promise<SiteSettings> {
  const current = await getDraftSiteSettings();
  const next = normalizeSettings({
    ...current,
    ...input,
    socialLinks: { ...current.socialLinks, ...input.socialLinks },
    seo: { ...current.seo, ...input.seo },
    homepage: { ...current.homepage, ...input.homepage },
    photographer: { ...current.photographer, ...input.photographer },
    order: { ...current.order, ...input.order },
    maintenance: { ...current.maintenance, ...input.maintenance },
    announcement: { ...current.announcement, ...input.announcement },
    updatedAt: new Date().toISOString(),
  });
  await writeDraftContent("site-settings", next);
  return next;
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
    order: { ...current.order, ...input.order },
    maintenance: { ...current.maintenance, ...input.maintenance },
    announcement: { ...current.announcement, ...input.announcement },
    updatedAt: new Date().toISOString(),
  });

  console.log("[Site Settings] Updating photographer to:", {
    name: next.photographer.defaultName,
    instagram: next.photographer.defaultInstagramUrl,
    facebook: next.photographer.defaultFacebookUrl,
  });

  await writeDraftContent("site-settings", next);
  console.log("[Site Settings] Successfully saved to database/storage");
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
