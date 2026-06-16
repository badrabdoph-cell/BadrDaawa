import Link from "next/link";
import nextDynamic from "next/dynamic";
import { BellRing, Check, Clock3, Eye, Headphones, LayoutTemplate, Link2, MessageCircle, Palette, Send, SlidersHorizontal, Sparkles, UserCheck, UsersRound, Vote, WandSparkles, X } from "lucide-react";
import { CountUpNumber } from "@/components/CountUpNumber";
import { LiveVisitorsCounter } from "@/components/LiveVisitorsCounter";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { getHomeContent } from "@/lib/home-content";
import { getHomePreviewSettings } from "@/lib/preview-settings";
import { getHomePlatformStats } from "@/lib/home-stats";
import { getSiteSettings } from "@/lib/site-settings";
import { FEATURE_ICONS } from "@/lib/feature-icons";

const BroadcastAnnotator = nextDynamic(() => import("@/components/BroadcastAnnotator").then((mod) => mod.BroadcastAnnotator));

const featureIcons = [Vote, Send, SlidersHorizontal, BellRing, Sparkles, SlidersHorizontal, Sparkles, Headphones, Send, SlidersHorizontal, Vote, Link2, BellRing];
const quickBenefits = [
  { label: "إنشاء سريع", icon: Clock3 },
  { label: "تصاميم فاخرة", icon: LayoutTemplate },
  { label: "إدارة الحضور", icon: UserCheck },
  { label: "مشاركة فورية", icon: MessageCircle },
];

