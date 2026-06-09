import Link from "next/link";
import { ExternalLink, FilePenLine, Globe2, PlusCircle, Save, Trash2 } from "lucide-react";
import { getDynamicPages, type DynamicPage } from "@/lib/dynamic-pages";

export const dynamic = "force-dynamic";

function formatDate(value: string) {
  return new Intl.DateTimeFormat("ar-EG", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

function notice(saved?: string, error?: string, message?: string) {
  if (error) return { kind: "danger", text: message || "تعذر تنفيذ العملية. راجع البيانات وحاول مرة أخرى." };
  if (saved === "created") return { kind: "success", text: "تم إنشاء الصفحة ونشر الرابط العام." };
  if (saved === "updated") return { kind: "success", text: "تم تحديث الصفحة بنجاح." };
  if (saved === "deleted") return { kind: "success", text: "تم حذف الصفحة." };
  if (saved === "visibility") return { kind: "success", text: "تم تحديث حالة ظهور الصفحة." };
  return null;
}

function PageEditor({ page }: { page?: DynamicPage }) {
  return (
    <article className="panel dynamic-page-editor">
      <div className="admin-card-head">
        {page ? <FilePenLine size={22} /> : <PlusCircle size={22} />}
        <div>
          <span className="eyebrow">{page ? page.slug : "New Page"}</span>
          <h2>{page ? "تعديل صفحة" : "إنشاء صفحة جديدة"}</h2>
        </div>
      </div>

      <form className="dynamic-page-form" action="/api/admin/pages" method="post" encType="multipart/form-data">
        <input name="action" type="hidden" value={page ? "update" : "create"} />
        {page ? <input name="id" type="hidden" value={page.id} /> : null}
        <div className="dynamic-page-form-grid">
          <label className="field">
            <span>عنوان الصفحة</span>
            <input name="title" defaultValue={page?.title || ""} required />
          </label>
          <label className="field">
            <span>الرابط slug</span>
            <input dir="ltr" name="slug" defaultValue={page?.slug || ""} placeholder="about" required />
            <small>مثال: about أو faq. سيتم إنشاء الصفحة على /slug.</small>
          </label>
          <label className="field full">
            <span>الوصف</span>
            <input name="description" defaultValue={page?.description || ""} maxLength={300} required />
          </label>
          <label className="field">
            <span>رابط صورة الغلاف</span>
            <input dir="ltr" name="coverImageUrl" defaultValue={page?.coverImageUrl || ""} placeholder="/uploads/..." />
          </label>
          <label className="field">
            <span>رفع صورة غلاف</span>
            <input name="coverFile" type="file" accept="image/*,.png,.jpg,.jpeg,.webp,.gif,.avif" />
            <small>اختياري. عند الرفع يتم استخدام الصورة الجديدة بدلاً من الرابط المكتوب.</small>
          </label>
          <label className="field full">
            <span>محتوى الصفحة</span>
            <textarea name="content" defaultValue={page?.content || ""} rows={16} required />
            <small>استخدم فقرات وأسطر بسيطة. كل سطر فارغ يتحول إلى فاصل فقرة في الصفحة العامة.</small>
          </label>
        </div>
        <label className="toggle-field">
          <input name="isPublished" type="checkbox" defaultChecked={page?.isPublished ?? true} />
          <span>إظهار الصفحة للزوار</span>
        </label>
        <div className="button-row">
          <button className="btn btn-gold" type="submit">
            <Save size={17} />
            {page ? "حفظ التعديلات" : "إنشاء الصفحة"}
          </button>
          {page ? (
            <>
              <Link className="btn btn-soft" href={`/${page.slug}`} target="_blank">
                <ExternalLink size={17} />
                فتح الصفحة
              </Link>
              <Link className="btn btn-soft" href="/admin/pages">
                صفحة جديدة
              </Link>
            </>
          ) : null}
        </div>
      </form>
    </article>
  );
}

export default async function AdminDynamicPagesPage({
  searchParams,
}: {
  searchParams: Promise<{ edit?: string; saved?: string; error?: string; message?: string }>;
}) {
  const [pages, params] = await Promise.all([getDynamicPages(), searchParams]);
  const editingPage = params.edit ? pages.find((page) => page.id === params.edit) : undefined;
  const status = notice(params.saved, params.error, params.message);
  const publishedCount = pages.filter((page) => page.isPublished).length;

  return (
    <section className="admin-command-center dynamic-pages-admin">
      <div className="dashboard-head">
        <div>
          <span className="eyebrow">Dynamic Pages</span>
          <h1>الصفحات</h1>
          <p>أنشئ صفحات عامة مثل about وcontact وfaq مع SEO وحالة نشر مستقلة دون التأثير على صفحات النظام الحالية.</p>
        </div>
        <div className="dynamic-pages-stats">
          <strong>{pages.length}</strong>
          <span>إجمالي الصفحات</span>
          <strong>{publishedCount}</strong>
          <span>منشورة</span>
        </div>
      </div>

      {status ? <div className={status.kind === "danger" ? "notice danger" : "notice success"}>{status.text}</div> : null}

      <div className="dynamic-pages-admin-grid">
        <PageEditor page={editingPage} />

        <aside className="panel dynamic-page-list">
          <div className="admin-card-head">
            <Globe2 size={22} />
            <div>
              <span className="eyebrow">Public URLs</span>
              <h2>كل الصفحات</h2>
            </div>
          </div>

          {pages.length ? (
            <div className="dynamic-page-cards">
              {pages.map((page) => (
                <article className="dynamic-page-card" key={page.id}>
                  {page.coverImageUrl ? <img src={page.coverImageUrl} alt="" /> : <div className="dynamic-page-cover-placeholder">Page</div>}
                  <div>
                    <div className="dynamic-page-card-head">
                      <h3>{page.title}</h3>
                      <span className={page.isPublished ? "status-pill success" : "status-pill muted"}>{page.isPublished ? "منشورة" : "مخفية"}</span>
                    </div>
                    <p>{page.description}</p>
                    <small dir="ltr">/{page.slug}</small>
                    <small>آخر تعديل: {formatDate(page.updatedAt)}</small>
                    <div className="dynamic-page-actions">
                      <Link className="btn btn-soft" href={`/admin/pages?edit=${page.id}`}>
                        تعديل
                      </Link>
                      <Link className="btn btn-soft" href={`/${page.slug}`} target="_blank">
                        فتح
                      </Link>
                      <form action="/api/admin/pages" method="post">
                        <input name="action" type="hidden" value="toggle" />
                        <input name="id" type="hidden" value={page.id} />
                        <input name="isPublished" type="hidden" value={String(!page.isPublished)} />
                        <button className="btn btn-soft" type="submit">
                          {page.isPublished ? "إخفاء" : "إظهار"}
                        </button>
                      </form>
                      <form action="/api/admin/pages" method="post">
                        <input name="action" type="hidden" value="delete" />
                        <input name="id" type="hidden" value={page.id} />
                        <button className="btn btn-danger" type="submit">
                          <Trash2 size={16} />
                          حذف
                        </button>
                      </form>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <strong>لا توجد صفحات بعد</strong>
              <p>ابدأ بإنشاء صفحة about أو contact وسيظهر رابطها مباشرة للزوار.</p>
            </div>
          )}
        </aside>
      </div>
    </section>
  );
}
