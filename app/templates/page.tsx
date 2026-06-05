import type { Metadata } from "next";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { SectionIntro } from "@/components/SectionIntro";
import { TemplateCard } from "@/components/TemplateCard";
import { invitationTemplates, getTemplateBySlug } from "@/lib/templates";

export const metadata: Metadata = {
  title: "قالب الدعوة الحالي",
  description: "قالب Royal Envelope الحالي لدعوات BadrDaawa.",
};

type PageProps = {
  searchParams?: Promise<{ preview?: string }>;
};

export default async function TemplatesPage({ searchParams }: PageProps) {
  const params = searchParams ? await searchParams : {};
  const preview = params.preview ? getTemplateBySlug(params.preview) ?? invitationTemplates[0] : invitationTemplates[0];

  return (
    <div className="page-shell">
      <SiteHeader />
      <main>
        <section className="section compact">
          <div className="container">
            <SectionIntro
              eyebrow="معرض القوالب"
              title="قالب Royal Envelope"
              lead="نعمل الآن على قالب واحد فقط حتى تكون التجربة مصقولة للموبايل، وبعدها نضيف أفكار قوالب جديدة بهدوء."
            />
          </div>
        </section>
        <section className="section compact" style={{ paddingTop: 0 }}>
          <div className="container form-grid">
            <div className="template-grid" style={{ marginTop: 0 }}>
              {invitationTemplates.map((template) => (
                <TemplateCard key={template.slug} template={template} />
              ))}
            </div>
            <aside className="form-panel" style={{ position: "sticky", top: 96 }}>
              <img src={preview.previewImage} alt={`معاينة ${preview.arabicName}`} style={{ width: "100%", aspectRatio: "4 / 5", objectFit: "cover", borderRadius: 8 }} />
              <span className="eyebrow" style={{ marginTop: 16 }}>
                {preview.category}
              </span>
              <h2>{preview.arabicName}</h2>
              <p>{preview.concept}</p>
              <ul className="feature-list">
                <li>الافتتاح: {preview.opening}</li>
                <li>التكوين: {preview.layout}</li>
                <li>الخطوط: {preview.typography}</li>
              </ul>
              <a className="btn btn-gold" href={`/order?template=${preview.slug}`} style={{ marginTop: 14 }}>
                اختار القالب
              </a>
            </aside>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
