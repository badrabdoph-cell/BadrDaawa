import { Facebook, Instagram, MapPin, Music2, Share2 } from "lucide-react";
import { Countdown } from "./Countdown";
import { InvitePoll } from "./InvitePoll";
import { QrCodeBlock } from "./QrCodeBlock";
import type { Invitation, TemplateDefinition } from "@/lib/types";
import { formatArabicDate, getInvitationUrl } from "@/lib/utils";

const galleryImages = ["/assets/brand/couple-royal.png", "/assets/brand/hero-luxury.png", "/assets/templates/royal-envelope.png"];

export async function InvitationExperience({ invitation, template }: { invitation: Invitation; template: TemplateDefinition }) {
  const invitationUrl = getInvitationUrl(invitation.code);
  const mapEmbed = `https://maps.google.com/maps?q=${encodeURIComponent(invitation.venue + " " + invitation.city)}&z=13&output=embed`;

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
      <section className="invite-opening" aria-label="فتح ظرف الدعوة">
        <div className="opening-envelope">
          <div className="opening-envelope-base" />
          <div className="opening-envelope-flap" />
          <div className="opening-paper">
            <span>دعوة فرح</span>
            <strong>
              {invitation.groomName} &amp; {invitation.brideName}
            </strong>
          </div>
        </div>
      </section>

      <section className="invite-story">
        <div className="invite-card invite-title-card">
          <span className="invite-kicker">Royal Envelope</span>
          <h1>
            {invitation.groomName} &amp; {invitation.brideName}
          </h1>
          <p>{formatArabicDate(invitation.weddingDate)}</p>
          <strong>{invitation.weddingTime}</strong>
          <Countdown targetDate={invitation.weddingDate} />
        </div>

        <div className="luxury-gallery" aria-label="صور الدعوة">
          {galleryImages.map((image, index) => (
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
          <div className="map-frame">
            <iframe src={mapEmbed} title="خريطة مكان الفرح" loading="lazy" />
            <span className="map-pin user-pin">موقعك</span>
            <span className="map-pin venue-pin">
              <MapPin size={14} />
              الفرح
            </span>
          </div>
        </section>

        <section className="invite-card photographer-card">
          <span className="invite-kicker">Photographer</span>
          <h2>badrabdoph</h2>
          <p>لقطات فرحتنا بعدسة خاصة.</p>
          <div className="button-row">
            <a className="btn btn-soft btn-glass" href="#" aria-label="Facebook">
              <Facebook size={18} />
              Facebook
            </a>
            <a className="btn btn-soft btn-glass" href="#" aria-label="Instagram">
              <Instagram size={18} />
              Instagram
            </a>
          </div>
        </section>

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
