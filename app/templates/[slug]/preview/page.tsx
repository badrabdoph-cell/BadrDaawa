import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, CheckCircle2, Home, Sparkles } from "lucide-react";
import { InvitationExperience } from "@/components/InvitationExperience";
import { LiveInvitationPreview } from "@/components/LiveInvitationPreview";
import { cleanPlayableAudioUrl } from "@/lib/audio-files";
import { getLocaleMeta, resolveLocale } from "@/lib/i18n";
import { isBrowserDisplayImageUrl } from "@/lib/image-formats";
import { cleanInvitationHeroVideoUrl } from "@/lib/invitation-media";
import { normalizeCoupleStory, normalizeGalleryStories, normalizeInvitationGift } from "@/lib/invitation-texts";
import { getSiteSettings } from "@/lib/site-settings";
import { getTemplateWithPreviewMusic } from "@/lib/template-settings";
import type { Invitation } from "@/lib/types";

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
    gift?: string;
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

function cleanPreviewGift(value: string | undefined) {
  if (!value) return {};
  try {
    return normalizeInvitationGift(JSON.parse(value));
  } catch {
    return {};
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
    "gift",
  ] as const;

  copiedKeys.forEach((key) => {
    const value = query?.[key]?.trim();
    if (value) params.set(key, value);
  });
  if (query?.story?.trim()) params.set("storyEnabled", "1");
  if (query?.gift?.trim()) params.set("giftEnabled", "1");

  return `/order?${params.toString()}`;
}

export default async function TemplatePreviewPage({ params, searchParams }: PageProps) {
  const { slug } = await params;
  const query = await searchParams;
  const [template, siteSettings] = await Promise.all([getTemplateWithPreviewMusic(slug), getSiteSettings()]);
  if (!template) notFound();
  const previewGallery = cleanPreviewGallery(query?.gallery);
  const hasExplicitMusicPreview = query?.musicEnabled !== undefined || query?.musicUrl !== undefined;
  const explicitMusicUrl = cleanPlayableAudioUrl(query?.musicUrl || "");
  const previewMusicUrl = hasExplicitMusicPreview ? explicitMusicUrl : cleanPlayableAudioUrl(template.musicUrl || "");
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
  const previewStory = cleanPreviewStory(query?.story);
  const previewGalleryStories = cleanPreviewGalleryStories(query?.galleryStories);
  const previewGift = cleanPreviewGift(query?.gift);
  const previewOpeningText = cleanPreviewText(query?.openingText, "");
  const previewTexts = previewOpeningText || previewGalleryStories.length || previewStory.length || Object.values(previewGift).some(Boolean) ? { openingText: previewOpeningText, galleryStories: previewGalleryStories, story: previewStory, gift: previewGift } : undefined;
  const isOrderRequestPreview = query?.orderPreview === "1";
  const orderConfirmHref = buildOrderConfirmHref(template.slug, query);

  const invitation: Invitation = {
    id: `preview-${template.slug}`,
    code: `preview-${template.slug}`,
    templateSlug: template.slug,
    language: locale,
    groomName: cleanPreviewText(query?.groomName, "بدر"),
    brideName: cleanPreviewText(query?.brideName, "Sara"),
    weddingDate: cleanPreviewDate(query?.weddingDate),
    weddingTime: cleanPreviewText(query?.weddingTime, "07:00 مساءً"),
    venue: cleanPreviewText(query?.venue, "قاعة رويال"),
    city: cleanPreviewText(query?.city, "البحيرة"),
    mapUrl: cleanPreviewText(query?.mapUrl, "https://maps.google.com/?q=Royal+Hall+Beheira"),
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
          }}
        />
      )}
      {!hidePreviewActions ? (
        <nav className={`template-preview-floating-actions ${isOrderRequestPreview ? "template-preview-floating-actions-order" : ""}`} aria-label={isOrderRequestPreview ? "تأكيد الطلب" : "اختيارات القالب"}>
          {isOrderRequestPreview ? (
            <Link className="template-preview-action template-preview-action-gold" href={orderConfirmHref}>
              <CheckCircle2 size={18} />
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
