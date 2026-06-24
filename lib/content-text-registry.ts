import { unstable_noStore as noStore } from "next/cache";
import { getDraftSiteSettings } from "./site-settings";
import { getDraftHomeContent } from "./home-content";
import { getDraftTemplatePreviewInfo } from "./template-preview-info";
import { getDraftContentPresets } from "./content-presets";
import { getDraftMessageTemplates } from "./message-templates";
import { getDraftLegalPages } from "./legal-pages";
import { getDynamicPages } from "./dynamic-pages";
import { getAdminUiTexts, type AdminUiTextEntry } from "./admin-ui-texts";
import { dictionaries } from "./i18n";

export type TextSource =
  | "site-settings"
  | "home-content"
  | "legal-pages"
  | "dynamic-pages"
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
  "dynamic-pages": "صفحات الموقع",
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
  const settings = await getDraftSiteSettings();
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
  const content = await getDraftHomeContent();
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
  const pages = await getDraftLegalPages();
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
    entries.push({ id: `legal-pages.${slug}.content`, source: "legal-pages", sourceLabel: sourceLabels["legal-pages"], group: slugLabel[slug] || slug, groupLabel: slugLabel[slug] || slug, path: `${slug}.content`, title: `محتوى ${slugLabel[slug] || slug}`, text: page.content, href: `${baseHref}?page=${slug}`, editable: true });
  }

  return entries;
}

async function collectDynamicPageEntries(): Promise<ContentTextEntry[]> {
  const pages = await getDynamicPages();
  const entries: ContentTextEntry[] = [];
  const baseHref = "/admin/pages";

  for (const page of pages) {
    entries.push({ id: `dynamic-pages.${page.id}.title`, source: "dynamic-pages", sourceLabel: sourceLabels["dynamic-pages"], group: page.title, groupLabel: page.title, path: `${page.id}.title`, title: `عنوان صفحة: ${page.title}`, text: page.title, href: `${baseHref}?edit=${page.id}`, editable: true });
    entries.push({ id: `dynamic-pages.${page.id}.description`, source: "dynamic-pages", sourceLabel: sourceLabels["dynamic-pages"], group: page.title, groupLabel: page.title, path: `${page.id}.description`, title: `وصف صفحة: ${page.title}`, text: page.description, href: `${baseHref}?edit=${page.id}`, editable: true });
    entries.push({ id: `dynamic-pages.${page.id}.content`, source: "dynamic-pages", sourceLabel: sourceLabels["dynamic-pages"], group: page.title, groupLabel: page.title, path: `${page.id}.content`, title: `محتوى صفحة: ${page.title}`, text: page.content, href: `${baseHref}?edit=${page.id}`, editable: true });
  }

  return entries;
}

async function collectContentPresetsEntries(): Promise<ContentTextEntry[]> {
  const presets = await getDraftContentPresets();
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
  const templates = await getDraftMessageTemplates();
  const entries: ContentTextEntry[] = [];
  const baseHref = "/admin/message-templates";

  for (const template of templates) {
    entries.push({ id: `message-templates.${template.id}.title`, source: "message-templates", sourceLabel: sourceLabels["message-templates"], group: "قوالب الرسائل", groupLabel: "قوالب الرسائل", path: `${template.id}.title`, title: `عنوان قالب الرسالة`, text: template.title, href: baseHref, editable: true });
    entries.push({ id: `message-templates.${template.id}.content`, source: "message-templates", sourceLabel: sourceLabels["message-templates"], group: "قوالب الرسائل", groupLabel: "قوالب الرسائل", path: `${template.id}.content`, title: `محتوى القالب: ${template.title}`, text: template.content, href: baseHref, editable: true });
  }

  return entries;
}

