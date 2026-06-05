import Link from "next/link";
import { BarChart3, CheckCircle2, Clock3, Crown, MapPinned, QrCode, ShieldCheck, Sparkles, UsersRound } from "lucide-react";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { SectionIntro } from "@/components/SectionIntro";
import { TemplateCard } from "@/components/TemplateCard";
import { featuredTemplates } from "@/lib/templates";

const benefits = [
  { icon: Crown, title: "دعوة إلكترونية راقية", text: "صفحة خاصة مصممة بإحساس فندقي، مش صورة ثابتة ولا لينك عادي." },
  { icon: QrCode, title: "QR Code تلقائي", text: "كود جاهز للطباعة على كارت أو شاشة الاستقبال ويفتح الدعوة فورًا." },
  { icon: UsersRound, title: "تأكيد حضور RSVP", text: "الضيف يكتب اسمه ورقمه وعدد الأفراد، والرد يظهر فورًا للعميل." },
  { icon: BarChart3, title: "لوحة متابعة", text: "إحصائيات الحضور، أرقام الضيوف، وتصدير Excel وPDF." },
  { icon: MapPinned, title: "موقع القاعة", text: "رابط خرائط واضح يساعد الضيوف يوصلوا بدون اتصالات متكررة." },
  { icon: ShieldCheck, title: "قابل للتوسع", text: "دعوات ديناميكية من قاعدة بيانات واحدة، بدون إنشاء صفحات يدويًا." },
];

const journey = ["اختار القالب المناسب", "ابعت بيانات الفرح والصور", "نجهز رابط الدعوة وQR", "تابع حضور ضيوفك من اللوحة"];

const faqs = [
  ["هل الدعوة صفحة خاصة؟", "نعم، كل عميل يحصل على رابط خاص مثل BadrDaawa.com/A7X92K يتم تحميل بياناته ديناميكيًا من قاعدة البيانات."],
  ["هل يوجد دفع أونلاين؟", "في هذه النسخة الطلب يتحول مباشرة إلى واتساب برسالة جاهزة، بدون بوابة دفع."],
  ["هل يمكن تغيير القالب لاحقًا؟", "من لوحة Super Admin يمكن تغيير القالب أو إيقاف الدعوة أو تعديل البيانات بدون إعادة بناء الموقع."],
];

