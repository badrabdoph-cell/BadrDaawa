import type { Metadata } from "next";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { TemplateBrowser } from "@/components/TemplateBrowser";
import { getTemplatesWithSettings } from "@/lib/template-settings";

export const metadata: Metadata = {
  title: "قوالب الدعوات",
  description: "اختار قالب دعوة فرحك من BadrDaawa.",
};

export default async function TemplatesPage() {
  const templates = await getTemplatesWithSettings();

  return (
    <div className="page-shell">
      <SiteHeader />
      <main className="section compact">
        <div className="container">
          <div className="section-title-block">
            <span className="eyebrow">Templates</span>
            <h1 className="section-title">اختر شكل الدعوة</h1>
            <p className="section-lead">كل قالب له معاينة مباشرة ومزامن مع الطلبات ولوحة الأدمن.</p>
          </div>
          <TemplateBrowser templates={templates} />
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
