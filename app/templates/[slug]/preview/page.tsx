import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, Home, Sparkles } from "lucide-react";
import { InvitationExperience } from "@/components/InvitationExperience";
import { LiveInvitationPreview } from "@/components/LiveInvitationPreview";
import { cleanPlayableAudioUrl } from "@/lib/audio-files";
import { getLocaleMeta, resolveLocale } from "@/lib/i18n";
import { isBrowserDisplayImageUrl } from "@/lib/image-formats";
import { cleanInvitationHeroVideoUrl } from "@/lib/invitation-media";
import { normalizeCoupleStory, normalizeGalleryStories } from "@/lib/invitation-texts";
import { getSiteSettings } from "@/lib/site-settings";
import { getTemplateWithPreviewMusic } from "@/lib/template-settings";
import type { CoupleStoryItem, Invitation } from "@/lib/types";

type TemplatePreviewSearchParams = {
    silentPreview?: string;
    embed?: string;
    builderPreview?: string;
    orderPreview?: string;
    groomName?: string;
    brideName?: string;
    weddingDate?: string;
    weddingTime?: string;
    venue?: string;
    city?: string;
    mapUrl?: string;
    gallery?: string;
    photographerEnabled?: string;
    photographerName?: string;
    photographerFacebookUrl?: string;
    photographerInstagramUrl?: string;
    photographerLogoUrl?: string;
    musicEnabled?: string;
    musicChoice?: string;
    musicUrl?: string;
    heroVideoUrl?: string;
    language?: string;
    openingText?: string;
    galleryStories?: string;
    story?: string;
};

type PageProps = {
  params: Promise<{ slug: string }>;
  searchParams?: Promise<TemplatePreviewSearchParams>;
};

function cleanPreviewText(value: string | undefined, fallback: string) {
  const clean = value?.trim();
  return clean ? clean.slice(0, 120) : fallback;
}

function cleanPreviewDate(value: string | undefined) {
  const clean = value?.trim();
  if (!clean || Number.isNaN(Date.parse(clean))) return "2026-10-26";
  return clean;
}

function formatStoryDate(value: string) {
  const isoMatch = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) return `${isoMatch[3]} / ${isoMatch[2]} / ${isoMatch[1]}`;

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  return `${day} / ${month} / ${year}`;
}

function buildDefaultPreviewStory(weddingDate: string): CoupleStoryItem[] {
  return [
    {
      id: "preview-story-first-meeting",
      title: "أول مرة شوفنا بعض ❤️",
      description: "كانت أول مقابلة بيننا في فرح صحبتي ، ومن هنا بدأت الحكاية.",
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
      date: formatStoryDate(weddingDate),
    },
  ];
}

function cleanPreviewGallery(value: string | undefined) {
  return (value || "")
    .split(",")
    .map((item) => item.trim())
    .filter((item) => item.startsWith("/uploads/order-previews/") || item.startsWith("/uploads/order-requests/") || item.startsWith("/uploads/client-invitations/"))
    .filter((item) => isBrowserDisplayImageUrl(item))
    .slice(0, 3);
}

function cleanPreviewUrl(value: string | undefined, fallback: string) {
  const clean = value?.trim();
  return clean && /^https?:\/\/\S+\.\S+/.test(clean) ? clean : fallback;
}

function cleanPreviewMapUrl(value: string | undefined) {
  const clean = value?.trim();
  if (!clean) return "";
  try {
    const url = new URL(clean);
    return url.protocol === "http:" || url.protocol === "https:" ? url.toString().slice(0, 1200) : "";
  } catch {
    return "";
  }
}

function cleanPreviewStory(value: string | undefined) {
  if (!value) return [];
  try {
    return normalizeCoupleStory(JSON.parse(value));
  } catch {
    return [];
  }
}

function cleanPreviewGalleryStories(value: string | undefined) {
  if (!value) return [];
  try {
    return normalizeGalleryStories(JSON.parse(value));
  } catch {
    return [];
  }
}

