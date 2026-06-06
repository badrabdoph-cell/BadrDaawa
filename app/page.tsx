import Link from "next/link";
import { BellRing, Check, Eye, Headphones, Link2, Palette, Send, SlidersHorizontal, Sparkles, Vote, WandSparkles, X } from "lucide-react";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { getHomePreviewSettings } from "@/lib/preview-settings";

const homeFeaturePoints = [
  { icon: Vote, text: "مفتوح تسجيلات الحضور" },
  { icon: Send, text: "الحصول على سجلات الحضور بالأسماء وأرقام الهواتف" },
  { icon: SlidersHorizontal, text: "بيدج أدمن خاصة بيك" },
  { icon: BellRing, text: "إشعار تذكير بموعد الفرح للمسجلين حضور" },
  { icon: Sparkles, text: "إضافة أغاني أو موسيقى تشتغل تلقائي عند فتح الدعوة" },
  { icon: SlidersHorizontal, text: "إمكانية التعديل على التصميم في أي وقت" },
  { icon: Sparkles, text: "انشئ دعوة زفافك بنفسك" },
  { icon: Headphones, text: "متابعة حالة الدعم 24/7" },
  { icon: Send, text: "تقدر تبعت رسالة لكل اللي حضر الدعوة" },
  { icon: SlidersHorizontal, text: "تقدر تعدل براحتك في دعوتك" },
  { icon: Vote, text: "استفتاء مين هيحضر ومين لا" },
  { icon: Link2, text: "رابط خاص بيك + رابط متابعة + قائمة بتتحدث فوري" },
  { icon: BellRing, text: "تعرف مين دخل الدعوة وتتابع الحضور أول بأول" },
];

const homePricingRows = [
  { feature: "إشعار تذكير بموعد الفرح للمسجلين حضور", invitation: false, plus: true },
  { feature: "إضافة أغاني أو موسيقى من اختيارك تشتغل تلقائي عند فتح الدعوة", invitation: false, plus: true },
  { feature: "إمكانية التعديل على التصميم في أي وقت", invitation: false, plus: true },
  { feature: "صفحة الدعوة الأساسية", invitation: true, plus: true },
  { feature: "اختيار التصميم", invitation: true, plus: true },
  { feature: "مفتوح كومنت", invitation: true, plus: true },
  { feature: "مفتوح تسجيلات الحضور", invitation: true, plus: true },
  { feature: "بيدج أدمن خاصة بيك", invitation: true, plus: true },
  { feature: "الحصول على سجلات الحضور بالأسماء وأرقام الهواتف", invitation: true, plus: true },
  { feature: "خدمة عملاء", invitation: true, plus: true },
];

export default async function HomePage() {
  const previewSettings = await getHomePreviewSettings();
  const previewTemplateSrc = `/templates/${previewSettings.templateSlug}/preview?silentPreview=1`;

  return (
    <div className="page-shell">
      <SiteHeader />
      <main>
        <section className="hero clean-hero">
          <div className="container hero-grid hero-grid-single">
            <div className="hero-copy">
              <h1 className="home-hero-title">
                <span className="home-hero-title-kicker">Forever Begins Here</span>
                <span className="home-hero-title-main">دعوة فرحك</span>
                <span className="home-hero-title-divider" aria-hidden="true">
                  <span />
                  <Sparkles size={18} />
                  <span />
                </span>
                <span className="home-hero-title-accent">
                  <span>بشكل كريتف وترندي</span>
                </span>
              </h1>
              <p className="hero-shine-copy">حابب تعمل دعايه لنفسك والمعازيم تعرفك قبل ما الفرح يبدأ أصلًا؟</p>
              <div className="button-row home-cta-row">
                <Link className="btn btn-gold btn-glow home-cta home-cta-primary" href="/order">
                  <WandSparkles size={19} />
                  <span>طلب دعوه</span>
                </Link>
                <Link className="btn btn-gold btn-glow home-cta home-cta-primary" href="/templates">
                  <Palette size={19} />
                  <span>شوف الاشكال والافكار</span>
                </Link>
              </div>
            </div>
          </div>
        </section>

        <section className="section compact live-template-section">
          <div className="container live-template-wrap">
            <div className="live-preview-stack">
              <div className="home-features-panel" aria-label="مميزات الدعوة الرقمية">
                <div className="home-features-head">
                  <span>
                    <Sparkles size={16} />
                  </span>
                  <h2>المميزات ال هتتقدملك</h2>
                </div>
                <div className="home-feature-points">
                  {homeFeaturePoints.map((item) => {
                    const Icon = item.icon;
                    return (
                      <div className="home-feature-point" key={item.text}>
                        <span>
                          <Icon size={17} />
                        </span>
                        <strong>{item.text}</strong>
                      </div>
                    );
                  })}
                </div>
              </div>
              <div className="live-preview-title">
                <span>اختر استايلك الخاص ✨</span>
                <h2>كل دعوة ليها شكل يحكي فرحتك</h2>
              </div>
              <div className="live-phone-frame" aria-label="معاينة مباشرة لدعوة بدر و Sara">
                <span className="live-preview-badge">معاينة</span>
                {previewSettings.mode === "image" && previewSettings.imageUrl ? (
                  <img className="live-preview-media" src={previewSettings.imageUrl} alt="معاينة صورة الدعوة" />
                ) : previewSettings.mode === "video" && previewSettings.videoUrl ? (
                  <video className="live-preview-media" src={previewSettings.videoUrl} muted loop playsInline autoPlay controls />
                ) : (
                  <iframe src={previewTemplateSrc} title="معاينة مباشرة لقالب الدعوة" loading="lazy" allow="geolocation; notifications" />
                )}
                <Link className="live-preview-open" href="/templates" aria-label="افتح صفحة القوالب واختر استايلك الخاص" />
              </div>
              <div className="button-row live-preview-actions">
                <Link className="btn btn-gold btn-glow home-cta home-cta-primary" href="/badr-sarah-1">
                  <Eye size={19} />
                  <span>افتح الدعوة كاملة</span>
                </Link>
                <Link className="btn btn-gold btn-glow home-cta home-cta-primary" href="/order">
                  <Sparkles size={19} />
                  <span>عايز واحد زيه</span>
                </Link>
              </div>
              <div className="home-pricing-panel" aria-label="باقات الأسعار">
                <div className="home-pricing-head">
                  <span>الباقات</span>
                  <h2>اختار المناسب لفرحك</h2>
                </div>
                <div className="home-pricing-table" role="table" aria-label="مقارنة باقات الدعوة">
                  <div className="home-pricing-row home-pricing-table-head" role="row">
                    <div className="home-pricing-feature-head" role="columnheader">الميزة</div>
                    <div className="home-pricing-plan-head" role="columnheader">
                      <span>باقة الدعوة فقط</span>
                      <strong>100 ج</strong>
                    </div>
                    <div className="home-pricing-plan-head home-pricing-plan-head-featured" role="columnheader">
                      <span>باقة الدعوة بلس</span>
                      <strong>300 ج</strong>
                    </div>
                  </div>
                  {homePricingRows.map((row) => (
                    <div className="home-pricing-row" role="row" key={row.feature}>
                      <div className="home-pricing-feature" role="cell">{row.feature}</div>
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
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
