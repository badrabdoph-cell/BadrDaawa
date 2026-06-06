import Link from "next/link";
import { CalendarCheck2, MapPinned, QrCode, Sparkles, UsersRound } from "lucide-react";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";

const features = [
  { icon: CalendarCheck2, title: "دعوة جاهزة", text: "صفحة أنيقة باسم العروسين." },
  { icon: UsersRound, title: "تأكيد حضور", text: "اسم، رقم، وعدد الأفراد." },
  { icon: QrCode, title: "QR وخريطة", text: "مشاركة سهلة ووصول أسرع." },
];

const steps = ["اختر الباقة", "اكتب بيانات الفرح", "استلم الرابط والـ QR"];

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
              <h1>دعوة زفاف فاخرة بدون زحمة</h1>
              <p>رابط أنيق يفتح كظرف ملكي، فيه تفاصيل الفرح، الخريطة، QR، وتأكيد حضور الضيوف.</p>
              <div className="button-row">
                <Link className="btn btn-gold" href="/order">
                  اطلب الدعوة
                </Link>
                <Link className="btn btn-soft" href="/A7X92K">
                  شاهد مثال
                </Link>
              </div>
            </div>
            <div className="hero-card">
              <div className="royal-envelope hero-envelope" aria-hidden="true">
                <div className="royal-envelope-base" />
                <div className="royal-envelope-flap" />
                <div className="royal-envelope-card">
                  <span>دعوة خاصة</span>
                  <strong>سيف &amp; ليلى</strong>
                  <small>18 September 2026</small>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="section compact">
          <div className="container">
            <div className="mobile-feature-grid">
              {features.map((feature) => {
                const Icon = feature.icon;
                return (
                  <article className="panel mini-panel" key={feature.title}>
                    <Icon size={22} />
                    <h2>{feature.title}</h2>
                    <p>{feature.text}</p>
                  </article>
                );
              })}
            </div>
          </div>
        </section>

        <section className="section compact">
          <div className="container split-band">
            <div>
              <span className="eyebrow">الخطوات</span>
              <h2 className="section-title">من الطلب للرابط</h2>
            </div>
            <div className="simple-steps">
              {steps.map((step, index) => (
                <div className="simple-step" key={step}>
                  <strong>{index + 1}</strong>
                  <span>{step}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="section compact">
          <div className="container final-cta">
            <MapPinned size={26} />
            <h2>ابدأ بقالب واحد مصقول</h2>
            <p>نركز الآن على Royal Envelope فقط حتى تكون التجربة ممتازة على الهاتف.</p>
            <Link className="btn btn-gold" href="/order">
              ابدأ الآن
            </Link>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
