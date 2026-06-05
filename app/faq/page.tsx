import type { Metadata } from "next";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { SectionIntro } from "@/components/SectionIntro";

export const metadata: Metadata = {
  title: "الأسئلة الشائعة",
};

const questions = [
  ["هل كل عميل له صفحة مستقلة؟", "نعم، لكن بدون إنشاء ملفات يدوية. كل دعوة تعمل من مسار ديناميكي مثل /A7X92K وتقرأ بياناتها من قاعدة البيانات."],
  ["هل يستطيع العميل تغيير التصميم؟", "لا. العميل يدير الحضور فقط حتى لا يكسر القالب. تعديل التصميم والبيانات الأساسية من لوحة Super Admin."],
  ["هل يمكن تصدير الحضور؟", "نعم، من لوحة العميل يمكن تحميل Excel وPDF أو نسخ قائمة الحضور كاملة."],
  ["هل المنصة مناسبة لآلاف الدعوات؟", "نعم، التصميم يعتمد على PostgreSQL وفهارس لكل الحقول الحساسة مثل كود الدعوة، حالة الحضور، وتاريخ الإنشاء."],
  ["هل يوجد نسخ احتياطي؟", "يوجد Workflow جاهز لنسخة كل ساعة ونسخة يومية كاملة إلى GitHub باستخدام DATABASE_URL كسر آمن."],
  ["هل الطلب يتم بدفع أونلاين؟", "لا في هذه النسخة. الطلب يتحول مباشرة إلى واتساب رقم 01011511561 برسالة منظمة."],
];

export default function FaqPage() {
  return (
    <div className="page-shell">
      <SiteHeader />
      <main className="section">
        <div className="container">
          <SectionIntro eyebrow="FAQ" title="كل سؤال مهم قبل التشغيل" lead="إجابات مختصرة وواضحة لصاحب المشروع والعميل النهائي." />
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
