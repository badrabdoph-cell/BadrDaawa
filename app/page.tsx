import Link from "next/link";
import { BellRing, Check, Eye, Headphones, Link2, Palette, Send, SlidersHorizontal, Sparkles, Vote, WandSparkles, X } from "lucide-react";
import { BroadcastAnnotator } from "@/components/BroadcastAnnotator";
import { LiveVisitorsCounter } from "@/components/LiveVisitorsCounter";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { getHomeContent } from "@/lib/home-content";
import { getHomePreviewSettings } from "@/lib/preview-settings";
import { getSiteSettings } from "@/lib/site-settings";

const featureIcons = [Vote, Send, SlidersHorizontal, BellRing, Sparkles, SlidersHorizontal, Sparkles, Headphones, Send, SlidersHorizontal, Vote, Link2, BellRing];

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function HomePage({ searchParams }: { searchParams?: Promise<{ broadcast?: string }> }) {
  const params = searchParams ? await searchParams : {};
  const [previewSettings, content, siteSettings] = await Promise.all([getHomePreviewSettings(), getHomeContent(), getSiteSettings()]);
  const previewTemplateSrc = `/templates/${previewSettings.templateSlug}/preview?silentPreview=1`;
  const isBroadcastMode = params.broadcast === "1";
  const showHomePanels = siteSettings.homepage.showFeatures || siteSettings.homepage.showPreview || siteSettings.homepage.showPricing;

  return (
    <div className="page-shell">
      <SiteHeader />
      <main>
        <section className="hero clean-hero">
          <div className="container hero-grid hero-grid-single">
            <div className="hero-copy">
              <h1 className="home-hero-title">
                <span className="home-hero-title-kicker" data-broadcast-key="hero.kicker" data-broadcast-label="النص العلوي" data-broadcast-kind="text" data-broadcast-value={content.hero.kicker}>
                  {content.hero.kicker}
                </span>
                <span className="home-hero-title-main" data-broadcast-key="hero.mainTitle" data-broadcast-label="العنوان الرئيسي" data-broadcast-kind="text" data-broadcast-value={content.hero.mainTitle}>
                  {content.hero.mainTitle}
                </span>
                <span className="home-hero-title-divider" aria-hidden="true">
                  <span />
                  <Sparkles size={18} />
                  <span />
                </span>
                <span className="home-hero-title-accent" data-broadcast-key="hero.accentTitle" data-broadcast-label="العنوان الملون" data-broadcast-kind="text" data-broadcast-value={content.hero.accentTitle}>
                  <span>{content.hero.accentTitle}</span>
                </span>
              </h1>
              <p className="hero-shine-copy" data-broadcast-key="hero.description" data-broadcast-label="وصف البداية" data-broadcast-kind="text" data-broadcast-value={content.hero.description}>
                {content.hero.description}
              </p>
              <div className="button-row home-cta-row">
                <Link className="btn btn-gold btn-glow home-cta home-cta-primary" href="/templates">
                  <WandSparkles size={19} />
                  <span data-broadcast-key="hero.primaryCta" data-broadcast-label="زر الطلب" data-broadcast-kind="text" data-broadcast-value={content.hero.primaryCta}>
                    {siteSettings.homepage.primaryCtaLabel || content.hero.primaryCta}
                  </span>
                </Link>
                <Link className="btn btn-gold btn-glow home-cta home-cta-primary" href="/templates">
                  <Palette size={19} />
                  <span data-broadcast-key="hero.secondaryCta" data-broadcast-label="زر الأشكال" data-broadcast-kind="text" data-broadcast-value={content.hero.secondaryCta}>
                    {siteSettings.homepage.secondaryCtaLabel || content.hero.secondaryCta}
                  </span>
                </Link>
              </div>
            </div>
          </div>
        </section>

        {showHomePanels ? (
          <section className="section compact live-template-section">
            <div className="container live-template-wrap">
              <div className="live-preview-stack">
                {siteSettings.homepage.showFeatures ? (
                  <div className="home-features-panel" aria-label="مميزات الدعوة الرقمية">
                <div className="home-features-head">
                  <span>
                    <Sparkles size={16} />
                  </span>
                  <h2 data-broadcast-key="features.title" data-broadcast-label="عنوان المميزات" data-broadcast-kind="text" data-broadcast-value={content.features.title}>
                    {content.features.title}
                  </h2>
                </div>
                <div className="home-feature-points">
                  {content.features.points.map((item, index) => {
                    const Icon = featureIcons[index] || Sparkles;
                    return (
                      <div className="home-feature-point" key={item.id}>
                        <span>
                          <Icon size={17} />
                        </span>
                        <strong data-broadcast-key={`features.points.${item.id}.text`} data-broadcast-label={`ميزة: ${item.text}`} data-broadcast-kind="text" data-broadcast-value={item.text}>
                          {item.text}
                        </strong>
                      </div>
                    );
                  })}
                </div>
                  </div>
                ) : null}
                {siteSettings.homepage.showPreview ? (
                  <>
                    <div className="live-preview-title">
                <span data-broadcast-key="preview.eyebrow" data-broadcast-label="نص المعاينة الصغير" data-broadcast-kind="text" data-broadcast-value={content.preview.eyebrow}>
                  {content.preview.eyebrow}
                </span>
                <h2 data-broadcast-key="preview.title" data-broadcast-label="عنوان المعاينة" data-broadcast-kind="text" data-broadcast-value={content.preview.title}>
                  {content.preview.title}
                </h2>
              </div>
              <div className="live-phone-frame" aria-label="معاينة مباشرة لدعوة بدر و Sara" data-broadcast-key="preview.media" data-broadcast-label="ميديا المعاينة" data-broadcast-kind="media" data-broadcast-value={previewSettings.mode === "video" ? previewSettings.videoUrl : previewSettings.mode === "image" ? previewSettings.imageUrl : previewSettings.templateSlug}>
                <span className="live-preview-badge" data-broadcast-key="preview.badge" data-broadcast-label="شارة المعاينة" data-broadcast-kind="text" data-broadcast-value={content.preview.badge}>
                  {content.preview.badge}
                </span>
                {previewSettings.mode === "image" && previewSettings.imageUrl ? (
                  <img className="live-preview-media" src={previewSettings.imageUrl} alt="معاينة صورة الدعوة" loading="lazy" decoding="async" />
                ) : previewSettings.mode === "video" && previewSettings.videoUrl ? (
                  <video className="live-preview-media" src={previewSettings.videoUrl} muted loop playsInline autoPlay controls preload="metadata" />
                ) : (
                  <iframe src={previewTemplateSrc} title="معاينة مباشرة لقالب الدعوة" loading="lazy" allow="geolocation; notifications" />
                )}
              </div>
              <div className="button-row live-preview-actions">
                <Link className="btn btn-gold btn-glow home-cta home-cta-primary" href="/badr-sarah-1">
                  <Eye size={19} />
                  <span data-broadcast-key="preview.fullInviteCta" data-broadcast-label="زر فتح الدعوة" data-broadcast-kind="text" data-broadcast-value={content.preview.fullInviteCta}>
                    {content.preview.fullInviteCta}
                  </span>
                </Link>
                <Link className="btn btn-gold btn-glow home-cta home-cta-primary" href="/templates">
                  <Sparkles size={19} />
                  <span data-broadcast-key="preview.orderCta" data-broadcast-label="زر طلب مشابه" data-broadcast-kind="text" data-broadcast-value={content.preview.orderCta}>
                    {content.preview.orderCta}
                  </span>
                </Link>
              </div>
                  </>
                ) : null}
                {siteSettings.homepage.showPricing ? (
                  <div className="home-pricing-panel" aria-label="باقات الأسعار">
                <div className="home-pricing-head">
                  <span data-broadcast-key="pricing.eyebrow" data-broadcast-label="نص الباقات الصغير" data-broadcast-kind="text" data-broadcast-value={content.pricing.eyebrow}>
                    {content.pricing.eyebrow}
                  </span>
                  <h2 data-broadcast-key="pricing.title" data-broadcast-label="عنوان الباقات" data-broadcast-kind="text" data-broadcast-value={content.pricing.title}>
                    {content.pricing.title}
                  </h2>
                </div>
                <div className="home-pricing-table" role="table" aria-label="مقارنة باقات الدعوة">
                  <div className="home-pricing-row home-pricing-table-head" role="row">
                    <div className="home-pricing-feature-head" role="columnheader">الميزة</div>
                    <div className="home-pricing-plan-head" role="columnheader">
                      <span data-broadcast-key="pricing.invitationPlanName" data-broadcast-label="اسم الباقة الأولى" data-broadcast-kind="text" data-broadcast-value={content.pricing.invitationPlanName}>
                        {content.pricing.invitationPlanName}
                      </span>
                      <strong data-broadcast-key="pricing.invitationPrice" data-broadcast-label="سعر الباقة الأولى" data-broadcast-kind="text" data-broadcast-value={content.pricing.invitationPrice}>
                        {content.pricing.invitationPrice}
                      </strong>
                    </div>
                    <div className="home-pricing-plan-head home-pricing-plan-head-featured" role="columnheader">
                      <span data-broadcast-key="pricing.plusPlanName" data-broadcast-label="اسم الباقة الثانية" data-broadcast-kind="text" data-broadcast-value={content.pricing.plusPlanName}>
                        {content.pricing.plusPlanName}
                      </span>
                      <strong data-broadcast-key="pricing.plusPrice" data-broadcast-label="سعر الباقة الثانية" data-broadcast-kind="text" data-broadcast-value={content.pricing.plusPrice}>
                        {content.pricing.plusPrice}
                      </strong>
                    </div>
                  </div>
                  {content.pricing.rows.map((row) => (
                    <div className="home-pricing-row" role="row" key={row.id}>
                      <div className="home-pricing-feature" role="cell" data-broadcast-key={`pricing.rows.${row.id}.feature`} data-broadcast-label={`ميزة باقة: ${row.feature}`} data-broadcast-kind="text" data-broadcast-value={row.feature}>
                        {row.feature}
                      </div>
                      <div className="home-pricing-state" role="cell" aria-label={row.invitation ? "متاح" : "غير متاح"}>
                        {row.invitation ? <Check size={20} /> : <X size={20} />}
                      </div>
                      <div className="home-pricing-state home-pricing-state-featured" role="cell" aria-label={row.plus ? "متاح" : "غير متاح"}>
                        {row.plus ? <Check size={20} /> : <X size={20} />}
                      </div>
                    </div>
                  ))}
                </div>
                  </div>
                ) : null}
              </div>
            </div>
          </section>
        ) : null}
      </main>
      <LiveVisitorsCounter />
      <SiteFooter />
      {isBroadcastMode ? <BroadcastAnnotator /> : null}
    </div>
  );
}
