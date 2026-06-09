"use client";

import { Calendar, CalendarHeart, Camera, ChevronDown, Clock, Facebook, Flower2, Heart, Instagram, Leaf, MapPin, Music2, Share2, Sparkles } from "lucide-react";
import { Countdown } from "./Countdown";
import { InviteOpening } from "./InviteOpening";
import { InviteMap } from "./InviteMap";
import { InviteMusic } from "./InviteMusic";
import { InvitePoll } from "./InvitePoll";
import { InvitePermissions } from "./InvitePermissions";
import { InviteCheckIn } from "./InviteCheckIn";
import { AddToCalendar } from "./AddToCalendar";
import { CoupleStoryTimeline } from "./CoupleStoryTimeline";
import { GuestBook } from "./GuestBook";
import { WeddingLiveMode } from "./WeddingLiveMode";
import { QrCodeBlock } from "./QrCodeBlock";
import { getInvitationTranslator, getLocaleMeta } from "@/lib/i18n";
import { isBrowserDisplayImageUrl } from "@/lib/image-formats";
import { normalizeInvitationTexts } from "@/lib/invitation-texts";
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
      code={invitation.code}
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

function getSocialShareLinks(invitationUrl: string) {
  const facebookUrl = withVisitSource(invitationUrl, "Facebook");
  const whatsAppUrl = withVisitSource(invitationUrl, "WhatsApp");
  return [
    { label: "Facebook", href: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(facebookUrl)}` },
    { label: "Instagram", href: "https://www.instagram.com/" },
    { label: "TikTok", href: "https://www.tiktok.com/" },
    { label: "WhatsApp", href: `https://wa.me/?text=${encodeURIComponent(whatsAppUrl)}` },
  ];
}

type PhotographerConfig = {
  enabled: boolean;
  name: string;
  logoUrl?: string;
  instagramUrl: string;
  facebookUrl: string;
};

