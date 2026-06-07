import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, Home, Sparkles } from "lucide-react";
import { InvitationExperience } from "@/components/InvitationExperience";
import { cleanPlayableAudioUrl } from "@/lib/audio-files";
import { isBrowserDisplayImageUrl } from "@/lib/image-formats";
import { getTemplateWithSettings } from "@/lib/template-settings";
import type { Invitation } from "@/lib/types";

type PageProps = {
  params: Promise<{ slug: string }>;
  searchParams?: Promise<{
    silentPreview?: string;
    embed?: string;
    builderPreview?: string;
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
    musicUrl?: string;
  }>;
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

export default async function TemplatePreviewPage({ params, searchParams }: PageProps) {
  const { slug } = await params;
  const query = await searchParams;
  const template = await getTemplateWithSettings(slug);
  if (!template) notFound();
  const previewGallery = cleanPreviewGallery(query?.gallery);
  const previewMusicUrl = cleanPlayableAudioUrl(query?.musicUrl || "");
  const fallbackGallery = ["/assets/invite/badr-sarah-1.jpeg", "/assets/invite/badr-sarah-2.jpeg", "/assets/invite/badr-sarah-3.jpeg"];
  const previewTemplate =
    query?.photographerEnabled === "1"
      ? {
          ...template,
          photographer: {
            enabled: true,
            name: cleanPreviewText(query.photographerName, "المصور الفوتوغرافي"),
            logoUrl: query.photographerLogoUrl?.trim() || undefined,
            facebookUrl: cleanPreviewUrl(query.photographerFacebookUrl, template.photographer?.facebookUrl || "https://www.facebook.com/"),
            instagramUrl: cleanPreviewUrl(query.photographerInstagramUrl, template.photographer?.instagramUrl || "https://www.instagram.com/"),
          },
        }
      : template;

  const invitation: Invitation = {
    id: `preview-${template.slug}`,
    code: `preview-${template.slug}`,
    templateSlug: template.slug,
    language: "ar",
    groomName: cleanPreviewText(query?.groomName, "بدر"),
    brideName: cleanPreviewText(query?.brideName, "Sara"),
    weddingDate: cleanPreviewDate(query?.weddingDate),
    weddingTime: cleanPreviewText(query?.weddingTime, "07:00 مساءً"),
    venue: cleanPreviewText(query?.venue, "قاعة رويال"),
    city: cleanPreviewText(query?.city, "البحيرة"),
    mapUrl: cleanPreviewText(query?.mapUrl, "https://maps.google.com/?q=Royal+Hall+Beheira"),
    heroPhoto: previewGallery[0] || fallbackGallery[0],
    gallery: previewGallery.length ? previewGallery : fallbackGallery,
    musicUrl: previewMusicUrl,
    isActive: true,
    views: 0,
    customerId: "preview",
  };

  const isSilentPreview = query?.silentPreview === "1" || query?.embed === "1";
  const hidePreviewActions = isSilentPreview || query?.builderPreview === "1";

  return (
    <>
      <InvitationExperience invitation={invitation} template={previewTemplate} disableMusic={isSilentPreview} />
      {!hidePreviewActions ? (
        <nav className="template-preview-floating-actions" aria-label="اختيارات القالب">
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
        </nav>
      ) : null}
    </>
  );
}
