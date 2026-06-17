import type { Metadata } from "next";
import { cookies, headers } from "next/headers";
import { CheckCircle2, Download, MessageCircle, UserCheck, UsersRound } from "lucide-react";
import { AdminMessagesBanner } from "@/components/AdminMessagesBanner";
import { notFound, redirect } from "next/navigation";
import { ClientInvitationEditor } from "@/components/ClientInvitationEditor";
import { ClientShareTools } from "@/components/ClientShareTools";
import { ClientWeddingLiveModePanel } from "@/components/ClientWeddingLiveModePanel";
import { CustomerAnalyticsPanel } from "@/components/CustomerAnalyticsPanel";
import { CustomerGuestBookPanel } from "@/components/CustomerGuestBookPanel";
import { GuestTable } from "@/components/GuestTable";
import { InvitationQrTools } from "@/components/InvitationQrTools";
import { PendingInvitationNotice } from "@/components/PendingInvitationNotice";
import { CLIENT_SESSION_COOKIE, verifyClientSessionCookie } from "@/lib/client-session";
import { getClientMessages } from "@/lib/client-messages";
import { getContentPresets } from "@/lib/content-presets";
import { getCustomerInvitationAnalytics } from "@/lib/customer-analytics";
import { getCoupleMessagesSettings, getGuestBookMessages } from "@/lib/guest-book";
import { getGuestsByInvitation, getInvitationByCode } from "@/lib/invitation-data";
import { getMessageTemplates } from "@/lib/message-templates";
import { getMusicLibrary } from "@/lib/music-library";
import { getPendingOrderByInvitationCode } from "@/lib/order-request-links";
import { getTemplateWithSettings } from "@/lib/template-settings";
import { formatArabicNumber, getPublicSiteUrl } from "@/lib/utils";
import { getWeddingLiveMode } from "@/lib/wedding-live-mode";

export const metadata: Metadata = {
  title: "لوحة العميل",
  robots: { index: false, follow: false },
};

function formatDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("ar-EG-u-nu-latn", { dateStyle: "medium", timeStyle: "short" }).format(date);
}

