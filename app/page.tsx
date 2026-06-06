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
              <div className="live-phone-frame" aria-label="معاينة مباشرة لدعوة بدر وسارة">
                <iframe src="/badr-sarah-1" title="معاينة مباشرة لقالب Royal Envelope" loading="lazy" allow="geolocation; autoplay; notifications" />
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
