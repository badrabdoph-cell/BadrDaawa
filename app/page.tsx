import Link from "next/link";
import { Sparkles } from "lucide-react";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";

export default function HomePage() {
  return (
    <div className="page-shell">
      <SiteHeader />
      <main>
        <section className="hero clean-hero">
          <div className="container hero-grid">
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
            <div className="hero-card">
              <div className="royal-envelope hero-envelope" aria-hidden="true">
                <div className="royal-envelope-base" />
                <div className="royal-envelope-flap" />
                <div className="royal-envelope-card">
                  <span>دعوة خاصة</span>
                  <strong>بدر &amp; سارة</strong>
                  <small>26 October 2026</small>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="section compact live-template-section">
          <div className="container live-template-wrap">
            <div className="live-template-head">
              <span className="eyebrow">Live Preview</span>
              <h2>معاينة مباشرة للقالب</h2>
              <p>نفس الدعوة اللي هتتبعت للمعازيم، بنفس الأنيميشن والتفاصيل.</p>
              <div className="button-row">
                <Link className="btn btn-gold btn-glow" href="/A7X92K">
                  افتح الدعوة كاملة
                </Link>
                <Link className="btn btn-soft btn-glass" href="/order">
                  اعمل واحدة زيها
                </Link>
              </div>
            </div>
            <div className="live-phone-frame" aria-label="معاينة مباشرة لدعوة بدر وسارة">
              <iframe src="/A7X92K" title="معاينة مباشرة لقالب Royal Envelope" loading="lazy" />
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
