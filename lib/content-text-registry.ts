import { unstable_noStore as noStore } from "next/cache";
import { getSiteSettings } from "./site-settings";
import { getHomeContent } from "./home-content";
import { getTemplatePreviewInfo } from "./template-preview-info";
import { getContentPresets } from "./content-presets";
import { getMessageTemplates } from "./message-templates";
import { getLegalPages } from "./legal-pages";
import { getAdminUiTexts, type AdminUiTextEntry } from "./admin-ui-texts";
import { dictionaries } from "./i18n";

export type TextSource =
  | "site-settings"
  | "home-content"
  | "legal-pages"
  | "content-presets"
  | "message-templates"
  | "template-preview-info"
  | "i18n"
  | "admin-ui";

export type ContentTextEntry = {
  id: string;
  source: TextSource;
  sourceLabel: string;
  group: string;
  groupLabel: string;
  path: string;
  title: string;
  text: string;
  href: string;
  editable: boolean;
};

const sourceLabels: Record<TextSource, string> = {
  "site-settings": "إعدادات الموقع",
  "home-content": "محتوى الصفحة الرئيسية",
  "legal-pages": "الصفحات القانونية",
  "content-presets": "النصوص الجاهزة",
  "message-templates": "قوالب الرسائل",
  "template-preview-info": "معلومات المعاينة",
  i18n: "ترجمة الواجهة",
  "admin-ui": "نصوص لوحة الإدارة",
};

