import type { Metadata } from "next";
import { redirect } from "next/navigation";
import type { OrderInitialDraft } from "@/components/OrderForm";
import { OrderForm } from "@/components/OrderForm";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { SectionIntro } from "@/components/SectionIntro";
import { getPublicTemplatesWithSettings } from "@/lib/template-settings";

export const metadata: Metadata = {
  title: "اطلب دعوتك",
};

type PageProps = {
  searchParams?: Promise<{
    template?: string;
    groomName?: string;
    brideName?: string;
    phone?: string;
    weddingDate?: string;
    mapUrl?: string;
    venue?: string;
    notes?: string;
    gallery?: string;
  }>;
};

export default async function OrderPage({ searchParams }: PageProps) {
  const params = searchParams ? await searchParams : {};
  const templates = await getPublicTemplatesWithSettings();
  const selected = params.template ? templates.find((template) => template.slug === params.template) : undefined;
  if (!selected) redirect("/templates");
  const templateOptions = templates.map(({ slug, name, arabicName, previewImage }) => ({ slug, name, arabicName, previewImage }));
  const initialDraft: OrderInitialDraft = {
    groomName: params.groomName || "",
    brideName: params.brideName || "",
    phone: params.phone || "",
    weddingDate: params.weddingDate || "",
    mapUrl: params.mapUrl || "",
    venue: params.venue || "",
    notes: params.notes || "",
    imageUrls: (params.gallery || "").split(",").map((item) => item.trim()).filter(Boolean).slice(0, 3),
  };

  return (
    <div className="page-shell">
      <SiteHeader />
      <main className="section compact">
        <div className="container order-shell">
          <SectionIntro eyebrow="الخطوة الثانية" title="كمّل بيانات دعوتك" lead="القالب اتحدد، دلوقتي اكتب البيانات الأساسية وارفع الصور اللي تحب تظهر في الدعوة. بعد التأكيد هنكمل معاك التفاصيل على واتساب." />
          <OrderForm initialTemplate={selected.slug} initialDraft={initialDraft} templates={templateOptions} />
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
