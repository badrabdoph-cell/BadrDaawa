import type { Metadata } from "next";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { TemplateBrowser } from "@/components/TemplateBrowser";
import { getPublicTemplatesWithPreviewMusic } from "@/lib/template-settings";

export const metadata: Metadata = {
  title: "تصاميم الدعوات",
  description: "استعرض التصاميم المختلفة واختر الشكل الأقرب ليومكم المميز من BadrDaawa.",
};

export default async function TemplatesPage() {
  const templates = await getPublicTemplatesWithPreviewMusic();

  return (
    <div className="page-shell">
      <SiteHeader />
      <main className="section compact">
        <div className="container">
          <div className="section-title-block templates-title-block">
            <span className="eyebrow">استعرض التصاميم</span>
            <h1 className="section-title">اختار التصميم اللي يشبه فرحتكم 🤍</h1>
            <p className="section-lead">استعرض التصاميم المختلفة واختر الشكل الأقرب ليومكم المميز ✨</p>
          </div>
          <TemplateBrowser templates={templates} />
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
