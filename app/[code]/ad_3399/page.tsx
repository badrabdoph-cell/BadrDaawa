import Link from "next/link";
import type { Metadata } from "next";
import { cookies, headers } from "next/headers";
import { CheckCircle2, Download, ExternalLink, Eye, LogOut, MessageCircle, UserCheck, UsersRound, UserX } from "lucide-react";
import { notFound, redirect } from "next/navigation";
import { ClientInvitationEditor } from "@/components/ClientInvitationEditor";
import { ClientShareTools } from "@/components/ClientShareTools";
import { ClientWeddingLiveModePanel } from "@/components/ClientWeddingLiveModePanel";
import { CopyButton } from "@/components/CopyButton";
import { CustomerAnalyticsPanel } from "@/components/CustomerAnalyticsPanel";
import { CustomerGuestBookPanel } from "@/components/CustomerGuestBookPanel";
import { CustomerMessagesPanel } from "@/components/CustomerMessagesPanel";
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
  const unreadClientMessages = clientMessages.filter((message) => !message.readAt).length;
  const guestBookPending = guestBookMessages.filter((message) => message.status === "pending").length;

  return (
    <main className="customer-admin">
      <section className="customer-mobile-hero">
        <div className="customer-mobile-hero-head">
          <span className="eyebrow">لوحة الدعوة</span>
          <form action="/api/auth/client/logout" method="post">
            <input name="code" type="hidden" value={invitation.code} />
            <button className="btn btn-soft btn-icon" type="submit" title="تسجيل خروج">
              <LogOut size={18} />
            </button>
          </form>
        </div>
        <h1>{invitation.groomName} و {invitation.brideName}</h1>
        <p dir="ltr">{url}</p>
        <div className="customer-mobile-hero-actions">
          <Link className="btn btn-gold btn-glow" href={`/${publicSlug}`}>
            <ExternalLink size={19} />
            فتح الدعوة
          </Link>
          <CopyButton className="btn btn-soft" value={url} label="نسخ الرابط" title="نسخ رابط الدعوة" />
          <a className="btn btn-soft whatsapp" href={whatsappShareUrl} target="_blank" rel="noreferrer">
            <MessageCircle size={19} />
            مشاركة فورية
          </a>
        </div>
      </section>

      <section className="customer-mobile-stats" aria-label="ملخص الدعوة">
        <article>
          <Eye size={20} />
          <span>عدد الزيارات</span>
          <strong>{formatArabicNumber(analytics.visits)}</strong>
        </article>
        <article>
          <CheckCircle2 size={20} />
          <span>الحضور المؤكد</span>
          <strong>{formatArabicNumber(analytics.confirmedResponses)}</strong>
        </article>
        <article>
          <UserX size={20} />
          <span>المعتذرون</span>
          <strong>{formatArabicNumber(analytics.declinedResponses)}</strong>
        </article>
        <article>
          <UsersRound size={20} />
          <span>إجمالي الأشخاص المتوقع حضورهم</span>
          <strong>{formatArabicNumber(analytics.expectedAttendees)}</strong>
        </article>
      </section>

      <section className="panel customer-priority-panel customer-latest-rsvps">
        <div className="customer-mobile-section-head">
          <div>
            <span className="eyebrow">Latest RSVP</span>
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
            <span className="eyebrow">Guest List</span>
            <h2>قائمة الحضور</h2>
          </div>
        </div>
        <GuestTable guests={guests} invitationCode={invitation.code} />
      </section>

      <section className="customer-mobile-section">
        <div className="customer-mobile-section-head">
          <div>
            <span className="eyebrow">Messages</span>
            <h2>رسائل وتهاني الضيوف</h2>
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
            <span className="eyebrow">Tools</span>
            <h2>أدوات الدعوة</h2>
          </div>
        </div>
        <details className="customer-admin-accordion">
          <summary>QR Code</summary>
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
          <summary>التصدير</summary>
          <article className="panel customer-export-card">
            <Download size={24} />
            <h2>تصدير الحضور</h2>
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
          <summary>رسائل الإدارة</summary>
          <div className="customer-accordion-count">{formatArabicNumber(unreadClientMessages)} رسالة جديدة من الإدارة</div>
          <CustomerMessagesPanel invitationCode={invitation.code} messages={clientMessages} />
        </details>
        <details className="customer-admin-accordion">
          <summary>تفاصيل التحليلات</summary>
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
