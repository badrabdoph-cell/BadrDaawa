import type { Metadata } from "next";
import { Gift, MessageCircle, ShieldCheck } from "lucide-react";
import { OrderForm } from "@/components/OrderForm";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { SectionIntro } from "@/components/SectionIntro";
import { getTemplateBySlug, invitationTemplates } from "@/lib/templates";

export const metadata: Metadata = {
  title: "اطلب دعوتك",
};

type PageProps = {
  searchParams?: Promise<{ template?: string }>;
};

export default async function OrderPage({ searchParams }: PageProps) {
  const params = searchParams ? await searchParams : {};
  const selected = params.template ? getTemplateBySlug(params.template) : invitationTemplates[0];

  return (
    <div className="page-shell">
      <SiteHeader />
      <main className="section">
        <div className="container form-grid">
          <div>
            <SectionIntro eyebrow="طلب جديد" title="اكتب بيانات الفرح والباقي علينا" lead="بعد الإرسال سيتم فتح واتساب تلقائيًا برسالة جاهزة تحتوي على كل البيانات. لا يوجد دفع أونلاين في هذه المرحلة." />
            <div className="grid-3" style={{ marginTop: 28 }}>
              <div className="panel">
                <Gift size={24} />
                <h3>قالب مختار</h3>
                <p>{selected?.arabicName}</p>
              </div>
              <div className="panel">
                <MessageCircle size={24} />
                <h3>تحويل مباشر</h3>
                <p>WhatsApp 01011511561</p>
              </div>
              <div className="panel">
                <ShieldCheck size={24} />
                <h3>بيانات منظمة</h3>
                <p>جاهزة للتحويل إلى دعوة من لوحة الإدارة.</p>
              </div>
            </div>
          </div>
          <OrderForm initialTemplate={selected?.slug} />
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
