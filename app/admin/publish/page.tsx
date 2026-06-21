import { getPublishMeta, discardAllDrafts } from "@/lib/project-content-store";
import { publishAllChanges } from "@/lib/publish-pipeline";
import { getAdminSessionUser } from "@/lib/admin-session";
import { ADMIN_SESSION_COOKIE } from "@/lib/admin-session";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

async function handlePublish(formData: FormData) {
  "use server";
  const cookieStore = await cookies();
  const username = await getAdminSessionUser(cookieStore.get(ADMIN_SESSION_COOKIE)?.value);
  
  if (!username) {
    redirect("/admin/publish?error=Unauthorized");
  }

  const result = await publishAllChanges(username);
  
  if (result.success) {
    redirect("/admin/publish?published=true");
  } else {
    redirect(`/admin/publish?error=${encodeURIComponent(result.message)}`);
  }
}

async function handleDiscard(formData: FormData) {
  "use server";
  await discardAllDrafts();
  redirect("/admin/publish?discarded=true");
}

async function handleToggleAutoPublish(formData: FormData) {
  "use server";
  const enabled = formData.get("enabled") === "true";
  const interval = parseInt(formData.get("interval") as string, 10);
  
  const { updatePublishMeta } = await import("@/lib/project-content-store");
  await updatePublishMeta({
    autoPublishEnabled: enabled,
    autoPublishIntervalMinutes: interval,
  });
  
  redirect("/admin/publish?updated=true");
}

export default async function AdminPublishPage({
  searchParams,
}: {
  searchParams: Promise<{ published?: string; discarded?: string; updated?: string; error?: string }>;
}) {
  const params = await searchParams;
  const meta = await getPublishMeta();
  
  const pendingChanges = meta.pendingChanges || {};
  const pendingChangeKeys = Object.keys(pendingChanges) as Array<string>;
  const hasUnpublishedChanges = meta.hasUnpublishedChanges;
  const lastPublishedAt = meta.lastPublishedAt;
  const lastPublishedBy = meta.lastPublishedBy;
  const autoPublishEnabled = meta.autoPublishEnabled;
  const autoPublishIntervalMinutes = meta.autoPublishIntervalMinutes;

  return (
    <section className="admin-command-center publish-admin">
      <div className="dashboard-head">
        <div>
          <span className="eyebrow">Publish System</span>
          <h1>إدارة النشر</h1>
          <p>نشر التغييرات من المسودات إلى المحتوى المنشور على الموقع العام</p>
        </div>
      </div>

      {params.published && <div className="notice success">تم النشر بنجاح. تم رفع {pendingChangeKeys.length} عنصر إلى GitHub.</div>}
      {params.discarded && <div className="notice success">تم إلغاء جميع المسودات.</div>}
      {params.updated && <div className="notice success">تم تحديث إعدادات النشر التلقائي.</div>}
      {params.error && <div className="notice danger">{params.error}</div>}

      <div className="publish-status-grid">
        <article className="panel publish-status-card">
          <div className="admin-card-head">
            <div>
              <span className="eyebrow">Status</span>
              <h2>حالة النشر</h2>
            </div>
          </div>
          <div className="publish-status-content">
            <div className="status-item">
              <span className="label">التغييرات غير المنشورة:</span>
              <span className={`value ${hasUnpublishedChanges ? "pending" : "clean"}`}>
                {hasUnpublishedChanges ? `${pendingChangeKeys.length} عنصر` : "لا توجد تغييرات"}
              </span>
            </div>
            {lastPublishedAt && (
              <div className="status-item">
                <span className="label">آخر نشر:</span>
                <span className="value">{new Date(lastPublishedAt).toLocaleString("ar-EG")}</span>
              </div>
            )}
            {lastPublishedBy && (
              <div className="status-item">
                <span className="label">تم النشر بواسطة:</span>
                <span className="value">{lastPublishedBy}</span>
              </div>
            )}
          </div>
        </article>

        <article className="panel publish-actions-card">
          <div className="admin-card-head">
            <div>
              <span className="eyebrow">Actions</span>
              <h2>إجراءات النشر</h2>
            </div>
          </div>
          <div className="publish-actions-content">
            <form action={handlePublish} className="publish-form">
              <button 
                type="submit" 
                className="btn btn-primary"
                disabled={!hasUnpublishedChanges}
              >
                نشر التغييرات الآن
              </button>
            </form>
            <form action={handleDiscard} className="publish-form">
              <button 
                type="submit" 
                className="btn btn-soft"
                disabled={!hasUnpublishedChanges}
              >
                إلغاء المسودات
              </button>
            </form>
          </div>
        </article>
      </div>

      {hasUnpublishedChanges && pendingChangeKeys.length > 0 && (
        <article className="panel pending-changes-card">
          <div className="admin-card-head">
            <div>
              <span className="eyebrow">Pending Changes</span>
              <h2>التغييرات المعلقة</h2>
            </div>
          </div>
          <div className="pending-changes-list">
            {pendingChangeKeys.map((key) => (
              <div key={key} className="pending-change-item">
                <span className="change-key">{key}</span>
              </div>
            ))}
          </div>
        </article>
      )}

      <article className="panel auto-publish-card">
        <div className="admin-card-head">
          <div>
            <span className="eyebrow">Auto Publish</span>
            <h2>النشر التلقائي</h2>
          </div>
        </div>
        <form action={handleToggleAutoPublish} className="auto-publish-form">
          <div className="form-row">
            <label className="field">
              <span className="field-label">تفعيل النشر التلقائي</span>
              <select 
                name="enabled" 
                className="input"
                defaultValue={autoPublishEnabled ? "true" : "false"}
              >
                <option value="true">مفعّل</option>
                <option value="false">معطّل</option>
              </select>
            </label>
            <label className="field">
              <span className="field-label">الفاصل الزمني (دقائق)</span>
              <input 
                type="number" 
                name="interval" 
                className="input"
                defaultValue={autoPublishIntervalMinutes}
                min="5"
                max="1440"
              />
            </label>
          </div>
          <button type="submit" className="btn btn-soft">
            حفظ الإعدادات
          </button>
        </form>
      </article>
    </section>
  );
}