async function collectTemplatePreviewEntries(): Promise<ContentTextEntry[]> {
  const info = await getDraftTemplatePreviewInfo();
  const entries: ContentTextEntry[] = [];
  const baseHref = "/admin/templates";

  entries.push({ id: "template-preview-info.groomName", source: "template-preview-info", sourceLabel: sourceLabels["template-preview-info"], group: "المعاينة", groupLabel: "المعاينة", path: "groomName", title: "اسم العريس", text: info.groomName, href: baseHref, editable: true });
  entries.push({ id: "template-preview-info.brideName", source: "template-preview-info", sourceLabel: sourceLabels["template-preview-info"], group: "المعاينة", groupLabel: "المعاينة", path: "brideName", title: "اسم العروس", text: info.brideName, href: baseHref, editable: true });
  entries.push({ id: "template-preview-info.venue", source: "template-preview-info", sourceLabel: sourceLabels["template-preview-info"], group: "المعاينة", groupLabel: "المعاينة", path: "venue", title: "القاعة", text: info.venue, href: baseHref, editable: true });
  entries.push({ id: "template-preview-info.city", source: "template-preview-info", sourceLabel: sourceLabels["template-preview-info"], group: "المعاينة", groupLabel: "المعاينة", path: "city", title: "المدينة", text: info.city, href: baseHref, editable: true });
  entries.push({ id: "template-preview-info.texts.inviteMessage", source: "template-preview-info", sourceLabel: sourceLabels["template-preview-info"], group: "المعاينة", groupLabel: "المعاينة", path: "texts.inviteMessage", title: "رسالة الدعوة", text: info.texts.inviteMessage, href: baseHref, editable: true });
  entries.push({ id: "template-preview-info.texts.inviteMessageSecondary", source: "template-preview-info", sourceLabel: sourceLabels["template-preview-info"], group: "المعاينة", groupLabel: "المعاينة", path: "texts.inviteMessageSecondary", title: "رسالة الدعوة الثانوية", text: info.texts.inviteMessageSecondary, href: baseHref, editable: true });
  entries.push({ id: "template-preview-info.texts.rsvpQuestion", source: "template-preview-info", sourceLabel: sourceLabels["template-preview-info"], group: "المعاينة", groupLabel: "المعاينة", path: "texts.rsvpQuestion", title: "سؤال RSVP", text: info.texts.rsvpQuestion, href: baseHref, editable: true });
  entries.push({ id: "template-preview-info.texts.rsvpDeclinedMessage", source: "template-preview-info", sourceLabel: sourceLabels["template-preview-info"], group: "المعاينة", groupLabel: "المعاينة", path: "texts.rsvpDeclinedMessage", title: "رسالة اعتذار RSVP", text: info.texts.rsvpDeclinedMessage, href: baseHref, editable: true });
  entries.push({ id: "template-preview-info.texts.rsvpConfirmedSuccessMessage", source: "template-preview-info", sourceLabel: sourceLabels["template-preview-info"], group: "المعاينة", groupLabel: "المعاينة", path: "texts.rsvpConfirmedSuccessMessage", title: "رسالة تأكيد الحضور", text: info.texts.rsvpConfirmedSuccessMessage, href: baseHref, editable: true });
  entries.push({ id: "template-preview-info.texts.rsvpDeclinedSuccessMessage", source: "template-preview-info", sourceLabel: sourceLabels["template-preview-info"], group: "المعاينة", groupLabel: "المعاينة", path: "texts.rsvpDeclinedSuccessMessage", title: "رسالة تأكيد الاعتذار", text: info.texts.rsvpDeclinedSuccessMessage, href: baseHref, editable: true });
  entries.push({ id: "template-preview-info.photographer.name", source: "template-preview-info", sourceLabel: sourceLabels["template-preview-info"], group: "المصور", groupLabel: "المصور", path: "photographer.name", title: "اسم المصور", text: info.photographer.name, href: baseHref, editable: true });
  entries.push({ id: "template-preview-info.photographer.description", source: "template-preview-info", sourceLabel: sourceLabels["template-preview-info"], group: "المصور", groupLabel: "المصور", path: "photographer.description", title: "وصف المصور", text: info.photographer.description, href: baseHref, editable: true });

  for (const story of info.texts.story) {
    if (story.title) {
      entries.push({ id: `template-preview-info.story.${story.id}.title`, source: "template-preview-info", sourceLabel: sourceLabels["template-preview-info"], group: "قصة العروسين", groupLabel: "قصة العروسين", path: `story.${story.id}.title`, title: `عنوان القصة`, text: story.title, href: baseHref, editable: true });
    }
    if (story.description) {
      entries.push({ id: `template-preview-info.story.${story.id}.description`, source: "template-preview-info", sourceLabel: sourceLabels["template-preview-info"], group: "قصة العروسين", groupLabel: "قصة العروسين", path: `story.${story.id}.description`, title: `وصف القصة`, text: story.description, href: baseHref, editable: true });
    }
  }

  for (const gs of info.texts.galleryStories) {
    if (gs.title) {
      entries.push({ id: `template-preview-info.galleryStories.${gs.title}`, source: "template-preview-info", sourceLabel: sourceLabels["template-preview-info"], group: "قصة الألبوم", groupLabel: "قصة الألبوم", path: "galleryStories.title", title: `عنوان الألبوم`, text: gs.title, href: baseHref, editable: true });
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
    collectDynamicPageEntries(),
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

function setNestedPath(obj: Record<string, unknown>, p: string, val: string) {
  const keys = p.split(".");
  let currentObj = obj;
  for (let i = 0; i < keys.length - 1; i++) {
    if (!currentObj[keys[i]] || typeof currentObj[keys[i]] !== "object") {
      currentObj[keys[i]] = {};
    }
    currentObj = currentObj[keys[i]] as Record<string, unknown>;
  }
  currentObj[keys[keys.length - 1]] = val;
}

function setHomeContentPath(obj: Record<string, unknown>, p: string, val: string) {
  const featureMatch = p.match(/^features\.points\.([^.]+)(?:\.text)?$/);
  if (featureMatch) {
    const features = obj.features as { points?: Array<{ id?: string; text?: string }> } | undefined;
    const point = features?.points?.find((item) => item.id === featureMatch[1]);
    if (!point) return false;
    point.text = val;
    return true;
  }

  const pricingMatch = p.match(/^pricing\.rows\.([^.]+)\.feature$/);
  if (pricingMatch) {
    const pricing = obj.pricing as { rows?: Array<{ id?: string; feature?: string }> } | undefined;
    const row = pricing?.rows?.find((item) => item.id === pricingMatch[1]);
    if (!row) return false;
    row.feature = val;
    return true;
  }

  setNestedPath(obj, p, val);
  return true;
}

export async function updateContentText(id: string, value: string): Promise<boolean> {
  const parts = id.split(".");
  const source = parts[0] as TextSource;
  const path = parts.slice(1).join(".");

  switch (source) {
    case "site-settings": {
      const { getDraftSiteSettings, updateSiteSettingsDraft } = await import("./site-settings");
      const current = await getDraftSiteSettings();
      const update = JSON.parse(JSON.stringify(current));
      setNestedPath(update, path, value);
      await updateSiteSettingsDraft(update as Parameters<typeof updateSiteSettingsDraft>[0]);
      return true;
    }
    case "home-content": {
      const { getDraftHomeContent, updateHomeContentDraft } = await import("./home-content");
      const current = await getDraftHomeContent();
      const update = JSON.parse(JSON.stringify(current));
      if (!setHomeContentPath(update, path, value)) return false;
      await updateHomeContentDraft(update as Parameters<typeof updateHomeContentDraft>[0]);
      return true;
    }
    case "dynamic-pages": {
      const { getDynamicPages, upsertDynamicPage } = await import("./dynamic-pages");
      const pathParts = path.split(".");
      const pageId = pathParts[0];
      const field = pathParts[1] as "title" | "description" | "content";
      if (!pageId || !["title", "description", "content"].includes(field)) return false;
      const pages = await getDynamicPages();
      const page = pages.find((item) => item.id === pageId);
      if (!page) return false;
      const result = await upsertDynamicPage({
        id: page.id,
        slug: page.slug,
        title: field === "title" ? value : page.title,
        description: field === "description" ? value : page.description,
        content: field === "content" ? value : page.content,
        coverImageUrl: page.coverImageUrl || "",
        isPublished: page.isPublished,
      });
      return !!result.page;
    }
    case "legal-pages": {
      const { updateLegalPageDraft } = await import("./legal-pages");
      const pathParts = path.split(".");
      const slug = pathParts[0];
      const field = pathParts[1] as "title" | "description" | "content";
      await updateLegalPageDraft(slug as Parameters<typeof updateLegalPageDraft>[0], { [field]: value });
      return true;
    }
    case "content-presets": {
      const { getDraftContentPresets, updateContentPresetDraft } = await import("./content-presets");
      const presets = await getDraftContentPresets();
      const parts = path.split(".");
      const presetId = parts[0];
      const field = parts[1] as "title" | "content" | "secondaryContent";
      const preset = presets.find((p) => p.id === presetId);
      if (!preset) return false;
      await updateContentPresetDraft(presetId, {
        kind: preset.kind,
        title: preset.title,
        content: preset.content,
        secondaryContent: preset.secondaryContent,
        [field]: value,
      });
      return true;
    }
    case "message-templates": {
      const { getDraftMessageTemplates, updateMessageTemplateDraft } = await import("./message-templates");
      const templates = await getDraftMessageTemplates();
      const parts = path.split(".");
      const templateId = parts[0];
      const field = parts[1] as "title" | "content";
      const template = templates.find((t) => t.id === templateId);
      if (!template) return false;
      await updateMessageTemplateDraft(templateId, {
        kind: template.kind,
        title: template.title,
        content: template.content,
        [field]: value,
      });
      return true;
    }
    case "template-preview-info": {
      const { getDraftTemplatePreviewInfo, updateTemplatePreviewInfoDraft } = await import("./template-preview-info");
      const current = await getDraftTemplatePreviewInfo();
      const update = JSON.parse(JSON.stringify(current));
      setNestedPath(update, path, value);
      await updateTemplatePreviewInfoDraft(update as Parameters<typeof updateTemplatePreviewInfoDraft>[0]);
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
