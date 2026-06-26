import type { Metadata } from "next";
import { cookies, headers } from "next/headers";
import { Home, MessageCircle, ShieldAlert, XCircle } from "lucide-react";
import Link from "next/link";
import { AdminMessagesBanner } from "@/components/AdminMessagesBanner";
import { notFound, redirect } from "next/navigation";
import { ClientDashboardShell } from "@/components/ClientDashboardShell";
import { PendingInvitationNotice } from "@/components/PendingInvitationNotice";
import { CLIENT_SESSION_COOKIE, verifyClientSessionCookie } from "@/lib/client-session";
import { getClientMessages } from "@/lib/client-messages";
import { getPublishedContentPresets } from "@/lib/content-presets";
import { getCustomerInvitationAnalytics } from "@/lib/customer-analytics";
import { getCoupleMessagesSettings, getGuestBookMessages } from "@/lib/guest-book";
import { autoDisableExpiredTrial, getGuestsByInvitation, getInvitationByCode } from "@/lib/invitation-data";
import { getPublishedMessageTemplates } from "@/lib/message-templates";
import { getPublishedMusicLibrary } from "@/lib/music-library";
import { getPendingOrderByInvitationCode, getRejectedOrderByInvitationCode } from "@/lib/order-request-links";
import { getPublishedSiteSettings } from "@/lib/site-settings";
import { getPublishedTemplateWithSettings } from "@/lib/template-settings";
import { getPublicSiteUrl } from "@/lib/utils";
import { getWeddingLiveMode } from "@/lib/wedding-live-mode";

export const metadata: Metadata = {
  title: "لوحة العميل",
  robots: { index: false, follow: false },
};

export default async function CustomerAdminPage({
  params,
  searchParams,
}: {
  params: Promise<{ code: string }>;
  searchParams: Promise<{ saved?: string }>;
}) {
  const { code } = await params;
  const [query, requestHeaders, cookieStore] = await Promise.all([searchParams, headers(), cookies()]);
  await autoDisableExpiredTrial(code);
  const invitation = await getInvitationByCode(code);
  if (!invitation) {
    const rejectedOrder = await getRejectedOrderByInvitationCode(code);
    if (rejectedOrder) {
      const siteSettings = await getPublishedSiteSettings();
      return (
        <main className="pending-invitation-page" dir="rtl">
          <section className="pending-invitation-card">
            <XCircle size={38} aria-hidden="true" />
            <span className="eyebrow">تم الرفض</span>
            <h1>تم رفض طلب الدعوة</h1>
            <p>للأسف، تم رفض طلب الدعوة من الإدارة. للاستفسار، تواصل مع فريق الدعم.</p>
            {rejectedOrder.rejectionReason ? (
              <div className="rejection-reason">
                <strong>سبب الرفض</strong>
                <p>{rejectedOrder.rejectionReason}</p>
              </div>
            ) : null}
            <div className="status-actions">
              <Link className="btn btn-soft" href="/">
                <Home size={16} />
                العودة للرئيسية
              </Link>
              {siteSettings.whatsappUrl ? (
                <a className="btn btn-gold" href={siteSettings.whatsappUrl} target="_blank" rel="noopener noreferrer">
                  <MessageCircle size={16} />
                  خدمة العملاء
                </a>
              ) : null}
            </div>
          </section>
        </main>
      );
    }
    const pendingOrder = await getPendingOrderByInvitationCode(code);
    if (pendingOrder) {
      const siteSettings = await getPublishedSiteSettings();
      return <PendingInvitationNotice variant="admin" code={pendingOrder.code} groomName={pendingOrder.groomName} brideName={pendingOrder.brideName} whatsappUrl={siteSettings.whatsappUrl} submittedAt={pendingOrder.submittedAt} />;
    }
    notFound();
  }

  if (invitation.disabledAt) {
    return (
      <main className="page-shell">
        <section className="section compact">
          <div className="container">
            <article className="panel" style={{ textAlign: "center" }}>
              <ShieldAlert size={44} style={{ margin: "0 auto 12px", color: "#dc2626" }} />
              <h1>الدعوة معطلة</h1>
              <p>{invitation.disabledReason || "تم تعطيل الدعوة من الإدارة."}</p>
              <Link className="btn btn-gold" href="/" style={{ marginTop: 16 }}>
                العودة للموقع
              </Link>
            </article>
          </div>
        </section>
      </main>
    );
  }

  const session = cookieStore.get(CLIENT_SESSION_COOKIE)?.value;
  if (!(await verifyClientSessionCookie(session, invitation.code))) {
    redirect("/manage/invitation/invalid?reason=session");
  }

  const [guests, template, fallbackTemplate, musicFiles, clientMessages, contentPresets, messageTemplates, liveModeConfig, guestBookMessages, coupleMessagesSettings, siteSettings] = await Promise.all([
    getGuestsByInvitation(invitation.code),
    getPublishedTemplateWithSettings(invitation.templateSlug),
    getPublishedTemplateWithSettings("featured-1"),
    getPublishedMusicLibrary(),
    getClientMessages(invitation.code),
    getPublishedContentPresets(),
    getPublishedMessageTemplates(),
    getWeddingLiveMode(invitation.code),
    getGuestBookMessages(invitation.code, "all"),
    getCoupleMessagesSettings(invitation.code),
    getPublishedSiteSettings(),
  ]);
  const resolvedTemplate = template || fallbackTemplate;
  if (!resolvedTemplate) {
    notFound();
  }
  const analytics = await getCustomerInvitationAnalytics(invitation, guests);
  const publicSlug = invitation.customSlug || invitation.code;
  const url = `${getPublicSiteUrl(requestHeaders).replace(/\/$/, "")}/${publicSlug}`;

  return (
    <main className="page-shell" dir="rtl">
      {query.saved === "music-error" ? (
        <div className="notice danger customer-notice">الصوت لم يتم حفظه. استخدم ملف صوت صالح أو رابط مباشر مثل MP3/WAV.</div>
      ) : query.saved === "images-error" ? (
        <div className="notice danger customer-notice">الصور لم يتم حفظها. ارفع صور JPG/PNG/WebP أو انتظر انتهاء الضغط قبل الحفظ.</div>
      ) : query.saved ? (
        <div className="notice success customer-notice">تم حفظ التعديلات المتاحة لهذه الدعوة.</div>
      ) : null}

      <AdminMessagesBanner invitationCode={invitation.code} messages={clientMessages} />

      <ClientDashboardShell
        invitation={invitation}
        template={resolvedTemplate}
        guests={guests}
        musicFiles={musicFiles.slots.filter((slot) => slot.url).map((slot) => ({ id: slot.id, name: slot.name, url: slot.url, modifiedAt: Date.parse(slot.updatedAt || slot.createdAt || "") || 0 }))}
        clientMessages={clientMessages}
        contentPresets={contentPresets}
        messageTemplates={messageTemplates}
        liveModeConfig={liveModeConfig}
        guestBookMessages={guestBookMessages}
        coupleMessagesSettings={coupleMessagesSettings}
        analytics={analytics}
        url={url}
        whatsappSupportUrl={siteSettings.whatsappUrl}
      />
    </main>
  );
}
