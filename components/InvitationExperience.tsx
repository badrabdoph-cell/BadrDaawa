import { CalendarDays, MapPin, Music2, Navigation } from "lucide-react";
import { Countdown } from "./Countdown";
import { QrCodeBlock } from "./QrCodeBlock";
import { RsvpForm } from "./RsvpForm";
import type { Invitation, TemplateDefinition } from "@/lib/types";
import { formatArabicDate, getInvitationUrl } from "@/lib/utils";

export async function InvitationExperience({ invitation, template }: { invitation: Invitation; template: TemplateDefinition }) {
  const invitationUrl = getInvitationUrl(invitation.code);

  return (
    <main
      className="invitation-page"
      style={
        {
          "--tpl-primary": template.palette.primary,
          "--tpl-secondary": template.palette.secondary,
          "--tpl-accent": template.palette.accent,
          "--tpl-ink": template.palette.ink,
          "--tpl-surface": template.palette.surface,
          "--invite-photo": `url(${invitation.heroPhoto})`,
        } as React.CSSProperties
      }
    >
      <section className="invitation-hero">
        <div className={`invitation-frame template-${template.slug}`}>
          <div className="invite-cover">
            <div className="invite-copy">
              <span className="eyebrow">{template.arabicName}</span>
              <h1>
                {invitation.groomName}
                <br />&amp; {invitation.brideName}
              </h1>
              <p>يشرفنا حضوركم ومشاركتكم أجمل لحظة في حياتنا.</p>
              <Countdown targetDate={invitation.weddingDate} />
              <div className="button-row">
                <a className="btn btn-gold" href="#rsvp">
                  تأكيد الحضور
                </a>
                <a className="btn btn-soft" href={invitation.mapUrl} target="_blank" rel="noreferrer">
                  <Navigation size={18} />
                  الاتجاهات
                </a>
              </div>
            </div>
            <div className="invite-envelope" aria-label="ظرف الدعوة">
              <div className="royal-envelope" aria-hidden="true">
                <div className="royal-envelope-base" />
                <div className="royal-envelope-flap" />
                <div className="royal-envelope-card">
                  <span>{template.arabicName}</span>
                  <strong>
                    {invitation.groomName} &amp; {invitation.brideName}
                  </strong>
                  <small>افتح الدعوة</small>
                </div>
              </div>
            </div>
          </div>
          <section className="invite-section">
            <div className="invite-details">
              <div className="detail-box">
                <CalendarDays size={24} />
                <h3>التاريخ</h3>
                <p>{formatArabicDate(invitation.weddingDate)}</p>
                <strong>{invitation.weddingTime}</strong>
              </div>
              <div className="detail-box">
                <MapPin size={24} />
                <h3>المكان</h3>
                <p>{invitation.venue}</p>
                <strong>{invitation.city}</strong>
              </div>
              <div className="detail-box">
                <Music2 size={24} />
                <h3>التجربة</h3>
                <p>{template.opening}</p>
                <strong>{template.category}</strong>
              </div>
            </div>
          </section>
          <section id="rsvp" className="invite-section">
            <div style={{ textAlign: "center", marginBottom: 24 }}>
              <span className="eyebrow">RSVP</span>
              <h2 className="section-title">أكد حضورك</h2>
              <p className="section-lead" style={{ marginInline: "auto" }}>
                سجّل ردك في ثواني.
              </p>
            </div>
            <RsvpForm code={invitation.code} />
          </section>
          <section className="invite-section">
            <div className="invite-share-grid">
              <QrCodeBlock value={invitationUrl} />
              <div className="detail-box">
                <h3>رابط الدعوة</h3>
                <p>{invitationUrl}</p>
              </div>
            </div>
          </section>
        </div>
      </section>
    </main>
  );
}
