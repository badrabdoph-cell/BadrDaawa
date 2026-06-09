import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { DynamicPageView } from "@/components/DynamicPageView";
import { InvitationExperience } from "@/components/InvitationExperience";
import { getDynamicPageBySlug, getDynamicPageMetadata } from "@/lib/dynamic-pages";
import { getLocaleMeta, resolveLocale } from "@/lib/i18n";
import { recordInvitationView } from "@/lib/invitation-data";
import { getCachedInvitationByCode, getInvitationSeoMetadata, getInvitationStructuredData, getMissingInvitationSeoMetadata } from "@/lib/invitation-seo";
import { getSiteSettings } from "@/lib/site-settings";
import { getTemplateWithSettings } from "@/lib/template-settings";
import { detectVisitSource } from "@/lib/visit-source";

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
  if (invitation) return getInvitationSeoMetadata(invitation);
  const page = await getDynamicPageBySlug(code);
  if (page) return getDynamicPageMetadata(page);
  return getMissingInvitationSeoMetadata();
}

export default async function InvitationPage({ params, searchParams }: PageProps) {
  const [{ code }, query, requestHeaders] = await Promise.all([params, searchParams, headers()]);
  const isSilentPreview = query?.silentPreview === "1" || query?.embed === "1";
  const invitation = await getCachedInvitationByCode(code);
  if (!invitation) {
    const page = await getDynamicPageBySlug(code);
    if (page) return <DynamicPageView page={page} />;
    notFound();
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

  const [template, fallbackTemplate, siteSettings] = await Promise.all([getTemplateWithSettings(invitation.templateSlug), getTemplateWithSettings("featured-1"), getSiteSettings()]);
  const resolvedTemplate = template || fallbackTemplate;
  if (!resolvedTemplate) {
    notFound();
  }

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
        settings={{
          showPhotographerCard: siteSettings.photographer.showPhotographerCard,
          photographerName: siteSettings.photographer.defaultName,
          photographerInstagramUrl: siteSettings.photographer.defaultInstagramUrl,
          photographerFacebookUrl: siteSettings.photographer.defaultFacebookUrl,
        }}
      />
    </div>
  );
}
