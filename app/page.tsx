import Link from "next/link";
import { BellRing, Eye, Headphones, Link2, Palette, Send, SlidersHorizontal, Sparkles, Vote, WandSparkles } from "lucide-react";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";

const homeFeaturePoints = [
  { icon: Sparkles, text: "انشئ دعوة زفافك بنفسك" },
  { icon: Headphones, text: "متابعة حالة الدعم 24/7" },
  { icon: Send, text: "تقدر تبعت رسالة لكل اللي حضر الدعوة" },
  { icon: SlidersHorizontal, text: "تقدر تعدل براحتك في دعوتك" },
  { icon: Vote, text: "استفتاء مين هيحضر ومين لا" },
  { icon: Link2, text: "رابط خاص بيك + رابط متابعة + قائمة بتتحدث فوري" },
];

export default function HomePage() {
  return (
    <div className="page-shell">
      <SiteHeader />
      <main>
        <section className="hero clean-hero">
          <div className="container hero-grid hero-grid-single">
            <div className="hero-copy">
              <span className="eyebrow">
                <Sparkles size={16} />
                Royal Envelope
              </span>
              <h1>دعوه فرحك بشكل كريتف وترندي</h1>
              <p className="hero-shine-copy">حابب تعمل دعايه لنفسك والمعازيم تعرفك قبل ما الفرح يبدأ أصلًا؟</p>
              <div className="button-row home-cta-row">
                <Link className="btn btn-gold btn-glow home-cta home-cta-primary" href="/order">
                  <WandSparkles size={19} />
                  <span>طلب دعوه</span>
                </Link>
                <Link className="btn btn-soft btn-glass home-cta home-cta-secondary" href="/templates">
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
              <div className="home-feature-points" aria-label="مميزات الدعوة الرقمية">
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
                <div className="home-feature-point home-feature-point-wide">
                  <span>
                    <BellRing size={17} />
                  </span>
                  <strong>تعرف مين دخل الدعوة وتتابع الحضور أول بأول</strong>
                </div>
              </div>
              <div className="live-preview-title">
                <span>اختر استايلك الخاص ✨</span>
                <h2>كل دعوة ليها شكل يحكي فرحتك</h2>
              </div>
              <div className="live-phone-frame" aria-label="معاينة مباشرة لدعوة بدر و Sara">
                <span className="live-preview-badge">معاينة</span>
                <iframe src="/badr-sarah-1?silentPreview=1" title="معاينة مباشرة لقالب Royal Envelope" loading="lazy" allow="geolocation; notifications" />
                <Link className="live-preview-open" href="/templates" aria-label="افتح صفحة القوالب واختر استايلك الخاص" />
              </div>
              <div className="button-row live-preview-actions">
                <Link className="btn btn-gold btn-glow home-cta home-cta-primary" href="/badr-sarah-1">
                  <Eye size={19} />
                  <span>افتح الدعوة كاملة</span>
                </Link>
                <Link className="btn btn-soft btn-glass home-cta home-cta-secondary" href="/order">
                  <Sparkles size={19} />
                  <span>عايز واحد زيه</span>
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
