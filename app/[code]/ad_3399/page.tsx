import Link from "next/link";
import type { Metadata } from "next";
import { cookies, headers } from "next/headers";
import { Download, ExternalLink, LogOut } from "lucide-react";
import { notFound, redirect } from "next/navigation";
import { ClientInvitationEditor } from "@/components/ClientInvitationEditor";
import { ClientShareTools } from "@/components/ClientShareTools";
import { ClientWeddingLiveModePanel } from "@/components/ClientWeddingLiveModePanel";
import { CopyButton } from "@/components/CopyButton";
import { CustomerAnalyticsPanel } from "@/components/CustomerAnalyticsPanel";
import { CustomerMessagesPanel } from "@/components/CustomerMessagesPanel";
import { GuestTable } from "@/components/GuestTable";
import { InvitationQrTools } from "@/components/InvitationQrTools";
import { CLIENT_SESSION_COOKIE, verifyClientSessionCookie } from "@/lib/client-session";
import { getClientMessages } from "@/lib/client-messages";
import { getContentPresets } from "@/lib/content-presets";
import { getCustomerInvitationAnalytics } from "@/lib/customer-analytics";
import { getGuestsByInvitation, getInvitationByCode } from "@/lib/invitation-data";
import { getMessageTemplates } from "@/lib/message-templates";
import { getMusicLibrary } from "@/lib/music-library";
import { getTemplateWithSettings } from "@/lib/template-settings";
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
  const invitation = await getInvitationByCode(code);
  if (!invitation) {
    notFound();
  }

  const session = cookieStore.get(CLIENT_SESSION_COOKIE)?.value;
  if (!(await verifyClientSessionCookie(session, invitation.code))) {
    redirect(`/${invitation.code}/ad_3399/login`);
  }

  const [guests, template, musicFiles, clientMessages, contentPresets, messageTemplates, liveModeConfig] = await Promise.all([
    getGuestsByInvitation(invitation.code),
    getTemplateWithSettings(invitation.templateSlug),
    getMusicLibrary(),
    getClientMessages(invitation.code),
    getContentPresets(),
    getMessageTemplates(),
    getWeddingLiveMode(invitation.code),
  ]);
  if (!template) {
    notFound();
  }
  const analytics = await getCustomerInvitationAnalytics(invitation, guests);
  const publicSlug = invitation.customSlug || invitation.code;
  const url = `${getPublicSiteUrl(requestHeaders).replace(/\/$/, "")}/${publicSlug}`;

  return (
    <main className="customer-admin">
      <section className="customer-topbar">
        <div>
          <span className="eyebrow">Customer Admin</span>
          <h1>
            {invitation.groomName} &amp; {invitation.brideName}
          </h1>
          <p>{url}</p>
        </div>
        <div className="button-row">
          <Link className="btn btn-soft" href={`/${publicSlug}`}>
            <ExternalLink size={18} />
            فتح الدعوة
          </Link>
          <CopyButton className="btn btn-gold" value={url} label="نسخ الرابط" title="نسخ رابط الدعوة" />
          <form action="/api/auth/client/logout" method="post">
            <input name="code" type="hidden" value={invitation.code} />
            <button className="btn btn-soft btn-icon" type="submit" title="تسجيل خروج">
              <LogOut size={18} />
            </button>
          </form>
        </div>
      </section>

      <CustomerAnalyticsPanel analytics={analytics} />

      <CustomerMessagesPanel invitationCode={invitation.code} messages={clientMessages} />

      {query.saved === "music-error" ? (
        <div className="notice danger customer-notice">الصوت لم يتم حفظه. استخدم ملف صوت صالح أو رابط مباشر مثل MP3/WAV.</div>
      ) : query.saved === "images-error" ? (
        <div className="notice danger customer-notice">الصور لم يتم حفظها. ارفع صور JPG/PNG/WebP أو انتظر انتهاء الضغط قبل الحفظ.</div>
      ) : query.saved ? (
        <div className="notice success customer-notice">تم حفظ التعديلات المتاحة لهذه الدعوة.</div>
      ) : null}

      <section className="customer-control-grid customer-admin-tools">
        <InvitationQrTools invitationUrl={url} title={`${invitation.groomName} و ${invitation.brideName}`} initialLogoUrl={invitation.photographer?.logoUrl || ""} />

        <article className="panel">
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

        <ClientShareTools invitationUrl={url} groomName={invitation.groomName} brideName={invitation.brideName} weddingDate={invitation.weddingDate} venue={invitation.venue} messageTemplates={messageTemplates} />

        <ClientWeddingLiveModePanel invitationCode={invitation.code} initialConfig={liveModeConfig} />
      </section>

      <ClientInvitationEditor
        invitation={invitation}
        template={template}
        musicFiles={musicFiles.slots.filter((slot) => slot.url).map((slot) => ({ id: slot.id, name: slot.name, url: slot.url, modifiedAt: Date.parse(slot.updatedAt || slot.createdAt || "") || 0 }))}
        contentPresets={contentPresets}
        publicUrl={url}
      />

      <section className="section compact">
        <div className="dashboard-head">
          <div>
            <span className="eyebrow">Guest List</span>
            <h2>قائمة الحضور</h2>
          </div>
        </div>
        <GuestTable guests={guests} />
      </section>
    </main>
  );
}
