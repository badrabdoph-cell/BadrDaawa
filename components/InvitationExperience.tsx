"use client";

import Image from "next/image";
import { Calendar, CalendarHeart, Camera, ChevronDown, Clock, Facebook, Flower2, Heart, Instagram, Leaf, MapPin, Music2, Sparkles } from "lucide-react";
import { createContext, useContext, type ReactNode } from "react";
import { Countdown } from "./Countdown";
import { InviteOpening } from "./InviteOpening";
import { InviteMap } from "./InviteMap";
import { InviteMusic } from "./InviteMusic";
import { InvitePoll } from "./InvitePoll";
import { InviteGallery, InviteGalleryStoryProvider } from "./InviteGallery";
import { InviteParallax } from "./InviteParallax";
import { InviteScrollAnimations } from "./InviteScrollAnimations";
import { InvitePermissions } from "./InvitePermissions";
import { InviteCheckIn } from "./InviteCheckIn";
import { AddToCalendar } from "./AddToCalendar";
import { CoupleStoryTimeline } from "./CoupleStoryTimeline";
import { GuestBook } from "./GuestBook";
import { WeddingLiveMode } from "./WeddingLiveMode";
import { QrCodeBlock } from "./QrCodeBlock";
import { getInvitationTranslator, getLocaleMeta } from "@/lib/i18n";
import { isBrowserDisplayImageUrl } from "@/lib/image-formats";
import { cleanInvitationHeroVideoUrl } from "@/lib/invitation-media";
import { normalizeInvitationTexts } from "@/lib/invitation-texts";
import type { SiteSocialLinks } from "@/lib/site-settings";
import type { Invitation, TemplateDefinition } from "@/lib/types";
import { getInvitationUrl, normalizeInternalAssetUrl } from "@/lib/utils";
import { withVisitSource } from "@/lib/visit-source";

const galleryImages = ["/assets/invite/badr-sarah-1.jpeg", "/assets/invite/badr-sarah-2.jpeg", "/assets/invite/badr-sarah-3.jpeg"];

function cleanInviteImage(value?: string | null) {
  const url = normalizeInternalAssetUrl(value);
  return url && isBrowserDisplayImageUrl(url) ? url : "";
}

function getInvitationImages(invitation: Invitation) {
  const uploaded = invitation.gallery.map(cleanInviteImage).filter(Boolean);
  const hero = uploaded[0] || cleanInviteImage(invitation.heroPhoto) || galleryImages[0];
  const secondary = uploaded[1] || galleryImages[1];
  const detail = uploaded[2] || galleryImages[2];

  return {
    hero,
    secondary,
    detail,
    gallery: [hero, secondary, detail],
  };
}

function getInvitationTexts(invitation: Invitation) {
  return normalizeInvitationTexts(invitation.texts, invitation.language);
}

function getInvitationHeroVideo(invitation: Invitation) {
  const rawTexts = invitation.texts && typeof invitation.texts === "object" ? (invitation.texts as Record<string, unknown>) : {};
  return cleanInvitationHeroVideoUrl(invitation.heroVideoUrl || rawTexts.heroVideoUrl);
}

function canUseOptimizedImage(src: string) {
  return src.startsWith("/") && !src.toLowerCase().endsWith(".svg");
}

function InviteHeroMedia({
  image,
  videoUrl,
  alt,
  className = "",
  strength = "0.82",
}: {
  image: string;
  videoUrl?: string;
  alt: string;
  className?: string;
  strength?: string;
}) {
  if (videoUrl) {
    return <video className={["invite-hero-video", className].filter(Boolean).join(" ")} src={videoUrl} poster={image} muted loop playsInline autoPlay preload="metadata" data-invite-parallax data-invite-parallax-strength={strength} />;
  }
  if (!canUseOptimizedImage(image)) {
    return <img className={className || undefined} src={image} alt={alt} loading="lazy" decoding="async" data-invite-parallax data-invite-parallax-strength={strength} />;
  }
  return (
    <Image
      className={className || undefined}
      src={image}
      alt={alt}
      width={1400}
      height={1900}
      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 80vw, 760px"
      loading="lazy"
      data-invite-parallax
      data-invite-parallax-strength={strength}
    />
  );
}

function InvitationOpeningLayer({ invitation }: { invitation: Invitation }) {
  const texts = getInvitationTexts(invitation);
  return (
    <InviteOpening
      groomName={invitation.groomName}
      brideName={invitation.brideName}
      coverImage={getInvitationImages(invitation).hero}
      weddingDateLabel={formatInvitationDate(invitation)}
      openingText={texts.openingText || texts.inviteMessageSecondary}
      locale={invitation.language}
    />
  );
}

function formatInvitationDate(invitation: Pick<Invitation, "weddingDate" | "language">) {
  return new Intl.DateTimeFormat(getLocaleMeta(invitation.language).dateLocale, {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(invitation.weddingDate));
}

function invitationT(invitation: Pick<Invitation, "language">, key: string, replacements?: Record<string, string | number>) {
  return getInvitationTranslator(invitation.language)(key, replacements);
}

function PrimaryInvitationMessage({ invitation }: { invitation: Invitation }) {
  return <>{getInvitationTexts(invitation).inviteMessage}</>;
}

function SecondaryInvitationMessage({ invitation }: { invitation: Invitation }) {
  return <>{getInvitationTexts(invitation).inviteMessageSecondary}</>;
}

function InvitationPoll({ invitation }: { invitation: Invitation }) {
  const texts = getInvitationTexts(invitation);
  return (
    <InvitePoll
      invitation={invitation}
      locale={invitation.language}
      question={texts.rsvpQuestion}
      declinedMessage={texts.rsvpDeclinedMessage}
      confirmedSuccessMessage={texts.rsvpConfirmedSuccessMessage}
      declinedSuccessMessage={texts.rsvpDeclinedSuccessMessage}
    />
  );
}

function InvitationGuestBook({ invitation }: { invitation: Invitation }) {
  const isPreview = invitation.code.startsWith("preview-");
  return (
    <>
      <CoupleStoryTimeline story={getInvitationTexts(invitation).story} locale={invitation.language} />
      <AddToCalendar invitation={invitation} isPreview={isPreview} />
      {invitation.checkInEnabled === false ? null : <InviteCheckIn code={invitation.code} isPreview={isPreview} locale={invitation.language} />}
      <GuestBook code={invitation.code} isPreview={isPreview} locale={invitation.language} />
    </>
  );
}

type InvitationSocialLink = {
  key: "facebook" | "instagram" | "tiktok" | "whatsapp";
  label: string;
  href: string;
  active: boolean;
};

type InvitationExperienceSettings = {
  showPhotographerCard?: boolean;
  showTemplatePhotographer?: boolean;
  photographerName?: string;
  photographerInstagramUrl?: string;
  photographerFacebookUrl?: string;
  socialLinks?: SiteSocialLinks;
  whatsappUrl?: string;
};

const InvitationSocialSettingsContext = createContext<InvitationExperienceSettings | null>(null);

function getSocialShareLinks(invitationUrl: string, settings?: InvitationExperienceSettings | null): InvitationSocialLink[] {
  const whatsAppUrl = withVisitSource(invitationUrl, "WhatsApp");
  const socials = settings?.socialLinks;
  return [
    { key: "facebook", label: "Facebook", href: socials?.facebook || "", active: Boolean(socials?.facebook) },
    { key: "instagram", label: "Instagram", href: socials?.instagram || "", active: Boolean(socials?.instagram) },
    { key: "tiktok", label: "TikTok", href: socials?.tiktok || "", active: Boolean(socials?.tiktok) },
    { key: "whatsapp", label: "WhatsApp", href: `https://wa.me/?text=${encodeURIComponent(whatsAppUrl)}`, active: true },
  ];
}

function SocialBrandIcon({ platform }: { platform: InvitationSocialLink["key"] }) {
  if (platform === "facebook") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <path d="M22 12.06C22 6.5 17.52 2 12 2S2 6.5 2 12.06c0 5.02 3.66 9.18 8.44 9.94v-7.03H7.9v-2.91h2.54V9.84c0-2.52 1.49-3.91 3.77-3.91 1.09 0 2.23.2 2.23.2v2.47h-1.25c-1.24 0-1.63.77-1.63 1.57v1.89h2.77l-.44 2.91h-2.33V22A10.03 10.03 0 0 0 22 12.06Z" />
      </svg>
    );
  }
  if (platform === "instagram") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <path d="M7.8 2h8.4A5.8 5.8 0 0 1 22 7.8v8.4a5.8 5.8 0 0 1-5.8 5.8H7.8A5.8 5.8 0 0 1 2 16.2V7.8A5.8 5.8 0 0 1 7.8 2Zm-.2 2A3.6 3.6 0 0 0 4 7.6v8.8A3.6 3.6 0 0 0 7.6 20h8.8a3.6 3.6 0 0 0 3.6-3.6V7.6A3.6 3.6 0 0 0 16.4 4H7.6Zm9.65 1.5a1.25 1.25 0 1 1 0 2.5 1.25 1.25 0 0 1 0-2.5ZM12 7a5 5 0 1 1 0 10 5 5 0 0 1 0-10Zm0 2a3 3 0 1 0 0 6 3 3 0 0 0 0-6Z" />
      </svg>
    );
  }
  if (platform === "tiktok") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <path d="M16.55 2c.24 2.03 1.39 3.25 3.45 3.38v3.12a7.34 7.34 0 0 1-3.38-.8v6.33c0 4.05-2.43 7.16-6.38 7.16-3.14 0-5.74-2.03-6.17-5.02-.56-3.93 2.55-7.12 6.38-6.79.35.03.69.1 1.03.2v3.28a3.2 3.2 0 0 0-1.58-.25 2.58 2.58 0 0 0-2.38 2.83 2.6 2.6 0 0 0 3 2.31c1.7-.25 2.45-1.47 2.45-3.16V2h3.58Z" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M20.52 3.48A11.83 11.83 0 0 0 12.1 0C5.55 0 .23 5.32.23 11.87c0 2.09.55 4.13 1.6 5.93L.12 24l6.35-1.67a11.83 11.83 0 0 0 5.63 1.43h.01c6.55 0 11.87-5.32 11.87-11.87 0-3.17-1.23-6.15-3.46-8.41ZM12.1 21.75h-.01a9.83 9.83 0 0 1-5.01-1.37l-.36-.21-3.77.99 1-3.68-.24-.38a9.85 9.85 0 0 1-1.5-5.23c0-5.44 4.43-9.86 9.88-9.86a9.8 9.8 0 0 1 6.98 2.9 9.78 9.78 0 0 1 2.89 6.98c0 5.44-4.43 9.86-9.86 9.86Zm5.41-7.39c-.3-.15-1.76-.87-2.03-.96-.27-.1-.47-.15-.67.15-.2.3-.77.96-.95 1.16-.17.2-.35.22-.64.07-.3-.15-1.25-.46-2.39-1.47-.88-.79-1.48-1.76-1.65-2.06-.17-.3-.02-.46.13-.61.13-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.08-.15-.67-1.61-.92-2.2-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.8.37-.27.3-1.04 1.02-1.04 2.48s1.07 2.88 1.22 3.08c.15.2 2.1 3.2 5.09 4.49.71.31 1.26.49 1.69.63.71.23 1.36.2 1.87.12.57-.08 1.76-.72 2.01-1.41.25-.7.25-1.29.17-1.42-.07-.12-.27-.2-.57-.35Z" />
    </svg>
  );
}

