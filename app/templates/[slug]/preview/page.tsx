import Link from "next/link";
import { notFound } from "next/navigation";
import { Sparkles, X } from "lucide-react";
import { InvitationExperience } from "@/components/InvitationExperience";
import { LiveInvitationPreview } from "@/components/LiveInvitationPreview";
import { cleanPlayableAudioUrl } from "@/lib/audio-files";
import { getLocaleMeta, resolveLocale } from "@/lib/i18n";
import { isBrowserDisplayImageUrl } from "@/lib/image-formats";
import { cleanInvitationHeroVideoUrl } from "@/lib/invitation-media";
import { normalizeCoupleStory, normalizeGalleryStories } from "@/lib/invitation-texts";
import { getPublishedSiteSettings } from "@/lib/site-settings";
import { getPublishedTemplatePreviewInfo, resolveTemplatePreviewInfo } from "@/lib/template-preview-info";
import { getPublishedTemplateWithPreviewMusic } from "@/lib/template-settings";
import { normalizeInternalAssetUrl } from "@/lib/utils";
import type { Invitation } from "@/lib/types";

export const dynamic = "force-dynamic";

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
    orderFullPreview?: string;
    hidePreviewChrome?: string;
    galleryPreview?: string;
};

type PageProps = {
  params: Promise<{ slug: string }>;
  searchParams?: Promise<TemplatePreviewSearchParams>;
};

function cleanPreviewText(value: string | undefined, fallback: string) {
  const clean = value?.trim();
  return clean ? clean.slice(0, 120) : fallback;
}

function cleanPreviewDate(value: string | undefined, fallback = "2026-10-26") {
  const clean = value?.trim();
  if (!clean || Number.isNaN(Date.parse(clean))) return fallback;
  return clean;
}

