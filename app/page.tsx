import Link from "next/link";
import { BellRing, CheckCircle2, Headphones, Link2, Send, SlidersHorizontal, Sparkles, Vote } from "lucide-react";
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
              <div className="button-row">
                <Link className="btn btn-gold btn-glow" href="/order">
                  طلب دعوه
                </Link>
                <Link className="btn btn-soft btn-glass" href="/templates">
                  شوف الاشكال والافكار
                </Link>
              </div>
            </div>
          </div>
        </section>

        <section className="section compact live-template-section">
          <div className="container live-template-wrap">
            <div className="live-preview-stack">
              <div className="live-phone-frame" aria-label="معاينة مباشرة لدعوة بدر و Sara">
                <iframe src="/badr-sarah-1" title="معاينة مباشرة لقالب Royal Envelope" loading="lazy" allow="geolocation; autoplay; notifications" />
              </div>
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
              <div className="button-row live-preview-actions">
                <Link className="btn btn-gold btn-glow" href="/badr-sarah-1">
                  افتح الدعوة كاملة
                </Link>
                <Link className="btn btn-soft btn-glass" href="/order">
                  عايز واحد زيه
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
