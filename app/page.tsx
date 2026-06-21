import Link from "next/link";
import nextDynamic from "next/dynamic";
import { BellRing, Check, Clock3, Eye, Gem, Headphones, Heart, LayoutTemplate, Link2, MessageCircle, Palette, Send, SlidersHorizontal, Smartphone, Sparkles, Star, UserCheck, UsersRound, Vote, WandSparkles, X } from "lucide-react";
import { CountUpNumber } from "@/components/CountUpNumber";
import { LiveVisitorsCounter } from "@/components/LiveVisitorsCounter";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { AnnouncementBar } from "@/components/AnnouncementBar";
import { QuickBenefits } from "@/components/QuickBenefits";
import { HowItWorks } from "@/components/HowItWorks";
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
  const showAnyContent = siteSettings?.homepage?.showPreview || siteSettings?.homepage?.showPricing;
  const LIVE_STATS_BASE = [
    { label: "دعوه منشأه", value: 116, icon: Smartphone },
    { label: "زياره", value: 60062, icon: UsersRound },
    { label: "تسجيل حضور", value: 8322, icon: UserCheck },
  ];

  return (
    <div className="page-shell">
      <AnnouncementBar />
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
                <span className="hero-title-main" data-broadcast-key="hero.mainTitle" data-broadcast-label="العنوان الرئيسي" data-broadcast-kind="text" data-broadcast-value={"ودّع الدعوات الورقية والزحمة… وادعُ ضيوفك بطريقة أذكى"}>
                  ودّع الدعوات الورقية والزحمة… وادعُ ضيوفك بطريقة أذكى
                </span>
                <span className="hero-title-divider" aria-hidden="true" />
                <span className="hero-title-accent" data-broadcast-key="hero.accentTitle" data-broadcast-label="الوصف" data-broadcast-kind="text" data-broadcast-value={"صمم دعوة زفاف إلكترونية فخمة خلال دقائق، وتابع الحضور لحظة بلحظة، واعرف بالضبط مين شاف الدعوة ومين أكد حضوره."}>
                  صمم دعوة زفاف إلكترونية فخمة خلال دقائق، وتابع الحضور لحظة بلحظة، واعرف بالضبط مين شاف الدعوة ومين أكد حضوره.
                </span>
              </h1>
              <div className="button-row" style={{ justifyContent: "center", marginTop: "clamp(16px, 3vw, 28px)" }}>
                <Link className="btn btn-gold btn-glow home-cta home-cta-primary" href="/templates">
                  <Palette size={19} />
                  <span>شاهد التصاميم</span>
                </Link>
                <Link className="btn btn-gold btn-glow home-cta home-cta-primary" href="/templates">
                  <Sparkles size={19} />
                  <span>اطلب دعوتك الآن</span>
                </Link>
              </div>
            </div>
          </div>
        </section>

        <QuickBenefits />

        <HowItWorks />

        {showAnyContent ? (
          <HomeSectionDivider variant="wave" />
        ) : null}

        {showAnyContent ? (
          <section className="home-platform-stats home-platform-stats-compact home-platform-stats-after-preview" aria-label="إحصائيات المنصة">
              <div className="home-platform-stats-inner">
                <div className="home-platform-stats-head">
                  <span className="eyebrow" data-broadcast-key="stats.eyebrow" data-broadcast-label="نص الإحصائيات" data-broadcast-kind="text" data-broadcast-value="آلاف الدعوات بدأت من هنا">
                    <Sparkles size={16} />
                    آلاف الدعوات بدأت من هنا
                  </span>
                </div>
                <div className="home-platform-stats-grid">
                  {LIVE_STATS_BASE.map((stat, i) => {
                    const Icon = stat.icon;
                    const isFeatured = i === LIVE_STATS_BASE.length - 1;
                    return (
                      <article className={`home-platform-stat-card${isFeatured ? " home-platform-stat-card-featured" : ""}`} key={stat.label}>
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

        {siteSettings?.homepage?.showPreview ? (
          <section className="section compact live-template-section" data-no-scroll-animation>
            <div className="container live-template-wrap">
              <div className="live-preview-stack">
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
              </div>
            </div>
          </section>
        ) : null}

        {showHomePanels ? <HomeSectionDivider variant="lace" /> : null}

        {siteSettings?.homepage?.showFeatures ? (
          <section id="features-section" className="home-features-panel home-features-panel-upgraded" aria-label="مميزات الدعوة الرقمية">
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

        {siteSettings?.homepage?.showPricing ? (
          <>
            <div className="pricing-offer-bar">
              🎁 جميع الباقات مجانية حالياً لفترة محدودة أثناء المرحلة التجريبية.
            </div>
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
                      <span className="home-pricing-slashed">{content?.pricing?.invitationPrice || "---"}</span>
                      <span className="home-pricing-free">مجاناً الآن</span>
                    </strong>
                  </div>
                  <div className="home-pricing-plan-head home-pricing-plan-head-featured" role="columnheader">
                    <span data-broadcast-key="pricing.plusPlanName" data-broadcast-label="اسم الباقة الثانية" data-broadcast-kind="text" data-broadcast-value={content?.pricing?.plusPlanName || "الباقة الماسية"}>
                      {content?.pricing?.plusPlanName || "الباقة الماسية"}
                    </span>
                    <strong data-broadcast-key="pricing.plusPrice" data-broadcast-label="سعر الباقة الثانية" data-broadcast-kind="text" data-broadcast-value={content?.pricing?.plusPrice || "---"}>
                      <span className="home-pricing-slashed">{content?.pricing?.plusPrice || "---"}</span>
                      <span className="home-pricing-free">مجاناً الآن</span>
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
          </>
        ) : null}
      </main>
      <SiteFooter />
      {isBroadcastMode ? <BroadcastAnnotator /> : null}
    </div>
  );
}