function HomeSectionDivider({ variant = "wave" }: { variant?: "wave" | "lace" | "arc" }) {
  return (
    <div className={`home-section-divider home-section-divider-${variant}`} aria-hidden="true">
      {variant === "wave" ? (
        <svg viewBox="0 0 1440 170" preserveAspectRatio="none" focusable="false">
          <path className="home-divider-fill" d="M0 84L60 76C120 68 240 52 360 67C480 82 600 128 720 127C840 126 960 78 1080 61C1200 44 1320 58 1380 65L1440 72V170H0V84Z" />
          <path className="home-divider-line" d="M0 84C144 63 247 54 360 67C480 82 600 128 720 127C840 126 960 78 1080 61C1200 44 1320 58 1440 72" />
          <path className="home-divider-line soft" d="M0 116C170 92 278 96 410 108C560 122 663 147 794 132C946 115 1046 68 1202 73C1295 76 1360 91 1440 105" />
        </svg>
      ) : null}
      {variant === "lace" ? (
        <svg viewBox="0 0 1180 96" preserveAspectRatio="none" focusable="false">
          <path className="home-divider-line" d="M40 48C166 14 280 14 386 48C492 82 608 82 714 48C820 14 936 14 1140 48" />
          <path className="home-divider-line soft" d="M40 56C210 76 314 76 456 55C598 34 708 34 850 55C966 72 1048 70 1140 56" />
          <circle cx="354" cy="48" r="5" />
          <circle cx="590" cy="48" r="7" />
          <circle cx="826" cy="48" r="5" />
        </svg>
      ) : null}
      {variant === "arc" ? (
        <svg viewBox="0 0 1180 112" preserveAspectRatio="none" focusable="false">
          <path className="home-divider-fill" d="M76 58C244 12 396 14 530 56C665 98 794 105 930 66C1012 42 1080 36 1136 42V112H76V58Z" />
          <path className="home-divider-line" d="M76 58C244 12 396 14 530 56C665 98 794 105 930 66C1012 42 1080 36 1136 42" />
          <path className="home-divider-line soft" d="M126 74C278 47 404 52 542 80C684 109 798 104 920 82C998 68 1058 62 1112 66" />
        </svg>
      ) : null}
    </div>
  );
}

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function HomePage({ searchParams }: { searchParams?: Promise<{ broadcast?: string }> }) {
  const params = searchParams ? await searchParams : {};
  const [previewSettings, content, siteSettings, platformStats] = await Promise.all([getHomePreviewSettings(), getHomeContent(), getSiteSettings(), getHomePlatformStats()]);
  const previewTemplateSrc = `/templates/${previewSettings.templateSlug}/preview?silentPreview=1`;
  const isBroadcastMode = params.broadcast === "1";
  const showHomePanels = siteSettings.homepage.showFeatures || siteSettings.homepage.showPreview || siteSettings.homepage.showPricing;
  const publicStatsBase = {
    invitations: 113,
    customers: 113,
    confirmedRsvps: 31640,
  };
  const stats = [
    { label: "دعوة رقمية", value: publicStatsBase.invitations + platformStats.invitations, icon: Sparkles },
    { label: "عميل سعيد", value: publicStatsBase.customers + platformStats.customers, icon: UsersRound },
    { label: "تسجيل حضور", value: publicStatsBase.confirmedRsvps + platformStats.confirmedRsvps, icon: UserCheck },
  ];

  return (
    <div className="page-shell">
      <style>{`
        .home-features-title-block {
          display: grid;
          justify-items: center;
          gap: 10px;
          margin: 0 auto clamp(20px, 5vw, 34px);
          text-align: center;
        }

        .home-features-title-icon {
          display: grid;
          width: 44px;
          height: 44px;
          place-items: center;
          border: 1px solid rgba(185, 137, 61, 0.28);
          border-radius: 999px;
          background: linear-gradient(135deg, #fffdf8, #f2dfbd);
          color: #8e6428;
          box-shadow: 0 12px 26px rgba(142, 100, 40, 0.14), inset 0 1px 0 rgba(255, 255, 255, 0.74);
        }

        .home-features-title-block h2 {
          max-width: 780px;
          margin: 0;
          color: #241b13;
          font-size: clamp(1.65rem, 7vw, 3.35rem);
          font-weight: 950;
          line-height: 1.16;
          letter-spacing: -0.035em;
        }

        .home-features-title-divider {
          display: flex;
          width: min(240px, 62vw);
          align-items: center;
          justify-content: center;
          gap: 10px;
          color: #b9893d;
        }

        .home-features-title-divider::before,
        .home-features-title-divider::after {
          content: "";
          height: 1px;
          flex: 1;
          background: linear-gradient(90deg, transparent, rgba(185, 137, 61, 0.46));
        }

        .home-features-title-divider::after {
          background: linear-gradient(90deg, rgba(185, 137, 61, 0.46), transparent);
        }
      `}</style>
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
            </div>
          </div>
        </section>

        {showHomePanels ? <HomeSectionDivider variant="wave" /> : null}

        {siteSettings.homepage.showFeatures ? (
          <section className="home-features-panel home-features-panel-upgraded" aria-label="مميزات الدعوة الرقمية">
            <div className="home-features-title-block">
              <span className="home-features-title-icon" aria-hidden="true">
                <Sparkles size={18} />
              </span>
              <h2 data-broadcast-key="features.title" data-broadcast-label="عنوان المميزات" data-broadcast-kind="text" data-broadcast-value="المميزات ال هتاخدها في دعوت فرحك ✨">
                المميزات ال هتاخدها في دعوت فرحك ✨
              </h2>
              <span className="home-features-title-divider" aria-hidden="true">
                <Sparkles size={15} />
              </span>
            </div>
            <div className="home-feature-points">
              {content.features.points.map((item, index) => {
                const Icon = (item.icon && FEATURE_ICONS[item.icon]) || featureIcons[index] || Sparkles;
                return (
                  <article className="home-feature-point" key={item.id}>
                    <span>
                      <Icon size={18} />
                    </span>
                    <strong data-broadcast-key={`features.points.${item.id}.text`} data-broadcast-label={`ميزة: ${item.text}`} data-broadcast-kind="text" data-broadcast-value={item.text}>
                      {item.text}
                    </strong>
                  </article>
                );
              })}
            </div>
          </section>
        ) : null}

        <div className="home-cta-section">
          <div className="button-row home-cta-row">
            <Link className="btn btn-gold btn-glow home-cta home-cta-primary" href="/templates">
              <WandSparkles size={19} />
              <span>أنشئ دعوتك الآن</span>
            </Link>
            <Link className="btn btn-gold btn-glow home-cta home-cta-primary" href="/templates">
              <Palette size={19} />
              <span>استعراض التصاميم</span>
            </Link>
          </div>
        </div>

        {showHomePanels ? (
          <section className="section compact live-template-section" data-no-scroll-animation>
            <div className="container live-template-wrap">
              <div className="live-preview-stack">

                {siteSettings.homepage.showPreview ? (
                  <>
                    <div className="live-preview-title">
                <span data-broadcast-key="preview.eyebrow" data-broadcast-label="نص المعاينة الصغير" data-broadcast-kind="text" data-broadcast-value={content.preview.eyebrow}>
                  {content.preview.eyebrow}
                </span>
                <h2 data-broadcast-key="preview.title" data-broadcast-label="عنوان المعاينة" data-broadcast-kind="text" data-broadcast-value="شاهد كيف تعمل الدعوة">
                  شاهد كيف تعمل الدعوة
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
                {(siteSettings.homepage.showPreview || siteSettings.homepage.showPricing) ? (
                  <section className="home-platform-stats home-platform-stats-compact home-platform-stats-after-preview" aria-label="إحصائيات المنصة">
                    <div className="home-platform-stats-inner">
                      <div className="home-platform-stats-head">
                        <span className="eyebrow">
                          <Sparkles size={16} />
                          آلاف الدعوات بدأت من هنا
                        </span>
                      </div>
                      <div className="home-platform-stats-grid">
                        {stats.map((stat) => {
                          const Icon = stat.icon;
                          return (
                            <article className="home-platform-stat-card" key={stat.label}>
                              <span className="home-platform-stat-icon">
                                <Icon size={22} />
                              </span>
                              <strong>
                                <CountUpNumber value={stat.value} />
                              </strong>
                              <small>{stat.label}</small>
                            </article>
                          );
                        })}
                      </div>
                      <LiveVisitorsCounter />
                    </div>
                  </section>
                ) : null}
                {siteSettings.homepage.showPreview && siteSettings.homepage.showPricing ? <HomeSectionDivider variant="arc" /> : null}
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
      <SiteFooter />
      {isBroadcastMode ? <BroadcastAnnotator /> : null}
    </div>
  );
}
