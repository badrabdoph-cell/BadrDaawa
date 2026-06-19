"use client";

import { useMemo, useState } from "react";
import { BarChart3, CalendarDays, CheckCircle2, Download, Edit3, ExternalLink, Heart, Home, MessageCircle, MessageCircleHeart, QrCode, Share2, UserCheck, UsersRound, XCircle } from "lucide-react";
import type { ClientMessage, ContentPreset, CoupleMessagesSettings, GuestBookMessage, GuestRsvp, Invitation, MessageTemplate, TemplateDefinition, WeddingLiveModeConfig } from "@/lib/types";
import type { CustomerInvitationAnalytics } from "@/lib/customer-analytics";
import { ErrorBoundary } from "./ErrorBoundary";
import { CustomerMessagesPanel } from "./CustomerMessagesPanel";
import { GuestTable } from "./GuestTable";
import { CustomerGuestBookPanel } from "./CustomerGuestBookPanel";
import { InvitationQrTools } from "./InvitationQrTools";
import { ClientShareTools } from "./ClientShareTools";
import { ClientWeddingLiveModePanel } from "./ClientWeddingLiveModePanel";
import { CustomerAnalyticsPanel } from "./CustomerAnalyticsPanel";
import { ClientInvitationEditor } from "./ClientInvitationEditor";
import { formatArabicNumber } from "@/lib/utils";

type MusicFile = { id?: string; name?: string; url: string; modifiedAt: number };
type DashboardTab = "overview" | "guests" | "guestbook" | "editor" | "share" | "analytics";

const TAB_LABELS: Record<DashboardTab, string> = {
  overview: "الرئيسية",
  guests: "الضيوف",
  guestbook: "التهاني",
  editor: "تعديل الدعوة",
  share: "مشاركة",
  analytics: "الإحصائيات",
};

const TAB_ICONS: Record<DashboardTab, React.ReactNode> = {
  overview: <Heart size={17} />,
  guests: <UsersRound size={17} />,
  guestbook: <MessageCircleHeart size={17} />,
  editor: <Edit3 size={17} />,
  share: <Share2 size={17} />,
  analytics: <BarChart3 size={17} />,
};