export default async function CustomerAdminPage({
  params,
  searchParams,
}: {
  params: Promise<{ code: string }>;
  searchParams: Promise<{ saved?: string }>;
}) {
  const { code } = await params;
  const [query, requestHeaders, cookieStore] = await Promise.all([searchParams, headers(), cookies()]);
  const invitation = await getInvitationByCode(code);
  if (!invitation) {
    const pendingOrder = await getPendingOrderByInvitationCode(code);
    if (pendingOrder) {
      return <PendingInvitationNotice variant="admin" code={pendingOrder.code} groomName={pendingOrder.groomName} brideName={pendingOrder.brideName} />;
    }
    notFound();
  }

  const session = cookieStore.get(CLIENT_SESSION_COOKIE)?.value;
  if (!(await verifyClientSessionCookie(session, invitation.code))) {
    redirect("/manage/invitation/invalid?reason=session");
  }

  const [guests, template, fallbackTemplate, musicFiles, clientMessages, contentPresets, messageTemplates, liveModeConfig, guestBookMessages, coupleMessagesSettings] = await Promise.all([
    getGuestsByInvitation(invitation.code),
    getTemplateWithSettings(invitation.templateSlug),
    getTemplateWithSettings("featured-1"),
    getMusicLibrary(),
    getClientMessages(invitation.code),
    getContentPresets(),
    getMessageTemplates(),
    getWeddingLiveMode(invitation.code),
    getGuestBookMessages(invitation.code, "all"),
    getCoupleMessagesSettings(invitation.code),
  ]);
  const resolvedTemplate = template || fallbackTemplate;
  if (!resolvedTemplate) {
    notFound();
  }
  const analytics = await getCustomerInvitationAnalytics(invitation, guests);
  const publicSlug = invitation.customSlug || invitation.code;
  const url = `${getPublicSiteUrl(requestHeaders).replace(/\/$/, "")}/${publicSlug}`;
  const whatsappShareUrl = `https://wa.me/?text=${encodeURIComponent(`يسعدنا دعوتكم لحضور حفل زفاف ${invitation.groomName} و ${invitation.brideName}\n${url}`)}`;
  const guestBookPending = guestBookMessages.filter((message) => message.status === "pending").length;
  const responseTotal = analytics.confirmedResponses + analytics.declinedResponses;
  const guestMessagesTotal = guestBookMessages.length;

  return (
    <main className="customer-admin customer-admin-refresh">
      <style>{`
        .customer-admin-refresh {
          --client-ivory: #fffdf8;
          --client-cream: #fbf4e9;
          --client-gold: #b98738;
          --client-gold-deep: #7d551f;
          --client-ink: #221a13;
          --client-muted: #796b5f;
          --client-line: rgba(126, 88, 35, 0.17);
          --client-soft-shadow: 0 16px 42px rgba(46, 33, 19, 0.09);
          background:
            radial-gradient(circle at 88% 3%, rgba(185, 135, 56, 0.13), transparent 24rem),
            linear-gradient(180deg, #fffaf1 0%, #fbf4e9 48%, #fffdf8 100%);
        }
        .customer-admin-refresh .customer-mobile-stats,
        .customer-admin-refresh .customer-priority-panel,
        .customer-admin-refresh .customer-mobile-section,
        .customer-admin-refresh .customer-editor-accordions {
          width: min(1120px, calc(100% - 28px));
          margin-inline: auto;
        }
        .customer-admin-refresh .customer-mobile-stats {
          grid-template-columns: repeat(3, minmax(0, 1fr));
          margin-bottom: 18px;
        }
        .customer-admin-refresh .customer-mobile-stats article {
          min-height: 118px;
          border: 1px solid var(--client-line);
          border-radius: 22px;
          background: rgba(255, 253, 248, 0.82);
          box-shadow: var(--client-soft-shadow);
        }
        .customer-admin-refresh .customer-mobile-stats article svg {
          color: var(--client-gold-deep);
        }
        .customer-admin-refresh .customer-mobile-stats article strong {
          color: var(--client-ink);
          font-size: clamp(1.65rem, 5vw, 2.4rem);
        }
        .customer-admin-refresh .customer-mobile-section-head .eyebrow {
          color: #8a6429;
        }
        .customer-admin-refresh .customer-mobile-section-head h2,
        .customer-admin-refresh .customer-admin-accordion summary {
          color: var(--client-ink);
        }
        .customer-admin-refresh .customer-admin-accordion,
        .customer-admin-refresh .customer-priority-panel,
        .customer-admin-refresh .customer-guest-book-panel,
        .customer-admin-refresh .customer-response-row,
        .customer-admin-refresh .guest-mobile-row {
          border-color: rgba(126, 88, 35, 0.14);
          background: rgba(255, 253, 248, 0.82);
          box-shadow: 0 10px 28px rgba(46, 33, 19, 0.07);
        }
        .customer-admin-refresh .customer-admin-accordion {
          border-radius: 22px;
        }
        .customer-admin-refresh .customer-admin-accordion summary {
          font-weight: 900;
        }
        .customer-admin-refresh .customer-preview-accordion {
          border-color: rgba(185, 135, 56, 0.24);
          background: linear-gradient(180deg, rgba(255, 253, 248, 0.92), rgba(246, 229, 198, 0.62));
          box-shadow: 0 18px 46px rgba(46, 33, 19, 0.1);
        }
        .customer-admin-refresh .customer-preview-accordion:not([open]) > :not(summary) {
          display: block;
        }
        .customer-admin-refresh .customer-preview-accordion summary {
          color: var(--client-gold-deep);
        }
        .customer-admin-refresh .builder-preview-panel {
          border-top: 1px solid rgba(126, 88, 35, 0.12);
          padding-top: 16px;
        }
        .customer-admin-refresh .builder-phone-frame {
          border-color: rgba(126, 88, 35, 0.18);
          box-shadow: 0 18px 44px rgba(46, 33, 19, 0.13);
        }
        .customer-admin-refresh .builder-editor-panel,
        .customer-admin-refresh .builder-section,
        .customer-admin-refresh .customer-export-card {
          border-color: rgba(126, 88, 35, 0.13);
          background: rgba(255, 253, 248, 0.78);
        }
        .customer-admin-refresh .status.success,
        .customer-admin-refresh .status.danger,
        .customer-admin-refresh .guest-book-status-pill {
          filter: saturate(0.78);
        }
        .customer-admin-refresh .admin-messages-banner {
          position: relative;
          width: min(1120px, calc(100% - 28px));
          margin: 0 auto 18px;
          border: 1px solid rgba(185, 135, 56, 0.3);
          border-radius: 22px;
          background: linear-gradient(135deg, rgba(255, 248, 235, 0.95), rgba(255, 241, 215, 0.92));
          box-shadow: 0 10px 28px rgba(46, 33, 19, 0.08);
          padding: 16px 20px;
        }
        .customer-admin-refresh .admin-messages-banner-head {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 12px;
          color: var(--client-gold-deep);
          font-weight: 700;
          font-size: 0.95rem;
        }
        .customer-admin-refresh .admin-messages-banner-head strong {
          margin-inline-start: auto;
          font-size: 0.82rem;
          background: rgba(185, 135, 56, 0.15);
          padding: 3px 12px;
          border-radius: 40px;
        }
        .customer-admin-refresh .admin-messages-banner-dismiss {
          position: absolute;
          top: 12px;
          inset-inline-end: 14px;
          background: none;
          border: none;
          color: var(--client-muted);
          cursor: pointer;
          padding: 4px;
          line-height: 1;
        }
        .customer-admin-refresh .admin-messages-banner-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .customer-admin-refresh .admin-message-banner-card {
          display: flex;
          align-items: flex-start;
          gap: 10px;
          padding: 10px 14px;
          border-radius: 14px;
          background: rgba(255, 253, 248, 0.78);
          border: 1px solid rgba(126, 88, 35, 0.1);
        }
        .customer-admin-refresh .admin-message-banner-card.unread {
          border-color: rgba(185, 135, 56, 0.3);
          background: rgba(255, 253, 248, 0.95);
        }
        .customer-admin-refresh .admin-message-banner-icon {
          flex-shrink: 0;
          margin-top: 2px;
          color: var(--client-gold);
        }
        .customer-admin-refresh .admin-message-banner-body {
          flex: 1;
          min-width: 0;
        }
        .customer-admin-refresh .admin-message-banner-title {
          font-weight: 700;
          font-size: 0.88rem;
          color: var(--client-ink);
        }
        .customer-admin-refresh .admin-message-banner-body p {
          margin: 2px 0 0;
          font-size: 0.82rem;
          color: var(--client-muted);
          line-height: 1.5;
        }
        .customer-admin-refresh .admin-message-banner-body time {
          display: block;
          font-size: 0.72rem;
          color: var(--client-muted);
          margin-top: 4px;
          opacity: 0.7;
        }
        .customer-admin-refresh .admin-message-banner-mark {
          flex-shrink: 0;
          background: rgba(185, 135, 56, 0.12);
          border: none;
          color: var(--client-gold-deep);
          cursor: pointer;
          padding: 6px 8px;
          border-radius: 40px;
          font-size: 0.78rem;
          line-height: 1;
          transition: background 0.15s;
        }
        .customer-admin-refresh .admin-message-banner-mark:hover {
          background: rgba(185, 135, 56, 0.22);
        }
        @media (max-width: 720px) {
          .customer-admin-refresh .customer-mobile-stats,
          .customer-admin-refresh .customer-priority-panel,
          .customer-admin-refresh .customer-mobile-section,
          .customer-admin-refresh .customer-editor-accordions,
          .customer-admin-refresh .admin-messages-banner {
            width: min(100% - 18px, 1120px);
          }
          .customer-admin-refresh .customer-mobile-stats article {
            min-height: 96px;
          }
          .customer-admin-refresh .customer-preview-accordion .builder-phone-frame {
            max-width: 330px;
            margin-inline: auto;
          }
        }
      `}</style>

      <AdminMessagesBanner invitationCode={invitation.code} messages={clientMessages} />

      <section className="customer-mobile-stats" aria-label="ملخص الدعوة">
        <article>
          <CheckCircle2 size={20} />
          <span>عدد الردود</span>
          <strong>{formatArabicNumber(responseTotal)}</strong>
        </article>
        <article>
          <UsersRound size={20} />
          <span>الحضور المتوقع</span>
          <strong>{formatArabicNumber(analytics.expectedAttendees)}</strong>
        </article>
        <article>
          <MessageCircle size={20} />
          <span>عدد الرسائل</span>
          <strong>{formatArabicNumber(guestMessagesTotal)}</strong>
        </article>
      </section>

      <section className="panel customer-priority-panel customer-latest-rsvps">
        <div className="customer-mobile-section-head">
          <div>
            <span className="eyebrow">آخر الردود</span>
            <h2>آخر الردود</h2>
          </div>
          <strong>{formatArabicNumber(analytics.recentResponses.length)}</strong>
        </div>
        {analytics.recentResponses.length ? (
          <div className="customer-response-list mobile-first">
            {analytics.recentResponses.map((guest) => (
              <article className="customer-response-row mobile-card" key={guest.id}>
                <span>
                  <strong>{guest.name}</strong>
                  <small>{formatArabicNumber(guest.attendees)} فرد · {formatDateTime(guest.createdAt)}</small>
                </span>
                <em className={guest.status === "confirmed" ? "status success" : "status danger"}>{guest.status === "confirmed" ? "حاضر" : "معتذر"}</em>
              </article>
            ))}
          </div>
        ) : (
          <div className="admin-empty-state compact">
            <UserCheck size={22} />
            <strong>لا توجد ردود حتى الآن</strong>
          </div>
        )}
      </section>

      <section className="panel customer-priority-panel customer-guest-list-section">
        <div className="customer-mobile-section-head">
          <div>
            <span className="eyebrow">الضيوف</span>
            <h2>الضيوف</h2>
          </div>
        </div>
        <GuestTable guests={guests} invitationCode={invitation.code} />
      </section>

      <section className="customer-mobile-section">
        <div className="customer-mobile-section-head">
          <div>
            <span className="eyebrow">تهاني الضيوف</span>
            <h2>تهاني الضيوف</h2>
          </div>
          <strong>{formatArabicNumber(guestBookPending)} جديد</strong>
        </div>
        <CustomerGuestBookPanel invitationCode={invitation.code} messages={guestBookMessages} settings={coupleMessagesSettings} />
      </section>

      {query.saved === "music-error" ? (
        <div className="notice danger customer-notice">الصوت لم يتم حفظه. استخدم ملف صوت صالح أو رابط مباشر مثل MP3/WAV.</div>
      ) : query.saved === "images-error" ? (
        <div className="notice danger customer-notice">الصور لم يتم حفظها. ارفع صور JPG/PNG/WebP أو انتظر انتهاء الضغط قبل الحفظ.</div>
      ) : query.saved ? (
        <div className="notice success customer-notice">تم حفظ التعديلات المتاحة لهذه الدعوة.</div>
      ) : null}

      <section className="customer-mobile-section customer-accordion-stack">
        <div className="customer-mobile-section-head">
          <div>
            <span className="eyebrow">مشاركة وتحميل</span>
            <h2>مشاركة وتحميل</h2>
          </div>
        </div>
        <details className="customer-admin-accordion">
          <summary>رمز QR</summary>
          <InvitationQrTools invitationUrl={url} title={`${invitation.groomName} و ${invitation.brideName}`} initialLogoUrl={invitation.photographer?.logoUrl || ""} />
        </details>
        <details className="customer-admin-accordion">
          <summary>مشاركة الدعوة ورسالة واتساب</summary>
          <ClientShareTools invitationUrl={url} groomName={invitation.groomName} brideName={invitation.brideName} weddingDate={invitation.weddingDate} venue={invitation.venue} messageTemplates={messageTemplates} />
        </details>
        <details className="customer-admin-accordion">
          <summary>وضع الحفل المباشر</summary>
          <ClientWeddingLiveModePanel invitationCode={invitation.code} initialConfig={liveModeConfig} />
        </details>
        <details className="customer-admin-accordion">
          <summary>تحميل قائمة الحضور</summary>
          <article className="panel customer-export-card">
            <Download size={24} />
            <h2>تحميل قائمة الحضور</h2>
            <p>حمل قائمة الحضور Excel أو PDF.</p>
            <div className="button-row">
              <a className="btn btn-soft" href={`/api/invitations/${invitation.code}/export/excel`}>
                Excel
              </a>
              <a className="btn btn-soft" href={`/api/invitations/${invitation.code}/export/pdf`}>
                PDF
              </a>
            </div>
          </article>
        </details>
        <details className="customer-admin-accordion">
          <summary>إحصائيات الدعوة</summary>
          <CustomerAnalyticsPanel analytics={analytics} />
        </details>
      </section>

      <ClientInvitationEditor
        invitation={invitation}
        template={resolvedTemplate}
        musicFiles={musicFiles.slots.filter((slot) => slot.url).map((slot) => ({ id: slot.id, name: slot.name, url: slot.url, modifiedAt: Date.parse(slot.updatedAt || slot.createdAt || "") || 0 }))}
        contentPresets={contentPresets}
        publicUrl={url}
      />
    </main>
  );
}
