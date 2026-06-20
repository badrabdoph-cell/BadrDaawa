import Link from "next/link";
import nextDynamic from "next/dynamic";
import { BellRing, Check, Clock3, Eye, Gem, Headphones, Heart, LayoutTemplate, Link2, MessageCircle, Palette, Send, SlidersHorizontal, Smartphone, Sparkles, Star, UserCheck, UsersRound, Vote, WandSparkles, X } from "lucide-react";
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

const featureIcons = [Vote, Send, SlidersHorizontal, BellRing, Sparkles, Headphones, Link2, Heart, Gem, Star, Palette, UserCheck, Clock3];
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

export default async function HomePage({ searchParams }: { searchParams?: Promise<{ broadcast?: string }> }) {
  const params = searchParams ? await searchParams : {};
  const [previewSettings, content, siteSettings, platformStats] = await Promise.all([getHomePreviewSettings().catch(() => null), getHomeContent().catch(() => null), getSiteSettings().catch(() => null), getHomePlatformStats().catch(() => null)]);
  const previewTemplateSrc = `/templates/${previewSettings?.templateSlug || "featured-1"}/preview?silentPreview=1`;
  const isBroadcastMode = params.broadcast === "1";
  const showHomePanels = siteSettings?.homepage?.showFeatures || siteSettings?.homepage?.showPreview || siteSettings?.homepage?.showPricing;
  const publicStatsBase = {
    invitations: platformStats?.invitations ?? 0,
    customers: platformStats?.customers ?? 0,
    confirmedRsvps: platformStats?.confirmedRsvps ?? 0,
  };
  const FAKE_OFFSET = {
    invitations: 113,
    customers: 116,
    confirmedRsvps: 8269,
  };
  const stats = [
    { label: "دعوة رقمية", value: publicStatsBase.invitations, icon: Smartphone, fakeOffset: FAKE_OFFSET.invitations },
    { label: "عميل سعيد", value: publicStatsBase.customers, icon: UsersRound, fakeOffset: FAKE_OFFSET.customers },
    { label: "تسجيل حضور", value: publicStatsBase.confirmedRsvps, icon: UserCheck, fakeOffset: FAKE_OFFSET.confirmedRsvps },
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

        .hero-title-style::before {
          background: linear-gradient(180deg, rgba(251, 247, 239, 0.98) 0%, rgba(251, 247, 239, 0.85) 50%, rgba(251, 247, 239, 0.5) 100%) !important;
        }

        .hero-title-block {
          display: grid;
          justify-items: center;
          gap: 8px;
          margin: 0 auto;
          position: relative;
          text-align: center;
        }

        .hero-title-icon {
          display: grid;
          width: 56px;
          height: 56px;
          margin-bottom: 6px;
          place-items: center;
          border: 1px solid rgba(185, 137, 61, 0.32);
          border-radius: 999px;
          background: linear-gradient(135deg, #fffdf8, #f2dfbd);
          color: #8e6428;
          box-shadow: 0 14px 28px rgba(142, 100, 40, 0.16), inset 0 1px 0 rgba(255, 255, 255, 0.8);
        }

        .hero-title-kicker {
          color: #b9893d;
          font-size: clamp(0.78rem, 1.4vw, 0.95rem);
          font-weight: 900;
          letter-spacing: 0.34em;
          text-transform: uppercase;
        }

        .hero-title-main {
          max-width: 820px;
          margin: 0;
          color: #241b13;
          font-size: clamp(2.4rem, 10vw, 5.4rem);
          font-weight: 1000;
          line-height: 1.04;
          letter-spacing: -0.04em;
          text-wrap: balance;
        }

        .hero-title-accent {
          max-width: 680px;
          color: #766b60;
          font-size: clamp(1.05rem, 2.6vw, 1.5rem);
          font-weight: 700;
          line-height: 1.45;
          text-wrap: balance;
        }

        .hero-title-divider {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          width: min(200px, 46vw);
          margin: 2px 0 4px;
          color: #b9893d;
        }

        .hero-title-divider::before,
        .hero-title-divider::after {
          content: "";
          height: 1px;
          flex: 1;
          background: linear-gradient(90deg, transparent, rgba(185, 137, 61, 0.5));
        }

        .hero-title-divider::after {
          background: linear-gradient(90deg, rgba(185, 137, 61, 0.5), transparent);
        }

        .hero-sticker {
          position: absolute;
          opacity: 0.35;
          animation: heroStickerFloat 3.6s ease-in-out infinite;
          pointer-events: none;
        }

        .hero-sticker-tl {
          top: -14px;
          inset-inline-start: -18px;
          color: #bd8f3f;
        }

        .hero-sticker-tr {
          top: -6px;
          inset-inline-end: -16px;
          color: #a8435a;
          animation-delay: 0.5s;
        }

        .hero-sticker-bl {
          bottom: 4px;
          inset-inline-start: -26px;
          color: #315f56;
          animation-delay: 1s;
        }

        .hero-sticker-br {
          bottom: 10px;
          inset-inline-end: -22px;
          color: #bd8f3f;
          animation-delay: 1.5s;
        }

        @keyframes heroStickerFloat {
          0%, 100% { transform: translateY(0) rotate(0deg); }
          50% { transform: translateY(-10px) rotate(6deg); }
        }

        @media (max-width: 640px) {
          .hero-sticker {
            display: none;
          }
        }
      `}</style>
      <SiteHeader />
      <main>
        <section className="hero clean-hero hero-title-style">
          <div className="container hero-grid hero-grid-single">
            <div className="hero-copy">
              <h1 className="hero-title-block">
                <span className="hero-sticker hero-sticker-tl" aria-hidden="true">
                  <Sparkles size={15} />
                </span>
                <span className="hero-sticker hero-sticker-tr" aria-hidden="true">
                  <Heart size={13} />
                </span>
                <span className="hero-sticker hero-sticker-bl" aria-hidden="true">
                  <Gem size={14} />
                </span>
                <span className="hero-sticker hero-sticker-br" aria-hidden="true">
                  <Star size={12} />
                </span>
                <span className="hero-title-icon" aria-hidden="true">
                  <Sparkles size={22} />
                </span>
                <span className="hero-title-kicker" data-broadcast-key="hero.kicker" data-broadcast-label="النص العلوي" data-broadcast-kind="text" data-broadcast-value={content?.hero?.kicker || "دعوتك الرقمية"}>
                  {content?.hero?.kicker || "دعوتك الرقمية"}
                </span>
                <span className="hero-title-main" data-broadcast-key="hero.mainTitle" data-broadcast-label="العنوان الرئيسي" data-broadcast-kind="text" data-broadcast-value={content?.hero?.mainTitle || "دعوتك"}>
                  {content?.hero?.mainTitle || "دعوتك"}
                </span>
                <span className="hero-title-divider" aria-hidden="true" />
                <span className="hero-title-accent" data-broadcast-key="hero.accentTitle" data-broadcast-label="العنوان الملون" data-broadcast-kind="text" data-broadcast-value={content?.hero?.accentTitle || "بأجمل التفاصيل"}>
                  {content?.hero?.accentTitle || "بأجمل التفاصيل"}
                </span>
              </h1>
            </div>
          </div>
        </section>

        {showHomePanels ? <HomeSectionDivider variant="wave" /> : null}

        {siteSettings?.homepage?.showFeatures ? (
          <section className="home-features-panel home-features-panel-upgraded" aria-label="مميزات الدعوة الرقمية">
            <div className="home-features-title-block">
              <span className="home-features-title-icon" aria-hidden="true">
                <Sparkles size={18} />
              </span>
              <h2 data-broadcast-key="features.title" data-broadcast-label="عنوان المميزات" data-broadcast-kind="text" data-broadcast-value={content?.features?.title || "المميزات ال هتاخدها في دعوت فرحك ✨"}>
                {content?.features?.title || "المميزات ال هتاخدها في دعوت فرحك ✨"}
              </h2>
              <span className="home-features-title-divider" aria-hidden="true">
                <Sparkles size={15} />
              </span>
            </div>
            <div className="home-feature-points">
              {(content?.features?.points || []).map((item, index) => {
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

                {siteSettings?.homepage?.showPreview ? (
                  <>
                    <div className="live-preview-title">
                <span data-broadcast-key="preview.eyebrow" data-broadcast-label="نص المعاينة الصغير" data-broadcast-kind="text" data-broadcast-value={content?.preview?.eyebrow || "معاينة حية"}>
                  {content?.preview?.eyebrow || "معاينة حية"}
                </span>
                <h2 data-broadcast-key="preview.title" data-broadcast-label="عنوان المعاينة" data-broadcast-kind="text" data-broadcast-value="شاهد كيف تعمل الدعوة">
                  شاهد كيف تعمل الدعوة
                </h2>
              </div>
              <div className="live-phone-frame" aria-label="معاينة مباشرة لدعوة بدر و Sara" data-broadcast-key="preview.media" data-broadcast-label="ميديا المعاينة" data-broadcast-kind="media" data-broadcast-value={previewSettings?.mode === "video" ? previewSettings?.videoUrl : previewSettings?.mode === "image" ? previewSettings?.imageUrl : previewSettings?.templateSlug}>
                <span className="live-preview-badge" data-broadcast-key="preview.badge" data-broadcast-label="شارة المعاينة" data-broadcast-kind="text" data-broadcast-value={content?.preview?.badge || "دعوة رقمية"}>
                  {content?.preview?.badge || "دعوة رقمية"}
                </span>
                {previewSettings?.mode === "image" && previewSettings?.imageUrl ? (
                  <img className="live-preview-media" src={previewSettings.imageUrl} alt="معاينة صورة الدعوة" loading="lazy" decoding="async" />
                ) : previewSettings?.mode === "video" && previewSettings?.videoUrl ? (
                  <video className="live-preview-media" src={previewSettings.videoUrl} muted loop playsInline autoPlay controls preload="metadata" />
                ) : (
                  <iframe src={previewTemplateSrc} title="معاينة مباشرة لقالب الدعوة" loading="lazy" sandbox="allow-scripts allow-same-origin" />
                )}
              </div>
              <div className="button-row live-preview-actions">
                <Link className="btn btn-gold btn-glow home-cta home-cta-primary" href="/badr-sarah-1">
                  <Eye size={19} />
                  <span data-broadcast-key="preview.fullInviteCta" data-broadcast-label="زر فتح الدعوة" data-broadcast-kind="text" data-broadcast-value={content?.preview?.fullInviteCta || "فتح الدعوة"}>
                    {content?.preview?.fullInviteCta || "فتح الدعوة"}
                  </span>
                </Link>
                <Link className="btn btn-gold btn-glow home-cta home-cta-primary" href="/templates">
                  <Sparkles size={19} />
                  <span data-broadcast-key="preview.orderCta" data-broadcast-label="زر طلب مشابه" data-broadcast-kind="text" data-broadcast-value={content?.preview?.orderCta || "اطلب مشابه"}>
                    {content?.preview?.orderCta || "اطلب مشابه"}
                  </span>
                </Link>
              </div>
                  </>
                ) : null}
                {(siteSettings?.homepage?.showPreview || siteSettings?.homepage?.showPricing) ? (
                  <section className="home-platform-stats home-platform-stats-compact home-platform-stats-after-preview" aria-label="إحصائيات المنصة">
                    <div className="home-platform-stats-inner">
                      <div className="home-platform-stats-head">
                        <span className="eyebrow" data-broadcast-key="stats.eyebrow" data-broadcast-label="نص الإحصائيات" data-broadcast-kind="text" data-broadcast-value="آلاف الدعوات بدأت من هنا">
                          <Sparkles size={16} />
                          آلاف الدعوات بدأت من هنا
                        </span>
                      </div>
                      <div className="home-platform-stats-grid">
                        {stats.map((stat, i) => {
                          const Icon = stat.icon;
                          const isFeatured = i === stats.length - 1;
                          return (
                            <article className={`home-platform-stat-card${isFeatured ? " home-platform-stat-card-featured" : ""}`} key={stat.label}>
                              <span className="home-platform-stat-icon">
                                <Icon size={22} />
                              </span>
                              <strong>
                                <CountUpNumber value={stat.value} fakeOffset={stat.fakeOffset} continuous />
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
                {siteSettings?.homepage?.showPreview && siteSettings?.homepage?.showPricing ? <HomeSectionDivider variant="arc" /> : null}
                {siteSettings?.homepage?.showPricing ? (
                  <div className="home-pricing-panel" aria-label="باقات الأسعار">
                <div className="home-pricing-head">
                  <span data-broadcast-key="pricing.eyebrow" data-broadcast-label="نص الباقات الصغير" data-broadcast-kind="text" data-broadcast-value={content?.pricing?.eyebrow || "الباقات"}>
                    {content?.pricing?.eyebrow || "الباقات"}
                  </span>
                  <h2 data-broadcast-key="pricing.title" data-broadcast-label="عنوان الباقات" data-broadcast-kind="text" data-broadcast-value={content?.pricing?.title || "اختر باقتك"}>
                    {content?.pricing?.title || "اختر باقتك"}
                  </h2>
                </div>
                <div className="home-pricing-table" role="table" aria-label="مقارنة باقات الدعوة">
                  <div className="home-pricing-row home-pricing-table-head" role="row">
                    <div className="home-pricing-feature-head" role="columnheader">الميزة</div>
                    <div className="home-pricing-plan-head" role="columnheader">
                      <span data-broadcast-key="pricing.invitationPlanName" data-broadcast-label="اسم الباقة الأولى" data-broadcast-kind="text" data-broadcast-value={content?.pricing?.invitationPlanName || "الباقة الأساسية"}>
                        {content?.pricing?.invitationPlanName || "الباقة الأساسية"}
                      </span>
                      <strong data-broadcast-key="pricing.invitationPrice" data-broadcast-label="سعر الباقة الأولى" data-broadcast-kind="text" data-broadcast-value={content?.pricing?.invitationPrice || "---"}>
                        {content?.pricing?.invitationPrice || "---"}
                      </strong>
                    </div>
                    <div className="home-pricing-plan-head home-pricing-plan-head-featured" role="columnheader">
                      <span data-broadcast-key="pricing.plusPlanName" data-broadcast-label="اسم الباقة الثانية" data-broadcast-kind="text" data-broadcast-value={content?.pricing?.plusPlanName || "الباقة الماسية"}>
                        {content?.pricing?.plusPlanName || "الباقة الماسية"}
                      </span>
                      <strong data-broadcast-key="pricing.plusPrice" data-broadcast-label="سعر الباقة الثانية" data-broadcast-kind="text" data-broadcast-value={content?.pricing?.plusPrice || "---"}>
                        {content?.pricing?.plusPrice || "---"}
                      </strong>
                    </div>
                  </div>
                  {(content?.pricing?.rows || []).map((row) => (
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
