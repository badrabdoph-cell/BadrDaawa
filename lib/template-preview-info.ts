import { unstable_noStore as noStore } from "next/cache";
import { readProjectContentSetting, writeProjectContentSetting } from "./project-content-store";
import type { CoupleStoryItem, GalleryStoryItem, InvitationTexts, Language } from "./types";

export type TemplatePreviewInfo = {
  language: Language;
  groomName: string;
  brideName: string;
  weddingDate: string;
  weddingTime: string;
  venue: string;
  city: string;
  mapUrl: string;
  heroVideoUrl: string;
  gallery: string[];
  texts: Required<Pick<InvitationTexts, "openingText" | "inviteMessage" | "inviteMessageSecondary" | "rsvpQuestion" | "rsvpDeclinedMessage" | "rsvpConfirmedSuccessMessage" | "rsvpDeclinedSuccessMessage">> & {
    galleryStories: GalleryStoryItem[];
    story: CoupleStoryItem[];
  };
  photographer: {
    enabled: boolean;
    name: string;
    logoUrl: string;
    instagramUrl: string;
    facebookUrl: string;
  };
  templateOverrides: Record<string, TemplatePreviewOverride>;
  adminScope: {
    mode: "all" | "allExcept";
    excludedSlugs: string[];
  };
  updatedAt: string;
};

export type TemplatePreviewEditableInfo = Omit<TemplatePreviewInfo, "templateOverrides" | "adminScope" | "updatedAt">;

export type TemplatePreviewOverride = Partial<TemplatePreviewEditableInfo> & {
  updatedAt?: string;
};

export const defaultTemplatePreviewInfo: TemplatePreviewInfo = {
  language: "ar",
  groomName: "بدر",
  brideName: "سارة",
  weddingDate: "2026-10-26",
  weddingTime: "07:00 مساءً",
  venue: "قاعة رويال",
  city: "البحيرة",
  mapUrl: "https://maps.google.com/?q=Royal+Hall+Beheira",
  heroVideoUrl: "",
  gallery: ["/assets/invite/badr-sarah-1.jpeg", "/assets/invite/badr-sarah-2.jpeg", "/assets/invite/badr-sarah-3.jpeg"],
  texts: {
    openingText: "",
    inviteMessage: "فرحتنا هذه الليلة لا تكتمل إلا بوجودكم ومشاركتكم لنا أجمل لحظات العمر.",
    inviteMessageSecondary: "هنفرح أكثر بوجودكم، وهتبقى الذكرى أحلى لما تكونوا جزء منها. 💖",
    rsvpQuestion: "هل ستحضر؟",
    rsvpDeclinedMessage: "وجود محبتكم يكفينا، ونقدر ظروفكم.",
    rsvpConfirmedSuccessMessage: "سجلنا حضورك، مستنيينك تنورنا.",
    rsvpDeclinedSuccessMessage: "وصل اعتذارك، وتقدر تسيب رسالة جميلة للعروسين.",
    galleryStories: [
      { title: "لحظة من الحكاية", description: "تفاصيل صغيرة تصنع ذكرى كبيرة." },
      { title: "بداية جديدة", description: "كل صورة تحمل جزءًا من فرحتنا." },
      { title: "يوم العمر", description: "معكم تكتمل البهجة." },
    ],
    story: [
      {
        id: "preview-story-first-meeting",
        title: "أول مرة شوفنا بعض ❤️",
        description: "كانت أول مقابلة بيننا في فرح صحبتي، ومن هنا بدأت الحكاية.",
        date: "15 / 11 / 2024",
      },
      {
        id: "preview-story-engagement",
        title: "الخطوبة 💍",
        description: "اليوم الذي قررنا فيه أن نكمل رحلتنا معاً ونبدأ فصلًا جديداً من حياتنا.",
        date: "02 / 02 / 2025",
      },
      {
        id: "preview-story-wedding-day",
        title: "يوم الزفاف 👰🤵",
        description: "اليوم الذي نحتفل فيه مع أهلنا وأصدقائنا ببداية حياتنا الجديدة معاً.",
        date: "26 / 10 / 2026",
      },
    ],
  },
  photographer: {
    enabled: true,
    name: "badrabdoph",
    logoUrl: "",
    instagramUrl: "https://www.instagram.com/",
    facebookUrl: "https://www.facebook.com/",
  },
  templateOverrides: {},
  adminScope: {
    mode: "all",
    excludedSlugs: [],
  },
  updatedAt: "",
};

