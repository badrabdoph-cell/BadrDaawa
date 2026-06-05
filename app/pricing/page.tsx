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
  { name: "Starter", price: "٧٥٠ ج", text: "مناسب لدعوة راقية وسريعة.", features: ["قالب جاهز", "رابط دعوة", "RSVP", "QR Code"] },
  { name: "Premium", price: "١٥٠٠ ج", text: "أفضل اختيار لمعظم الأفراح.", featured: true, features: ["كل Starter", "لوحة عميل", "تصدير Excel/PDF", "صور متعددة", "خريطة القاعة"] },
  { name: "Royal", price: "٣٠٠٠ ج", text: "تجربة مخصصة أكثر.", features: ["تصميم أقرب للمخصص", "افتتاحية خاصة", "موسيقى خلفية", "دعم يوم الفرح"] },
];

export default function PricingPage() {
  return (
    <div className="page-shell">
      <SiteHeader />
      <main className="section">
        <div className="container">
          <SectionIntro eyebrow="الأسعار" title="باقات سهلة البيع والتطوير" lead="الأرقام قابلة للتعديل لاحقًا، لكن الهيكل التجاري جاهز لاستقبال العملاء من اليوم." />
          <div className="pricing-grid">
            {plans.map((plan) => (
              <article className={`pricing-card ${plan.featured ? "featured" : ""}`} key={plan.name}>
                <h3>{plan.name}</h3>
                <p>{plan.text}</p>
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