export function ClientDashboardShell({
  invitation,
  template,
  guests,
  musicFiles,
  clientMessages,
  contentPresets,
  messageTemplates,
  liveModeConfig,
  guestBookMessages,
  coupleMessagesSettings,
  analytics,
  url,
  whatsappSupportUrl,
}: {
  invitation: Invitation;
  template: Pick<TemplateDefinition, "slug" | "name" | "arabicName" | "opening" | "concept" | "layout" | "typography">;
  guests: GuestRsvp[];
  musicFiles: { id?: string; name?: string; url: string; modifiedAt: number }[];
  clientMessages: ClientMessage[];
  contentPresets: ContentPreset[];
  messageTemplates: MessageTemplate[];
  liveModeConfig: WeddingLiveModeConfig | null;
  guestBookMessages: GuestBookMessage[];
  coupleMessagesSettings: CoupleMessagesSettings;
  analytics: CustomerInvitationAnalytics;
  url: string;
  whatsappSupportUrl?: string | null;
}) {
  const [activeTab, setActiveTab] = useState<DashboardTab>("overview");
  const guestBookPending = guestBookMessages.filter((m) => m.status === "pending").length;

  const tabBadge = useMemo(
    () =>
      ({
        overview: 0,
        guests: 0,
        guestbook: guestBookPending,
        editor: 0,
        share: 0,
        analytics: 0,
      }) as Record<DashboardTab, number>,
    [guestBookPending],
  );

  return (
    <div className="customer-admin customer-admin-refresh">
      <header className="customer-dashboard-header">
        <section className="dashboard-topbar">
          <div className="dashboard-topbar-actions">
            <a className="btn btn-soft" href={url} target="_blank" rel="noopener noreferrer">
              <ExternalLink size={17} /> دعوتك
            </a>
            <a className="btn btn-gold" href={whatsappSupportUrl || "#"} target="_blank" rel="noopener noreferrer">
              <MessageCircle size={17} /> خدمة العملاء
            </a>
            <a className="btn btn-soft" href="/" target="_blank" rel="noopener noreferrer">
              <Home size={17} /> الرئيسيه
            </a>
          </div>
        </section>

        {activeTab === "overview" ? (
          <CompactStatsSection analytics={analytics} guestBookMessages={guestBookMessages} />
        ) : null}

        <nav className="dashboard-tabs" role="tablist" aria-label="أقسام لوحة التحكم">
          {(Object.keys(TAB_LABELS) as DashboardTab[]).map((tab) => (
            <button
              key={tab}
              role="tab"
              aria-selected={activeTab === tab}
              className={activeTab === tab ? "active" : ""}
              type="button"
              onClick={() => setActiveTab(tab)}
            >
              {TAB_ICONS[tab]}
              <span>{TAB_LABELS[tab]}</span>
              {tabBadge[tab] > 0 ? <sup className="dashboard-tab-badge">{tabBadge[tab]}</sup> : null}
            </button>
          ))}
        </nav>
      </header>

      {activeTab === "overview" ? (
        <OverviewTab
          invitation={invitation}
          analytics={analytics}
          guests={guests}
          guestBookMessages={guestBookMessages}
          guestBookPending={guestBookPending}
          clientMessages={clientMessages}
          url={url}
          messageTemplates={messageTemplates}
          liveModeConfig={liveModeConfig}
          musicFiles={musicFiles}
          template={template}
          contentPresets={contentPresets}
          coupleMessagesSettings={coupleMessagesSettings}
        />
      ) : null}

      {activeTab === "guests" ? (
        <ErrorBoundary name="guest-list">
          <section className="customer-mobile-section">
            <div className="customer-mobile-section-head">
              <div>
                <span className="eyebrow">الضيوف</span>
                <h2>الضيوف</h2>
              </div>
            </div>
            <GuestTable guests={guests} invitationCode={invitation.code} invitationViews={invitation.views} />
          </section>
        </ErrorBoundary>
      ) : null}

      {activeTab === "guestbook" ? (
        <ErrorBoundary name="guest-book">
          <CustomerGuestBookPanel invitationCode={invitation.code} messages={guestBookMessages} settings={coupleMessagesSettings} />
        </ErrorBoundary>
      ) : null}

      {activeTab === "editor" ? (
        <ErrorBoundary name="editor">
          <ClientInvitationEditor invitation={invitation} template={template} musicFiles={musicFiles} contentPresets={contentPresets} publicUrl={url} />
        </ErrorBoundary>
      ) : null}

      {activeTab === "share" ? (
        <section className="customer-mobile-section customer-accordion-stack">
          <ErrorBoundary name="qr-tools">
            <details className="customer-admin-accordion" open>
              <summary>رمز QR</summary>
              <InvitationQrTools invitationUrl={url} title={`${invitation.groomName} و ${invitation.brideName}`} initialLogoUrl={invitation.photographer?.logoUrl || ""} />
            </details>
          </ErrorBoundary>
          <ErrorBoundary name="share-tools">
            <details className="customer-admin-accordion" open>
              <summary>مشاركة الدعوة ورسالة واتساب</summary>
              <ClientShareTools invitationUrl={url} groomName={invitation.groomName} brideName={invitation.brideName} weddingDate={invitation.weddingDate} venue={invitation.venue} messageTemplates={messageTemplates} />
            </details>
          </ErrorBoundary>
          <ErrorBoundary name="live-mode">
            <details className="customer-admin-accordion" open>
              <summary>وضع الحفل المباشر</summary>
              <ClientWeddingLiveModePanel invitationCode={invitation.code} initialConfig={liveModeConfig} />
            </details>
          </ErrorBoundary>
          <ErrorBoundary name="export">
            <details className="customer-admin-accordion" open>
              <summary>تحميل قائمة الحضور</summary>
              <article className="panel customer-export-card">
                <Download size={24} />
                <h2>تحميل قائمة الحضور</h2>
                <p>حمل قائمة الحضور Excel أو PDF.</p>
                <div className="button-row">
                  <a className="btn btn-soft" href={`/api/invitations/${invitation.code}/export/excel`}>Excel</a>
                  <a className="btn btn-soft" href={`/api/invitations/${invitation.code}/export/pdf`}>PDF</a>
                </div>
              </article>
            </details>
          </ErrorBoundary>
        </section>
      ) : null}

      {activeTab === "analytics" ? (
        <ErrorBoundary name="analytics">
          <CustomerAnalyticsPanel analytics={analytics} />
        </ErrorBoundary>
      ) : null}
    </div>
  );
}

