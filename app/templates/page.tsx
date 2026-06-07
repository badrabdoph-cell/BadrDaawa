import type { Metadata } from "next";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { TemplateBrowser } from "@/components/TemplateBrowser";
import { getPublicTemplatesWithSettings } from "@/lib/template-settings";

export const metadata: Metadata = {
  title: "قوالب الدعوات",
  description: "شاهد التصاميم المختلفة واختر قالب دعوتك الرقمية من BadrDaawa.",
};

export default async function TemplatesPage() {
  const templates = await getPublicTemplatesWithSettings();

  return (
    <div className="page-shell">
      <SiteHeader />
      <main className="section compact">
        <div className="container">
          <div className="section-title-block templates-title-block">
            <span className="eyebrow">شاهد التصاميم المختلفة</span>
            <h1 className="section-title">اختار قالب يحكي فرحتك</h1>
            <p className="section-lead">عاين أي قالب براحتك، ولما تستقر على الشكل اضغط اختار وكمّل بيانات الدعوة في خطوة هادية وسريعة.</p>
          </div>
          <TemplateBrowser templates={templates} />
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
