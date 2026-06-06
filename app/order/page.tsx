import type { Metadata } from "next";
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
      <main className="section compact">
        <div className="container order-shell">
          <SectionIntro eyebrow={selected?.arabicName || "Royal Envelope"} title="اطلب دعوتك" lead="اختيارات بسيطة، ثم بيانات الفرح. بعدها يفتح واتساب برسالة جاهزة." />
          <OrderForm initialTemplate={selected?.slug} />
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
