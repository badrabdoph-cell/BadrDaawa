import Link from "next/link";
import { ExternalLink, FileText, Save } from "lucide-react";
import { getDraftLegalPages, legalPageSlugs, type LegalPageSlug } from "@/lib/legal-pages";

export const dynamic = "force-dynamic";

const pageLinks: Record<LegalPageSlug, string> = {
  "privacy-policy": "/privacy-policy",
  terms: "/terms",
  "refund-policy": "/refund-policy",
  "usage-policy": "/usage-policy",
};

function notice(saved?: string, error?: string) {
  if (error) return { kind: "danger", text: "تعذر حفظ الصفحة القانونية. راجع البيانات وحاول مرة أخرى." };
  if (saved) return { kind: "success", text: "تم حفظ الصفحة القانونية وتحديث الرابط العام." };
  return null;
}

export default async function AdminLegalPagesPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string; error?: string }>;
}) {
  const [pages, params] = await Promise.all([getDraftLegalPages(), searchParams]);
  const message = notice(params.saved, params.error);

  return (
    <section className="admin-command-center legal-admin-page">
      <div className="dashboard-head">
        <div>
          <span className="eyebrow">Legal Pages</span>
          <h1>إدارة الصفحات القانونية</h1>
          <p>عدّل محتوى سياسة الخصوصية والشروط وسياسات الاسترجاع والاستخدام من مكان واحد.</p>
        </div>
      </div>

      {message ? <div className={message.kind === "danger" ? "notice danger" : "notice success"}>{message.text}</div> : null}

      <div className="legal-admin-grid">
        {legalPageSlugs.map((slug) => {
          const page = pages[slug];
          return (
            <article className="panel legal-editor-card" key={slug}>
              <div className="admin-card-head">
                <FileText size={22} />
                <div>
                  <span className="eyebrow">{slug}</span>
                  <h2>{page.title}</h2>
                </div>
              </div>
              <form className="legal-editor-form" action="/api/admin/legal-pages" method="post">
                <input name="slug" type="hidden" value={slug} />
                <label className="field">
                  <span>عنوان الصفحة</span>
                  <input name="title" defaultValue={page.title} required />
                </label>
                <label className="field">
                  <span>وصف قصير</span>
                  <input name="description" defaultValue={page.description} required />
                </label>
                <label className="field full">
                  <span>المحتوى</span>
                  <textarea name="content" defaultValue={page.content} rows={12} required />
                  <small>استخدم أسطرًا وفقرات بسيطة. كل سطر فارغ يفصل فقرة جديدة في الصفحة العامة.</small>
                </label>
                <div className="button-row">
                  <button className="btn btn-gold" type="submit">
                    <Save size={17} />
                    حفظ
                  </button>
                  <Link className="btn btn-soft" href={pageLinks[slug]} target="_blank">
                    <ExternalLink size={17} />
                    فتح الصفحة
                  </Link>
                </div>
              </form>
            </article>
          );
        })}
      </div>
    </section>
  );
}
