import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import type { LegalPageContent } from "@/lib/legal-pages";

export function LegalPageView({ page }: { page: LegalPageContent }) {
  return (
    <div className="page-shell">
      <SiteHeader />
      <main className="section compact legal-page">
        <div className="container">
          <div className="section-title-block">
            <span className="eyebrow">Legal</span>
            <h1 className="section-title">{page.title}</h1>
            <p className="section-lead">{page.description}</p>
          </div>
          <article className="legal-content-panel">
            {page.content.split(/\n{2,}/).map((paragraph, index) => (
              <p key={`${page.slug}-${index}`}>{paragraph}</p>
            ))}
            {page.updatedAt ? <small>آخر تحديث: {new Intl.DateTimeFormat("ar-EG-u-nu-latn", { dateStyle: "medium" }).format(new Date(page.updatedAt))}</small> : null}
          </article>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
