import type { Metadata } from "next";
import Link from "next/link";
import { Check, Sparkles, WandSparkles, X } from "lucide-react";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { SectionIntro } from "@/components/SectionIntro";
import { getHomeContent } from "@/lib/home-content";

export const metadata: Metadata = {
  title: "الأسعار",
  description: "باقات دعوات الزفاف الرقمية من BadrDaawa.",
};

export const dynamic = "force-dynamic";

export default async function PricingPage() {
  const content = await getHomeContent();

  return (
    <div className="page-shell">
      <SiteHeader />
      <main className="section compact pricing-page-section">
        <div className="container">
          <SectionIntro eyebrow={content.pricing.eyebrow} title={content.pricing.title} lead="قارن المميزات بسرعة، وبعدها اختار القالب أو ابعت طلب الدعوة مباشرة." />

          <div className="pricing-page-actions" aria-label="إجراءات الأسعار">
            <Link className="btn btn-gold btn-glow" href="/order">
              <WandSparkles size={18} />
              طلب دعوه
            </Link>
            <Link className="btn btn-soft" href="/templates">
              <Sparkles size={18} />
              شوف العينات
            </Link>
          </div>

          <div className="home-pricing-panel pricing-comparison-panel" aria-label="جدول مقارنة الأسعار">
            <div className="home-pricing-head pricing-comparison-head">
              <span>{content.pricing.eyebrow}</span>
              <h2>{content.pricing.title}</h2>
            </div>
            <div className="home-pricing-table pricing-comparison-table" role="table" aria-label="مقارنة باقات الدعوة">
              <div className="home-pricing-row home-pricing-table-head" role="row">
                <div className="home-pricing-feature-head" role="columnheader">الميزة</div>
                <div className="home-pricing-plan-head" role="columnheader">
                  <span>{content.pricing.invitationPlanName}</span>
                  <strong>{content.pricing.invitationPrice}</strong>
                </div>
                <div className="home-pricing-plan-head home-pricing-plan-head-featured" role="columnheader">
                  <span>{content.pricing.plusPlanName}</span>
                  <strong>{content.pricing.plusPrice}</strong>
                </div>
              </div>
              {content.pricing.rows.map((row) => (
                <div className="home-pricing-row" role="row" key={row.id}>
                  <div className="home-pricing-feature" role="cell">
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
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