function normalizeSearchText(value: string) {
  return value
    .toLowerCase()
    .replace(/[\u064B-\u065F\u0670]/g, "")
    .replace(/[إأآا]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/[^\p{L}\p{N}@._+\-\s/]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokenize(query: string) {
  return normalizeSearchText(query)
    .split(" ")
    .map((part) => part.trim())
    .filter((part) => part.length >= 2);
}

export function textMatchesSearch(text: string, queryTokens: string[]): boolean {
  if (!queryTokens.length) return false;
  const normalized = normalizeSearchText(text);
  return queryTokens.every((token) => normalized.includes(token));
}

async function collectSiteSettingsEntries(): Promise<ContentTextEntry[]> {
  const settings = await getSiteSettings();
  const entries: ContentTextEntry[] = [];
  const baseHref = "/admin/settings";

  entries.push({ id: "site-settings.siteName", source: "site-settings", sourceLabel: sourceLabels["site-settings"], group: "عام", groupLabel: "عام", path: "siteName", title: "اسم الموقع", text: settings.siteName, href: baseHref, editable: true });
  entries.push({ id: "site-settings.siteDescription", source: "site-settings", sourceLabel: sourceLabels["site-settings"], group: "عام", groupLabel: "عام", path: "siteDescription", title: "وصف الموقع", text: settings.siteDescription, href: baseHref, editable: true });
  entries.push({ id: "site-settings.seo.title", source: "site-settings", sourceLabel: sourceLabels["site-settings"], group: "SEO", groupLabel: "SEO", path: "seo.title", title: "SEO عنوان", text: settings.seo.title, href: baseHref, editable: true });
  entries.push({ id: "site-settings.seo.description", source: "site-settings", sourceLabel: sourceLabels["site-settings"], group: "SEO", groupLabel: "SEO", path: "seo.description", title: "SEO وصف", text: settings.seo.description, href: baseHref, editable: true });
  entries.push({ id: "site-settings.seo.keywords", source: "site-settings", sourceLabel: sourceLabels["site-settings"], group: "SEO", groupLabel: "SEO", path: "seo.keywords", title: "SEO كلمات مفتاحية", text: settings.seo.keywords, href: baseHref, editable: true });
  entries.push({ id: "site-settings.seo.ogTitle", source: "site-settings", sourceLabel: sourceLabels["site-settings"], group: "SEO", groupLabel: "SEO", path: "seo.ogTitle", title: "SEO OG عنوان", text: settings.seo.ogTitle, href: baseHref, editable: true });
  entries.push({ id: "site-settings.seo.ogDescription", source: "site-settings", sourceLabel: sourceLabels["site-settings"], group: "SEO", groupLabel: "SEO", path: "seo.ogDescription", title: "SEO OG وصف", text: settings.seo.ogDescription, href: baseHref, editable: true });
  entries.push({ id: "site-settings.homepage.primaryCtaLabel", source: "site-settings", sourceLabel: sourceLabels["site-settings"], group: "الصفحة الرئيسية", groupLabel: "الصفحة الرئيسية", path: "homepage.primaryCtaLabel", title: "زر CTA الأساسي", text: settings.homepage.primaryCtaLabel, href: baseHref, editable: true });
  entries.push({ id: "site-settings.homepage.secondaryCtaLabel", source: "site-settings", sourceLabel: sourceLabels["site-settings"], group: "الصفحة الرئيسية", groupLabel: "الصفحة الرئيسية", path: "homepage.secondaryCtaLabel", title: "زر CTA الثانوي", text: settings.homepage.secondaryCtaLabel, href: baseHref, editable: true });
  entries.push({ id: "site-settings.photographer.defaultName", source: "site-settings", sourceLabel: sourceLabels["site-settings"], group: "المصور", groupLabel: "المصور", path: "photographer.defaultName", title: "اسم المصور", text: settings.photographer.defaultName, href: baseHref, editable: true });

  return entries;
}

async function collectHomeContentEntries(): Promise<ContentTextEntry[]> {
  const content = await getHomeContent();
  const entries: ContentTextEntry[] = [];
  const baseHref = "/admin/settings";

  entries.push({ id: "home-content.hero.kicker", source: "home-content", sourceLabel: sourceLabels["home-content"], group: "القسم العلوي", groupLabel: "القسم العلوي", path: "hero.kicker", title: "مقدمة الهيرو", text: content.hero.kicker, href: baseHref, editable: true });
  entries.push({ id: "home-content.hero.mainTitle", source: "home-content", sourceLabel: sourceLabels["home-content"], group: "القسم العلوي", groupLabel: "القسم العلوي", path: "hero.mainTitle", title: "العنوان الرئيسي", text: content.hero.mainTitle, href: baseHref, editable: true });
  entries.push({ id: "home-content.hero.accentTitle", source: "home-content", sourceLabel: sourceLabels["home-content"], group: "القسم العلوي", groupLabel: "القسم العلوي", path: "hero.accentTitle", title: "العنوان المميز", text: content.hero.accentTitle, href: baseHref, editable: true });
  entries.push({ id: "home-content.hero.description", source: "home-content", sourceLabel: sourceLabels["home-content"], group: "القسم العلوي", groupLabel: "القسم العلوي", path: "hero.description", title: "الوصف", text: content.hero.description, href: baseHref, editable: true });
  entries.push({ id: "home-content.hero.primaryCta", source: "home-content", sourceLabel: sourceLabels["home-content"], group: "القسم العلوي", groupLabel: "القسم العلوي", path: "hero.primaryCta", title: "زر CTA أساسي", text: content.hero.primaryCta, href: baseHref, editable: true });
  entries.push({ id: "home-content.hero.secondaryCta", source: "home-content", sourceLabel: sourceLabels["home-content"], group: "القسم العلوي", groupLabel: "القسم العلوي", path: "hero.secondaryCta", title: "زر CTA ثانوي", text: content.hero.secondaryCta, href: baseHref, editable: true });
  entries.push({ id: "home-content.features.title", source: "home-content", sourceLabel: sourceLabels["home-content"], group: "المميزات", groupLabel: "المميزات", path: "features.title", title: "عنوان المميزات", text: content.features.title, href: baseHref, editable: true });
  entries.push({ id: "home-content.preview.eyebrow", source: "home-content", sourceLabel: sourceLabels["home-content"], group: "المعاينة", groupLabel: "المعاينة", path: "preview.eyebrow", title: "شعار المعاينة", text: content.preview.eyebrow, href: baseHref, editable: true });
  entries.push({ id: "home-content.preview.title", source: "home-content", sourceLabel: sourceLabels["home-content"], group: "المعاينة", groupLabel: "المعاينة", path: "preview.title", title: "عنوان المعاينة", text: content.preview.title, href: baseHref, editable: true });
  entries.push({ id: "home-content.preview.badge", source: "home-content", sourceLabel: sourceLabels["home-content"], group: "المعاينة", groupLabel: "المعاينة", path: "preview.badge", title: "وسام المعاينة", text: content.preview.badge, href: baseHref, editable: true });
  entries.push({ id: "home-content.preview.fullInviteCta", source: "home-content", sourceLabel: sourceLabels["home-content"], group: "المعاينة", groupLabel: "المعاينة", path: "preview.fullInviteCta", title: "زر معاينة كاملة", text: content.preview.fullInviteCta, href: baseHref, editable: true });
  entries.push({ id: "home-content.preview.orderCta", source: "home-content", sourceLabel: sourceLabels["home-content"], group: "المعاينة", groupLabel: "المعاينة", path: "preview.orderCta", title: "زر استخدام التصميم", text: content.preview.orderCta, href: baseHref, editable: true });
  entries.push({ id: "home-content.pricing.eyebrow", source: "home-content", sourceLabel: sourceLabels["home-content"], group: "الأسعار", groupLabel: "الأسعار", path: "pricing.eyebrow", title: "شعار الأسعار", text: content.pricing.eyebrow, href: baseHref, editable: true });
  entries.push({ id: "home-content.pricing.title", source: "home-content", sourceLabel: sourceLabels["home-content"], group: "الأسعار", groupLabel: "الأسعار", path: "pricing.title", title: "عنوان الأسعار", text: content.pricing.title, href: baseHref, editable: true });
  entries.push({ id: "home-content.pricing.invitationPlanName", source: "home-content", sourceLabel: sourceLabels["home-content"], group: "الأسعار", groupLabel: "الأسعار", path: "pricing.invitationPlanName", title: "اسم الباقة الأساسية", text: content.pricing.invitationPlanName, href: baseHref, editable: true });
  entries.push({ id: "home-content.pricing.invitationPrice", source: "home-content", sourceLabel: sourceLabels["home-content"], group: "الأسعار", groupLabel: "الأسعار", path: "pricing.invitationPrice", title: "سعر الباقة الأساسية", text: content.pricing.invitationPrice, href: baseHref, editable: true });
  entries.push({ id: "home-content.pricing.plusPlanName", source: "home-content", sourceLabel: sourceLabels["home-content"], group: "الأسعار", groupLabel: "الأسعار", path: "pricing.plusPlanName", title: "اسم الباقة الكاملة", text: content.pricing.plusPlanName, href: baseHref, editable: true });
  entries.push({ id: "home-content.pricing.plusPrice", source: "home-content", sourceLabel: sourceLabels["home-content"], group: "الأسعار", groupLabel: "الأسعار", path: "pricing.plusPrice", title: "سعر الباقة الكاملة", text: content.pricing.plusPrice, href: baseHref, editable: true });

  for (const point of content.features.points) {
    entries.push({ id: `home-content.features.points.${point.id}`, source: "home-content", sourceLabel: sourceLabels["home-content"], group: "المميزات", groupLabel: "المميزات", path: `features.points.${point.id}`, title: `ميزة: ${point.text.slice(0, 40)}`, text: point.text, href: baseHref, editable: true });
  }

  for (const row of content.pricing.rows) {
    entries.push({ id: `home-content.pricing.rows.${row.id}`, source: "home-content", sourceLabel: sourceLabels["home-content"], group: "الأسعار", groupLabel: "الأسعار", path: `pricing.rows.${row.id}.feature`, title: `خاصية: ${row.feature.slice(0, 40)}`, text: row.feature, href: baseHref, editable: true });
  }

  return entries;
}

async function collectLegalPagesEntries(): Promise<ContentTextEntry[]> {
  const pages = await getLegalPages();
  const entries: ContentTextEntry[] = [];
  const baseHref = "/admin/legal";

  for (const slug of Object.keys(pages) as Array<keyof typeof pages>) {
    const page = pages[slug];
    const slugLabel: Record<string, string> = {
      "privacy-policy": "سياسة الخصوصية",
      terms: "الشروط والأحكام",
      "refund-policy": "سياسة الاسترجاع",
      "usage-policy": "سياسة الاستخدام",
    };

    entries.push({ id: `legal-pages.${slug}.title`, source: "legal-pages", sourceLabel: sourceLabels["legal-pages"], group: slugLabel[slug] || slug, groupLabel: slugLabel[slug] || slug, path: `${slug}.title`, title: `عنوان ${slugLabel[slug] || slug}`, text: page.title, href: `${baseHref}?page=${slug}`, editable: true });
    entries.push({ id: `legal-pages.${slug}.description`, source: "legal-pages", sourceLabel: sourceLabels["legal-pages"], group: slugLabel[slug] || slug, groupLabel: slugLabel[slug] || slug, path: `${slug}.description`, title: `وصف ${slugLabel[slug] || slug}`, text: page.description, href: `${baseHref}?page=${slug}`, editable: true });
    entries.push({ id: `legal-pages.${slug}.content`, source: "legal-pages", sourceLabel: sourceLabels["legal-pages"], group: slugLabel[slug] || slug, groupLabel: slugLabel[slug] || slug, path: `${slug}.content`, title: `محتوى ${slugLabel[slug] || slug}`, text: page.content.slice(0, 500), href: `${baseHref}?page=${slug}`, editable: true });
  }

  return entries;
}

async function collectContentPresetsEntries(): Promise<ContentTextEntry[]> {
  const presets = await getContentPresets();
  const entries: ContentTextEntry[] = [];
  const baseHref = "/admin/content-presets";

  for (const preset of presets) {
    entries.push({ id: `content-presets.${preset.id}.title`, source: "content-presets", sourceLabel: sourceLabels["content-presets"], group: "النصوص الجاهزة", groupLabel: "النصوص الجاهزة", path: `${preset.id}.title`, title: `عنوان النص الجاهز`, text: preset.title, href: baseHref, editable: true });
    entries.push({ id: `content-presets.${preset.id}.content`, source: "content-presets", sourceLabel: sourceLabels["content-presets"], group: "النصوص الجاهزة", groupLabel: "النصوص الجاهزة", path: `${preset.id}.content`, title: `محتوى النص الجاهز: ${preset.title}`, text: preset.content, href: baseHref, editable: true });
    if (preset.secondaryContent) {
      entries.push({ id: `content-presets.${preset.id}.secondaryContent`, source: "content-presets", sourceLabel: sourceLabels["content-presets"], group: "النصوص الجاهزة", groupLabel: "النصوص الجاهزة", path: `${preset.id}.secondaryContent`, title: `محتوى ثانوي: ${preset.title}`, text: preset.secondaryContent, href: baseHref, editable: true });
    }
  }

  return entries;
}

async function collectMessageTemplatesEntries(): Promise<ContentTextEntry[]> {
  const templates = await getMessageTemplates();
  const entries: ContentTextEntry[] = [];
  const baseHref = "/admin/message-templates";

  for (const template of templates) {
    entries.push({ id: `message-templates.${template.id}.title`, source: "message-templates", sourceLabel: sourceLabels["message-templates"], group: "قوالب الرسائل", groupLabel: "قوالب الرسائل", path: `${template.id}.title`, title: `عنوان قالب الرسالة`, text: template.title, href: baseHref, editable: true });
    entries.push({ id: `message-templates.${template.id}.content`, source: "message-templates", sourceLabel: sourceLabels["message-templates"], group: "قوالب الرسائل", groupLabel: "قوالب الرسائل", path: `${template.id}.content`, title: `محتوى القالب: ${template.title}`, text: template.content, href: baseHref, editable: true });
  }

  return entries;
}

async function collectTemplatePreviewEntries(): Promise<ContentTextEntry[]> {
  const info = await getTemplatePreviewInfo();
  const entries: ContentTextEntry[] = [];
  const baseHref = "/admin/templates";

  entries.push({ id: "template-preview.groomName", source: "template-preview-info", sourceLabel: sourceLabels["template-preview-info"], group: "المعاينة", groupLabel: "المعاينة", path: "groomName", title: "اسم العريس", text: info.groomName, href: baseHref, editable: true });
  entries.push({ id: "template-preview.brideName", source: "template-preview-info", sourceLabel: sourceLabels["template-preview-info"], group: "المعاينة", groupLabel: "المعاينة", path: "brideName", title: "اسم العروس", text: info.brideName, href: baseHref, editable: true });
  entries.push({ id: "template-preview.venue", source: "template-preview-info", sourceLabel: sourceLabels["template-preview-info"], group: "المعاينة", groupLabel: "المعاينة", path: "venue", title: "القاعة", text: info.venue, href: baseHref, editable: true });
  entries.push({ id: "template-preview.city", source: "template-preview-info", sourceLabel: sourceLabels["template-preview-info"], group: "المعاينة", groupLabel: "المعاينة", path: "city", title: "المدينة", text: info.city, href: baseHref, editable: true });
  entries.push({ id: "template-preview.texts.inviteMessage", source: "template-preview-info", sourceLabel: sourceLabels["template-preview-info"], group: "المعاينة", groupLabel: "المعاينة", path: "texts.inviteMessage", title: "رسالة الدعوة", text: info.texts.inviteMessage, href: baseHref, editable: true });
  entries.push({ id: "template-preview.texts.inviteMessageSecondary", source: "template-preview-info", sourceLabel: sourceLabels["template-preview-info"], group: "المعاينة", groupLabel: "المعاينة", path: "texts.inviteMessageSecondary", title: "رسالة الدعوة الثانوية", text: info.texts.inviteMessageSecondary, href: baseHref, editable: true });
  entries.push({ id: "template-preview.texts.rsvpQuestion", source: "template-preview-info", sourceLabel: sourceLabels["template-preview-info"], group: "المعاينة", groupLabel: "المعاينة", path: "texts.rsvpQuestion", title: "سؤال RSVP", text: info.texts.rsvpQuestion, href: baseHref, editable: true });
  entries.push({ id: "template-preview.texts.rsvpDeclinedMessage", source: "template-preview-info", sourceLabel: sourceLabels["template-preview-info"], group: "المعاينة", groupLabel: "المعاينة", path: "texts.rsvpDeclinedMessage", title: "رسالة اعتذار RSVP", text: info.texts.rsvpDeclinedMessage, href: baseHref, editable: true });
  entries.push({ id: "template-preview.texts.rsvpConfirmedSuccessMessage", source: "template-preview-info", sourceLabel: sourceLabels["template-preview-info"], group: "المعاينة", groupLabel: "المعاينة", path: "texts.rsvpConfirmedSuccessMessage", title: "رسالة تأكيد الحضور", text: info.texts.rsvpConfirmedSuccessMessage, href: baseHref, editable: true });
  entries.push({ id: "template-preview.texts.rsvpDeclinedSuccessMessage", source: "template-preview-info", sourceLabel: sourceLabels["template-preview-info"], group: "المعاينة", groupLabel: "المعاينة", path: "texts.rsvpDeclinedSuccessMessage", title: "رسالة تأكيد الاعتذار", text: info.texts.rsvpDeclinedSuccessMessage, href: baseHref, editable: true });
  entries.push({ id: "template-preview.photographer.name", source: "template-preview-info", sourceLabel: sourceLabels["template-preview-info"], group: "المصور", groupLabel: "المصور", path: "photographer.name", title: "اسم المصور", text: info.photographer.name, href: baseHref, editable: true });
  entries.push({ id: "template-preview.photographer.description", source: "template-preview-info", sourceLabel: sourceLabels["template-preview-info"], group: "المصور", groupLabel: "المصور", path: "photographer.description", title: "وصف المصور", text: info.photographer.description, href: baseHref, editable: true });

  for (const story of info.texts.story) {
    if (story.title) {
      entries.push({ id: `template-preview.story.${story.id}.title`, source: "template-preview-info", sourceLabel: sourceLabels["template-preview-info"], group: "قصة العروسين", groupLabel: "قصة العروسين", path: `story.${story.id}.title`, title: `عنوان القصة`, text: story.title, href: baseHref, editable: true });
    }
    if (story.description) {
      entries.push({ id: `template-preview.story.${story.id}.description`, source: "template-preview-info", sourceLabel: sourceLabels["template-preview-info"], group: "قصة العروسين", groupLabel: "قصة العروسين", path: `story.${story.id}.description`, title: `وصف القصة`, text: story.description, href: baseHref, editable: true });
    }
  }

  for (const gs of info.texts.galleryStories) {
    if (gs.title) {
      entries.push({ id: `template-preview.galleryStories.${gs.title}`, source: "template-preview-info", sourceLabel: sourceLabels["template-preview-info"], group: "قصة الألبوم", groupLabel: "قصة الألبوم", path: "galleryStories.title", title: `عنوان الألبوم`, text: gs.title, href: baseHref, editable: true });
    }
  }

  return entries;
}

function collectI18nEntries(): ContentTextEntry[] {
  const entries: ContentTextEntry[] = [];
  const ar = dictionaries.ar;

  function walk(obj: Record<string, unknown>, prefix: string) {
    for (const [key, value] of Object.entries(obj)) {
      const path = prefix ? `${prefix}.${key}` : key;
      if (typeof value === "string") {
        entries.push({
          id: `i18n.${path}`,
          source: "i18n",
          sourceLabel: sourceLabels.i18n,
          group: getI18nGroup(prefix),
          groupLabel: getI18nGroupLabel(prefix),
          path: `ar.${path}`,
          title: `ترجمة: ${path}`,
          text: value,
          href: "/admin/texts?source=i18n",
          editable: false,
        });
      } else if (value && typeof value === "object") {
        walk(value as Record<string, unknown>, path);
      }
    }
  }

  walk(ar as unknown as Record<string, unknown>, "");
  return entries;
}

function getI18nGroup(prefix: string): string {
  if (!prefix) return "عام";
  const parts = prefix.split(".");
  return parts[0];
}

function getI18nGroupLabel(prefix: string): string {
  if (!prefix) return "عام";
  if (prefix.startsWith("common")) return "عام";
  if (prefix.startsWith("invitation")) return "الدعوة";
  if (prefix.startsWith("admin")) return "الإدارة";
  return prefix;
}

export async function collectAllTextEntries(): Promise<ContentTextEntry[]> {
  noStore();
  const results = await Promise.allSettled([
    collectSiteSettingsEntries(),
    collectHomeContentEntries(),
    collectLegalPagesEntries(),
    collectContentPresetsEntries(),
    collectMessageTemplatesEntries(),
    collectTemplatePreviewEntries(),
    getAdminUiTexts().then((uiTexts) =>
      uiTexts.map(
        (t): ContentTextEntry => ({
          id: `admin-ui.${t.id}`,
          source: "admin-ui",
          sourceLabel: sourceLabels["admin-ui"],
          group: t.group,
          groupLabel: t.group,
          path: t.id,
          title: t.title,
          text: t.text,
          href: "/admin/texts?source=admin-ui",
          editable: true,
        }),
      ),
    ),
  ]);

  const entries: ContentTextEntry[] = [];

  for (const result of results) {
    if (result.status === "fulfilled") {
      entries.push(...result.value);
    }
  }

  const i18nEntries = collectI18nEntries();
  entries.push(...i18nEntries);

  return entries;
}

export async function searchContentTexts(query: string): Promise<ContentTextEntry[]> {
  const queryTokens = tokenize(query);
  if (!queryTokens.length) return [];
  const allEntries = await collectAllTextEntries();
  return allEntries.filter((entry) => textMatchesSearch(entry.text, queryTokens) || textMatchesSearch(entry.title, queryTokens));
}

export function buildContentTextGroups(entries: ContentTextEntry[]) {
  const groups = new Map<string, ContentTextEntry[]>();
  for (const entry of entries) {
    const key = entry.source;
    const existing = groups.get(key);
    if (existing) {
      existing.push(entry);
    } else {
      groups.set(key, [entry]);
    }
  }
  return groups;
}

export type TextUpdateRequest = {
  id: string;
  value: string;
};

export async function updateContentText(id: string, value: string): Promise<boolean> {
  const parts = id.split(".");
  const source = parts[0] as TextSource;
  const path = parts.slice(1).join(".");

  switch (source) {
    case "site-settings": {
      const { getSiteSettings, updateSiteSettings } = await import("./site-settings");
      const current = await getSiteSettings();
      const setNestedPath = (obj: Record<string, unknown>, p: string, val: string) => {
        const keys = p.split(".");
        let currentObj = obj;
        for (let i = 0; i < keys.length - 1; i++) {
          if (!currentObj[keys[i]] || typeof currentObj[keys[i]] !== "object") {
            currentObj[keys[i]] = {};
          }
          currentObj = currentObj[keys[i]] as Record<string, unknown>;
        }
        currentObj[keys[keys.length - 1]] = val;
      };
      const update = JSON.parse(JSON.stringify(current));
      setNestedPath(update, path, value);
      await updateSiteSettings(update as Parameters<typeof updateSiteSettings>[0]);
      return true;
    }
    case "home-content": {
      const { getHomeContent, updateHomeContent } = await import("./home-content");
      const current = await getHomeContent();
      const setNestedPath = (obj: Record<string, unknown>, p: string, val: string) => {
        const keys = p.split(".");
        let currentObj = obj;
        for (let i = 0; i < keys.length - 1; i++) {
          if (!currentObj[keys[i]] || typeof currentObj[keys[i]] !== "object") {
            currentObj[keys[i]] = {};
          }
          currentObj = currentObj[keys[i]] as Record<string, unknown>;
        }
        currentObj[keys[keys.length - 1]] = val;
      };
      const update = JSON.parse(JSON.stringify(current));
      setNestedPath(update, path, value);
      await updateHomeContent(update as Parameters<typeof updateHomeContent>[0]);
      return true;
    }
    case "legal-pages": {
      const { updateLegalPage } = await import("./legal-pages");
      const pathParts = path.split(".");
      const slug = pathParts[0];
      const field = pathParts[1] as "title" | "description" | "content";
      await updateLegalPage(slug as Parameters<typeof updateLegalPage>[0], { [field]: value });
      return true;
    }
    case "content-presets": {
      const { getContentPresets, updateContentPreset } = await import("./content-presets");
      const presets = await getContentPresets();
      const parts = path.split(".");
      const presetId = parts[0];
      const field = parts[1] as "title" | "content" | "secondaryContent";
      const preset = presets.find((p) => p.id === presetId);
      if (!preset) return false;
      await updateContentPreset(presetId, {
        kind: preset.kind,
        title: preset.title,
        content: preset.content,
        secondaryContent: preset.secondaryContent,
        [field]: value,
      });
      return true;
    }
    case "message-templates": {
      const { getMessageTemplates, updateMessageTemplate } = await import("./message-templates");
      const templates = await getMessageTemplates();
      const parts = path.split(".");
      const templateId = parts[0];
      const field = parts[1] as "title" | "content";
      const template = templates.find((t) => t.id === templateId);
      if (!template) return false;
      await updateMessageTemplate(templateId, {
        kind: template.kind,
        title: template.title,
        content: template.content,
        [field]: value,
      });
      return true;
    }
    case "template-preview-info": {
      const { getTemplatePreviewInfo, updateTemplatePreviewInfo } = await import("./template-preview-info");
      const current = await getTemplatePreviewInfo();
      const setNestedPath = (obj: Record<string, unknown>, p: string, val: string) => {
        const keys = p.split(".");
        let currentObj = obj;
        for (let i = 0; i < keys.length - 1; i++) {
          if (!currentObj[keys[i]] || typeof currentObj[keys[i]] !== "object") {
            currentObj[keys[i]] = {};
          }
          currentObj = currentObj[keys[i]] as Record<string, unknown>;
        }
        currentObj[keys[keys.length - 1]] = val;
      };
      const update = JSON.parse(JSON.stringify(current));
      setNestedPath(update, path, value);
      await updateTemplatePreviewInfo(update as Parameters<typeof updateTemplatePreviewInfo>[0]);
      return true;
    }
    case "admin-ui": {
      const { updateAdminUiText } = await import("./admin-ui-texts");
      return updateAdminUiText(path, value);
    }
    default:
      return false;
  }
}
