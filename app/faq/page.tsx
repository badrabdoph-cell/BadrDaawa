import type { Metadata } from "next";
import { DynamicPageView } from "@/components/DynamicPageView";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { SectionIntro } from "@/components/SectionIntro";
import { getDynamicPageBySlug, getDynamicPageMetadata } from "@/lib/dynamic-pages";

export async function generateMetadata(): Promise<Metadata> {
  const page = await getDynamicPageBySlug("faq");
  return page ? getDynamicPageMetadata(page) : { title: "الأسئلة الشائعة" };
}

const questions = [
  ["هستلم إيه؟", "رابط دعوة، QR، خريطة، وتأكيد حضور."],
  ["الطلب بياخد وقت قد إيه؟", "حسب الباقة. الطلب السريع خلال 24 ساعة."],
  ["أقدر أتابع الحضور؟", "نعم، من لوحة بسيطة للعميل."],
  ["الدفع أونلاين؟", "حاليًا الطلب يتم على واتساب."],
];

export default async function FaqPage() {
  const dynamicPage = await getDynamicPageBySlug("faq");
  if (dynamicPage) return <DynamicPageView page={dynamicPage} />;

  return (
    <div className="page-shell">
      <SiteHeader />
      <main className="section compact">
        <div className="container">
          <SectionIntro eyebrow="FAQ" title="أسئلة سريعة" lead="إجابات مختصرة بدون تفاصيل تقنية." />
          <div className="faq-list">
            {questions.map(([question, answer]) => (
              <article className="faq-item" key={question}>
                <h3>{question}</h3>
                <p>{answer}</p>
              </article>
            ))}
          </div>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