function buildOrderConfirmHref(templateSlug: string, query?: TemplatePreviewSearchParams) {
  const params = new URLSearchParams();
  params.set("template", templateSlug);
  params.set("confirmOrder", "1");

  const copiedKeys = [
    "groomName",
    "brideName",
    "weddingDate",
    "weddingTime",
    "venue",
    "city",
    "mapUrl",
    "gallery",
    "photographerEnabled",
    "photographerName",
    "photographerFacebookUrl",
    "photographerInstagramUrl",
    "musicEnabled",
    "musicChoice",
    "musicUrl",
    "openingText",
    "story",
  ] as const;

  copiedKeys.forEach((key) => {
    const value = query?.[key]?.trim();
    if (value) params.set(key, value);
  });
  if (query?.story?.trim()) params.set("storyEnabled", "1");

  return `/order?${params.toString()}#confirm-order`;
}

export default async function TemplatePreviewPage({ params, searchParams }: PageProps) {
  const { slug } = await params;
  const query = await searchParams;
  const [template, siteSettings] = await Promise.all([getTemplateWithPreviewMusic(slug), getSiteSettings()]);
  if (!template) notFound();
  const previewGallery = cleanPreviewGallery(query?.gallery);
  const hasExplicitMusicPreview = query?.musicEnabled !== undefined || query?.musicChoice !== undefined || query?.musicUrl !== undefined;
  const explicitMusicUrl = cleanPlayableAudioUrl(query?.musicUrl || "");
  const templateMusicUrl = cleanPlayableAudioUrl(template.musicUrl || "");
  const previewMusicUrl = hasExplicitMusicPreview && query?.musicChoice !== "default" ? explicitMusicUrl : templateMusicUrl;
  const previewHeroVideoUrl = cleanInvitationHeroVideoUrl(query?.heroVideoUrl);
  const previewMusicEnabled = hasExplicitMusicPreview ? query?.musicEnabled === "1" && Boolean(previewMusicUrl) : Boolean(previewMusicUrl);
  const hasExplicitPhotographerPreview = query?.photographerEnabled !== undefined;
  const useTemplatePhotographer = query?.builderPreview !== "1" && !hasExplicitPhotographerPreview;
  const templatePhotographer = template.photographer || {
    enabled: true,
    name: "badrabdoph",
    facebookUrl: "https://www.facebook.com/",
    instagramUrl: "https://www.instagram.com/",
  };
  const previewPhotographer =
    query?.photographerEnabled === "1"
      ? {
          enabled: true,
          name: cleanPreviewText(query.photographerName, "المصور الفوتوغرافي"),
          logoUrl: query.photographerLogoUrl?.trim() || undefined,
          facebookUrl: cleanPreviewUrl(query.photographerFacebookUrl, template.photographer?.facebookUrl || "https://www.facebook.com/"),
          instagramUrl: cleanPreviewUrl(query.photographerInstagramUrl, template.photographer?.instagramUrl || "https://www.instagram.com/"),
        }
      : useTemplatePhotographer
        ? {
            enabled: templatePhotographer.enabled !== false,
            name: templatePhotographer.name || "badrabdoph",
            logoUrl: templatePhotographer.logoUrl,
            facebookUrl: templatePhotographer.facebookUrl || "https://www.facebook.com/",
            instagramUrl: templatePhotographer.instagramUrl || "https://www.instagram.com/",
          }
      : {
          enabled: false,
          name: "",
          facebookUrl: "",
          instagramUrl: "",
  };
  const fallbackGallery = ["/assets/invite/badr-sarah-1.jpeg", "/assets/invite/badr-sarah-2.jpeg", "/assets/invite/badr-sarah-3.jpeg"];
  const locale = resolveLocale(query?.language);
  const localeMeta = getLocaleMeta(locale);
  const isOrderRequestPreview = query?.orderPreview === "1";
  const previewWeddingDate = cleanPreviewDate(query?.weddingDate);
  const previewStory = cleanPreviewStory(query?.story);
  const effectivePreviewStory = previewStory.length || query?.builderPreview === "1" || isOrderRequestPreview ? previewStory : buildDefaultPreviewStory(previewWeddingDate);
  const previewGalleryStories = cleanPreviewGalleryStories(query?.galleryStories);
  const previewOpeningText = cleanPreviewText(query?.openingText, "");
  const previewTexts = previewOpeningText || previewGalleryStories.length || effectivePreviewStory.length ? { openingText: previewOpeningText, galleryStories: previewGalleryStories, story: effectivePreviewStory } : undefined;
  const orderConfirmHref = buildOrderConfirmHref(template.slug, query);
  const previewMapUrl = query?.mapUrl?.trim() ? cleanPreviewMapUrl(query.mapUrl) : isOrderRequestPreview ? "" : "https://maps.google.com/?q=Royal+Hall+Beheira";

  const invitation: Invitation = {
    id: `preview-${template.slug}`,
    code: `preview-${template.slug}`,
    templateSlug: template.slug,
    language: locale,
    groomName: cleanPreviewText(query?.groomName, "بدر"),
    brideName: cleanPreviewText(query?.brideName, "Sara"),
    weddingDate: previewWeddingDate,
    weddingTime: cleanPreviewText(query?.weddingTime, "07:00 مساءً"),
    venue: cleanPreviewText(query?.venue, "قاعة رويال"),
    city: cleanPreviewText(query?.city, "البحيرة"),
    mapUrl: previewMapUrl,
    heroPhoto: previewGallery[0] || fallbackGallery[0],
    heroVideoUrl: previewHeroVideoUrl || undefined,
    gallery: previewGallery.length ? previewGallery : fallbackGallery,
    musicUrl: previewMusicUrl,
    musicEnabled: previewMusicEnabled,
    texts: previewTexts,
    photographer: previewPhotographer,
    isActive: true,
    views: 0,
    customerId: "preview",
  };

  const isSilentPreview = query?.silentPreview === "1" || query?.embed === "1";
  const hidePreviewActions = isSilentPreview || query?.builderPreview === "1";

  return (
    <div lang={localeMeta.htmlLang} dir={localeMeta.dir} data-invitation-locale={locale}>
      {query?.builderPreview === "1" ? (
        <LiveInvitationPreview
          invitation={invitation}
          template={template}
          disableMusic={isSilentPreview}
          settings={{
            showPhotographerCard: siteSettings.photographer.showPhotographerCard,
            showTemplatePhotographer: useTemplatePhotographer,
            photographerName: siteSettings.photographer.defaultName,
            photographerInstagramUrl: siteSettings.photographer.defaultInstagramUrl,
            photographerFacebookUrl: siteSettings.photographer.defaultFacebookUrl,
            socialLinks: siteSettings.socialLinks,
            whatsappUrl: siteSettings.whatsappUrl,
          }}
        />
      ) : (
        <InvitationExperience
          invitation={invitation}
          template={template}
          disableMusic={isSilentPreview}
          settings={{
            showPhotographerCard: siteSettings.photographer.showPhotographerCard,
            showTemplatePhotographer: useTemplatePhotographer,
            photographerName: siteSettings.photographer.defaultName,
            photographerInstagramUrl: siteSettings.photographer.defaultInstagramUrl,
            photographerFacebookUrl: siteSettings.photographer.defaultFacebookUrl,
            socialLinks: siteSettings.socialLinks,
            whatsappUrl: siteSettings.whatsappUrl,
          }}
        />
      )}
      {!hidePreviewActions ? (
        <nav className={`template-preview-floating-actions ${isOrderRequestPreview ? "template-preview-floating-actions-order" : ""}`} aria-label={isOrderRequestPreview ? "تأكيد الطلب" : "اختيارات القالب"}>
          {isOrderRequestPreview ? (
            <Link className="template-preview-action template-preview-confirm-action" href={orderConfirmHref}>
              تأكيد الطلب
            </Link>
          ) : (
            <>
              <Link className="template-preview-action template-preview-action-soft" href="/">
                <Home size={17} />
                الصفحة الرئيسية
              </Link>
              <Link className="template-preview-action template-preview-action-soft" href="/templates">
                <ArrowRight size={17} />
                اختار واحد تاني
              </Link>
              <Link className="template-preview-action template-preview-action-gold" href={`/order?template=${template.slug}`}>
                <Sparkles size={17} />
                اختار القالب دا
              </Link>
            </>
          )}
        </nav>
      ) : null}
    </div>
  );
}
