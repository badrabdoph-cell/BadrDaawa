import { Calendar, CalendarHeart, Camera, ChevronDown, Clock, Facebook, Flower2, Heart, Instagram, Leaf, MapPin, Music2, Share2, Sparkles } from "lucide-react";
import { Countdown } from "./Countdown";
import { InviteOpening } from "./InviteOpening";
import { InviteMap } from "./InviteMap";
import { InviteMusic } from "./InviteMusic";
import { InvitePoll } from "./InvitePoll";
import { InvitePermissions } from "./InvitePermissions";
import { QrCodeBlock } from "./QrCodeBlock";
import type { Invitation, TemplateDefinition } from "@/lib/types";
import { shouldShowPhotographerCard } from "@/lib/site-settings";
import { formatArabicDate, getInvitationUrl } from "@/lib/utils";

const galleryImages = ["/assets/invite/badr-sarah-1.jpeg", "/assets/invite/badr-sarah-2.jpeg", "/assets/invite/badr-sarah-3.jpeg"];

function getSocialShareLinks(invitationUrl: string) {
  return [
    { label: "Facebook", href: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(invitationUrl)}` },
    { label: "Instagram", href: "https://www.instagram.com/" },
    { label: "TikTok", href: "https://www.tiktok.com/" },
    { label: "WhatsApp", href: `https://wa.me/?text=${encodeURIComponent(invitationUrl)}` },
  ];
}

