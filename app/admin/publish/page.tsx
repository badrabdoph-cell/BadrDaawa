import { getPublishMeta, discardAllDrafts } from "@/lib/project-content-store";
import { publishAllChanges, getLatestContentVersion, getAllContentVersions } from "@/lib/publish-pipeline";
import { getAdminSessionUser, ADMIN_SESSION_COOKIE } from "@/lib/admin-session";
import { getCommitUrl } from "@/lib/github-url";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";

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
    const keysCount = result.publishedKeys.length;
    redirect(`/admin/publish?published=true&count=${keysCount}`);
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
  searchParams: Promise<{ published?: string; discarded?: string; updated?: string; error?: string; count?: string }>;
}) {
  const params = await searchParams;
  const [meta, latestVersion] = await Promise.all([getPublishMeta(), getLatestContentVersion()]);
  
  const pendingChanges = meta.pendingChanges || {};
  const pendingChangeKeys = Object.keys(pendingChanges) as Array<string>;
  const hasUnpublishedChanges = meta.hasUnpublishedChanges;
  const lastPublishedAt = meta.lastPublishedAt;
  const lastPublishedBy = meta.lastPublishedBy;
  const autoPublishEnabled = meta.autoPublishEnabled;
  const autoPublishIntervalMinutes = meta.autoPublishIntervalMinutes;
  const publishedCount = params.count ? parseInt(params.count, 10) : pendingChangeKeys.length;
  const allVersions = await getAllContentVersions(10);

  return (
    <section className="admin-command-center publish-admin">
      <div className="dashboard-head">
        <div>
          <span className="eyebrow">Publish System</span>
          <h1>إدارة النشر</h1>
          <p>نشر التغييرات من المسودات إلى المحتوى المنشور على الموقع العام</p>
        </div>
      </div>

      {params.published && <div className="notice success">تم النشر بنجاح. تم رفع {publishedCount} عنصر إلى GitHub.</div>}
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

        {latestVersion && (
          <article className="panel publish-version-card">
            <div className="admin-card-head">
              <div>
                <span className="eyebrow">Version</span>
                <h2>الإصدار الحالي</h2>
              </div>
            </div>
            <div className="publish-status-content">
              <div className="status-item">
                <span className="label">رقم الإصدار:</span>
                <span className="value">#{latestVersion.version}</span>
              </div>
              <div className="status-item">
                <span className="label">آخر نشر:</span>
                <span className="value">{new Date(latestVersion.publishedAt).toLocaleString("ar-EG")}</span>
              </div>
              {latestVersion.publishedBy && (
                <div className="status-item">
                  <span className="label">تم النشر بواسطة:</span>
                  <span className="value">{latestVersion.publishedBy}</span>
                </div>
              )}
              {latestVersion.commitSha && (
                <div className="status-item">
                  <span className="label">Commit SHA:</span>
                  <span className="value" style={{ fontFamily: "monospace", fontSize: "0.85em" }}>{latestVersion.commitSha.slice(0, 12)}</span>
                </div>
              )}
            </div>
          </article>
        )}

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

      <article className="panel version-history-card">
        <div className="admin-card-head">
          <div>
            <span className="eyebrow">Version History</span>
            <h2>سجل الإصدارات</h2>
          </div>
          <Link href="/admin/versions" className="btn btn-soft btn-sm">عرض الكل</Link>
        </div>
        <div style={{ overflowX: "auto" }}>
          <table className="version-history-table">
            <thead>
              <tr>
                <th>الإصدار</th>
                <th>التاريخ</th>
                <th>الناشر</th>
                <th>Commit</th>
                <th>المفاتيح</th>
              </tr>
            </thead>
            <tbody>
              {allVersions.length === 0 ? (
                <tr><td colSpan={5} style={{ textAlign: "center", padding: "24px", color: "var(--text-muted)" }}>لا توجد إصدارات بعد</td></tr>
              ) : allVersions.map((v) => {
                const commitUrl = v.commitSha ? getCommitUrl(v.commitSha) : null;
                return (
                  <tr key={v.id}>
                    <td><strong>#{v.version}</strong></td>
                    <td>{new Date(v.publishedAt).toLocaleString("ar-EG")}</td>
                    <td>{v.publishedBy}</td>
                    <td>
                      {commitUrl ? (
                        <a href={commitUrl} target="_blank" rel="noopener noreferrer" style={{ fontFamily: "monospace", fontSize: "0.85em", color: "var(--gold)" }}>
                          {v.commitSha ? v.commitSha.slice(0, 12) : "—"}
                        </a>
                      ) : (
                        <span style={{ fontFamily: "monospace", fontSize: "0.85em" }}>{v.commitSha ? v.commitSha.slice(0, 12) : "—"}</span>
                      )}
                    </td>
                    <td style={{ fontSize: "0.85em", color: "var(--text-muted)" }}>{(v.changedKeys as string[]).join(", ")}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </article>

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
