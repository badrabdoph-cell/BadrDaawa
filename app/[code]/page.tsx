import type { Metadata } from "next";
import Link from "next/link";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { Home, MessageCircle, XCircle } from "lucide-react";
import { DisabledInvitationNotice } from "@/components/DisabledInvitationNotice";
import { DynamicPageView } from "@/components/DynamicPageView";
import { InvitationExperience } from "@/components/InvitationExperience";
import { PendingInvitationNotice } from "@/components/PendingInvitationNotice";
import { getDynamicPageBySlug, getDynamicPageMetadata } from "@/lib/dynamic-pages";
import { getLocaleMeta, resolveLocale } from "@/lib/i18n";
import { recordInvitationView } from "@/lib/invitation-data";
import { getCachedInvitationByCode, getInvitationSeoMetadata, getInvitationStructuredData, getMissingInvitationSeoMetadata } from "@/lib/invitation-seo";
import { getMusicLibrary, resolveInvitationMusic } from "@/lib/music-library";
import { getPendingOrderByInvitationCode, getRejectedOrderByInvitationCode } from "@/lib/order-request-links";
import { getSiteSettings } from "@/lib/site-settings";
import { getTemplateWithSettings } from "@/lib/template-settings";
import { detectVisitSource } from "@/lib/visit-source";

export const dynamic = "force-dynamic";

type InvitationSearchParams = {
  silentPreview?: string;
  embed?: string;
  [key: string]: string | string[] | undefined;
};

type PageProps = {
  params: Promise<{ code: string }>;
  searchParams?: Promise<InvitationSearchParams>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { code } = await params;
  const invitation = await getCachedInvitationByCode(code);
  if (invitation) {
    if (invitation.disabledAt || invitation.disabledReason) {
      return {
        title: "الدعوة معطلة",
        description: "تم تعطيل هذه الدعوة من الإدارة.",
        robots: { index: false, follow: false },
      };
    }
    return getInvitationSeoMetadata(invitation);
  }
  const pendingOrder = await getPendingOrderByInvitationCode(code);
  if (pendingOrder) {
    return {
      title: "الدعوة قيد المراجعة",
      description: "تم تجهيز رابط الدعوة، لكنه غير متاح حتى موافقة الأدمن ونشر الدعوة.",
      robots: { index: false, follow: false },
    };
  }
  const rejectedOrder = await getRejectedOrderByInvitationCode(code);
  if (rejectedOrder) {
    return {
      title: "تم رفض الدعوة",
      description: "تم رفض طلب الدعوة من الإدارة.",
      robots: { index: false, follow: false },
    };
  }
  const page = await getDynamicPageBySlug(code);
  if (page) return getDynamicPageMetadata(page);
  return getMissingInvitationSeoMetadata();
}

export default async function InvitationPage({ params, searchParams }: PageProps) {
  const [{ code }, query, requestHeaders] = await Promise.all([params, searchParams, headers()]);
  const isSilentPreview = query?.silentPreview === "1" || query?.embed === "1";
  const invitation = await getCachedInvitationByCode(code);
  if (!invitation) {
    const pendingOrder = await getPendingOrderByInvitationCode(code);
    if (pendingOrder) {
      const siteSettings = await getSiteSettings();
      return <PendingInvitationNotice code={pendingOrder.code} groomName={pendingOrder.groomName} brideName={pendingOrder.brideName} whatsappUrl={siteSettings.whatsappUrl} />;
    }
    const rejectedOrder = await getRejectedOrderByInvitationCode(code);
    if (rejectedOrder) {
      const siteSettings = await getSiteSettings();
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
    const page = await getDynamicPageBySlug(code);
    if (page) return <DynamicPageView page={page} />;
    notFound();
  }

  if (invitation.disabledAt || invitation.disabledReason) {
    if (invitation.customSlug && code !== invitation.customSlug) {
      redirect(`/${invitation.customSlug}`);
    }
    const siteSettings = await getSiteSettings();
    return <DisabledInvitationNotice reason={invitation.disabledReason} whatsappUrl={siteSettings.whatsappUrl} />;
  }
  if (!invitation.isActive) {
    notFound();
  }
  if (invitation.customSlug && code !== invitation.customSlug) {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(query || {})) {
      if (Array.isArray(value)) value.forEach((item) => params.append(key, item));
      else if (value) params.set(key, value);
    }
    redirect(`/${invitation.customSlug}${params.size ? `?${params.toString()}` : ""}`);
  }

  const [template, fallbackTemplate, siteSettings, musicLibrary] = await Promise.all([getTemplateWithSettings(invitation.templateSlug), getTemplateWithSettings("featured-1"), getSiteSettings(), getMusicLibrary()]);
  const resolvedTemplate = template || fallbackTemplate;
  if (!resolvedTemplate) {
    notFound();
  }
  const resolvedMusic = resolveInvitationMusic({
    invitation,
    library: musicLibrary,
    fallbackMusicUrl: resolvedTemplate.musicUrl,
    disableMusic: isSilentPreview,
  });

  if (!isSilentPreview) {
    const referrer = requestHeaders.get("referer");
    const userAgent = requestHeaders.get("user-agent");
    await recordInvitationView(invitation.code, {
      source: detectVisitSource({ searchParams: query, referrer, userAgent }),
      searchParams: query,
      referrer,
      userAgent,
    });
  }

  const locale = resolveLocale(invitation.language);
  const localeMeta = getLocaleMeta(locale);
  const structuredData = JSON.stringify(getInvitationStructuredData(invitation)).replace(/</g, "\\u003c");

  return (
    <div lang={localeMeta.htmlLang} dir={localeMeta.dir} data-invitation-locale={locale}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: structuredData }} />
      <InvitationExperience
        invitation={invitation}
        template={resolvedTemplate}
        disableMusic={isSilentPreview}
        resolvedMusicUrl={resolvedMusic.url}
        settings={{
          showPhotographerCard: siteSettings.photographer.showPhotographerCard,
          photographerName: siteSettings.photographer.defaultName,
          photographerInstagramUrl: siteSettings.photographer.defaultInstagramUrl,
          photographerFacebookUrl: siteSettings.photographer.defaultFacebookUrl,
          socialLinks: siteSettings.socialLinks,
          whatsappUrl: siteSettings.whatsappUrl,
        }}
      />
    </div>
  );
}