export async function InvitationExperience({ invitation, template }: { invitation: Invitation; template: TemplateDefinition }) {
  const templateMusicUrl = invitation.musicUrl || template.musicUrl;

  if (template.customHtml) {
    return <CustomHtmlInvitationExperience invitation={invitation} template={template} musicUrl={templateMusicUrl} />;
  }

  if (template.slug === "luxe-noir") {
    return <LuxeNoirInvitationExperience invitation={invitation} musicUrl={templateMusicUrl} />;
  }
  if (template.slug === "ivory-arches") {
    return <IvoryArchesInvitationExperience invitation={invitation} musicUrl={templateMusicUrl} />;
  }
  if (template.slug === "mobile-gold" || template.slug === "soft-gold") {
    return <MobileGoldInvitationExperience invitation={invitation} musicUrl={templateMusicUrl} />;
  }
  if (template.slug === "boho-chic") {
    return <BohoChicInvitationExperience invitation={invitation} musicUrl={templateMusicUrl} />;
  }
  if (template.slug === "garden-elegance") {
    return <GardenEleganceInvitationExperience invitation={invitation} musicUrl={templateMusicUrl} />;
  }
  if (template.slug === "cinematic-story") {
    return <CinematicStoryInvitationExperience invitation={invitation} musicUrl={templateMusicUrl} />;
  }

  const invitationUrl = getInvitationUrl(invitation.code);
  const showPhotographer = shouldShowPhotographerCard();

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
      <InviteOpening groomName={invitation.groomName} brideName={invitation.brideName} />

      <section className="invite-story">
        <div className="invite-card invite-title-card">
          <span className="invite-kicker">Royal Envelope</span>
          <h1>
            {invitation.groomName} &amp; {invitation.brideName}
          </h1>
          <h2 className="invite-venue-title">{invitation.venue}</h2>
          <p className="invite-short-line">✦ ✧ ✦</p>
          <p>{formatArabicDate(invitation.weddingDate)}</p>
          <strong>{invitation.weddingTime}</strong>
          <Countdown targetDate={invitation.weddingDate} />
        </div>

        <div className="luxury-gallery" aria-label="صور الدعوة">
          {(invitation.gallery.length ? invitation.gallery : galleryImages).map((image, index) => (
            <img src={image} alt={`صورة من الدعوة ${index + 1}`} key={image} />
          ))}
        </div>

        <section className="invite-card invite-message">
          <Music2 size={22} />
          <p>حضورك هيفرحني، بتمنى إنك تحضر معايا أفضل يوم في عمري.</p>
          <p>أنا مستنيك تكون جزء من يومي المفضل.</p>
        </section>

        <section className="invite-card map-card">
          <div>
            <span className="invite-kicker">Location</span>
            <h2>{invitation.venue}</h2>
            <p>{invitation.city}</p>
          </div>
          <InviteMap venue={invitation.venue} city={invitation.city} mapUrl={invitation.mapUrl} />
        </section>

        {showPhotographer ? (
          <section className="invite-card photographer-card">
            <div className="photographer-logo" aria-hidden="true">
              BA
            </div>
            <div>
              <span className="invite-kicker">Photographer</span>
              <h2>badrabdoph</h2>
              <p>لقطات فرحتنا بعدسة خاصة.</p>
            </div>
            <div className="photographer-socials" aria-label="روابط المصور">
              <a href="#" aria-label="Facebook">
                <Facebook size={19} />
              </a>
              <a href="#" aria-label="Instagram">
                <Instagram size={19} />
              </a>
            </div>
          </section>
        ) : null}

        <InvitePoll code={invitation.code} />

        <section className="invite-card qr-share-card">
          <QrCodeBlock value={invitationUrl} />
          <div className="social-row" aria-label="روابط السوشيال">
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

function injectCustomTemplateData(html: string, invitation: Invitation, musicUrl?: string) {
  const invitationUrl = getInvitationUrl(invitation.code);
  const images = invitation.gallery.length ? invitation.gallery : galleryImages;
  const data = {
    groomName: invitation.groomName,
    brideName: invitation.brideName,
    coupleNames: `${invitation.groomName} & ${invitation.brideName}`,
    weddingDate: formatArabicDate(invitation.weddingDate),
    rawWeddingDate: invitation.weddingDate,
    weddingTime: invitation.weddingTime,
    venue: invitation.venue,
    city: invitation.city,
    mapUrl: invitation.mapUrl,
    invitationUrl,
    musicUrl: musicUrl || "",
    heroPhoto: invitation.heroPhoto,
    gallery1: images[0] || "",
    gallery2: images[1] || images[0] || "",
    gallery3: images[2] || images[0] || "",
  };

  let output = html;
  Object.entries(data).forEach(([key, value]) => {
    output = output.replaceAll(`{{${key}}}`, escapeHtml(String(value)));
  });

  const bridge = `<script>window.BADR_INVITE=${JSON.stringify({ ...data, gallery: images }).replace(/</g, "\\u003c")};</script>`;
  return output.includes("</body>") ? output.replace("</body>", `${bridge}</body>`) : `${output}${bridge}`;
}

async function CustomHtmlInvitationExperience({ invitation, template, musicUrl }: { invitation: Invitation; template: TemplateDefinition; musicUrl?: string }) {
  const srcDoc = injectCustomTemplateData(template.customHtml || "", invitation, musicUrl);

  return (
    <main className="custom-code-invite">
      <InviteMusic musicUrl={musicUrl} />
      <InvitePermissions invitationCode={invitation.code} />
      <iframe
        className="custom-code-frame"
        srcDoc={srcDoc}
        title={`قالب ${template.arabicName}`}
        sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox"
        allow="autoplay; geolocation; notifications"
      />
    </main>
  );
}

async function LuxeNoirInvitationExperience({ invitation, musicUrl }: { invitation: Invitation; musicUrl?: string }) {
  const invitationUrl = getInvitationUrl(invitation.code);
  const showPhotographer = shouldShowPhotographerCard();
  const images = invitation.gallery.length ? invitation.gallery : galleryImages;

  return (
    <main className="noir-invite">
      <div className="noir-pattern" aria-hidden="true" />
      <InviteMusic musicUrl={musicUrl} />
      <InvitePermissions invitationCode={invitation.code} />
      <InviteOpening groomName={invitation.groomName} brideName={invitation.brideName} />

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
          <p>{formatArabicDate(invitation.weddingDate)}</p>
          <strong className="noir-time">{invitation.weddingTime}</strong>
          <div className="noir-countdown">
            <Countdown targetDate={invitation.weddingDate} />
          </div>
        </div>

        <section className="noir-message">
          <span>
            <Music2 size={28} strokeWidth={1.5} />
          </span>
          <p>
            حضورك هيفرحني، بتمنى إنك تحضر معايا أفضل يوم في عمري.
            <strong>أنا مستنيك تكون جزء من يومي المفضل.</strong>
          </p>
        </section>

        <div className="noir-gallery" aria-label="صور الدعوة">
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
            <InviteMap venue={invitation.venue} city={invitation.city} mapUrl={invitation.mapUrl} />
          </div>
        </section>

        {showPhotographer ? (
          <section className="noir-photographer-card">
            <div className="noir-photographer-main">
              <div className="noir-photographer-logo">BA</div>
              <div>
                <span>
                  <Camera size={16} />
                  Photographer
                </span>
                <h2>badrabdoph</h2>
                <p>لقطات فرحتنا بعدسة خاصة.</p>
              </div>
            </div>
            <div className="noir-socials">
              <a href="#" aria-label="Facebook">
                <Facebook size={20} />
              </a>
              <a href="#" aria-label="Instagram">
                <Instagram size={20} />
              </a>
            </div>
          </section>
        ) : null}

        <InvitePoll code={invitation.code} />

        <section className="noir-qr-card">
          <p>شارك الدعوة مع من تحب</p>
          <QrCodeBlock value={invitationUrl} />
          <div className="social-row" aria-label="روابط السوشيال">
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

async function IvoryArchesInvitationExperience({ invitation, musicUrl }: { invitation: Invitation; musicUrl?: string }) {
  const invitationUrl = getInvitationUrl(invitation.code);
  const showPhotographer = shouldShowPhotographerCard();
  const images = invitation.gallery.length ? invitation.gallery : galleryImages;

  return (
    <main className="ivory-invite">
      <div className="ivory-frame" aria-hidden="true" />
      <InviteMusic musicUrl={musicUrl} />
      <InvitePermissions invitationCode={invitation.code} />
      <InviteOpening groomName={invitation.groomName} brideName={invitation.brideName} />

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
          <p>{formatArabicDate(invitation.weddingDate)}</p>
          <strong>{invitation.weddingTime}</strong>
          <div className="ivory-divider" aria-hidden="true" />
          <div className="ivory-countdown">
            <Countdown targetDate={invitation.weddingDate} />
          </div>
        </div>

        <section className="ivory-quote">
          <Heart size={36} strokeWidth={1.2} />
          <h2>حضورك هيفرحني، بتمنى إنك تحضر معايا أفضل يوم في عمري.</h2>
          <p>أنا مستنيك تكون جزء من يومي المفضل</p>
        </section>

        <section className="ivory-gallery" aria-label="صور الدعوة">
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
            <InviteMap venue={invitation.venue} city={invitation.city} mapUrl={invitation.mapUrl} />
          </div>
        </section>

        {showPhotographer ? (
          <section className="ivory-photographer-card">
            <div className="ivory-photographer-logo">
              <Camera size={24} />
              <span>BA</span>
            </div>
            <span>Photography</span>
            <h2>badrabdoph</h2>
            <p>لقطات فرحتنا بعدسة خاصة</p>
            <div className="ivory-socials">
              <a href="#" aria-label="Facebook">
                <Facebook size={22} strokeWidth={1.5} />
              </a>
              <a href="#" aria-label="Instagram">
                <Instagram size={22} strokeWidth={1.5} />
              </a>
            </div>
          </section>
        ) : null}

        <div className="ivory-poll-wrap">
          <InvitePoll code={invitation.code} />
        </div>

        <section className="ivory-qr-card">
          <h2>لمشاركة هذه اللحظة</h2>
          <QrCodeBlock value={invitationUrl} />
          <div className="social-row" aria-label="روابط السوشيال">
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

async function MobileGoldInvitationExperience({ invitation, musicUrl }: { invitation: Invitation; musicUrl?: string }) {
  const invitationUrl = getInvitationUrl(invitation.code);
  const showPhotographer = shouldShowPhotographerCard();
  const images = invitation.gallery.length ? invitation.gallery : galleryImages;
  const socialLinks = getSocialShareLinks(invitationUrl);

  return (
    <main className="mobile-gold-invite">
      <InviteMusic musicUrl={musicUrl} />
      <InvitePermissions invitationCode={invitation.code} />
      <InviteOpening groomName={invitation.groomName} brideName={invitation.brideName} />

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
              <p>{formatArabicDate(invitation.weddingDate)}</p>
            </div>
            <div>
              <Clock size={20} />
              <strong>{invitation.weddingTime}</strong>
            </div>
          </div>

          <div className="mobile-gold-countdown">
            <Countdown targetDate={invitation.weddingDate} />
          </div>
        </div>

        <div className="mobile-gold-gallery" aria-label="صور الدعوة">
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
          <p>"حضورك هيفرحني، بتمنى إنك تحضر معايا أفضل يوم في عمري. أنا مستنيك تكون جزء من يومي المفضل."</p>
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
            <InviteMap venue={invitation.venue} city={invitation.city} mapUrl={invitation.mapUrl} />
          </div>
        </section>

        {showPhotographer ? (
          <section className="mobile-gold-photographer">
            <div className="mobile-gold-photographer-main">
              <div className="mobile-gold-photographer-logo">BA</div>
              <div>
                <p>
                  <Camera size={12} />
                  Photo
                </p>
                <h2>badrabdoph</h2>
              </div>
            </div>
            <div className="mobile-gold-socials" aria-label="روابط المصور">
              <a href="https://www.facebook.com/" aria-label="Facebook" target="_blank" rel="noreferrer">
                <Facebook size={18} />
              </a>
              <a href="https://www.instagram.com/" aria-label="Instagram" target="_blank" rel="noreferrer">
                <Instagram size={18} />
              </a>
            </div>
          </section>
        ) : null}

        <div className="mobile-gold-poll-wrap">
          <InvitePoll code={invitation.code} />
        </div>

        <section className="mobile-gold-qr-card">
          <h3>شارك دعوتنا</h3>
          <div className="mobile-gold-qr-box">
            <QrCodeBlock value={invitationUrl} />
          </div>
          <div className="mobile-gold-share-row" aria-label="روابط السوشيال">
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

async function BohoChicInvitationExperience({ invitation, musicUrl }: { invitation: Invitation; musicUrl?: string }) {
  const invitationUrl = getInvitationUrl(invitation.code);
  const showPhotographer = shouldShowPhotographerCard();
  const images = invitation.gallery.length ? invitation.gallery : galleryImages;
  const heroImage = images[0] || invitation.heroPhoto || galleryImages[0];
  const socialLinks = getSocialShareLinks(invitationUrl);

  return (
    <main className="boho-invite">
      <InviteMusic musicUrl={musicUrl} />
      <InvitePermissions invitationCode={invitation.code} />

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
              <p>{formatArabicDate(invitation.weddingDate)}</p>
            </div>

            <i />

            <div>
              <Clock size={24} strokeWidth={1.5} />
              <strong>{invitation.weddingTime}</strong>
            </div>
          </div>

          <div className="boho-countdown">
            <Countdown targetDate={invitation.weddingDate} />
          </div>
        </section>

        <section className="boho-gallery-wrap" aria-label="صور الدعوة">
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
            <InviteMap venue={invitation.venue} city={invitation.city} mapUrl={invitation.mapUrl} />
          </div>
        </section>

        {showPhotographer ? (
          <section className="boho-photographer">
            <div className="boho-photographer-icon">
              <Camera size={28} strokeWidth={1.5} />
            </div>
            <div>
              <p>Captured By</p>
              <h3>badrabdoph</h3>
            </div>
            <div className="boho-photographer-socials">
              <a href="https://www.instagram.com/" aria-label="Instagram" target="_blank" rel="noreferrer">
                <Instagram size={18} />
              </a>
            </div>
          </section>
        ) : null}

        <div className="boho-poll-wrap">
          <InvitePoll code={invitation.code} />
        </div>

        <section className="boho-qr-card">
          <h3>بطاقة الدخول والمشاركة</h3>

          <div className="boho-qr-box">
            <QrCodeBlock value={invitationUrl} />
          </div>

          <div className="boho-share-row" aria-label="روابط السوشيال">
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

async function GardenEleganceInvitationExperience({ invitation, musicUrl }: { invitation: Invitation; musicUrl?: string }) {
  const invitationUrl = getInvitationUrl(invitation.code);
  const showPhotographer = shouldShowPhotographerCard();
  const images = invitation.gallery.length ? invitation.gallery : galleryImages;
  const socialLinks = getSocialShareLinks(invitationUrl);

  return (
    <main className="garden-invite">
      <div className="garden-soft-bg" aria-hidden="true" />
      <InviteMusic musicUrl={musicUrl} />
      <InvitePermissions invitationCode={invitation.code} />

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
                <strong>{formatArabicDate(invitation.weddingDate)}</strong>
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
          <Countdown targetDate={invitation.weddingDate} />
        </section>

        <section className="garden-map-frame">
          <InviteMap venue={invitation.venue} city={invitation.city} mapUrl={invitation.mapUrl} />
        </section>

        {images.length > 1 ? (
          <section className="garden-gallery-grid" aria-label="صور الدعوة">
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
                <h3>badrabdoph</h3>
                <small>لتوثيق أجمل لحظاتنا</small>
              </div>
              <div className="garden-photographer-socials">
                <a href="https://www.facebook.com/" aria-label="Facebook" target="_blank" rel="noreferrer">
                  <Facebook size={17} />
                </a>
                <a href="https://www.instagram.com/" aria-label="Instagram" target="_blank" rel="noreferrer">
                  <Instagram size={17} />
                </a>
              </div>
            </div>
          </section>
        ) : null}

        <div className="garden-poll-wrap">
          <InvitePoll code={invitation.code} />
        </div>

        <section className="garden-qr-ticket">
          <span className="garden-ticket-cut garden-ticket-cut-left" aria-hidden="true" />
          <span className="garden-ticket-cut garden-ticket-cut-right" aria-hidden="true" />
          <h3>بطاقة الدخول والمشاركة</h3>

          <div className="garden-qr-box">
            <QrCodeBlock value={invitationUrl} />
          </div>

          <div className="garden-share-row" aria-label="روابط السوشيال">
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

async function CinematicStoryInvitationExperience({ invitation, musicUrl }: { invitation: Invitation; musicUrl?: string }) {
  const invitationUrl = getInvitationUrl(invitation.code);
  const showPhotographer = shouldShowPhotographerCard();
  const images = invitation.gallery.length ? invitation.gallery : galleryImages;
  const socialLinks = getSocialShareLinks(invitationUrl);

  return (
    <main className="cinematic-invite">
      <InviteMusic musicUrl={musicUrl} />
      <InvitePermissions invitationCode={invitation.code} />
      <InviteOpening groomName={invitation.groomName} brideName={invitation.brideName} />

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
              <p>{formatArabicDate(invitation.weddingDate)}</p>
            </div>
            <div>
              <Clock size={24} />
              <p>{invitation.weddingTime}</p>
            </div>
          </div>

          <div className="cinematic-countdown">
            <p>يتبقى على الفرحة</p>
            <Countdown targetDate={invitation.weddingDate} />
          </div>
        </section>

        {images.length > 1 ? (
          <section className="cinematic-gallery-stack" aria-label="صور الدعوة">
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
            <InviteMap venue={invitation.venue} city={invitation.city} mapUrl={invitation.mapUrl} />
            <span aria-hidden="true" />
          </div>
        </section>

        {showPhotographer ? (
          <section className="cinematic-photographer">
            <Camera size={120} className="cinematic-photographer-watermark" />
            <div className="cinematic-photographer-logo">
              <span>BA</span>
            </div>
            <div>
              <span>Official Photographer</span>
              <h2>badrabdoph</h2>
            </div>
          </section>
        ) : null}

        <div className="cinematic-poll-wrap">
          <InvitePoll code={invitation.code} />
        </div>

        <section className="cinematic-qr-section">
          <div className="cinematic-separator" />
          <h3>بطاقة الدخول الإلكترونية</h3>

          <div className="cinematic-qr-box">
            <div>
              <QrCodeBlock value={invitationUrl} />
            </div>
          </div>

          <p>شارك الدعوة</p>
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
