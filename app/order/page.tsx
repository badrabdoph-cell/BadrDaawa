import type { Metadata } from "next";
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
  const templateOptions = templates.map(({ slug, name, arabicName, previewImage }) => ({ slug, name, arabicName, previewImage }));

  return (
    <div className="page-shell">
      <SiteHeader />
      <main className="section compact">
        <div className="container order-shell">
          <SectionIntro eyebrow="طلب جديد" title="احجز تصميم دعوتك" lead="اختار الستايل اللي يليق بفرحتك، اكتب البيانات الأساسية، وبعدها هنكمل معاك على واتساب بهدوء وبشكل واضح." />
          <OrderForm initialTemplate={selected?.slug} templates={templateOptions} />
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
