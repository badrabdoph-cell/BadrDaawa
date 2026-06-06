import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { SectionIntro } from "@/components/SectionIntro";

export const metadata: Metadata = {
  title: "الأسعار",
  description: "باقات دعوات الزفاف الرقمية من BadrDaawa.",
};

const plans = [
  { name: "Starter", price: "750 ج", features: ["رابط دعوة", "QR", "RSVP"] },
  { name: "Premium", price: "1500 ج", featured: true, features: ["صور", "لوحة عميل", "تصدير"] },
  { name: "Royal", price: "3000 ج", features: ["تعديل خاص", "موسيقى", "دعم"] },
];

export default function PricingPage() {
  return (
    <div className="page-shell">
      <SiteHeader />
      <main className="section compact">
        <div className="container">
          <SectionIntro eyebrow="الأسعار" title="اختار المناسب" lead="ثلاث باقات واضحة، والبداية من واتساب." />
          <div className="pricing-grid">
            {plans.map((plan) => (
              <article className={`pricing-card ${plan.featured ? "featured" : ""}`} key={plan.name}>
                <h3>{plan.name}</h3>
                <div className="price">{plan.price}</div>
                <ul className="feature-list">
                  {plan.features.map((feature) => (
                    <li key={feature}>
                      <CheckCircle2 size={18} />
                      {feature}
                    </li>
                  ))}
                </ul>
                <Link className={plan.featured ? "btn btn-gold" : "btn btn-soft"} href="/order">
                  اطلب الآن
                </Link>
              </article>
            ))}
          </div>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