function SocialShareButtons({ invitationUrl }: { invitationUrl: string }) {
  const settings = useContext(InvitationSocialSettingsContext);
  const links = getSocialShareLinks(invitationUrl, settings);

  return (
    <>
      {links.map((item) => (
        <a
          className={`social-share-button social-share-button-${item.key}${item.active ? "" : " is-disabled"}`}
          href={item.active ? item.href : undefined}
          key={item.key}
          aria-label={item.active ? item.label : `${item.label} غير مفعل`}
          aria-disabled={!item.active}
          tabIndex={item.active ? undefined : -1}
          target={item.active ? "_blank" : undefined}
          rel={item.active ? "noreferrer" : undefined}
          onClick={item.active ? undefined : (event) => event.preventDefault()}
          title={item.active ? item.label : `${item.label} غير مفعل حالياً`}
        >
          <SocialBrandIcon platform={item.key} />
        </a>
      ))}
    </>
  );
}

type PhotographerConfig = {
  enabled: boolean;
  name: string;
  logoUrl?: string;
  instagramUrl: string;
  facebookUrl: string;
};

function getTemplatePhotographer(template: TemplateDefinition, invitation?: Invitation, settings?: InvitationExperienceSettings): PhotographerConfig {
  const invitationPhotographer = invitation?.photographer;
  const enabled =
    (settings?.showTemplatePhotographer === true && template.photographer?.enabled !== false) ||
    (settings?.showPhotographerCard !== false && invitationPhotographer?.enabled === true);
  return {
    enabled,
    name: invitationPhotographer?.name || template.photographer?.name || settings?.photographerName || "badrabdoph",
    logoUrl: invitationPhotographer?.logoUrl || template.photographer?.logoUrl,
    instagramUrl: invitationPhotographer?.instagramUrl || template.photographer?.instagramUrl || settings?.photographerInstagramUrl || "https://www.instagram.com/",
    facebookUrl: invitationPhotographer?.facebookUrl || template.photographer?.facebookUrl || settings?.photographerFacebookUrl || "https://www.facebook.com/",
  };
}

function PhotographerLogoMark({ photographer, fallback = "BA" }: { photographer: PhotographerConfig; fallback?: string }) {
  return photographer.logoUrl ? <img className="photographer-logo-image" src={photographer.logoUrl} alt={photographer.name} /> : <span>{fallback}</span>;
}

function getTemplatePaletteStyle(template: TemplateDefinition) {
  return {
    "--tpl-primary": template.palette.primary,
    "--tpl-secondary": template.palette.secondary,
    "--tpl-accent": template.palette.accent,
    "--tpl-ink": template.palette.ink,
    "--tpl-surface": template.palette.surface,
  } as React.CSSProperties;
}

function withTemplateColors(template: TemplateDefinition, invitation: Invitation, children: React.ReactNode) {
  return (
    <div className="template-color-scope" style={getTemplatePaletteStyle(template)}>
      <InvitationOpeningLayer invitation={invitation} />
      {children}
    </div>
  );
}

function TemplatePhotographerCard({ photographer, className = "", invitation }: { photographer: PhotographerConfig; className?: string; invitation: Pick<Invitation, "language"> }) {
  if (!photographer.enabled) return null;

  return (
    <section className={["template-photographer-card", className].filter(Boolean).join(" ")}>
      <div className="template-photographer-logo">
        <PhotographerLogoMark photographer={photographer} />
      </div>
      <div>
        <span>Official Photographer</span>
        <h2>{photographer.name}</h2>
      </div>
      <div className="template-photographer-socials" aria-label={invitationT(invitation, "invitation.photographerLinks")}>
        <a href={photographer.facebookUrl} aria-label="Facebook" target="_blank" rel="noreferrer">
          <Facebook size={17} />
        </a>
        <a href={photographer.instagramUrl} aria-label="Instagram" target="_blank" rel="noreferrer">
          <Instagram size={17} />
        </a>
      </div>
    </section>
  );
}

