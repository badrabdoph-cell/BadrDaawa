import Link from "next/link";
import { BarChart3, BellRing, CalendarDays, Camera, ChevronRight, Eye, Headphones, Link2, MapPinned, MessageCircle, Music, Paintbrush, Palette, Send, ShieldCheck, Smartphone, Sparkles, Star, UserCheck, UsersRound, Vote, WandSparkles } from "lucide-react";
import { BroadcastAnnotator } from "@/components/BroadcastAnnotator";
import { LiveVisitorsCounter } from "@/components/LiveVisitorsCounter";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { getHomeContent } from "@/lib/home-content";
import { getHomePreviewSettings } from "@/lib/preview-settings";

const featureIcons = [Vote, Smartphone, UserCheck, BellRing, Music, Paintbrush, Sparkles, Headphones, Send, Palette, MessageCircle, Link2, BarChart3, Camera, MapPinned, CalendarDays, UsersRound, ShieldCheck];

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function HomePage({ searchParams }: { searchParams?: Promise<{ broadcast?: string }> }) {
  const params = searchParams ? await searchParams : {};
  const [previewSettings, content] = await Promise.all([getHomePreviewSettings(), getHomeContent()]);
  const previewTemplateSrc = `/templates/${previewSettings.templateSlug}/preview?silentPreview=1`;
  const isBroadcastMode = params.broadcast === "1";

  return (
    <div className="page-shell">
      <SiteHeader />
      <main className="mobile-optimized">
        <section className="hero-mobile">
          <div className="container">
            <div className="hero-card animate-fade-up">
              <span className="hero-kicker" data-broadcast-key="hero.kicker" data-broadcast-label="النص العلوي" data-broadcast-kind="text" data-broadcast-value={content.hero.kicker}>
                <Star size={14} fill="currentColor" />
                {content.hero.kicker}
              </span>

              <h1 className="hero-title">
                <span data-broadcast-key="hero.mainTitle" data-broadcast-label="العنوان الرئيسي" data-broadcast-kind="text" data-broadcast-value={content.hero.mainTitle}>
                  {content.hero.mainTitle}
                </span>
                <span className="hero-title-accent" data-broadcast-key="hero.accentTitle" data-broadcast-label="العنوان الملون" data-broadcast-kind="text" data-broadcast-value={content.hero.accentTitle}>
                  {content.hero.accentTitle}
                </span>
              </h1>

              <div className="hero-divider">
                <Sparkles size={16} />
              </div>

              <p className="hero-description" data-broadcast-key="hero.description" data-broadcast-label="وصف البداية" data-broadcast-kind="text" data-broadcast-value={content.hero.description}>
                {content.hero.description}
              </p>

              <div className="cta-stack">
                <Link href="/templates" className="cta-primary">
                  <WandSparkles size={20} />
                  <span data-broadcast-key="hero.primaryCta" data-broadcast-label="زر الطلب" data-broadcast-kind="text" data-broadcast-value={content.hero.primaryCta}>
                    {content.hero.primaryCta}
                  </span>
                  <ChevronRight size={18} />
                </Link>

                <Link href="/templates" className="cta-secondary">
                  <Palette size={18} />
                  <span data-broadcast-key="hero.secondaryCta" data-broadcast-label="زر الأشكال" data-broadcast-kind="text" data-broadcast-value={content.hero.secondaryCta}>
                    {content.hero.secondaryCta}
                  </span>
                </Link>
              </div>
            </div>
          </div>
        </section>

        <section className="features-section">
          <div className="container">
            <div className="features-header">
              <h2 className="features-title" data-broadcast-key="features.title" data-broadcast-label="عنوان المميزات" data-broadcast-kind="text" data-broadcast-value={content.features.title}>
                {content.features.title}
              </h2>
            </div>

            <div className="features-grid">
              {content.features.points.map((item, index) => {
                const Icon = featureIcons[index] || Sparkles;

                return (
                  <div key={item.id} className="feature-card animate-fade-up" style={{ animationDelay: `${index * 0.05}s` }}>
                    <div className="feature-icon">
                      <Icon size={20} />
                    </div>
                    <span className="feature-text" data-broadcast-key={`features.points.${item.id}.text`} data-broadcast-label={`ميزة: ${item.text}`} data-broadcast-kind="text" data-broadcast-value={item.text}>
                      {item.text}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        <section className="preview-section">
          <div className="container">
            <div className="preview-header">
              <span className="preview-badge" data-broadcast-key="preview.badge" data-broadcast-label="شارة المعاينة" data-broadcast-kind="text" data-broadcast-value={content.preview.badge}>
                <Eye size={14} />
                {content.preview.badge}
              </span>
              <h2 className="preview-title" data-broadcast-key="preview.title" data-broadcast-label="عنوان المعاينة" data-broadcast-kind="text" data-broadcast-value={content.preview.title}>
                {content.preview.title}
              </h2>
            </div>

            <div className="phone-frame" data-broadcast-key="preview.media" data-broadcast-label="ميديا المعاينة" data-broadcast-kind="media" data-broadcast-value={previewSettings.mode === "video" ? previewSettings.videoUrl : previewSettings.mode === "image" ? previewSettings.imageUrl : previewSettings.templateSlug}>
              <div className="phone-notch" />
              <div className="phone-screen">
                {previewSettings.mode === "image" && previewSettings.imageUrl ? (
                  <img src={previewSettings.imageUrl} alt="معاينة صورة الدعوة" loading="lazy" decoding="async" />
                ) : previewSettings.mode === "video" && previewSettings.videoUrl ? (
                  <video src={previewSettings.videoUrl} muted loop playsInline autoPlay controls preload="metadata" />
                ) : (
                  <iframe src={previewTemplateSrc} title="معاينة مباشرة لقالب الدعوة" loading="lazy" allow="geolocation; notifications" />
                )}
              </div>
            </div>

            <div className="cta-stack preview-actions">
              <Link href={`/templates/${previewSettings.templateSlug}/preview`} className="cta-primary">
                <Eye size={20} />
                <span data-broadcast-key="preview.fullInviteCta" data-broadcast-label="زر فتح الدعوة" data-broadcast-kind="text" data-broadcast-value={content.preview.fullInviteCta}>
                  {content.preview.fullInviteCta}
                </span>
              </Link>
              <Link href={`/order?template=${previewSettings.templateSlug}`} className="cta-secondary">
                <Sparkles size={18} />
                <span data-broadcast-key="preview.orderCta" data-broadcast-label="زر طلب مشابه" data-broadcast-kind="text" data-broadcast-value={content.preview.orderCta}>
                  {content.preview.orderCta}
                </span>
              </Link>
            </div>
          </div>
        </section>

        <section className="pricing-section">
          <div className="container">
            <div className="features-header">
              <span className="preview-badge" data-broadcast-key="pricing.eyebrow" data-broadcast-label="نص الباقات الصغير" data-broadcast-kind="text" data-broadcast-value={content.pricing.eyebrow}>
                {content.pricing.eyebrow}
              </span>
              <h2 className="features-title" data-broadcast-key="pricing.title" data-broadcast-label="عنوان الباقات" data-broadcast-kind="text" data-broadcast-value={content.pricing.title}>
                {content.pricing.title}
              </h2>
            </div>

            <div className="pricing-grid">
              <div className="pricing-card">
                <div className="pricing-header">
                  <div className="pricing-name" data-broadcast-key="pricing.invitationPlanName" data-broadcast-label="اسم الباقة الأولى" data-broadcast-kind="text" data-broadcast-value={content.pricing.invitationPlanName}>
                    {content.pricing.invitationPlanName}
                  </div>
                  <div className="pricing-price" data-broadcast-key="pricing.invitationPrice" data-broadcast-label="سعر الباقة الأولى" data-broadcast-kind="text" data-broadcast-value={content.pricing.invitationPrice}>
                    {content.pricing.invitationPrice}
                  </div>
                </div>
                <div className="pricing-features">
                  {content.pricing.rows.map((row) => (
                    <div key={row.id} className="pricing-feature" data-broadcast-key={`pricing.rows.${row.id}.feature`} data-broadcast-label={`ميزة باقة: ${row.feature}`} data-broadcast-kind="text" data-broadcast-value={row.feature}>
                      <span className={`pricing-check ${row.invitation ? "pricing-check-included" : "pricing-check-excluded"}`}>{row.invitation ? "✓" : "—"}</span>
                      {row.feature}
                    </div>
                  ))}
                </div>
              </div>

              <div className="pricing-card pricing-card-featured">
                <div className="pricing-header">
                  <div className="pricing-name" data-broadcast-key="pricing.plusPlanName" data-broadcast-label="اسم الباقة الثانية" data-broadcast-kind="text" data-broadcast-value={content.pricing.plusPlanName}>
                    {content.pricing.plusPlanName}
                  </div>
                  <div className="pricing-price" data-broadcast-key="pricing.plusPrice" data-broadcast-label="سعر الباقة الثانية" data-broadcast-kind="text" data-broadcast-value={content.pricing.plusPrice}>
                    {content.pricing.plusPrice}
                  </div>
                </div>
                <div className="pricing-features">
                  {content.pricing.rows.map((row) => (
                    <div key={row.id} className="pricing-feature">
                      <span className={`pricing-check ${row.plus ? "pricing-check-included" : "pricing-check-excluded"}`}>{row.plus ? "✓" : "—"}</span>
                      {row.feature}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <LiveVisitorsCounter />
      <SiteFooter />
      {isBroadcastMode ? <BroadcastAnnotator /> : null}
    </div>
  );
}
