import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { OrderForm } from "@/components/OrderForm";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { SectionIntro } from "@/components/SectionIntro";
import { getTemplatesWithSettings } from "@/lib/template-settings";

export const metadata: Metadata = {
  title: "اطلب دعوتك",
};

type PageProps = {
  searchParams?: Promise<{ template?: string }>;
};

export default async function OrderPage({ searchParams }: PageProps) {
  const params = searchParams ? await searchParams : {};
  const templates = await getTemplatesWithSettings();
  const selected = params.template ? templates.find((template) => template.slug === params.template) : undefined;
  if (!selected) redirect("/templates");
  const templateOptions = templates.map(({ slug, name, arabicName, previewImage }) => ({ slug, name, arabicName, previewImage }));

  return (
    <div className="page-shell">
      <SiteHeader />
      <main className="section compact">
        <div className="container order-shell">
          <SectionIntro eyebrow="الخطوة الثانية" title="كمّل بيانات دعوتك" lead="القالب اتحدد، دلوقتي اكتب البيانات الأساسية وارفع الصور اللي تحب تظهر في الدعوة. بعد التأكيد هنكمل معاك التفاصيل على واتساب." />
          <OrderForm initialTemplate={selected.slug} templates={templateOptions} />
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