export function InvitationExperience({
  invitation,
  template,
  disableMusic = false,
  settings,
}: {
  invitation: Invitation;
  template: TemplateDefinition;
  disableMusic?: boolean;
  settings?: InvitationExperienceSettings;
}) {
  const templateMusicUrl = disableMusic || invitation.musicEnabled === false ? null : invitation.musicUrl || template.musicUrl;
  const photographer = getTemplatePhotographer(template, invitation, settings);
  const galleryImagesForStories = getInvitationImages(invitation).gallery;
  const galleryStories = getInvitationTexts(invitation).galleryStories;
  const heroVideoUrl = getInvitationHeroVideo(invitation);
  const withGalleryStories = (content: ReactNode) => (
    <InvitationSocialSettingsContext.Provider value={settings || null}>
      <InviteGalleryStoryProvider images={galleryImagesForStories} stories={galleryStories} heroVideoUrl={heroVideoUrl}>
        <InviteScrollAnimations />
        <InviteParallax />
        {content}
      </InviteGalleryStoryProvider>
    </InvitationSocialSettingsContext.Provider>
  );

  if (template.customHtml) {
    return withGalleryStories(<CustomHtmlInvitationExperience invitation={invitation} template={template} musicUrl={templateMusicUrl} />);
  }

  if (template.slug === "luxe-noir") {
    return withGalleryStories(withTemplateColors(template, invitation, <LuxeNoirInvitationExperience invitation={invitation} musicUrl={templateMusicUrl} photographer={photographer} />));
  }
  if (template.slug === "ivory-arches") {
    return withGalleryStories(withTemplateColors(template, invitation, <IvoryArchesInvitationExperience invitation={invitation} musicUrl={templateMusicUrl} photographer={photographer} />));
  }
  if (template.slug === "mobile-gold" || template.slug === "soft-gold") {
    return withGalleryStories(withTemplateColors(template, invitation, <MobileGoldInvitationExperience invitation={invitation} musicUrl={templateMusicUrl} photographer={photographer} />));
  }
  if (template.slug === "boho-chic") {
    return withGalleryStories(withTemplateColors(template, invitation, <BohoChicInvitationExperience invitation={invitation} musicUrl={templateMusicUrl} photographer={photographer} />));
  }
  if (template.slug === "garden-elegance") {
    return withGalleryStories(withTemplateColors(template, invitation, <GardenEleganceInvitationExperience invitation={invitation} musicUrl={templateMusicUrl} photographer={photographer} />));
  }
  if (template.slug === "featured-1") {
    return withGalleryStories(withTemplateColors(template, invitation, <FeaturedOneInvitationExperience invitation={invitation} musicUrl={templateMusicUrl} photographer={photographer} />));
  }
  if (template.slug === "cinematic-rose") {
    return withGalleryStories(withTemplateColors(template, invitation, <CinematicRoseInvitationExperience invitation={invitation} musicUrl={templateMusicUrl} photographer={photographer} />));
  }
  if (template.slug === "modern-cinematic") {
    return withGalleryStories(withTemplateColors(template, invitation, <ModernCinematicInvitationExperience invitation={invitation} musicUrl={templateMusicUrl} photographer={photographer} />));
  }
  if (template.slug === "ethereal-glass") {
    return withGalleryStories(withTemplateColors(template, invitation, <EtherealGlassInvitationExperience invitation={invitation} musicUrl={templateMusicUrl} photographer={photographer} />));
  }
  if (template.slug === "botanical-theme") {
    return withGalleryStories(withTemplateColors(template, invitation, <BotanicalThemeInvitationExperience invitation={invitation} musicUrl={templateMusicUrl} photographer={photographer} />));
  }
  if (template.slug === "royal-gold") {
    return withGalleryStories(withTemplateColors(template, invitation, <RoyalGoldInvitationExperience invitation={invitation} musicUrl={templateMusicUrl} photographer={photographer} />));
  }
  if (template.slug === "boho-sand") {
    return withGalleryStories(withTemplateColors(template, invitation, <BohoSandInvitationExperience invitation={invitation} musicUrl={templateMusicUrl} photographer={photographer} />));
  }
  if (template.slug === "pure-white") {
    return withGalleryStories(withTemplateColors(template, invitation, <PureWhiteInvitationExperience invitation={invitation} musicUrl={templateMusicUrl} photographer={photographer} />));
  }
  if (template.slug === "neon-theme") {
    return withGalleryStories(withTemplateColors(template, invitation, <NeonThemeInvitationExperience invitation={invitation} musicUrl={templateMusicUrl} photographer={photographer} />));
  }
  if (template.slug === "vintage-theme") {
    return withGalleryStories(withTemplateColors(template, invitation, <VintageThemeInvitationExperience invitation={invitation} musicUrl={templateMusicUrl} photographer={photographer} />));
  }
  if (template.slug === "fairytale-theme") {
    return withGalleryStories(withTemplateColors(template, invitation, <FairytaleThemeInvitationExperience invitation={invitation} musicUrl={templateMusicUrl} photographer={photographer} />));
  }
  if (template.slug === "ocean-theme") {
    return withGalleryStories(withTemplateColors(template, invitation, <OceanThemeInvitationExperience invitation={invitation} musicUrl={templateMusicUrl} photographer={photographer} />));
  }
  if (template.slug === "art-deco-theme") {
    return withGalleryStories(withTemplateColors(template, invitation, <ArtDecoThemeInvitationExperience invitation={invitation} musicUrl={templateMusicUrl} photographer={photographer} />));
  }
  if (template.slug === "magazine-theme") {
    return withGalleryStories(withTemplateColors(template, invitation, <MagazineThemeInvitationExperience invitation={invitation} musicUrl={templateMusicUrl} photographer={photographer} />));
  }
  if (template.slug === "cinematic-story") {
    return withGalleryStories(withTemplateColors(template, invitation, <CinematicStoryInvitationExperience invitation={invitation} musicUrl={templateMusicUrl} photographer={photographer} />));
  }

  const invitationUrl = getInvitationUrl(invitation.code, invitation.customSlug);
  const showPhotographer = photographer.enabled;

  return withGalleryStories(
    <main
      className="creative-invite"
      style={getTemplatePaletteStyle(template)}
    >
      <InviteMusic musicUrl={templateMusicUrl} />
      <InvitePermissions invitationCode={invitation.code} />
      <WeddingLiveMode code={invitation.code} />
      <InvitationOpeningLayer invitation={invitation} />

      <section className="invite-story">
        <div className="invite-card invite-title-card">
          <span className="invite-kicker">Royal Envelope</span>
          <h1>
            {invitation.groomName} &amp; {invitation.brideName}
          </h1>
          <h2 className="invite-venue-title">{invitation.venue}</h2>
          <p className="invite-short-line">✦ ✧ ✦</p>
          <p>{formatInvitationDate(invitation)}</p>
          <strong>{invitation.weddingTime}</strong>
          <Countdown targetDate={invitation.weddingDate} targetTime={invitation.weddingTime} locale={invitation.language} />
        </div>

        <InviteGallery className="luxury-gallery" images={getInvitationImages(invitation).gallery} locale={invitation.language} label={invitationT(invitation, "invitation.galleryLabel")} />

        <section className="invite-card invite-message">
          <Music2 size={22} />
          <p>
            <PrimaryInvitationMessage invitation={invitation} />
          </p>
          <p>
            <SecondaryInvitationMessage invitation={invitation} />
          </p>
        </section>

        <section className="invite-card map-card">
          <div>
            <span className="invite-kicker">Location</span>
            <h2>{invitation.venue}</h2>
            <p>{invitation.city}</p>
          </div>
          <InviteMap venue={invitation.venue} city={invitation.city} mapUrl={invitation.mapUrl} locale={invitation.language} />
        </section>

        {showPhotographer ? (
          <section className="invite-card photographer-card">
            <div className="photographer-logo" aria-hidden="true">
              <PhotographerLogoMark photographer={photographer} />
            </div>
            <div>
              <span className="invite-kicker">Photographer</span>
              <h2>{photographer.name}</h2>
              <p>{invitationT(invitation, "invitation.photographerMoments")}</p>
            </div>
            <div className="photographer-socials" aria-label={invitationT(invitation, "invitation.photographerLinks")}>
              <a href={photographer.facebookUrl} aria-label="Facebook" target="_blank" rel="noreferrer">
                <Facebook size={19} />
              </a>
              <a href={photographer.instagramUrl} aria-label="Instagram" target="_blank" rel="noreferrer">
                <Instagram size={19} />
              </a>
            </div>
          </section>
        ) : null}

        <InvitationPoll invitation={invitation} />

        <InvitationGuestBook invitation={invitation} />

        <section className="invite-card qr-share-card">
          <QrCodeBlock value={invitationUrl} locale={invitation.language} />
          <div className="social-row" aria-label={invitationT(invitation, "invitation.socialLinks")}>
            <SocialShareButtons invitationUrl={invitationUrl} />
          </div>
        </section>
      </section>
    </main>,
  );
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function getCustomTemplateScrollAnimations() {
  return `<style>
[data-badr-scroll]{--badr-scroll-x:0;--badr-scroll-y:18px;--badr-scroll-scale:1;opacity:0;translate:var(--badr-scroll-x) var(--badr-scroll-y);scale:var(--badr-scroll-scale);filter:blur(4px);transition:opacity 680ms cubic-bezier(.2,.74,.24,1),translate 680ms cubic-bezier(.2,.74,.24,1),scale 680ms cubic-bezier(.2,.74,.24,1),filter 680ms cubic-bezier(.2,.74,.24,1);transition-delay:var(--badr-scroll-delay,0ms);will-change:opacity,translate,scale,filter}
[data-badr-scroll-effect=slide-left]{--badr-scroll-x:-22px;--badr-scroll-y:10px}
[data-badr-scroll-effect=slide-right]{--badr-scroll-x:22px;--badr-scroll-y:10px}
[data-badr-scroll-effect=scale]{--badr-scroll-y:12px;--badr-scroll-scale:.975}
[data-badr-scroll].is-in-view{opacity:1;translate:0 0;scale:1;filter:blur(0)}
@media (prefers-reduced-motion:reduce){[data-badr-scroll]{opacity:1!important;translate:0 0!important;scale:1!important;filter:none!important;transition:none!important;will-change:auto}}
</style><script>
(() => {
  if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  if (!("IntersectionObserver" in window)) return;
  const selector = "main > section, section, article, .invite-card, [class*='card'], [class*='gallery'], [class*='map'], [class*='photographer'], [class*='qr']";
  const items = Array.from(document.querySelectorAll(selector)).filter((item) => !item.closest(".invite-opening") && !item.matches("script,style"));
  const observer = new IntersectionObserver((entries) => entries.forEach((entry) => {
    if (!entry.isIntersecting) return;
    entry.target.classList.add("is-in-view");
    observer.unobserve(entry.target);
  }), { rootMargin: "0px 0px -10% 0px", threshold: 0.16 });
  items.forEach((item, index) => {
    const name = String(item.className || "").toLowerCase();
    item.dataset.badrScroll = "true";
    item.dataset.badrScrollEffect = name.includes("gallery") || name.includes("photo") || name.includes("media") ? "scale" : index % 3 === 1 ? "slide-right" : index % 3 === 2 ? "slide-left" : "fade";
    item.style.setProperty("--badr-scroll-delay", (Math.min(index % 5, 4) * 55) + "ms");
    observer.observe(item);
  });
})();
</script>`;
}

function injectCustomTemplateData(html: string, invitation: Invitation, musicUrl?: string | null) {
  const invitationUrl = getInvitationUrl(invitation.code, invitation.customSlug);
  const imageSet = getInvitationImages(invitation);
  const images = imageSet.gallery;
  const texts = getInvitationTexts(invitation);
  const data = {
    groomName: invitation.groomName,
    brideName: invitation.brideName,
    coupleNames: `${invitation.groomName} & ${invitation.brideName}`,
    weddingDate: formatInvitationDate(invitation),
    rawWeddingDate: invitation.weddingDate,
    weddingTime: invitation.weddingTime,
    venue: invitation.venue,
    city: invitation.city,
    mapUrl: invitation.mapUrl,
    invitationUrl,
    musicUrl: musicUrl || "",
    heroVideoUrl: getInvitationHeroVideo(invitation),
    inviteMessage: texts.inviteMessage,
    inviteMessageSecondary: texts.inviteMessageSecondary,
    openingText: texts.openingText,
    rsvpQuestion: texts.rsvpQuestion,
    rsvpDeclinedMessage: texts.rsvpDeclinedMessage,
    rsvpConfirmedSuccessMessage: texts.rsvpConfirmedSuccessMessage,
    rsvpDeclinedSuccessMessage: texts.rsvpDeclinedSuccessMessage,
    galleryStories: JSON.stringify(texts.galleryStories),
    story: JSON.stringify(texts.story),
    heroPhoto: imageSet.hero,
    gallery1: images[0] || "",
    gallery2: images[1] || images[0] || "",
    gallery3: images[2] || images[0] || "",
  };

  let output = html;
  Object.entries(data).forEach(([key, value]) => {
    output = output.replaceAll(`{{${key}}}`, escapeHtml(String(value)));
  });

  const bridge = `<script>window.BADR_INVITE=${JSON.stringify({ ...data, galleryStories: texts.galleryStories, story: texts.story, gallery: images }).replace(/</g, "\\u003c")};</script>`;
  const scrollAnimations = getCustomTemplateScrollAnimations();
  return output.includes("</body>") ? output.replace("</body>", `${bridge}${scrollAnimations}</body>`) : `${output}${bridge}${scrollAnimations}`;
}

function CustomHtmlInvitationExperience({ invitation, template, musicUrl }: { invitation: Invitation; template: TemplateDefinition; musicUrl?: string | null }) {
  const srcDoc = injectCustomTemplateData(template.customHtml || "", invitation, musicUrl);

  return (
    <main
      className="custom-code-invite"
      style={getTemplatePaletteStyle(template)}
    >
      <InviteMusic musicUrl={musicUrl} />
      <InvitePermissions invitationCode={invitation.code} />
      <WeddingLiveMode code={invitation.code} />
      <InvitationOpeningLayer invitation={invitation} />
      <iframe
        className="custom-code-frame"
        srcDoc={srcDoc}
        title={`قالب ${template.arabicName}`}
        sandbox="allow-scripts allow-forms allow-popups allow-popups-to-escape-sandbox"
        allow="autoplay; geolocation; notifications"
      />
      <div className="custom-code-countdown">
        <Countdown targetDate={invitation.weddingDate} targetTime={invitation.weddingTime} locale={invitation.language} />
      </div>
      <div className="custom-code-guest-book">
        <InvitationGuestBook invitation={invitation} />
      </div>
    </main>
  );
}

function LuxeNoirInvitationExperience({ invitation, musicUrl, photographer }: { invitation: Invitation; musicUrl?: string | null; photographer: PhotographerConfig }) {
  const invitationUrl = getInvitationUrl(invitation.code, invitation.customSlug);
  const showPhotographer = photographer.enabled;
  const images = getInvitationImages(invitation).gallery;

  return (
    <main className="noir-invite">
      <div className="noir-pattern" aria-hidden="true" />
      <InviteMusic musicUrl={musicUrl} />
      <InvitePermissions invitationCode={invitation.code} />
      <WeddingLiveMode code={invitation.code} />

      <section className="noir-story">
        <div className="noir-hero-card">
          <span className="noir-kicker">Royal Envelope</span>
          <h1>
            {invitation.groomName} <span>&amp;</span> {invitation.brideName}
          </h1>
          <h2>{invitation.venue}</h2>
          <div className="noir-stars" aria-hidden="true">
            <i />
            <strong>✦ ✧ ✦</strong>
            <i />
          </div>
          <p>{formatInvitationDate(invitation)}</p>
          <strong className="noir-time">{invitation.weddingTime}</strong>
          <div className="noir-countdown">
            <Countdown targetDate={invitation.weddingDate} targetTime={invitation.weddingTime} locale={invitation.language} />
          </div>
        </div>

        <section className="noir-message">
          <span>
            <Music2 size={28} strokeWidth={1.5} />
          </span>
          <p>
            <PrimaryInvitationMessage invitation={invitation} />
            <strong>
              <SecondaryInvitationMessage invitation={invitation} />
            </strong>
          </p>
        </section>

        <InviteGallery className="noir-gallery" images={images} locale={invitation.language} label={invitationT(invitation, "invitation.galleryLabel")} />

        <section className="noir-map-card">
          <div className="noir-map-copy">
            <span>
              <MapPin size={20} />
              Location
            </span>
            <h2>{invitation.venue}</h2>
            <p>{invitation.city}</p>
          </div>
          <div className="noir-map-frame">
            <InviteMap venue={invitation.venue} city={invitation.city} mapUrl={invitation.mapUrl} locale={invitation.language} />
          </div>
        </section>

        {showPhotographer ? (
          <section className="noir-photographer-card">
            <div className="noir-photographer-main">
              <div className="noir-photographer-logo">
                <PhotographerLogoMark photographer={photographer} />
              </div>
              <div>
                <span>
                  <Camera size={16} />
                  Photographer
                </span>
                <h2>{photographer.name}</h2>
                <p>{invitationT(invitation, "invitation.photographerMoments")}</p>
              </div>
            </div>
            <div className="noir-socials">
              <a href={photographer.facebookUrl} aria-label="Facebook" target="_blank" rel="noreferrer">
                <Facebook size={20} />
              </a>
              <a href={photographer.instagramUrl} aria-label="Instagram" target="_blank" rel="noreferrer">
                <Instagram size={20} />
              </a>
            </div>
          </section>
        ) : null}

        <InvitationPoll invitation={invitation} />

        <InvitationGuestBook invitation={invitation} />

        <section className="noir-qr-card">
          <p>{invitationT(invitation, "invitation.shareInvitation")}</p>
          <QrCodeBlock value={invitationUrl} locale={invitation.language} />
          <div className="social-row" aria-label={invitationT(invitation, "invitation.socialLinks")}>
            <SocialShareButtons invitationUrl={invitationUrl} />
          </div>
        </section>
      </section>
    </main>
  );
}

function IvoryArchesInvitationExperience({ invitation, musicUrl, photographer }: { invitation: Invitation; musicUrl?: string | null; photographer: PhotographerConfig }) {
  const invitationUrl = getInvitationUrl(invitation.code, invitation.customSlug);
  const showPhotographer = photographer.enabled;
  const images = getInvitationImages(invitation).gallery;

  return (
    <main className="ivory-invite">
      <div className="ivory-frame" aria-hidden="true" />
      <InviteMusic musicUrl={musicUrl} />
      <InvitePermissions invitationCode={invitation.code} />
      <WeddingLiveMode code={invitation.code} />

      <section className="ivory-story">
        <div className="ivory-hero">
          <div className="ivory-kicker">
            <i />
            <span>Save The Date</span>
            <i />
          </div>
          <h1>
            {invitation.groomName}
            <span>&amp;</span>
            {invitation.brideName}
          </h1>
          <p>{formatInvitationDate(invitation)}</p>
          <strong>{invitation.weddingTime}</strong>
          <div className="ivory-divider" aria-hidden="true" />
          <div className="ivory-countdown">
            <Countdown targetDate={invitation.weddingDate} targetTime={invitation.weddingTime} locale={invitation.language} />
          </div>
        </div>

        <section className="ivory-quote">
          <Heart size={36} strokeWidth={1.2} />
          <h2>
            <PrimaryInvitationMessage invitation={invitation} />
          </h2>
          <p>
            <SecondaryInvitationMessage invitation={invitation} />
          </p>
        </section>

        <InviteGallery className="ivory-gallery" images={images} locale={invitation.language} label={invitationT(invitation, "invitation.galleryLabel")} />

        <section className="ivory-map-card">
          <Sparkles className="ivory-map-sparkle" size={96} aria-hidden="true" />
          <div className="ivory-map-copy">
            <span>
              <MapPin size={16} />
              The Venue
            </span>
            <h2>{invitation.venue}</h2>
            <p>{invitation.city}</p>
            <strong>ننتظركم بكل حب</strong>
          </div>
          <div className="ivory-map-frame">
            <InviteMap venue={invitation.venue} city={invitation.city} mapUrl={invitation.mapUrl} locale={invitation.language} />
          </div>
        </section>

        {showPhotographer ? (
          <section className="ivory-photographer-card">
            <div className="ivory-photographer-logo">
              {photographer.logoUrl ? <PhotographerLogoMark photographer={photographer} /> : <Camera size={24} />}
              {!photographer.logoUrl ? <span>BA</span> : null}
            </div>
            <span>Photography</span>
            <h2>{photographer.name}</h2>
            <p>{invitationT(invitation, "invitation.photographerMoments")}</p>
            <div className="ivory-socials">
              <a href={photographer.facebookUrl} aria-label="Facebook" target="_blank" rel="noreferrer">
                <Facebook size={22} strokeWidth={1.5} />
              </a>
              <a href={photographer.instagramUrl} aria-label="Instagram" target="_blank" rel="noreferrer">
                <Instagram size={22} strokeWidth={1.5} />
              </a>
            </div>
          </section>
        ) : null}

        <div className="ivory-poll-wrap">
          <InvitationPoll invitation={invitation} />
          <InvitationGuestBook invitation={invitation} />
        </div>

        <section className="ivory-qr-card">
          <h2>لمشاركة هذه اللحظة</h2>
          <QrCodeBlock value={invitationUrl} locale={invitation.language} />
          <div className="social-row" aria-label={invitationT(invitation, "invitation.socialLinks")}>
            <SocialShareButtons invitationUrl={invitationUrl} />
          </div>
        </section>
      </section>
    </main>
  );
}

function MobileGoldInvitationExperience({ invitation, musicUrl, photographer }: { invitation: Invitation; musicUrl?: string | null; photographer: PhotographerConfig }) {
  const invitationUrl = getInvitationUrl(invitation.code, invitation.customSlug);
  const showPhotographer = photographer.enabled;
  const images = getInvitationImages(invitation).gallery;

  return (
    <main className="mobile-gold-invite">
      <InviteMusic musicUrl={musicUrl} />
      <InvitePermissions invitationCode={invitation.code} />
      <WeddingLiveMode code={invitation.code} />

      <section className="mobile-gold-story">
        <div className="mobile-gold-hero">
          <p className="mobile-gold-kicker">Wedding Invitation</p>

          <h1>{invitation.groomName}</h1>
          <span>&amp;</span>
          <h1>{invitation.brideName}</h1>

          <div className="mobile-gold-line" />

          <div className="mobile-gold-date-grid">
            <div>
              <Calendar size={20} />
              <p>{formatInvitationDate(invitation)}</p>
            </div>
            <div>
              <Clock size={20} />
              <strong>{invitation.weddingTime}</strong>
            </div>
          </div>

          <div className="mobile-gold-countdown">
            <Countdown targetDate={invitation.weddingDate} targetTime={invitation.weddingTime} locale={invitation.language} />
          </div>
        </div>

        <InviteGallery className="mobile-gold-gallery" images={images} locale={invitation.language} label={invitationT(invitation, "invitation.galleryLabel")} />

        <div className="mobile-gold-message">
          <Heart size={24} />
          <p>
            "<PrimaryInvitationMessage invitation={invitation} /> <SecondaryInvitationMessage invitation={invitation} />"
          </p>
        </div>

        <section className="mobile-gold-map-card">
          <div className="mobile-gold-map-copy">
            <div>
              <MapPin size={18} />
              <span>Location</span>
            </div>
            <h2>{invitation.venue}</h2>
            <p>{invitation.city}</p>
          </div>
          <div className="mobile-gold-map-frame">
            <InviteMap venue={invitation.venue} city={invitation.city} mapUrl={invitation.mapUrl} locale={invitation.language} />
          </div>
        </section>

        {showPhotographer ? (
          <section className="mobile-gold-photographer">
            <div className="mobile-gold-photographer-main">
              <div className="mobile-gold-photographer-logo">
                <PhotographerLogoMark photographer={photographer} />
              </div>
              <div>
                <p>
                  <Camera size={12} />
                  Photo
                </p>
                <h2>{photographer.name}</h2>
              </div>
            </div>
            <div className="mobile-gold-socials" aria-label={invitationT(invitation, "invitation.photographerLinks")}>
              <a href={photographer.facebookUrl} aria-label="Facebook" target="_blank" rel="noreferrer">
                <Facebook size={18} />
              </a>
              <a href={photographer.instagramUrl} aria-label="Instagram" target="_blank" rel="noreferrer">
                <Instagram size={18} />
              </a>
            </div>
          </section>
        ) : null}

        <div className="mobile-gold-poll-wrap">
          <InvitationPoll invitation={invitation} />
          <InvitationGuestBook invitation={invitation} />
        </div>

        <section className="mobile-gold-qr-card">
          <h3>شارك دعوتنا</h3>
          <div className="mobile-gold-qr-box">
            <QrCodeBlock value={invitationUrl} locale={invitation.language} />
          </div>
          <div className="mobile-gold-share-row" aria-label={invitationT(invitation, "invitation.socialLinks")}>
            <SocialShareButtons invitationUrl={invitationUrl} />
          </div>
        </section>
      </section>
    </main>
  );
}

function BohoChicInvitationExperience({ invitation, musicUrl, photographer }: { invitation: Invitation; musicUrl?: string | null; photographer: PhotographerConfig }) {
  const invitationUrl = getInvitationUrl(invitation.code, invitation.customSlug);
  const showPhotographer = photographer.enabled;
  const images = getInvitationImages(invitation).gallery;
  const heroImage = images[0] || invitation.heroPhoto || galleryImages[0];

  return (
    <main className="boho-invite">
      <InviteMusic musicUrl={musicUrl} />
      <InvitePermissions invitationCode={invitation.code} />
      <WeddingLiveMode code={invitation.code} />

      <section className="boho-hero">
        <InviteHeroMedia image={heroImage} videoUrl={getInvitationHeroVideo(invitation)} alt="صورة العروسين" strength="0.82" />
        <div className="boho-hero-shade" />

        <div className="boho-hero-copy">
          <p>We Are Getting Married</p>
          <h1>{invitation.groomName}</h1>
          <span>&amp;</span>
          <h1>{invitation.brideName}</h1>
        </div>
      </section>

      <div className="boho-content">
        <section className="boho-date-card">
          <Heart size={20} />

          <div className="boho-date-row">
            <div>
              <CalendarHeart size={24} strokeWidth={1.5} />
              <p>{formatInvitationDate(invitation)}</p>
            </div>

            <i />

            <div>
              <Clock size={24} strokeWidth={1.5} />
              <strong>{invitation.weddingTime}</strong>
            </div>
          </div>

          <div className="boho-countdown">
            <Countdown targetDate={invitation.weddingDate} targetTime={invitation.weddingTime} locale={invitation.language} />
          </div>
        </section>

        <InviteGallery className="boho-gallery-wrap boho-gallery-scroll" images={images} locale={invitation.language} label={invitationT(invitation, "invitation.galleryLabel")} />

        <section className="boho-map-card">
          <div className="boho-map-copy">
            <div>
              <MapPin size={24} />
            </div>
            <p>Location</p>
            <h2>{invitation.venue}</h2>
            <span>{invitation.city}</span>
          </div>
          <div className="boho-map-frame">
            <InviteMap venue={invitation.venue} city={invitation.city} mapUrl={invitation.mapUrl} locale={invitation.language} />
          </div>
        </section>

        {showPhotographer ? (
          <section className="boho-photographer">
            <div className="boho-photographer-icon">
              <Camera size={28} strokeWidth={1.5} />
            </div>
            <div>
              <p>Captured By</p>
              <h3>{photographer.name}</h3>
            </div>
            <div className="boho-photographer-socials">
              <a href={photographer.instagramUrl} aria-label="Instagram" target="_blank" rel="noreferrer">
                <Instagram size={18} />
              </a>
            </div>
          </section>
        ) : null}

        <div className="boho-poll-wrap">
          <InvitationPoll invitation={invitation} />
          <InvitationGuestBook invitation={invitation} />
        </div>

        <section className="boho-qr-card">
          <h3>{invitationT(invitation, "invitation.shareCard")}</h3>

          <div className="boho-qr-box">
            <QrCodeBlock value={invitationUrl} locale={invitation.language} />
          </div>

          <div className="boho-share-row" aria-label={invitationT(invitation, "invitation.socialLinks")}>
            <SocialShareButtons invitationUrl={invitationUrl} />
          </div>
        </section>
      </div>
    </main>
  );
}

function GardenEleganceInvitationExperience({ invitation, musicUrl, photographer }: { invitation: Invitation; musicUrl?: string | null; photographer: PhotographerConfig }) {
  const invitationUrl = getInvitationUrl(invitation.code, invitation.customSlug);
  const showPhotographer = photographer.enabled;
  const images = getInvitationImages(invitation).gallery;

  return (
    <main className="garden-invite">
      <div className="garden-soft-bg" aria-hidden="true" />
      <InviteMusic musicUrl={musicUrl} />
      <InvitePermissions invitationCode={invitation.code} />
      <WeddingLiveMode code={invitation.code} />

      <section className="garden-story">
        <header className="garden-hero">
          <Leaf className="garden-leaf" size={28} strokeWidth={1.5} />
          <p className="garden-kicker">We Are Getting Married</p>

          <div className="garden-name-orbits">
            <div className="garden-name-circle garden-name-circle-left">
              <h1>{invitation.groomName}</h1>
            </div>
            <strong>&amp;</strong>
            <div className="garden-name-circle garden-name-circle-right">
              <h1>{invitation.brideName}</h1>
            </div>
          </div>

          <ChevronDown className="garden-chevron" size={24} />
        </header>

        <section className="garden-photo-arch" aria-label="الصورة الرئيسية">
          <div className="garden-photo-line" aria-hidden="true" />
          <figure>
            <InviteHeroMedia image={images[0] || invitation.heroPhoto || galleryImages[0]} videoUrl={getInvitationHeroVideo(invitation)} alt={`${invitation.groomName} و ${invitation.brideName}`} strength="0.78" />
          </figure>
        </section>

        <section className="garden-detail-card">
          <Flower2 className="garden-detail-flower" size={42} aria-hidden="true" />
          <div className="garden-timeline">
            <span className="garden-timeline-line" aria-hidden="true" />

            <div className="garden-detail-row">
              <span className="garden-detail-icon">
                <Calendar size={14} />
              </span>
              <div>
                <p>موعد الحفل</p>
                <strong>{formatInvitationDate(invitation)}</strong>
              </div>
            </div>

            <div className="garden-detail-row">
              <span className="garden-detail-icon">
                <Clock size={14} />
              </span>
              <div>
                <p>وقت الحضور</p>
                <strong>{invitation.weddingTime}</strong>
              </div>
            </div>

            <div className="garden-detail-row">
              <span className="garden-detail-icon">
                <MapPin size={14} />
              </span>
              <div>
                <p>مكان الحفل</p>
                <strong>{invitation.venue}</strong>
                <small>{invitation.city}</small>
              </div>
            </div>
          </div>
        </section>

        <section className="garden-countdown-card">
          <p>The Countdown</p>
          <Countdown targetDate={invitation.weddingDate} targetTime={invitation.weddingTime} locale={invitation.language} />
        </section>

        <section className="garden-map-frame">
          <InviteMap venue={invitation.venue} city={invitation.city} mapUrl={invitation.mapUrl} locale={invitation.language} />
        </section>

        {images.length > 1 ? <InviteGallery className="garden-gallery-grid" images={images.slice(1)} locale={invitation.language} label={invitationT(invitation, "invitation.galleryLabel")} /> : null}

        {showPhotographer ? (
          <section className="garden-photographer">
            <div className="garden-photographer-inner">
              <div className="garden-photographer-logo">
                <span>
                  <Camera size={18} />
                </span>
              </div>
              <div>
                <p>Official Photographer</p>
                <h3>{photographer.name}</h3>
                <small>لتوثيق أجمل لحظاتنا</small>
              </div>
              <div className="garden-photographer-socials">
                <a href={photographer.facebookUrl} aria-label="Facebook" target="_blank" rel="noreferrer">
                  <Facebook size={17} />
                </a>
                <a href={photographer.instagramUrl} aria-label="Instagram" target="_blank" rel="noreferrer">
                  <Instagram size={17} />
                </a>
              </div>
            </div>
          </section>
        ) : null}

        <div className="garden-poll-wrap">
          <InvitationPoll invitation={invitation} />
          <InvitationGuestBook invitation={invitation} />
        </div>

        <section className="garden-qr-ticket">
          <span className="garden-ticket-cut garden-ticket-cut-left" aria-hidden="true" />
          <span className="garden-ticket-cut garden-ticket-cut-right" aria-hidden="true" />
          <h3>{invitationT(invitation, "invitation.shareCard")}</h3>

          <div className="garden-qr-box">
            <QrCodeBlock value={invitationUrl} locale={invitation.language} />
          </div>

          <div className="garden-share-row" aria-label={invitationT(invitation, "invitation.socialLinks")}>
            <SocialShareButtons invitationUrl={invitationUrl} />
          </div>
        </section>
      </section>
    </main>
  );
}

function FeaturedOneInvitationExperience({ invitation, musicUrl, photographer }: { invitation: Invitation; musicUrl?: string | null; photographer: PhotographerConfig }) {
  const invitationUrl = getInvitationUrl(invitation.code, invitation.customSlug);
  const showPhotographer = photographer.enabled;
  const images = getInvitationImages(invitation).gallery;

  return (
    <main className="featured-invite">
      <InviteMusic musicUrl={musicUrl} />
      <InvitePermissions invitationCode={invitation.code} />
      <WeddingLiveMode code={invitation.code} />

      <section className="featured-hero">
        <div className="featured-hero-media">
          <InviteHeroMedia image={images[0] || invitation.heroPhoto || galleryImages[0]} videoUrl={getInvitationHeroVideo(invitation)} alt="صورة العرسان" strength="0.86" />
          <div className="featured-hero-gradient" />
        </div>

        <div className="featured-hero-copy">
          <p>هنا تبدأ الحكاية ❤️</p>
          <h1>{invitation.groomName}</h1>
          <div className="featured-heart-line" aria-hidden="true">
            <span />
            <Heart size={20} className="featured-heart" />
            <span />
          </div>
          <h1>{invitation.brideName}</h1>
        </div>
      </section>

      <div className="featured-content">
        <section className="featured-detail-card">
          <Flower2 className="featured-detail-flower" size={42} aria-hidden="true" />
          <div className="featured-timeline">
            <span className="featured-timeline-line" aria-hidden="true" />

            <div className="featured-detail-row">
              <span className="featured-detail-icon">
                <Calendar size={14} />
              </span>
              <div>
                <p>موعد الحفل</p>
                <strong>{formatInvitationDate(invitation)}</strong>
              </div>
            </div>

            <div className="featured-detail-row">
              <span className="featured-detail-icon">
                <Clock size={14} />
              </span>
              <div>
                <p>وقت الحضور</p>
                <strong>{invitation.weddingTime}</strong>
              </div>
            </div>

            <div className="featured-detail-row">
              <span className="featured-detail-icon">
                <MapPin size={14} />
              </span>
              <div>
                <p>مكان الحفل</p>
                <strong>{invitation.venue}</strong>
                <small>{invitation.city}</small>
              </div>
            </div>
          </div>
        </section>

        <section className="featured-countdown-card">
          <p>The Countdown</p>
          <Countdown targetDate={invitation.weddingDate} targetTime={invitation.weddingTime} locale={invitation.language} />
        </section>

        <InviteGallery className="featured-gallery" images={images} locale={invitation.language} label={invitationT(invitation, "invitation.galleryLabel")} />

        <section className="featured-map-card">
          <div className="featured-map-copy">
            <span>
              <MapPin size={17} />
              The Venue
            </span>
            <h2>{invitation.venue}</h2>
            <p>{invitation.city}</p>
          </div>
          <div className="featured-map-frame">
            <InviteMap venue={invitation.venue} city={invitation.city} mapUrl={invitation.mapUrl} locale={invitation.language} />
          </div>
        </section>

        {showPhotographer ? (
          <section className="featured-photographer-card">
            <div className="featured-photographer-logo">
              {photographer.logoUrl ? <PhotographerLogoMark photographer={photographer} /> : <Camera size={24} />}
              {!photographer.logoUrl ? <span>BA</span> : null}
            </div>
            <span>Photography</span>
            <h2>{photographer.name}</h2>
            <p>{invitationT(invitation, "invitation.photographerMoments")}</p>
            <div className="featured-socials">
              <a href={photographer.facebookUrl} aria-label="Facebook" target="_blank" rel="noreferrer">
                <Facebook size={22} strokeWidth={1.5} />
              </a>
              <a href={photographer.instagramUrl} aria-label="Instagram" target="_blank" rel="noreferrer">
                <Instagram size={22} strokeWidth={1.5} />
              </a>
            </div>
          </section>
        ) : null}

        <div className="featured-poll-wrap">
          <InvitationPoll invitation={invitation} />
          <InvitationGuestBook invitation={invitation} />
        </div>

        <section className="featured-qr-card">
          <h3>{invitationT(invitation, "invitation.shareCard")}</h3>
          <div className="featured-qr-box">
            <QrCodeBlock value={invitationUrl} locale={invitation.language} />
          </div>
          <div className="featured-share-row" aria-label={invitationT(invitation, "invitation.socialLinks")}>
            <SocialShareButtons invitationUrl={invitationUrl} />
          </div>
        </section>
      </div>
    </main>
  );
}

function CinematicRoseInvitationExperience({ invitation, musicUrl, photographer }: { invitation: Invitation; musicUrl?: string | null; photographer: PhotographerConfig }) {
  const invitationUrl = getInvitationUrl(invitation.code, invitation.customSlug);
  const showPhotographer = photographer.enabled;
  const images = getInvitationImages(invitation).gallery;
  const heroImage = images[0] || invitation.heroPhoto || galleryImages[0];
  const galleryImage1 = images[1] || galleryImages[1];
  const galleryImage2 = images[2] || galleryImages[2];

  return (
    <main className="cinema-rose-invite">
      <InviteMusic musicUrl={musicUrl} />
      <InvitePermissions invitationCode={invitation.code} />
      <WeddingLiveMode code={invitation.code} />

      <section className="cinema-rose-hero">
        <div className="cinema-rose-hero-media">
          <InviteHeroMedia image={heroImage} videoUrl={getInvitationHeroVideo(invitation)} alt="صورة الغلاف" strength="0.78" />
          <span aria-hidden="true" />
        </div>
        <div className="cinema-rose-hero-copy">
          <p>The Wedding Of</p>
          <h1>{invitation.groomName}</h1>
          <strong>&amp;</strong>
          <h1>{invitation.brideName}</h1>
        </div>
      </section>

      <section className="cinema-rose-float-card">
        <div className="cinema-rose-date-row">
          <div>
            <Calendar size={22} />
            <p>{formatInvitationDate(invitation)}</p>
          </div>
          <i />
          <div>
            <Clock size={22} />
            <strong>{invitation.weddingTime}</strong>
          </div>
        </div>
        <Countdown targetDate={invitation.weddingDate} targetTime={invitation.weddingTime} locale={invitation.language} />
      </section>

      <section className="cinema-rose-content">
        <div className="cinema-rose-message">
          <Heart size={34} />
          <h2>
            "<PrimaryInvitationMessage invitation={invitation} />"
          </h2>
        </div>

        <InviteGallery className="cinema-rose-gallery" images={[galleryImage1, galleryImage2]} locale={invitation.language} label={invitationT(invitation, "invitation.galleryLabel")} />

        <section className="cinema-rose-map-card">
          <div className="cinema-rose-map-copy">
            <span>
              <MapPin size={18} />
              Venue
            </span>
            <h2>{invitation.venue}</h2>
            <p>{invitation.city}</p>
          </div>
          <div className="cinema-rose-map-frame">
            <InviteMap venue={invitation.venue} city={invitation.city} mapUrl={invitation.mapUrl} locale={invitation.language} />
          </div>
        </section>

        {showPhotographer ? (
          <section className="cinema-rose-photographer">
            <div className="cinema-rose-photographer-main">
              <span>
                <Camera size={20} />
              </span>
              <div>
                <p>Captured By</p>
                <h3>{photographer.name}</h3>
              </div>
            </div>
            <div className="cinema-rose-socials">
              <a href={photographer.facebookUrl} aria-label="Facebook" target="_blank" rel="noreferrer">
                <Facebook size={20} />
              </a>
              <a href={photographer.instagramUrl} aria-label="Instagram" target="_blank" rel="noreferrer">
                <Instagram size={20} />
              </a>
            </div>
          </section>
        ) : null}

        <div className="cinema-rose-poll-wrap">
          <InvitationPoll invitation={invitation} />
          <InvitationGuestBook invitation={invitation} />
        </div>

        <section className="cinema-rose-qr-card">
          <h3>مشاركة الدعوة</h3>
          <div className="cinema-rose-qr-box">
            <QrCodeBlock value={invitationUrl} locale={invitation.language} />
          </div>
          <div className="cinema-rose-share-row" aria-label={invitationT(invitation, "invitation.socialLinks")}>
            <SocialShareButtons invitationUrl={invitationUrl} />
          </div>
        </section>
      </section>
    </main>
  );
}

function ModernCinematicInvitationExperience({ invitation, musicUrl, photographer }: { invitation: Invitation; musicUrl?: string | null; photographer: PhotographerConfig }) {
  const invitationUrl = getInvitationUrl(invitation.code, invitation.customSlug);
  const showPhotographer = photographer.enabled;
  const images = getInvitationImages(invitation).gallery;

  return (
    <main className="modern-cinema-invite">
      <InviteMusic musicUrl={musicUrl} />
      <InvitePermissions invitationCode={invitation.code} />
      <WeddingLiveMode code={invitation.code} />

      <section className="modern-cinema-hero">
        <InviteHeroMedia image={images[0] || invitation.heroPhoto || galleryImages[0]} videoUrl={getInvitationHeroVideo(invitation)} alt="صورة الغلاف" strength="0.74" />
        <span className="modern-cinema-hero-shade" aria-hidden="true" />
        <div className="modern-cinema-hero-copy">
          <p>
            <Heart size={13} />
            The Premiere
          </p>
          <h1>{invitation.groomName}</h1>
          <strong>&amp;</strong>
          <h1>{invitation.brideName}</h1>
        </div>
      </section>

      <section className="modern-cinema-content">
        <div className="modern-cinema-date-strip">
          <div>
            <Calendar size={18} />
            <span>Date</span>
            <strong>{formatInvitationDate(invitation)}</strong>
          </div>
          <i />
          <div>
            <Clock size={18} />
            <span>Time</span>
            <strong>{invitation.weddingTime}</strong>
          </div>
        </div>

        <div className="modern-cinema-countdown">
          <Countdown targetDate={invitation.weddingDate} targetTime={invitation.weddingTime} locale={invitation.language} />
        </div>

        <div className="modern-cinema-message">
          <h2>
            "<PrimaryInvitationMessage invitation={invitation} />
            <span> <SecondaryInvitationMessage invitation={invitation} /></span>"
          </h2>
        </div>

        <InviteGallery className="modern-cinema-gallery" images={images} locale={invitation.language} label={invitationT(invitation, "invitation.galleryLabel")} />

        <section className="modern-cinema-map-card">
          <div className="modern-cinema-map-copy">
            <span>
              <MapPin size={16} />
              Location
            </span>
            <h3>{invitation.venue}</h3>
            <p>{invitation.city}</p>
          </div>
          <div className="modern-cinema-map-frame">
            <InviteMap venue={invitation.venue} city={invitation.city} mapUrl={invitation.mapUrl} locale={invitation.language} />
          </div>
        </section>

        {showPhotographer ? (
          <section className="modern-cinema-photographer">
            <div>
              <span>
                <Camera size={20} />
              </span>
              <div>
                <p>Captured By</p>
                <h3>{photographer.name}</h3>
              </div>
            </div>
            <a href={photographer.instagramUrl} target="_blank" rel="noreferrer">
              Follow
            </a>
          </section>
        ) : null}

        <div className="modern-cinema-poll-wrap">
          <InvitationPoll invitation={invitation} />
          <InvitationGuestBook invitation={invitation} />
        </div>

        <section className="modern-cinema-qr-card">
          <div className="modern-cinema-qr-box">
            <QrCodeBlock value={invitationUrl} locale={invitation.language} />
          </div>
          <h4>احفظ التذكرة أو شاركها مع من تحب</h4>
          <div className="modern-cinema-share-row" aria-label={invitationT(invitation, "invitation.socialLinks")}>
            <SocialShareButtons invitationUrl={invitationUrl} />
          </div>
        </section>
      </section>
    </main>
  );
}

function EtherealGlassInvitationExperience({ invitation, musicUrl, photographer }: { invitation: Invitation; musicUrl?: string | null; photographer: PhotographerConfig }) {
  const invitationUrl = getInvitationUrl(invitation.code, invitation.customSlug);
  const showPhotographer = photographer.enabled;
  const images = getInvitationImages(invitation).gallery;

  return (
    <main className="ethereal-glass-invite">
      <div className="ethereal-glass-bg" aria-hidden="true">
        <InviteHeroMedia image={images[0] || invitation.heroPhoto || galleryImages[0]} videoUrl={getInvitationHeroVideo(invitation)} alt="" strength="0.58" />
        <span />
      </div>
      <InviteMusic musicUrl={musicUrl} />
      <InvitePermissions invitationCode={invitation.code} />
      <WeddingLiveMode code={invitation.code} />

      <div className="ethereal-glass-content">
        <section className="ethereal-glass-hero">
          <p>We Invite You To Celebrate</p>
          <h1>{invitation.groomName}</h1>
          <div aria-hidden="true">
            <span />
            <strong>&amp;</strong>
            <span />
          </div>
          <h1>{invitation.brideName}</h1>
        </section>

        <section className="ethereal-glass-card ethereal-glass-details">
          <div className="ethereal-glass-date-row">
            <div>
              <span>
                <Calendar size={14} />
                Date
              </span>
              <p>{formatInvitationDate(invitation)}</p>
            </div>
            <i />
            <div>
              <span>
                <Clock size={14} />
                Time
              </span>
              <p>{invitation.weddingTime}</p>
            </div>
          </div>
          <Countdown targetDate={invitation.weddingDate} targetTime={invitation.weddingTime} locale={invitation.language} />
        </section>

        <div className="ethereal-glass-poll-wrap">
          <InvitationPoll invitation={invitation} />
        </div>

        <InviteGallery className="ethereal-glass-gallery" images={[images[1] || galleryImages[1], images[2] || galleryImages[2]]} locale={invitation.language} label={invitationT(invitation, "invitation.galleryLabel")} />

        <div className="ethereal-glass-message">
          <Heart size={24} fill="currentColor" />
          <p>
            "<PrimaryInvitationMessage invitation={invitation} />
            <br />
            <SecondaryInvitationMessage invitation={invitation} />"
          </p>
        </div>

        <section className="ethereal-glass-card ethereal-glass-map-card">
          <div className="ethereal-glass-map-copy">
            <span>
              <MapPin size={14} />
              Location
            </span>
            <h3>{invitation.venue}</h3>
            <p>{invitation.city}</p>
          </div>
          <div className="ethereal-glass-map-frame">
            <InviteMap venue={invitation.venue} city={invitation.city} mapUrl={invitation.mapUrl} locale={invitation.language} />
          </div>
        </section>

        {showPhotographer ? (
          <section className="ethereal-glass-photographer">
            <span>
              <Camera size={18} />
            </span>
            <div>
              <p>Photography</p>
              <strong>{photographer.name}</strong>
            </div>
          </section>
        ) : null}

        <InvitationGuestBook invitation={invitation} />

        <section className="ethereal-glass-card ethereal-glass-qr-card">
          <h4>{invitationT(invitation, "invitation.shareCard")}</h4>
          <div className="ethereal-glass-qr-box">
            <QrCodeBlock value={invitationUrl} locale={invitation.language} />
          </div>
          <div className="ethereal-glass-share-row" aria-label={invitationT(invitation, "invitation.socialLinks")}>
            <SocialShareButtons invitationUrl={invitationUrl} />
          </div>
        </section>
      </div>
    </main>
  );
}

function BotanicalThemeInvitationExperience({ invitation, musicUrl, photographer }: { invitation: Invitation; musicUrl?: string | null; photographer: PhotographerConfig }) {
  const invitationUrl = getInvitationUrl(invitation.code, invitation.customSlug);
  const showPhotographer = photographer.enabled;
  const images = getInvitationImages(invitation).gallery;

  return (
    <main className="botanical-invite">
      <InviteMusic musicUrl={musicUrl} />
      <InvitePermissions invitationCode={invitation.code} />
      <WeddingLiveMode code={invitation.code} />

      <div className="botanical-shell">
        <section className="botanical-hero-card">
          <Sparkles className="botanical-sparkle" size={24} />
          <h1>{invitation.groomName}</h1>
          <span>&amp;</span>
          <h1>{invitation.brideName}</h1>
          <p>
            {formatInvitationDate(invitation)} - {invitation.weddingTime}
          </p>
        </section>

        <section className="botanical-countdown-card">
          <Countdown targetDate={invitation.weddingDate} targetTime={invitation.weddingTime} locale={invitation.language} />
        </section>

        <InviteGallery className="botanical-cover-photo" images={images} locale={invitation.language} label={invitationT(invitation, "invitation.galleryLabel")} altPrefix="غلاف الدعوة" />

        <section className="botanical-map-card">
          <div className="botanical-map-copy">
            <h2>
              <MapPin size={18} />
              {invitation.venue}
            </h2>
            <p>{invitation.city}</p>
          </div>
          <div className="botanical-map-frame">
            <InviteMap venue={invitation.venue} city={invitation.city} mapUrl={invitation.mapUrl} locale={invitation.language} />
          </div>
        </section>

        {showPhotographer ? (
          <section className="botanical-photographer">
            <span>
              <Camera size={18} />
            </span>
            <div>
              <h3>{photographer.name}</h3>
              <p>لقطات طبيعية وواقعية بدون مبالغة</p>
            </div>
          </section>
        ) : null}

        <div className="botanical-poll-wrap">
          <InvitationPoll invitation={invitation} />
          <InvitationGuestBook invitation={invitation} />
        </div>

        <section className="botanical-qr-card">
          <h3>{invitationT(invitation, "invitation.shareCard")}</h3>
          <div className="botanical-qr-box">
            <QrCodeBlock value={invitationUrl} locale={invitation.language} />
          </div>
          <div className="botanical-share-row" aria-label={invitationT(invitation, "invitation.socialLinks")}>
            <SocialShareButtons invitationUrl={invitationUrl} />
          </div>
        </section>
      </div>
    </main>
  );
}

function RoyalGoldInvitationExperience({ invitation, musicUrl, photographer }: { invitation: Invitation; musicUrl?: string | null; photographer: PhotographerConfig }) {
  const invitationUrl = getInvitationUrl(invitation.code, invitation.customSlug);
  const images = getInvitationImages(invitation).gallery;

  return (
    <main className="royal-gold-invite">
      <InviteMusic musicUrl={musicUrl} />
      <InvitePermissions invitationCode={invitation.code} />
      <WeddingLiveMode code={invitation.code} />

      <div className="royal-gold-shell">
        <section className="royal-gold-names">
          <h1>{invitation.groomName}</h1>
          <p>&amp;</p>
          <h1>{invitation.brideName}</h1>
        </section>

        <section className="royal-gold-date-strip">
          <p>{formatInvitationDate(invitation)}</p>
          <span aria-hidden="true" />
          <p>{invitation.weddingTime}</p>
        </section>

        <InviteGallery className="royal-gold-cover" images={images} locale={invitation.language} label={invitationT(invitation, "invitation.galleryLabel")} altPrefix="غلاف الدعوة" />

        <section className="royal-gold-countdown">
          <Countdown targetDate={invitation.weddingDate} targetTime={invitation.weddingTime} locale={invitation.language} />
        </section>

        <section className="royal-gold-map-card">
          <MapPin size={26} />
          <h2>{invitation.venue}</h2>
          <p>{invitation.city}</p>
          <div className="royal-gold-map-frame">
            <InviteMap venue={invitation.venue} city={invitation.city} mapUrl={invitation.mapUrl} locale={invitation.language} />
          </div>
        </section>

        <TemplatePhotographerCard photographer={photographer} className="royal-gold-photographer" invitation={invitation} />

        <div className="royal-gold-poll-wrap">
          <InvitationPoll invitation={invitation} />
          <InvitationGuestBook invitation={invitation} />
        </div>

        <section className="royal-gold-qr-card">
          <h3>{invitationT(invitation, "invitation.shareCard")}</h3>
          <div className="royal-gold-qr-box">
            <QrCodeBlock value={invitationUrl} locale={invitation.language} />
          </div>
          <div className="royal-gold-share-row" aria-label={invitationT(invitation, "invitation.socialLinks")}>
            <SocialShareButtons invitationUrl={invitationUrl} />
          </div>
        </section>
      </div>
    </main>
  );
}

function BohoSandInvitationExperience({ invitation, musicUrl, photographer }: { invitation: Invitation; musicUrl?: string | null; photographer: PhotographerConfig }) {
  const invitationUrl = getInvitationUrl(invitation.code, invitation.customSlug);
  const images = getInvitationImages(invitation).gallery;

  return (
    <main className="boho-sand-invite">
      <InviteMusic musicUrl={musicUrl} />
      <InvitePermissions invitationCode={invitation.code} />
      <WeddingLiveMode code={invitation.code} />

      <div className="boho-sand-shell">
        <InviteGallery className="boho-sand-cover" images={images} locale={invitation.language} label={invitationT(invitation, "invitation.galleryLabel")} altPrefix="غلاف الدعوة" />

        <section className="boho-sand-names">
          <h1>{invitation.groomName}</h1>
          <h1>{invitation.brideName}</h1>
          <div className="boho-sand-date-pill">
            <span>{formatInvitationDate(invitation)}</span>
            <i aria-hidden="true" />
            <span>{invitation.weddingTime}</span>
          </div>
        </section>

        <section className="boho-sand-countdown">
          <Countdown targetDate={invitation.weddingDate} targetTime={invitation.weddingTime} locale={invitation.language} />
        </section>

        <section className="boho-sand-map-card">
          <h2>{invitation.venue}</h2>
          <p>{invitation.city}</p>
          <div className="boho-sand-map-frame">
            <InviteMap venue={invitation.venue} city={invitation.city} mapUrl={invitation.mapUrl} locale={invitation.language} />
          </div>
        </section>

        <TemplatePhotographerCard photographer={photographer} className="boho-sand-photographer" invitation={invitation} />

        <div className="boho-sand-poll-wrap">
          <InvitationPoll invitation={invitation} />
          <InvitationGuestBook invitation={invitation} />
        </div>

        <section className="boho-sand-qr-card">
          <h3>{invitationT(invitation, "invitation.shareCard")}</h3>
          <div className="boho-sand-qr-box">
            <QrCodeBlock value={invitationUrl} locale={invitation.language} />
          </div>
          <div className="boho-sand-share-row" aria-label={invitationT(invitation, "invitation.socialLinks")}>
            <SocialShareButtons invitationUrl={invitationUrl} />
          </div>
        </section>
      </div>
    </main>
  );
}

function PureWhiteInvitationExperience({ invitation, musicUrl, photographer }: { invitation: Invitation; musicUrl?: string | null; photographer: PhotographerConfig }) {
  const invitationUrl = getInvitationUrl(invitation.code, invitation.customSlug);
  const images = getInvitationImages(invitation).gallery;

  return (
    <main className="pure-white-invite">
      <InviteMusic musicUrl={musicUrl} />
      <InvitePermissions invitationCode={invitation.code} />
      <WeddingLiveMode code={invitation.code} />

      <div className="pure-white-shell">
        <section className="pure-white-names">
          <p>Wedding Celebration</p>
          <h1>{invitation.groomName}</h1>
          <h1>{invitation.brideName}</h1>
        </section>

        <InviteGallery className="pure-white-cover" images={images} locale={invitation.language} label={invitationT(invitation, "invitation.galleryLabel")} altPrefix="غلاف الدعوة" />

        <section className="pure-white-date">
          <p>{formatInvitationDate(invitation)}</p>
          <span>{invitation.weddingTime}</span>
        </section>

        <section className="pure-white-countdown">
          <Countdown targetDate={invitation.weddingDate} targetTime={invitation.weddingTime} locale={invitation.language} />
        </section>

        <section className="pure-white-map-card">
          <h2>{invitation.venue}</h2>
          <p>{invitation.city}</p>
          <div className="pure-white-map-frame">
            <InviteMap venue={invitation.venue} city={invitation.city} mapUrl={invitation.mapUrl} locale={invitation.language} />
          </div>
        </section>

        <TemplatePhotographerCard photographer={photographer} className="pure-white-photographer" invitation={invitation} />

        <div className="pure-white-poll-wrap">
          <InvitationPoll invitation={invitation} />
          <InvitationGuestBook invitation={invitation} />
        </div>

        <section className="pure-white-qr-card">
          <h3>{invitationT(invitation, "invitation.shareCard")}</h3>
          <div className="pure-white-qr-box">
            <QrCodeBlock value={invitationUrl} locale={invitation.language} />
          </div>
          <div className="pure-white-share-row" aria-label={invitationT(invitation, "invitation.socialLinks")}>
            <SocialShareButtons invitationUrl={invitationUrl} />
          </div>
        </section>
      </div>
    </main>
  );
}

function NeonThemeInvitationExperience({ invitation, musicUrl, photographer }: { invitation: Invitation; musicUrl?: string | null; photographer: PhotographerConfig }) {
  const invitationUrl = getInvitationUrl(invitation.code, invitation.customSlug);
  const images = getInvitationImages(invitation).gallery;

  return (
    <main className="neon-invite">
      <InviteMusic musicUrl={musicUrl} />
      <InvitePermissions invitationCode={invitation.code} />
      <WeddingLiveMode code={invitation.code} />

      <div className="neon-shell">
        <section className="neon-name-card">
          <h1>{invitation.groomName}</h1>
          <h1>{invitation.brideName}</h1>
          <div className="neon-date-row">
            <span>{formatInvitationDate(invitation)}</span>
            <span>{invitation.weddingTime}</span>
          </div>
        </section>

        <InviteGallery className="neon-cover" images={images} locale={invitation.language} label={invitationT(invitation, "invitation.galleryLabel")} altPrefix="غلاف الدعوة" />

        <section className="neon-countdown">
          <Countdown targetDate={invitation.weddingDate} targetTime={invitation.weddingTime} locale={invitation.language} />
        </section>

        <section className="neon-map-card">
          <h2>{invitation.venue}</h2>
          <p>{invitation.city}</p>
          <div className="neon-map-frame">
            <InviteMap venue={invitation.venue} city={invitation.city} mapUrl={invitation.mapUrl} locale={invitation.language} />
          </div>
        </section>

        <TemplatePhotographerCard photographer={photographer} className="neon-photographer" invitation={invitation} />

        <div className="neon-poll-wrap">
          <InvitationPoll invitation={invitation} />
          <InvitationGuestBook invitation={invitation} />
        </div>

        <section className="neon-qr-card">
          <div className="neon-qr-box">
            <QrCodeBlock value={invitationUrl} locale={invitation.language} />
          </div>
          <div className="neon-share-row" aria-label={invitationT(invitation, "invitation.socialLinks")}>
            <SocialShareButtons invitationUrl={invitationUrl} />
          </div>
        </section>
      </div>
    </main>
  );
}

function VintageThemeInvitationExperience({ invitation, musicUrl, photographer }: { invitation: Invitation; musicUrl?: string | null; photographer: PhotographerConfig }) {
  const invitationUrl = getInvitationUrl(invitation.code, invitation.customSlug);
  const images = getInvitationImages(invitation).gallery;

  return (
    <main className="vintage-invite">
      <div className="vintage-paper-pattern" aria-hidden="true" />
      <InviteMusic musicUrl={musicUrl} />
      <InvitePermissions invitationCode={invitation.code} />
      <WeddingLiveMode code={invitation.code} />

      <div className="vintage-shell">
        <section className="vintage-title-card">
          <h1>
            {invitation.groomName} &amp; {invitation.brideName}
          </h1>
          <span aria-hidden="true" />
          <p>
            {formatInvitationDate(invitation)} • {invitation.weddingTime}
          </p>
        </section>

        <InviteGallery className="vintage-photo" images={images} locale={invitation.language} label={invitationT(invitation, "invitation.galleryLabel")} altPrefix="غلاف الدعوة" />

        <section className="vintage-countdown">
          <Countdown targetDate={invitation.weddingDate} targetTime={invitation.weddingTime} locale={invitation.language} />
        </section>

        <section className="vintage-map-card">
          <h2>{invitation.venue}</h2>
          <p>{invitation.city}</p>
          <div className="vintage-map-frame">
            <InviteMap venue={invitation.venue} city={invitation.city} mapUrl={invitation.mapUrl} locale={invitation.language} />
          </div>
        </section>

        <TemplatePhotographerCard photographer={photographer} className="vintage-photographer" invitation={invitation} />

        <div className="vintage-poll-wrap">
          <InvitationPoll invitation={invitation} />
          <InvitationGuestBook invitation={invitation} />
        </div>

        <section className="vintage-qr-card">
          <div className="vintage-qr-box">
            <QrCodeBlock value={invitationUrl} locale={invitation.language} />
          </div>
          <div className="vintage-share-row" aria-label={invitationT(invitation, "invitation.socialLinks")}>
            <SocialShareButtons invitationUrl={invitationUrl} />
          </div>
        </section>
      </div>
    </main>
  );
}

function FairytaleThemeInvitationExperience({ invitation, musicUrl, photographer }: { invitation: Invitation; musicUrl?: string | null; photographer: PhotographerConfig }) {
  const invitationUrl = getInvitationUrl(invitation.code, invitation.customSlug);
  const images = getInvitationImages(invitation).gallery;

  return (
    <main className="fairytale-invite">
      <InviteMusic musicUrl={musicUrl} />
      <InvitePermissions invitationCode={invitation.code} />
      <WeddingLiveMode code={invitation.code} />

      <div className="fairytale-shell">
        <section className="fairytale-hero-card">
          <Heart className="fairytale-heart" fill="currentColor" />
          <h1>{invitation.groomName}</h1>
          <h1>{invitation.brideName}</h1>
        </section>

        <InviteGallery className="fairytale-photo" images={images} locale={invitation.language} label={invitationT(invitation, "invitation.galleryLabel")} altPrefix="غلاف الدعوة" />

        <section className="fairytale-date-card">
          <p>{formatInvitationDate(invitation)}</p>
          <span>{invitation.weddingTime}</span>
        </section>

        <section className="fairytale-countdown">
          <Countdown targetDate={invitation.weddingDate} targetTime={invitation.weddingTime} locale={invitation.language} />
        </section>

        <section className="fairytale-map-card">
          <h2>{invitation.venue}</h2>
          <p>{invitation.city}</p>
          <div className="fairytale-map-frame">
            <InviteMap venue={invitation.venue} city={invitation.city} mapUrl={invitation.mapUrl} locale={invitation.language} />
          </div>
        </section>

        <TemplatePhotographerCard photographer={photographer} className="fairytale-photographer" invitation={invitation} />

        <div className="fairytale-poll-wrap">
          <InvitationPoll invitation={invitation} />
          <InvitationGuestBook invitation={invitation} />
        </div>

        <section className="fairytale-qr-card">
          <div className="fairytale-qr-box">
            <QrCodeBlock value={invitationUrl} locale={invitation.language} />
          </div>
          <div className="fairytale-share-row" aria-label={invitationT(invitation, "invitation.socialLinks")}>
            <SocialShareButtons invitationUrl={invitationUrl} />
          </div>
        </section>
      </div>
    </main>
  );
}

function OceanThemeInvitationExperience({ invitation, musicUrl, photographer }: { invitation: Invitation; musicUrl?: string | null; photographer: PhotographerConfig }) {
  const invitationUrl = getInvitationUrl(invitation.code, invitation.customSlug);
  const images = getInvitationImages(invitation).gallery;

  return (
    <main className="ocean-invite">
      <InviteMusic musicUrl={musicUrl} />
      <InvitePermissions invitationCode={invitation.code} />
      <WeddingLiveMode code={invitation.code} />

      <section className="ocean-hero">
        <h1>{invitation.groomName}</h1>
        <h1>{invitation.brideName}</h1>
      </section>

      <div className="ocean-shell">
        <InviteGallery className="ocean-photo" images={images} locale={invitation.language} label={invitationT(invitation, "invitation.galleryLabel")} altPrefix="غلاف الدعوة" />

        <section className="ocean-date-grid">
          <div>
            <p>Date</p>
            <strong>{formatInvitationDate(invitation)}</strong>
          </div>
          <div>
            <p>Time</p>
            <strong>{invitation.weddingTime}</strong>
          </div>
        </section>

        <section className="ocean-countdown">
          <Countdown targetDate={invitation.weddingDate} targetTime={invitation.weddingTime} locale={invitation.language} />
        </section>

        <section className="ocean-map-card">
          <h2>{invitation.venue}</h2>
          <p>{invitation.city}</p>
          <div className="ocean-map-frame">
            <InviteMap venue={invitation.venue} city={invitation.city} mapUrl={invitation.mapUrl} locale={invitation.language} />
          </div>
        </section>

        <TemplatePhotographerCard photographer={photographer} className="ocean-photographer" invitation={invitation} />

        <div className="ocean-poll-wrap">
          <InvitationPoll invitation={invitation} />
          <InvitationGuestBook invitation={invitation} />
        </div>

        <section className="ocean-qr-card">
          <div className="ocean-qr-box">
            <QrCodeBlock value={invitationUrl} locale={invitation.language} />
          </div>
          <div className="ocean-share-row" aria-label={invitationT(invitation, "invitation.socialLinks")}>
            <SocialShareButtons invitationUrl={invitationUrl} />
          </div>
        </section>
      </div>
    </main>
  );
}

function ArtDecoThemeInvitationExperience({ invitation, musicUrl, photographer }: { invitation: Invitation; musicUrl?: string | null; photographer: PhotographerConfig }) {
  const invitationUrl = getInvitationUrl(invitation.code, invitation.customSlug);
  const images = getInvitationImages(invitation).gallery;

  return (
    <main className="artdeco-invite">
      <InviteMusic musicUrl={musicUrl} />
      <InvitePermissions invitationCode={invitation.code} />
      <WeddingLiveMode code={invitation.code} />

      <div className="artdeco-shell">
        <section className="artdeco-name-frame">
          <div>
            <h1>{invitation.groomName}</h1>
            <span aria-hidden="true" />
            <h1>{invitation.brideName}</h1>
          </div>
        </section>

        <InviteGallery className="artdeco-photo" images={images} locale={invitation.language} label={invitationT(invitation, "invitation.galleryLabel")} altPrefix="غلاف الدعوة" />

        <section className="artdeco-date-card">
          <p>{formatInvitationDate(invitation)}</p>
          <span>{invitation.weddingTime}</span>
        </section>

        <section className="artdeco-countdown">
          <Countdown targetDate={invitation.weddingDate} targetTime={invitation.weddingTime} locale={invitation.language} />
        </section>

        <section className="artdeco-map-card">
          <h2>{invitation.venue}</h2>
          <p>{invitation.city}</p>
          <div className="artdeco-map-frame">
            <InviteMap venue={invitation.venue} city={invitation.city} mapUrl={invitation.mapUrl} locale={invitation.language} />
          </div>
        </section>

        <TemplatePhotographerCard photographer={photographer} className="artdeco-photographer" invitation={invitation} />

        <div className="artdeco-poll-wrap">
          <InvitationPoll invitation={invitation} />
          <InvitationGuestBook invitation={invitation} />
        </div>

        <section className="artdeco-qr-card">
          <div className="artdeco-qr-box">
            <QrCodeBlock value={invitationUrl} locale={invitation.language} />
          </div>
          <div className="artdeco-share-row" aria-label={invitationT(invitation, "invitation.socialLinks")}>
            <SocialShareButtons invitationUrl={invitationUrl} />
          </div>
        </section>
      </div>
    </main>
  );
}

function MagazineThemeInvitationExperience({ invitation, musicUrl, photographer }: { invitation: Invitation; musicUrl?: string | null; photographer: PhotographerConfig }) {
  const invitationUrl = getInvitationUrl(invitation.code, invitation.customSlug);
  const images = getInvitationImages(invitation).gallery;

  return (
    <main className="magazine-invite">
      <InviteMusic musicUrl={musicUrl} />
      <InvitePermissions invitationCode={invitation.code} />
      <WeddingLiveMode code={invitation.code} />

      <div className="magazine-shell">
        <section className="magazine-cover">
          <h1 className="magazine-name magazine-name-top">{invitation.groomName}</h1>
          <InviteGallery className="magazine-photo" images={images} locale={invitation.language} label={invitationT(invitation, "invitation.galleryLabel")} altPrefix="غلاف الدعوة" />
          <h1 className="magazine-name magazine-name-bottom">{invitation.brideName}</h1>
        </section>

        <div className="magazine-content">
          <section className="magazine-date-row">
            <span>{formatInvitationDate(invitation)}</span>
            <span>{invitation.weddingTime}</span>
          </section>

          <section className="magazine-countdown">
            <Countdown targetDate={invitation.weddingDate} targetTime={invitation.weddingTime} locale={invitation.language} />
          </section>

          <section className="magazine-map-card">
            <h2>{invitation.venue}</h2>
            <p>{invitation.city}</p>
            <div className="magazine-map-frame">
              <InviteMap venue={invitation.venue} city={invitation.city} mapUrl={invitation.mapUrl} locale={invitation.language} />
            </div>
          </section>

          <TemplatePhotographerCard photographer={photographer} className="magazine-photographer" invitation={invitation} />

          <div className="magazine-poll-wrap">
            <InvitationPoll invitation={invitation} />
            <InvitationGuestBook invitation={invitation} />
          </div>

          <section className="magazine-qr-card">
            <QrCodeBlock value={invitationUrl} locale={invitation.language} />
            <p>Scan for access</p>
            <div className="magazine-share-row" aria-label={invitationT(invitation, "invitation.socialLinks")}>
              <SocialShareButtons invitationUrl={invitationUrl} />
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}

function CinematicStoryInvitationExperience({ invitation, musicUrl, photographer }: { invitation: Invitation; musicUrl?: string | null; photographer: PhotographerConfig }) {
  const invitationUrl = getInvitationUrl(invitation.code, invitation.customSlug);
  const showPhotographer = photographer.enabled;
  const images = getInvitationImages(invitation).gallery;

  return (
    <main className="cinematic-invite">
      <InviteMusic musicUrl={musicUrl} />
      <InvitePermissions invitationCode={invitation.code} />
      <WeddingLiveMode code={invitation.code} />

      <section className="cinematic-hero">
        <div className="cinematic-hero-media">
          <InviteHeroMedia image={images[0] || invitation.heroPhoto || galleryImages[0]} videoUrl={getInvitationHeroVideo(invitation)} alt="صورة العرسان" strength="0.84" />
          <div className="cinematic-hero-gradient" />
        </div>

        <div className="cinematic-hero-copy">
          <p>هنا تبدأ الحكاية ❤️</p>
          <h1>{invitation.groomName}</h1>
          <div className="cinematic-heart-line">
            <span />
            <Heart size={20} className="cinematic-heart" />
            <span />
          </div>
          <h1>{invitation.brideName}</h1>
        </div>
      </section>

      <div className="cinematic-content">
        <section className="cinematic-date-card">
          <div className="cinematic-date-row">
            <div>
              <Calendar size={24} />
              <p>{formatInvitationDate(invitation)}</p>
            </div>
            <div>
              <Clock size={24} />
              <p>{invitation.weddingTime}</p>
            </div>
          </div>

          <div className="cinematic-countdown">
            <p>العد التنازلي ليوم الحفل</p>
            <Countdown targetDate={invitation.weddingDate} targetTime={invitation.weddingTime} locale={invitation.language} />
          </div>
        </section>

        {images.length > 1 ? <InviteGallery className="cinematic-gallery-stack" images={images.slice(1)} locale={invitation.language} label={invitationT(invitation, "invitation.galleryLabel")} /> : null}

        <section className="cinematic-map-card">
          <div className="cinematic-map-copy">
            <div>
              <MapPin size={24} />
            </div>
            <h2>{invitation.venue}</h2>
            <p>{invitation.city}</p>
          </div>
          <div className="cinematic-map-frame">
            <InviteMap venue={invitation.venue} city={invitation.city} mapUrl={invitation.mapUrl} locale={invitation.language} />
            <span aria-hidden="true" />
          </div>
        </section>

        {showPhotographer ? (
          <section className="cinematic-photographer">
            <Camera size={120} className="cinematic-photographer-watermark" />
            <div className="cinematic-photographer-logo">
              <PhotographerLogoMark photographer={photographer} />
            </div>
            <div>
              <span>Official Photographer</span>
              <h2>{photographer.name}</h2>
            </div>
          </section>
        ) : null}

        <div className="cinematic-poll-wrap">
          <InvitationPoll invitation={invitation} />
          <InvitationGuestBook invitation={invitation} />
        </div>

        <section className="cinematic-qr-section">
          <div className="cinematic-separator" />
          <h3>{invitationT(invitation, "invitation.shareCard")}</h3>

          <div className="cinematic-qr-box">
            <div>
              <QrCodeBlock value={invitationUrl} locale={invitation.language} />
            </div>
          </div>

          <p>{invitationT(invitation, "invitation.shareInvitation")}</p>
          <div className="cinematic-share-row">
            <SocialShareButtons invitationUrl={invitationUrl} />
          </div>
        </section>
      </div>
    </main>
  );
}
