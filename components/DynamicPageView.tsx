import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import type { DynamicPage } from "@/lib/dynamic-pages";

function renderParagraphs(page: DynamicPage) {
  return page.content.split(/\n{2,}/).map((paragraph, index) => (
    <p key={`${page.slug}-${index}`}>
      {paragraph.split("\n").map((line, lineIndex) => (
        <span key={`${page.slug}-${index}-${lineIndex}`}>
          {line}
          {lineIndex < paragraph.split("\n").length - 1 ? <br /> : null}
        </span>
      ))}
    </p>
  ));
}

export function DynamicPageView({ page }: { page: DynamicPage }) {
  return (
    <div className="page-shell">
      <SiteHeader />
      <main className="section compact dynamic-page">
        <div className="container">
          {page.coverImageUrl ? (
            <figure className="dynamic-page-cover">
              <img src={page.coverImageUrl} alt="" />
            </figure>
          ) : null}
          <div className="section-title-block">
            <span className="eyebrow">BadrDaawa</span>
            <h1 className="section-title">{page.title}</h1>
            <p className="section-lead">{page.description}</p>
          </div>
          <article className="legal-content-panel dynamic-page-content">
            {renderParagraphs(page)}
            <small>آخر تحديث: {new Intl.DateTimeFormat("ar-EG-u-nu-latn", { dateStyle: "medium" }).format(new Date(page.updatedAt))}</small>
          </article>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