function cleanPreviewGallery(value: string | undefined) {
  return (value || "")
    .split(",")
    .map((item) => normalizeInternalAssetUrl(item) || "")
    .filter((item) => item.startsWith("/uploads/") || item.startsWith("/assets/"))
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

export default async function TemplatePreviewPage({ params, searchParams }: PageProps) {
  const { slug } = await params;
  const query = await searchParams;
  const [template, siteSettings, templatePreviewInfo] = await Promise.all([getPublishedTemplateWithPreviewMusic(slug), getPublishedSiteSettings(), getPublishedTemplatePreviewInfo()]);
  if (!template) notFound();
  const effectiveTemplatePreviewInfo = resolveTemplatePreviewInfo(templatePreviewInfo, template.slug);
  const previewGallery = cleanPreviewGallery(query?.gallery);
  const isOrderRequestPreview = query?.orderPreview === "1";
  const isRuntimePreview = query?.builderPreview === "1" || isOrderRequestPreview;
  const hasExplicitMusicPreview = query?.musicEnabled !== undefined || query?.musicChoice !== undefined || query?.musicUrl !== undefined;
  const explicitMusicUrl = cleanPlayableAudioUrl(query?.musicUrl || "");
  const templateMusicUrl = cleanPlayableAudioUrl(template.musicUrl || "");
  const previewMusicUrl = hasExplicitMusicPreview && query?.musicChoice !== "default" ? explicitMusicUrl : templateMusicUrl;
  const previewHeroVideoUrl = cleanInvitationHeroVideoUrl(query?.heroVideoUrl || (isRuntimePreview ? "" : effectiveTemplatePreviewInfo.heroVideoUrl));
  const previewMusicEnabled = hasExplicitMusicPreview ? query?.musicEnabled === "1" && Boolean(previewMusicUrl) : Boolean(previewMusicUrl);
  const hasExplicitPhotographerPreview = query?.photographerEnabled !== undefined;
  const useGlobalTemplateInfo = !isRuntimePreview && !hasExplicitPhotographerPreview;
  const useTemplatePhotographer = query?.builderPreview !== "1" && !hasExplicitPhotographerPreview;
  const templatePhotographer = template.photographer || {
    enabled: true,
    name: "badrabdoph",
    description: "لقطات فرحتنا بعدسة خاصة.",
    facebookUrl: "https://www.facebook.com/",
    instagramUrl: "https://www.instagram.com/",
  };
  const previewPhotographer =
    query?.photographerEnabled === "1"
      ? {
          enabled: true,
          name: cleanPreviewText(query.photographerName, "المصور الفوتوغرافي"),
          description: effectiveTemplatePreviewInfo.photographer.description,
          logoUrl: query.photographerLogoUrl?.trim() || undefined,
          facebookUrl: cleanPreviewUrl(query.photographerFacebookUrl, template.photographer?.facebookUrl || "https://www.facebook.com/"),
          instagramUrl: cleanPreviewUrl(query.photographerInstagramUrl, template.photographer?.instagramUrl || "https://www.instagram.com/"),
        }
      : useGlobalTemplateInfo
        ? {
            enabled: effectiveTemplatePreviewInfo.photographer.enabled,
            name: effectiveTemplatePreviewInfo.photographer.name,
            description: effectiveTemplatePreviewInfo.photographer.description,
            logoUrl: effectiveTemplatePreviewInfo.photographer.logoUrl || undefined,
            facebookUrl: effectiveTemplatePreviewInfo.photographer.facebookUrl,
            instagramUrl: effectiveTemplatePreviewInfo.photographer.instagramUrl,
          }
      : useTemplatePhotographer
        ? {
            enabled: templatePhotographer.enabled !== false,
            name: templatePhotographer.name || "badrabdoph",
            description: templatePhotographer.description || effectiveTemplatePreviewInfo.photographer.description,
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
  const fallbackGallery = effectiveTemplatePreviewInfo.gallery;
  const locale = resolveLocale(query?.language || effectiveTemplatePreviewInfo.language);
  const localeMeta = getLocaleMeta(locale);
  const previewWeddingDate = cleanPreviewDate(query?.weddingDate, effectiveTemplatePreviewInfo.weddingDate);
  const previewStory = cleanPreviewStory(query?.story);
  const effectivePreviewStory = previewStory.length || isRuntimePreview ? previewStory : effectiveTemplatePreviewInfo.texts.story;
  const previewGalleryStories = cleanPreviewGalleryStories(query?.galleryStories);
  const effectiveGalleryStories = previewGalleryStories.length || isRuntimePreview ? previewGalleryStories : effectiveTemplatePreviewInfo.texts.galleryStories;
  const previewOpeningText = cleanPreviewText(query?.openingText, isRuntimePreview ? "" : effectiveTemplatePreviewInfo.texts.openingText);
  const previewTexts = isRuntimePreview
    ? {
        ...effectiveTemplatePreviewInfo.texts,
        openingText: previewOpeningText,
        galleryStories: effectiveGalleryStories,
        story: effectivePreviewStory,
      }
    : { ...effectiveTemplatePreviewInfo.texts, openingText: previewOpeningText, galleryStories: effectiveGalleryStories, story: effectivePreviewStory };
  const previewMapUrl = query?.mapUrl?.trim() ? cleanPreviewMapUrl(query.mapUrl) : isOrderRequestPreview ? "" : effectiveTemplatePreviewInfo.mapUrl;

  const invitation: Invitation = {
    id: `preview-${template.slug}`,
    code: `preview-${template.slug}`,
    templateSlug: template.slug,
    language: locale,
    groomName: cleanPreviewText(query?.groomName, effectiveTemplatePreviewInfo.groomName),
    brideName: cleanPreviewText(query?.brideName, effectiveTemplatePreviewInfo.brideName),
    weddingDate: previewWeddingDate,
    weddingTime: cleanPreviewText(query?.weddingTime, effectiveTemplatePreviewInfo.weddingTime),
    venue: cleanPreviewText(query?.venue, effectiveTemplatePreviewInfo.venue),
    city: cleanPreviewText(query?.city, effectiveTemplatePreviewInfo.city),
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
  const hidePreviewActions = isSilentPreview || query?.builderPreview === "1" || isOrderRequestPreview || query?.hidePreviewChrome === "1" || query?.orderFullPreview === "1";
  const showGalleryClose = hidePreviewActions && query?.galleryPreview === "1";
  const showFloatingStart = !hidePreviewActions || query?.galleryPreview === "1";

  return (
    <div lang={localeMeta.htmlLang} dir={localeMeta.dir} data-invitation-locale={locale}>
      {query?.builderPreview === "1" ? (
        <LiveInvitationPreview
          invitation={invitation}
          template={template}
          disableMusic={isSilentPreview}
          settings={{
            showPhotographerCard: siteSettings.photographer.showPhotographerCard,
            showTemplatePhotographer: useTemplatePhotographer && !useGlobalTemplateInfo,
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
            showTemplatePhotographer: useTemplatePhotographer && !useGlobalTemplateInfo,
            photographerName: siteSettings.photographer.defaultName,
            photographerInstagramUrl: siteSettings.photographer.defaultInstagramUrl,
            photographerFacebookUrl: siteSettings.photographer.defaultFacebookUrl,
            socialLinks: siteSettings.socialLinks,
            whatsappUrl: siteSettings.whatsappUrl,
          }}
        />
      )}
      {showGalleryClose ? (
        <Link className="template-preview-close-fab" href="/templates" aria-label="العودة إلى معرض التصاميم">
          <X size={20} />
        </Link>
      ) : null}
      {showFloatingStart ? (
        <Link className="wd-floating-start template-floating-start" href={`/order?template=${template.slug}`} aria-label="ابدأ الآن واطلب هذا التصميم">
          <Sparkles size={18} />
          <span>أبدأ الآن</span>
        </Link>
      ) : null}
    </div>
  );
}