export default function HomePage() {
  return (
    <div className="page-shell">
      <SiteHeader />
      <main>
        <section className="hero">
          <div className="container hero-grid">
            <div className="hero-copy">
              <span className="eyebrow">
                <Sparkles size={16} />
                دعوات زفاف رقمية فاخرة
              </span>
              <h1>دعوة فرحك بشكل يليق بفرحتك</h1>
              <p>
                BadrDaawa منصة عربية متخصصة في دعوات الزفاف الرقمية، بتجربة أنيقة للضيوف ولوحة متابعة سهلة للعروسين وصاحب الموقع.
              </p>
              <div className="button-row">
                <Link className="btn btn-gold" href="/order">
                  <Sparkles size={19} />
                  ابدأ دعوة جديدة
                </Link>
                <Link className="btn btn-soft" href="/templates">
                  شاهد ٢٠ قالب
                </Link>
              </div>
              <div className="hero-metrics">
                <div className="metric-tile">
                  <strong>٢٠</strong>
                  <span>قالب فاخر</span>
                </div>
                <div className="metric-tile">
                  <strong>QR</strong>
                  <span>تلقائي لكل دعوة</span>
                </div>
                <div className="metric-tile">
                  <strong>24/7</strong>
                  <span>تأكيد حضور مباشر</span>
                </div>
              </div>
            </div>
            <div className="hero-card animate-float">
              <div className="hero-card-inner">
                <span>Royal Envelope</span>
                <h2>سيف &amp; ليلى</h2>
                <p>18 سبتمبر 2026 - القاهرة</p>
              </div>
            </div>
          </div>
        </section>

        <section className="section">
          <div className="container">
            <SectionIntro
              eyebrow="كل ما يحتاجه الفرح"
              title="من أول القالب لحد قائمة الحضور"
              lead="المنصة مصممة كمنتج تجاري حقيقي: صفحة دعوة، RSVP، QR، لوحة عميل، ولوحة إدارة مركزية بدون تعقيد."
            />
            <div className="grid-3" style={{ marginTop: 28 }}>
              {benefits.map((benefit) => {
                const Icon = benefit.icon;
                return (
                  <article className="panel benefit-card" key={benefit.title}>
                    <span className="benefit-icon">
                      <Icon size={23} />
                    </span>
                    <h3>{benefit.title}</h3>
                    <p>{benefit.text}</p>
                  </article>
                );
              })}
            </div>
          </div>
        </section>

        <section className="section compact">
          <div className="container">
            <SectionIntro eyebrow="نماذج مختارة" title="قوالب لها شخصيات مختلفة" lead="مش مجرد تغيير ألوان. كل قالب له فكرة افتتاح، هوية بصرية، وتكوين يناسب نوع فرح مختلف." />
            <div className="template-grid">
              {featuredTemplates.map((template) => (
                <TemplateCard key={template.slug} template={template} />
              ))}
            </div>
          </div>
        </section>

        <section className="section">
          <div className="container">
            <SectionIntro eyebrow="رحلة العميل" title="تجربة سهلة وواضحة" lead="العميل يطلب من واتساب، وصاحب الموقع يحول الطلب لدعوة نشطة من لوحة الإدارة." />
            <div className="journey" style={{ marginTop: 28 }}>
              {journey.map((step) => (
                <div className="journey-step" key={step}>
                  <h3>{step}</h3>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="section compact">
          <div className="container">
            <SectionIntro eyebrow="باقات واضحة" title="ابدأ بسيط وكبّر براحتك" lead="تسعير قابل للتعديل من لوحة الإدارة لاحقًا، مع تصور تجاري جاهز لبيع الخدمة." />
            <div className="pricing-grid">
              {[
                ["أساسي", "٧٥٠ ج", ["قالب احترافي", "رابط دعوة", "RSVP", "QR Code"]],
                ["Premium", "١٥٠٠ ج", ["كل الأساسي", "صور متعددة", "لوحة عميل", "تصدير الحضور"], true],
                ["Royal", "٣٠٠٠ ج", ["تصميم مخصص", "موسيقى وخريطة", "متابعة كاملة", "دعم VIP"]],
              ].map(([name, price, features, featured]) => (
                <article className={`pricing-card ${featured ? "featured" : ""}`} key={String(name)}>
                  <h3>{name}</h3>
                  <div className="price">{price}</div>
                  <ul className="feature-list">
                    {(features as string[]).map((feature) => (
                      <li key={feature}>
                        <CheckCircle2 size={18} />
                        {feature}
                      </li>
                    ))}
                  </ul>
                  <Link className={featured ? "btn btn-gold" : "btn btn-soft"} href="/order">
                    اطلب الباقة
                  </Link>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="section compact">
          <div className="container">
            <SectionIntro eyebrow="أسئلة سريعة" title="إجابات قبل الطلب" lead="التفاصيل الأساسية التي يحتاجها العميل قبل التواصل." />
            <div className="faq-list">
              {faqs.map(([question, answer]) => (
                <article className="faq-item" key={question}>
                  <h3>{question}</h3>
                  <p>{answer}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="section">
          <div className="container panel" style={{ display: "grid", gap: 18, textAlign: "center" }}>
            <Clock3 size={34} style={{ marginInline: "auto", color: "#bd8f3f" }} />
            <h2 className="section-title" style={{ margin: 0 }}>
              جاهز تخلي أول انطباع عن فرحك مبهر؟
            </h2>
            <div className="button-row" style={{ justifyContent: "center" }}>
              <Link className="btn btn-gold" href="/order">
                اطلب دعوتك الآن
              </Link>
              <Link className="btn btn-soft" href="/A7X92K">
                شاهد دعوة تجريبية
              </Link>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