function cleanText(value: unknown, fallback = "", maxLength = 240) {
  if (typeof value !== "string") return fallback;
  const text = value.trim();
  return (text || fallback).slice(0, maxLength);
}

function cleanOptionalText(value: unknown, maxLength = 240) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

function cleanDate(value: unknown, fallback: string) {
  const text = cleanOptionalText(value, 32);
  return text && !Number.isNaN(Date.parse(text)) ? text : fallback;
}

function cleanUrl(value: unknown, fallback = "") {
  const text = cleanOptionalText(value, 1200);
  if (!text) return fallback;
  if (text.startsWith("/uploads/") || text.startsWith("/assets/")) return text;
  try {
    const url = new URL(text);
    return url.protocol === "http:" || url.protocol === "https:" ? url.toString() : fallback;
  } catch {
    return fallback;
  }
}

function cleanGallery(value: unknown, fallback: string[]) {
  const raw = Array.isArray(value) ? value : [];
  const gallery = raw.map((item) => cleanUrl(item)).filter(Boolean).slice(0, 3);
  return gallery.length ? gallery : fallback;
}

function cleanGalleryStories(value: unknown, fallback: GalleryStoryItem[]) {
  const raw = Array.isArray(value) ? value : [];
  const stories = raw
    .map((item) => {
      const source = item && typeof item === "object" ? (item as Partial<GalleryStoryItem>) : {};
      return {
        title: cleanOptionalText(source.title, 90),
        description: cleanOptionalText(source.description, 180),
      };
    })
    .filter((item) => item.title || item.description)
    .slice(0, 3);
  return stories.length ? stories : fallback;
}

function cleanStory(value: unknown, fallback: CoupleStoryItem[]) {
  const raw = Array.isArray(value) ? value : [];
  const story = raw
    .map((item, index) => {
      const source = item && typeof item === "object" ? (item as Partial<CoupleStoryItem>) : {};
      return {
        id: cleanOptionalText(source.id, 80) || `preview-story-${index + 1}`,
        title: cleanOptionalText(source.title, 100),
        description: cleanOptionalText(source.description, 320),
        date: cleanOptionalText(source.date, 80),
        imageUrl: cleanUrl(source.imageUrl || ""),
      };
    })
    .filter((item) => item.title || item.description || item.imageUrl)
    .slice(0, 6);
  return story.length ? story : fallback;
}

function normalizeTemplatePreviewInfo(input: Partial<TemplatePreviewInfo>): TemplatePreviewInfo {
  const fallback = defaultTemplatePreviewInfo;
  const language = input.language === "en" ? "en" : "ar";
  const templateOverrides =
    input.templateOverrides && typeof input.templateOverrides === "object" && !Array.isArray(input.templateOverrides)
      ? Object.fromEntries(
          Object.entries(input.templateOverrides)
            .filter(([slug, value]) => Boolean(slug.trim()) && value && typeof value === "object" && !Array.isArray(value))
            .map(([slug, value]) => [slug.trim(), normalizeTemplatePreviewOverride(value as Partial<TemplatePreviewEditableInfo> & { updatedAt?: string })]),
        )
      : {};
  const rawExcludedSlugs = Array.isArray(input.adminScope?.excludedSlugs) ? input.adminScope.excludedSlugs : [];
  return {
    language,
    groomName: cleanText(input.groomName, fallback.groomName, 80),
    brideName: cleanText(input.brideName, fallback.brideName, 80),
    weddingDate: cleanDate(input.weddingDate, fallback.weddingDate),
    weddingTime: cleanText(input.weddingTime, fallback.weddingTime, 80),
    venue: cleanText(input.venue, fallback.venue, 120),
    city: cleanText(input.city, fallback.city, 90),
    mapUrl: cleanUrl(input.mapUrl, fallback.mapUrl),
    heroVideoUrl: cleanUrl(input.heroVideoUrl, ""),
    gallery: cleanGallery(input.gallery, fallback.gallery),
    texts: {
      openingText: cleanOptionalText(input.texts?.openingText, 180),
      inviteMessage: cleanText(input.texts?.inviteMessage, fallback.texts.inviteMessage, 420),
      inviteMessageSecondary: cleanText(input.texts?.inviteMessageSecondary, fallback.texts.inviteMessageSecondary, 420),
      rsvpQuestion: cleanText(input.texts?.rsvpQuestion, fallback.texts.rsvpQuestion, 120),
      rsvpDeclinedMessage: cleanText(input.texts?.rsvpDeclinedMessage, fallback.texts.rsvpDeclinedMessage, 180),
      rsvpConfirmedSuccessMessage: cleanText(input.texts?.rsvpConfirmedSuccessMessage, fallback.texts.rsvpConfirmedSuccessMessage, 180),
      rsvpDeclinedSuccessMessage: cleanText(input.texts?.rsvpDeclinedSuccessMessage, fallback.texts.rsvpDeclinedSuccessMessage, 180),
      galleryStories: cleanGalleryStories(input.texts?.galleryStories, fallback.texts.galleryStories),
      story: cleanStory(input.texts?.story, fallback.texts.story),
    },
    photographer: {
      enabled: input.photographer?.enabled !== false,
      name: cleanText(input.photographer?.name, fallback.photographer.name, 90),
      logoUrl: cleanUrl(input.photographer?.logoUrl, ""),
      instagramUrl: cleanUrl(input.photographer?.instagramUrl, fallback.photographer.instagramUrl),
      facebookUrl: cleanUrl(input.photographer?.facebookUrl, fallback.photographer.facebookUrl),
    },
    templateOverrides,
    adminScope: {
      mode: input.adminScope?.mode === "allExcept" ? "allExcept" : "all",
      excludedSlugs: rawExcludedSlugs.filter((item): item is string => typeof item === "string").map((item) => item.trim()).filter(Boolean),
    },
    updatedAt: cleanOptionalText(input.updatedAt, 80),
  };
}