function CompactStatsSection({
  analytics,
  guestBookMessages,
}: {
  analytics: CustomerInvitationAnalytics;
  guestBookMessages: GuestBookMessage[];
}) {
  const responseTotal = analytics.confirmedResponses + analytics.declinedResponses;
  const guestMessagesTotal = guestBookMessages.length;
  const confirmedPercent = responseTotal ? Math.round((analytics.confirmedResponses / responseTotal) * 100) : 0;
  const declinedPercent = responseTotal ? 100 - confirmedPercent : 0;
  const maxDayViews = Math.max(1, ...analytics.openDays.map((day) => day.count));

  function formatDate(value: string) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return new Intl.DateTimeFormat("ar-EG-u-nu-latn", { day: "numeric", month: "short" }).format(date);
  }

  return (
    <section className="customer-compact-stats" aria-label="ملخص الدعوة">
      <div className="customer-compact-stats-grid">
        <article>
          <CheckCircle2 size={16} />
          <span>عدد الردود</span>
          <strong>{formatArabicNumber(responseTotal)}</strong>
        </article>
        <article>
          <UsersRound size={16} />
          <span>الحضور المتوقع</span>
          <strong>{formatArabicNumber(analytics.expectedAttendees)}</strong>
        </article>
        <article>
          <MessageCircleHeart size={16} />
          <span>عدد الرسائل</span>
          <strong>{formatArabicNumber(guestMessagesTotal)}</strong>
        </article>
        <article>
          <BarChart3 size={16} />
          <span>عدد الزيارات</span>
          <strong>{formatArabicNumber(analytics.visits)}</strong>
        </article>
        <article>
          <UserCheck size={16} />
          <span>حضور مؤكد</span>
          <strong>{formatArabicNumber(analytics.confirmedResponses)}</strong>
        </article>
        <article>
          <XCircle size={16} />
          <span>اعتذارات</span>
          <strong>{formatArabicNumber(analytics.declinedResponses)}</strong>
        </article>
      </div>
      <div className="customer-compact-stats-extras">
        <article className="customer-compact-chart">
          <div className="customer-compact-chart-head">
            <UsersRound size={14} />
            <span>توزيع الردود</span>
          </div>
          <div className="customer-compact-rsvp-bar" aria-label={`حضور ${confirmedPercent}% واعتذار ${declinedPercent}%`}>
            <span className="confirmed" style={{ width: `${confirmedPercent}%` }} />
            <span className="declined" style={{ width: `${declinedPercent}%` }} />
          </div>
          <div className="customer-compact-legend">
            <span><i className="confirmed" /> حضور {formatArabicNumber(confirmedPercent)}%</span>
            <span><i className="declined" /> اعتذار {formatArabicNumber(declinedPercent)}%</span>
          </div>
        </article>
        <article className="customer-compact-chart">
          <div className="customer-compact-chart-head">
            <CalendarDays size={14} />
            <span>أكثر أيام فتح الدعوة</span>
          </div>
          {analytics.openDays.length ? (
            <div className="customer-compact-day-bars">
              {analytics.openDays.slice(0, 3).map((day) => (
                <div className="customer-compact-day-bar" key={day.date}>
                  <span>{formatDate(day.date)}</span>
                  <div><i style={{ width: `${Math.max(8, (day.count / maxDayViews) * 100)}%` }} /></div>
                  <strong>{formatArabicNumber(day.count)}</strong>
                </div>
              ))}
            </div>
          ) : (
            <div className="admin-empty-state compact">
              <p>لا توجد زيارات يومية مسجلة بعد</p>
            </div>
          )}
        </article>
      </div>
    </section>
  );
}