type InvitationExperienceSettings = {
  showPhotographerCard?: boolean;
  showTemplatePhotographer?: boolean;
  photographerName?: string;
  photographerInstagramUrl?: string;
  photographerFacebookUrl?: string;
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

  if (template.customHtml) {
    return <CustomHtmlInvitationExperience invitation={invitation} template={template} musicUrl={templateMusicUrl} />;
  }

  if (template.slug === "luxe-noir") {
    return <LuxeNoirInvitationExperience invitation={invitation} musicUrl={templateMusicUrl} photographer={photographer} />;
  }
  if (template.slug === "ivory-arches") {
    return <IvoryArchesInvitationExperience invitation={invitation} musicUrl={templateMusicUrl} photographer={photographer} />;
  }
  if (template.slug === "mobile-gold" || template.slug === "soft-gold") {
    return <MobileGoldInvitationExperience invitation={invitation} musicUrl={templateMusicUrl} photographer={photographer} />;
  }
  if (template.slug === "boho-chic") {
    return <BohoChicInvitationExperience invitation={invitation} musicUrl={templateMusicUrl} photographer={photographer} />;
  }
  if (template.slug === "garden-elegance") {
    return <GardenEleganceInvitationExperience invitation={invitation} musicUrl={templateMusicUrl} photographer={photographer} />;
  }
  if (template.slug === "featured-1") {
    return <FeaturedOneInvitationExperience invitation={invitation} musicUrl={templateMusicUrl} photographer={photographer} />;
  }
  if (template.slug === "cinematic-rose") {
    return <CinematicRoseInvitationExperience invitation={invitation} musicUrl={templateMusicUrl} photographer={photographer} />;
  }
  if (template.slug === "modern-cinematic") {
    return <ModernCinematicInvitationExperience invitation={invitation} musicUrl={templateMusicUrl} photographer={photographer} />;
  }
  if (template.slug === "ethereal-glass") {
    return <EtherealGlassInvitationExperience invitation={invitation} musicUrl={templateMusicUrl} photographer={photographer} />;
  }
  if (template.slug === "botanical-theme") {
    return <BotanicalThemeInvitationExperience invitation={invitation} musicUrl={templateMusicUrl} photographer={photographer} />;
  }
  if (template.slug === "royal-gold") {
    return <RoyalGoldInvitationExperience invitation={invitation} musicUrl={templateMusicUrl} photographer={photographer} />;
  }
  if (template.slug === "boho-sand") {
    return <BohoSandInvitationExperience invitation={invitation} musicUrl={templateMusicUrl} photographer={photographer} />;
  }
  if (template.slug === "pure-white") {
    return <PureWhiteInvitationExperience invitation={invitation} musicUrl={templateMusicUrl} photographer={photographer} />;
  }
  if (template.slug === "neon-theme") {
    return <NeonThemeInvitationExperience invitation={invitation} musicUrl={templateMusicUrl} photographer={photographer} />;
  }
  if (template.slug === "vintage-theme") {
    return <VintageThemeInvitationExperience invitation={invitation} musicUrl={templateMusicUrl} photographer={photographer} />;
  }
  if (template.slug === "fairytale-theme") {
    return <FairytaleThemeInvitationExperience invitation={invitation} musicUrl={templateMusicUrl} photographer={photographer} />;
  }
  if (template.slug === "ocean-theme") {
    return <OceanThemeInvitationExperience invitation={invitation} musicUrl={templateMusicUrl} photographer={photographer} />;
  }
  if (template.slug === "art-deco-theme") {
    return <ArtDecoThemeInvitationExperience invitation={invitation} musicUrl={templateMusicUrl} photographer={photographer} />;
  }
  if (template.slug === "magazine-theme") {
    return <MagazineThemeInvitationExperience invitation={invitation} musicUrl={templateMusicUrl} photographer={photographer} />;
  }
  if (template.slug === "cinematic-story") {
    return <CinematicStoryInvitationExperience invitation={invitation} musicUrl={templateMusicUrl} photographer={photographer} />;
  }

  const invitationUrl = getInvitationUrl(invitation.code, invitation.customSlug);
  const showPhotographer = photographer.enabled;

  return (
    <main
      className="creative-invite"
      style={
        {
          "--tpl-primary": template.palette.primary,
          "--tpl-secondary": template.palette.secondary,
          "--tpl-accent": template.palette.accent,
          "--tpl-ink": template.palette.ink,
          "--tpl-surface": template.palette.surface,
        } as React.CSSProperties
      }
    >
      <InviteMusic musicUrl={templateMusicUrl} />
      <InvitePermissions invitationCode={invitation.code} />
      <WeddingLiveMode code={invitation.code} />
      <InviteOpening groomName={invitation.groomName} brideName={invitation.brideName} locale={invitation.language} />

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
          <Countdown targetDate={invitation.weddingDate} locale={invitation.language} />
        </div>

        <div className="luxury-gallery" aria-label={invitationT(invitation, "invitation.galleryLabel")}>
          {getInvitationImages(invitation).gallery.map((image, index) => (
            <img src={image} alt={`صورة من الدعوة ${index + 1}`} key={`${image}-${index}`} />
          ))}
        </div>

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
            {["Facebook", "Instagram", "TikTok", "WhatsApp"].map((item) => (
              <a href="#" key={item} aria-label={item}>
                <Share2 size={17} />
              </a>
            ))}
          </div>
        </section>
      </section>
    </main>
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
    inviteMessage: texts.inviteMessage,
    inviteMessageSecondary: texts.inviteMessageSecondary,
    rsvpQuestion: texts.rsvpQuestion,
    rsvpDeclinedMessage: texts.rsvpDeclinedMessage,
    rsvpConfirmedSuccessMessage: texts.rsvpConfirmedSuccessMessage,
    rsvpDeclinedSuccessMessage: texts.rsvpDeclinedSuccessMessage,
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

  const bridge = `<script>window.BADR_INVITE=${JSON.stringify({ ...data, story: texts.story, gallery: images }).replace(/</g, "\\u003c")};</script>`;
  return output.includes("</body>") ? output.replace("</body>", `${bridge}</body>`) : `${output}${bridge}`;
}

function CustomHtmlInvitationExperience({ invitation, template, musicUrl }: { invitation: Invitation; template: TemplateDefinition; musicUrl?: string | null }) {
  const srcDoc = injectCustomTemplateData(template.customHtml || "", invitation, musicUrl);

  return (
    <main className="custom-code-invite">
      <InviteMusic musicUrl={musicUrl} />
      <InvitePermissions invitationCode={invitation.code} />
      <WeddingLiveMode code={invitation.code} />
      <iframe
        className="custom-code-frame"
        srcDoc={srcDoc}
        title={`قالب ${template.arabicName}`}
        sandbox="allow-scripts allow-forms allow-popups allow-popups-to-escape-sandbox"
        allow="autoplay; geolocation; notifications"
      />
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
      <InviteOpening groomName={invitation.groomName} brideName={invitation.brideName} locale={invitation.language} />

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
            <Countdown targetDate={invitation.weddingDate} locale={invitation.language} />
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

        <div className="noir-gallery" aria-label={invitationT(invitation, "invitation.galleryLabel")}>
          {images.map((image, index) => (
            <figure key={`${image}-${index}`}>
              <img src={image} alt={`صورة من الدعوة ${index + 1}`} />
            </figure>
          ))}
        </div>

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
            {["Facebook", "Instagram", "TikTok", "WhatsApp"].map((item) => (
              <a href="#" key={item} aria-label={item}>
                <Share2 size={18} />
              </a>
            ))}
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
      <InviteOpening groomName={invitation.groomName} brideName={invitation.brideName} locale={invitation.language} />

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
            <Countdown targetDate={invitation.weddingDate} locale={invitation.language} />
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

        <section className="ivory-gallery" aria-label={invitationT(invitation, "invitation.galleryLabel")}>
          <figure className="arch-card">
            <img src={images[0] || galleryImages[0]} alt="صورة العريس والعروسة 1" />
          </figure>
          <figure className="feature-photo-card">
            <img src={images[1] || galleryImages[1]} alt="صورة العريس والعروسة 2" />
            <span aria-hidden="true" />
          </figure>
          <figure className="arch-card">
            <img src={images[2] || galleryImages[2]} alt="صورة العريس والعروسة 3" />
          </figure>
        </section>

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
            {["Facebook", "Instagram", "TikTok", "WhatsApp"].map((item) => (
              <a href="#" key={item} aria-label={item}>
                <Share2 size={20} strokeWidth={1.5} />
              </a>
            ))}
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
  const socialLinks = getSocialShareLinks(invitationUrl);

  return (
    <main className="mobile-gold-invite">
      <InviteMusic musicUrl={musicUrl} />
      <InvitePermissions invitationCode={invitation.code} />
      <WeddingLiveMode code={invitation.code} />
      <InviteOpening groomName={invitation.groomName} brideName={invitation.brideName} locale={invitation.language} />

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
            <Countdown targetDate={invitation.weddingDate} locale={invitation.language} />
          </div>
        </div>

        <div className="mobile-gold-gallery" aria-label={invitationT(invitation, "invitation.galleryLabel")}>
          <div className="mobile-gold-photo-main">
            <img src={images[0] || galleryImages[0]} alt="صورة 1" />
          </div>
          <div>
            <img src={images[1] || galleryImages[1]} alt="صورة 2" />
          </div>
          <div>
            <img src={images[2] || galleryImages[2]} alt="صورة 3" />
          </div>
        </div>

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
            {socialLinks.map((item) => (
              <a href={item.href} key={item.label} aria-label={item.label} target="_blank" rel="noreferrer">
                <Share2 size={20} />
              </a>
            ))}
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
  const socialLinks = getSocialShareLinks(invitationUrl);

  return (
    <main className="boho-invite">
      <InviteMusic musicUrl={musicUrl} />
      <InvitePermissions invitationCode={invitation.code} />
      <WeddingLiveMode code={invitation.code} />

      <section className="boho-hero">
        <img src={heroImage} alt="صورة العروسين" />
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
            <Countdown targetDate={invitation.weddingDate} locale={invitation.language} />
          </div>
        </section>

        <section className="boho-gallery-wrap" aria-label={invitationT(invitation, "invitation.galleryLabel")}>
          <div className="boho-gallery-scroll">
            {images.map((image, index) => (
              <div key={`${image}-${index}`}>
                <img src={image} alt={`Gallery ${index + 1}`} />
              </div>
            ))}
          </div>
        </section>

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
            {socialLinks.map((item) => (
              <a href={item.href} key={item.label} aria-label={item.label} target="_blank" rel="noreferrer">
                <Share2 size={20} />
              </a>
            ))}
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
  const socialLinks = getSocialShareLinks(invitationUrl);

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
            <img src={images[0] || invitation.heroPhoto || galleryImages[0]} alt={`${invitation.groomName} و ${invitation.brideName}`} />
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
                <p>اليوم والتاريخ</p>
                <strong>{formatInvitationDate(invitation)}</strong>
              </div>
            </div>

            <div className="garden-detail-row">
              <span className="garden-detail-icon">
                <Clock size={14} />
              </span>
              <div>
                <p>موعد الحضور</p>
                <strong>{invitation.weddingTime}</strong>
              </div>
            </div>

            <div className="garden-detail-row">
              <span className="garden-detail-icon">
                <MapPin size={14} />
              </span>
              <div>
                <p>القاعة والموقع</p>
                <strong>{invitation.venue}</strong>
                <small>{invitation.city}</small>
              </div>
            </div>
          </div>
        </section>

        <section className="garden-countdown-card">
          <p>The Countdown</p>
          <Countdown targetDate={invitation.weddingDate} locale={invitation.language} />
        </section>

        <section className="garden-map-frame">
          <InviteMap venue={invitation.venue} city={invitation.city} mapUrl={invitation.mapUrl} locale={invitation.language} />
        </section>

        {images.length > 1 ? (
          <section className="garden-gallery-grid" aria-label={invitationT(invitation, "invitation.galleryLabel")}>
            <figure>
              <img src={images[1] || galleryImages[1]} alt="صورة من الدعوة 2" />
            </figure>
            <figure>
              <img src={images[2] || galleryImages[2]} alt="صورة من الدعوة 3" />
            </figure>
          </section>
        ) : null}

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
            {socialLinks.map((item) => (
              <a href={item.href} key={item.label} aria-label={item.label} target="_blank" rel="noreferrer">
                <Share2 size={18} />
              </a>
            ))}
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
  const socialLinks = getSocialShareLinks(invitationUrl);

  return (
    <main className="featured-invite">
      <InviteMusic musicUrl={musicUrl} />
      <InvitePermissions invitationCode={invitation.code} />
      <WeddingLiveMode code={invitation.code} />

      <section className="featured-hero">
        <div className="featured-hero-media">
          <img src={images[0] || invitation.heroPhoto || galleryImages[0]} alt="صورة العرسان" />
          <div className="featured-hero-gradient" />
        </div>

        <div className="featured-hero-copy">
          <p>Forever Begins Here</p>
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
                <p>اليوم والتاريخ</p>
                <strong>{formatInvitationDate(invitation)}</strong>
              </div>
            </div>

            <div className="featured-detail-row">
              <span className="featured-detail-icon">
                <Clock size={14} />
              </span>
              <div>
                <p>موعد الحضور</p>
                <strong>{invitation.weddingTime}</strong>
              </div>
            </div>

            <div className="featured-detail-row">
              <span className="featured-detail-icon">
                <MapPin size={14} />
              </span>
              <div>
                <p>القاعة والموقع</p>
                <strong>{invitation.venue}</strong>
                <small>{invitation.city}</small>
              </div>
            </div>
          </div>
        </section>

        <section className="featured-countdown-card">
          <p>The Countdown</p>
          <Countdown targetDate={invitation.weddingDate} locale={invitation.language} />
        </section>

        <section className="featured-gallery" aria-label={invitationT(invitation, "invitation.galleryLabel")}>
          <figure className="featured-arch-card">
            <img src={images[0] || galleryImages[0]} alt="صورة العريس والعروسة 1" />
          </figure>
          <figure className="featured-photo-card">
            <img src={images[1] || galleryImages[1]} alt="صورة العريس والعروسة 2" />
            <span aria-hidden="true" />
          </figure>
          <figure className="featured-arch-card">
            <img src={images[2] || galleryImages[2]} alt="صورة العريس والعروسة 3" />
          </figure>
        </section>

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
            {socialLinks.map((item) => (
              <a href={item.href} key={item.label} aria-label={item.label} target="_blank" rel="noreferrer">
                <Share2 size={18} />
              </a>
            ))}
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
  const socialLinks = getSocialShareLinks(invitationUrl);
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
          <img src={heroImage} alt="صورة الغلاف" />
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
        <Countdown targetDate={invitation.weddingDate} locale={invitation.language} />
      </section>

      <section className="cinema-rose-content">
        <div className="cinema-rose-message">
          <Heart size={34} />
          <h2>
            "<PrimaryInvitationMessage invitation={invitation} />"
          </h2>
        </div>

        <section className="cinema-rose-gallery" aria-label={invitationT(invitation, "invitation.galleryLabel")}>
          <figure>
            <img src={galleryImage1} alt="صورة من الدعوة 2" />
          </figure>
          <figure>
            <img src={galleryImage2} alt="صورة من الدعوة 3" />
          </figure>
        </section>

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
            {socialLinks.map((item) => (
              <a href={item.href} key={item.label} aria-label={item.label} target="_blank" rel="noreferrer">
                <Share2 size={20} />
              </a>
            ))}
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
  const socialLinks = getSocialShareLinks(invitationUrl);

  return (
    <main className="modern-cinema-invite">
      <InviteMusic musicUrl={musicUrl} />
      <InvitePermissions invitationCode={invitation.code} />
      <WeddingLiveMode code={invitation.code} />

      <section className="modern-cinema-hero">
        <img src={images[0] || invitation.heroPhoto || galleryImages[0]} alt="صورة الغلاف" />
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
          <Countdown targetDate={invitation.weddingDate} locale={invitation.language} />
        </div>

        <div className="modern-cinema-message">
          <h2>
            "<PrimaryInvitationMessage invitation={invitation} />
            <span> <SecondaryInvitationMessage invitation={invitation} /></span>"
          </h2>
        </div>

        <section className="modern-cinema-gallery" aria-label={invitationT(invitation, "invitation.galleryLabel")}>
          {images.map((image, index) => (
            <figure key={`${image}-${index}`}>
              <img src={image} alt={`صورة من الدعوة ${index + 1}`} />
            </figure>
          ))}
        </section>

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
            {socialLinks.map((item) => (
              <a href={item.href} key={item.label} aria-label={item.label} target="_blank" rel="noreferrer">
                <Share2 size={18} />
              </a>
            ))}
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
  const socialLinks = getSocialShareLinks(invitationUrl);

  return (
    <main className="ethereal-glass-invite">
      <div className="ethereal-glass-bg" aria-hidden="true">
        <img src={images[0] || invitation.heroPhoto || galleryImages[0]} alt="" />
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
          <Countdown targetDate={invitation.weddingDate} locale={invitation.language} />
        </section>

        <section className="ethereal-glass-gallery" aria-label={invitationT(invitation, "invitation.galleryLabel")}>
          <figure>
            <img src={images[1] || galleryImages[1]} alt="صورة من الدعوة 2" />
          </figure>
          <figure>
            <img src={images[2] || galleryImages[2]} alt="صورة من الدعوة 3" />
          </figure>
        </section>

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

        <div className="ethereal-glass-poll-wrap">
          <InvitationPoll invitation={invitation} />
          <InvitationGuestBook invitation={invitation} />
        </div>

        <section className="ethereal-glass-card ethereal-glass-qr-card">
          <h4>{invitationT(invitation, "invitation.shareCard")}</h4>
          <div className="ethereal-glass-qr-box">
            <QrCodeBlock value={invitationUrl} locale={invitation.language} />
          </div>
          <div className="ethereal-glass-share-row" aria-label={invitationT(invitation, "invitation.socialLinks")}>
            {socialLinks.map((item) => (
              <a href={item.href} key={item.label} aria-label={item.label} target="_blank" rel="noreferrer">
                <Share2 size={18} />
              </a>
            ))}
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
  const socialLinks = getSocialShareLinks(invitationUrl);

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
          <Countdown targetDate={invitation.weddingDate} locale={invitation.language} />
        </section>

        <figure className="botanical-cover-photo">
          <img src={images[0] || invitation.heroPhoto || galleryImages[0]} alt="غلاف الدعوة" />
        </figure>

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
            {socialLinks.map((item) => (
              <a href={item.href} key={item.label} aria-label={item.label} target="_blank" rel="noreferrer">
                <Share2 size={18} />
              </a>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}

function RoyalGoldInvitationExperience({ invitation, musicUrl, photographer }: { invitation: Invitation; musicUrl?: string | null; photographer: PhotographerConfig }) {
  const invitationUrl = getInvitationUrl(invitation.code, invitation.customSlug);
  const images = getInvitationImages(invitation).gallery;
  const socialLinks = getSocialShareLinks(invitationUrl);

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

        <figure className="royal-gold-cover">
          <img src={images[0] || invitation.heroPhoto || galleryImages[0]} alt="غلاف الدعوة" />
        </figure>

        <section className="royal-gold-countdown">
          <Countdown targetDate={invitation.weddingDate} locale={invitation.language} />
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
            {socialLinks.map((item) => (
              <a href={item.href} key={item.label} aria-label={item.label} target="_blank" rel="noreferrer">
                <Share2 size={18} />
              </a>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}

function BohoSandInvitationExperience({ invitation, musicUrl, photographer }: { invitation: Invitation; musicUrl?: string | null; photographer: PhotographerConfig }) {
  const invitationUrl = getInvitationUrl(invitation.code, invitation.customSlug);
  const images = getInvitationImages(invitation).gallery;
  const socialLinks = getSocialShareLinks(invitationUrl);

  return (
    <main className="boho-sand-invite">
      <InviteMusic musicUrl={musicUrl} />
      <InvitePermissions invitationCode={invitation.code} />
      <WeddingLiveMode code={invitation.code} />

      <div className="boho-sand-shell">
        <figure className="boho-sand-cover">
          <img src={images[0] || invitation.heroPhoto || galleryImages[0]} alt="غلاف الدعوة" />
        </figure>

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
          <Countdown targetDate={invitation.weddingDate} locale={invitation.language} />
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
            {socialLinks.map((item) => (
              <a href={item.href} key={item.label} aria-label={item.label} target="_blank" rel="noreferrer">
                <Share2 size={18} />
              </a>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}

function PureWhiteInvitationExperience({ invitation, musicUrl, photographer }: { invitation: Invitation; musicUrl?: string | null; photographer: PhotographerConfig }) {
  const invitationUrl = getInvitationUrl(invitation.code, invitation.customSlug);
  const images = getInvitationImages(invitation).gallery;
  const socialLinks = getSocialShareLinks(invitationUrl);

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

        <figure className="pure-white-cover">
          <img src={images[0] || invitation.heroPhoto || galleryImages[0]} alt="غلاف الدعوة" />
        </figure>

        <section className="pure-white-date">
          <p>{formatInvitationDate(invitation)}</p>
          <span>{invitation.weddingTime}</span>
        </section>

        <section className="pure-white-countdown">
          <Countdown targetDate={invitation.weddingDate} locale={invitation.language} />
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
            {socialLinks.map((item) => (
              <a href={item.href} key={item.label} aria-label={item.label} target="_blank" rel="noreferrer">
                <Share2 size={18} />
              </a>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}

function NeonThemeInvitationExperience({ invitation, musicUrl, photographer }: { invitation: Invitation; musicUrl?: string | null; photographer: PhotographerConfig }) {
  const invitationUrl = getInvitationUrl(invitation.code, invitation.customSlug);
  const images = getInvitationImages(invitation).gallery;
  const socialLinks = getSocialShareLinks(invitationUrl);

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

        <figure className="neon-cover">
          <img src={images[0] || invitation.heroPhoto || galleryImages[0]} alt="غلاف الدعوة" />
        </figure>

        <section className="neon-countdown">
          <Countdown targetDate={invitation.weddingDate} locale={invitation.language} />
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
            {socialLinks.map((item) => (
              <a href={item.href} key={item.label} aria-label={item.label} target="_blank" rel="noreferrer">
                <Share2 size={18} />
              </a>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}

function VintageThemeInvitationExperience({ invitation, musicUrl, photographer }: { invitation: Invitation; musicUrl?: string | null; photographer: PhotographerConfig }) {
  const invitationUrl = getInvitationUrl(invitation.code, invitation.customSlug);
  const images = getInvitationImages(invitation).gallery;
  const socialLinks = getSocialShareLinks(invitationUrl);

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

        <figure className="vintage-photo">
          <img src={images[0] || invitation.heroPhoto || galleryImages[0]} alt="غلاف الدعوة" />
        </figure>

        <section className="vintage-countdown">
          <Countdown targetDate={invitation.weddingDate} locale={invitation.language} />
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
            {socialLinks.map((item) => (
              <a href={item.href} key={item.label} aria-label={item.label} target="_blank" rel="noreferrer">
                <Share2 size={18} />
              </a>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}

function FairytaleThemeInvitationExperience({ invitation, musicUrl, photographer }: { invitation: Invitation; musicUrl?: string | null; photographer: PhotographerConfig }) {
  const invitationUrl = getInvitationUrl(invitation.code, invitation.customSlug);
  const images = getInvitationImages(invitation).gallery;
  const socialLinks = getSocialShareLinks(invitationUrl);

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

        <figure className="fairytale-photo">
          <img src={images[0] || invitation.heroPhoto || galleryImages[0]} alt="غلاف الدعوة" />
        </figure>

        <section className="fairytale-date-card">
          <p>{formatInvitationDate(invitation)}</p>
          <span>{invitation.weddingTime}</span>
        </section>

        <section className="fairytale-countdown">
          <Countdown targetDate={invitation.weddingDate} locale={invitation.language} />
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
            {socialLinks.map((item) => (
              <a href={item.href} key={item.label} aria-label={item.label} target="_blank" rel="noreferrer">
                <Share2 size={18} />
              </a>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}

function OceanThemeInvitationExperience({ invitation, musicUrl, photographer }: { invitation: Invitation; musicUrl?: string | null; photographer: PhotographerConfig }) {
  const invitationUrl = getInvitationUrl(invitation.code, invitation.customSlug);
  const images = getInvitationImages(invitation).gallery;
  const socialLinks = getSocialShareLinks(invitationUrl);

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
        <figure className="ocean-photo">
          <img src={images[0] || invitation.heroPhoto || galleryImages[0]} alt="غلاف الدعوة" />
        </figure>

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
          <Countdown targetDate={invitation.weddingDate} locale={invitation.language} />
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
            {socialLinks.map((item) => (
              <a href={item.href} key={item.label} aria-label={item.label} target="_blank" rel="noreferrer">
                <Share2 size={18} />
              </a>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}

function ArtDecoThemeInvitationExperience({ invitation, musicUrl, photographer }: { invitation: Invitation; musicUrl?: string | null; photographer: PhotographerConfig }) {
  const invitationUrl = getInvitationUrl(invitation.code, invitation.customSlug);
  const images = getInvitationImages(invitation).gallery;
  const socialLinks = getSocialShareLinks(invitationUrl);

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

        <figure className="artdeco-photo">
          <img src={images[0] || invitation.heroPhoto || galleryImages[0]} alt="غلاف الدعوة" />
        </figure>

        <section className="artdeco-date-card">
          <p>{formatInvitationDate(invitation)}</p>
          <span>{invitation.weddingTime}</span>
        </section>

        <section className="artdeco-countdown">
          <Countdown targetDate={invitation.weddingDate} locale={invitation.language} />
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
            {socialLinks.map((item) => (
              <a href={item.href} key={item.label} aria-label={item.label} target="_blank" rel="noreferrer">
                <Share2 size={18} />
              </a>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}

function MagazineThemeInvitationExperience({ invitation, musicUrl, photographer }: { invitation: Invitation; musicUrl?: string | null; photographer: PhotographerConfig }) {
  const invitationUrl = getInvitationUrl(invitation.code, invitation.customSlug);
  const images = getInvitationImages(invitation).gallery;
  const socialLinks = getSocialShareLinks(invitationUrl);

  return (
    <main className="magazine-invite">
      <InviteMusic musicUrl={musicUrl} />
      <InvitePermissions invitationCode={invitation.code} />
      <WeddingLiveMode code={invitation.code} />

      <div className="magazine-shell">
        <section className="magazine-cover">
          <h1 className="magazine-name magazine-name-top">{invitation.groomName}</h1>
          <figure className="magazine-photo">
            <img src={images[0] || invitation.heroPhoto || galleryImages[0]} alt="غلاف الدعوة" />
          </figure>
          <h1 className="magazine-name magazine-name-bottom">{invitation.brideName}</h1>
        </section>

        <div className="magazine-content">
          <section className="magazine-date-row">
            <span>{formatInvitationDate(invitation)}</span>
            <span>{invitation.weddingTime}</span>
          </section>

          <section className="magazine-countdown">
            <Countdown targetDate={invitation.weddingDate} locale={invitation.language} />
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
              {socialLinks.map((item) => (
                <a href={item.href} key={item.label} aria-label={item.label} target="_blank" rel="noreferrer">
                  <Share2 size={18} />
                </a>
              ))}
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
  const socialLinks = getSocialShareLinks(invitationUrl);

  return (
    <main className="cinematic-invite">
      <InviteMusic musicUrl={musicUrl} />
      <InvitePermissions invitationCode={invitation.code} />
      <WeddingLiveMode code={invitation.code} />
      <InviteOpening groomName={invitation.groomName} brideName={invitation.brideName} locale={invitation.language} />

      <section className="cinematic-hero">
        <div className="cinematic-hero-media">
          <img src={images[0] || invitation.heroPhoto || galleryImages[0]} alt="صورة العرسان" />
          <div className="cinematic-hero-gradient" />
        </div>

        <div className="cinematic-hero-copy">
          <p>Forever Begins Here</p>
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
            <p>يتبقى على الفرحة</p>
            <Countdown targetDate={invitation.weddingDate} locale={invitation.language} />
          </div>
        </section>

        {images.length > 1 ? (
          <section className="cinematic-gallery-stack" aria-label={invitationT(invitation, "invitation.galleryLabel")}>
            <div className="cinematic-gallery-back">
              <img src={images[1] || galleryImages[1]} alt="Gallery 2" />
            </div>
            <div className="cinematic-gallery-front">
              <img src={images[2] || galleryImages[2]} alt="Gallery 3" />
            </div>
          </section>
        ) : null}

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
            {socialLinks.map((item) => (
              <a href={item.href} key={item.label} aria-label={item.label} target="_blank" rel="noreferrer">
                <Share2 size={18} />
              </a>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