function normalizeTemplatePreviewOverride(input: Partial<TemplatePreviewEditableInfo> & { updatedAt?: string }): TemplatePreviewOverride {
  const normalized = normalizeTemplatePreviewInfo({ ...defaultTemplatePreviewInfo, ...input });
  return {
    language: normalized.language,
    groomName: normalized.groomName,
    brideName: normalized.brideName,
    weddingDate: normalized.weddingDate,
    weddingTime: normalized.weddingTime,
    venue: normalized.venue,
    city: normalized.city,
    mapUrl: normalized.mapUrl,
    heroVideoUrl: normalized.heroVideoUrl,
    gallery: normalized.gallery,
    texts: normalized.texts,
    photographer: normalized.photographer,
    updatedAt: cleanOptionalText(input.updatedAt, 80),
  };
}

export async function getTemplatePreviewInfo() {
  noStore();
  return readProjectContentSetting("template-preview-info", defaultTemplatePreviewInfo, (value) => normalizeTemplatePreviewInfo(value as Partial<TemplatePreviewInfo>));
}

export async function updateTemplatePreviewInfo(input: Partial<TemplatePreviewInfo>) {
  const current = await getTemplatePreviewInfo();
  const next = normalizeTemplatePreviewInfo({
    ...current,
    ...input,
    texts: {
      ...current.texts,
      ...input.texts,
    },
    photographer: {
      ...current.photographer,
      ...input.photographer,
    },
    updatedAt: new Date().toISOString(),
  });

  await writeProjectContentSetting("template-preview-info", next);
  return next;
}

export function getTemplatePreviewBaseInfo(info: TemplatePreviewInfo): TemplatePreviewEditableInfo {
  return {
    language: info.language,
    groomName: info.groomName,
    brideName: info.brideName,
    weddingDate: info.weddingDate,
    weddingTime: info.weddingTime,
    venue: info.venue,
    city: info.city,
    mapUrl: info.mapUrl,
    heroVideoUrl: info.heroVideoUrl,
    gallery: info.gallery,
    texts: info.texts,
    photographer: info.photographer,
  };
}

export function resolveTemplatePreviewInfo(info: TemplatePreviewInfo, slug?: string): TemplatePreviewEditableInfo {
  const base = getTemplatePreviewBaseInfo(info);
  const override = slug ? info.templateOverrides[slug] : undefined;
  if (!override) return base;
  return normalizeTemplatePreviewOverride({
    ...base,
    ...override,
    texts: {
      ...base.texts,
      ...override.texts,
    },
    photographer: {
      ...base.photographer,
      ...override.photographer,
    },
  }) as TemplatePreviewEditableInfo;
}