function OverviewTab({
  invitation,
  analytics,
  guests,
  guestBookMessages,
  guestBookPending,
  clientMessages,
  url,
  messageTemplates,
  liveModeConfig,
  musicFiles,
  template,
  contentPresets,
  coupleMessagesSettings,
}: {
  invitation: Invitation;
  analytics: CustomerInvitationAnalytics;
  guests: GuestRsvp[];
  guestBookMessages: GuestBookMessage[];
  guestBookPending: number;
  clientMessages: ClientMessage[];
  url: string;
  messageTemplates: MessageTemplate[];
  liveModeConfig: WeddingLiveModeConfig | null;
  musicFiles: { id?: string; name?: string; url: string; modifiedAt: number }[];
  template: Pick<TemplateDefinition, "slug" | "name" | "arabicName" | "opening" | "concept" | "layout" | "typography">;
  contentPresets: ContentPreset[];
  coupleMessagesSettings: CoupleMessagesSettings;
}) {
  return (
    <>
      {invitation.trialEndsAt && !invitation.disabledAt ? (
        <div className="trial-notification-bar">
          <span className="trial-notification-icon">⏳</span>
          <span>
            دعوه مده تجريبيه لمده {invitation.trialDays} ايام (باقي {Math.max(0, Math.ceil((new Date(invitation.trialEndsAt).getTime() - Date.now()) / 86400000))} ايام)
          </span>
        </div>
      ) : null}

      {/* Guest Book Section - moved above Guests */}
      <ErrorBoundary name="guest-book">
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
      </ErrorBoundary>

      {/* Guests Section */}
      <ErrorBoundary name="guest-table">
        <section className="customer-mobile-section">
          <div className="customer-mobile-section-head">
            <div>
              <span className="eyebrow">الضيوف</span>
              <h2>الضيوف</h2>
            </div>
          </div>
          <GuestTable guests={guests.slice(0, 10)} invitationCode={invitation.code} invitationViews={invitation.views} />
          {guests.length > 10 ? (
            <p className="guest-table-more-hint">
              وعرض {guests.length - 10} ضيف آخر — انتقل لتبويب <strong>الضيوف</strong> لمشاهدة الكل
            </p>
          ) : null}
        </section>
      </ErrorBoundary>

      {/* Share & Tools */}
      <ErrorBoundary name="share-and-tools">
        <section className="customer-mobile-section customer-accordion-stack">
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
                <a className="btn btn-soft" href={`/api/invitations/${invitation.code}/export/excel`}>Excel</a>
                <a className="btn btn-soft" href={`/api/invitations/${invitation.code}/export/pdf`}>PDF</a>
              </div>
            </article>
          </details>
        </section>
      </ErrorBoundary>

      {/* Editor */}
      <ErrorBoundary name="editor">
        <ClientInvitationEditor invitation={invitation} template={template} musicFiles={musicFiles} contentPresets={contentPresets} publicUrl={url} />
      </ErrorBoundary>

      {/* Messages Center - moved to very last */}
      <ErrorBoundary name="messages">
        <CustomerMessagesPanel invitationCode={invitation.code} messages={clientMessages} />
      </ErrorBoundary>
    </>
  );
}
