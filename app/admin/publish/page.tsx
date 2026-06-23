import { getPublishMeta, discardAllDrafts } from "@/lib/project-content-store";
import { publishAllChanges, getLatestContentVersion, getAllContentVersions } from "@/lib/publish-pipeline";
import { getAdminSessionUser, ADMIN_SESSION_COOKIE } from "@/lib/admin-session";
import { getCommitUrl } from "@/lib/github-url";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ShieldCheck, Upload, History, Settings2, Activity } from "lucide-react";
import { VersionHistorySection } from "./VersionHistorySection";

export const dynamic = "force-dynamic";

async function handlePublish(formData: FormData) {
  "use server";
  const cookieStore = await cookies();
  const username = await getAdminSessionUser(cookieStore.get(ADMIN_SESSION_COOKIE)?.value);
  if (!username) redirect("/admin/publish?error=Unauthorized");
  const result = await publishAllChanges(username);
  if (result.success) redirect(`/admin/publish?published=true&count=${result.publishedKeys.length}`);
  else redirect(`/admin/publish?error=${encodeURIComponent(result.message)}`);
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
  const hasChanges = meta.hasUnpublishedChanges;
  const publishedCount = params.count ? parseInt(params.count, 10) : pendingChangeKeys.length;

  return (
    <div>
      <div className="dashboard-head">
        <div>
          <span className="eyebrow">Publish System</span>
          <h1>النشر والإصدارات</h1>
          <p>نشر التغييرات من المسودات، إدارة الإصدارات، واستعادة الإصدارات السابقة</p>
        </div>
      </div>

      {params.published && <div className="notice success">تم النشر بنجاح. تم رفع {publishedCount} عنصر إلى GitHub.</div>}
      {params.discarded && <div className="notice success">تم إلغاء جميع المسودات.</div>}
      {params.updated && <div className="notice success">تم تحديث إعدادات النشر التلقائي.</div>}
      {params.error && <div className="notice danger">{params.error}</div>}

      {/* ── Status + Actions inline ── */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 14, alignItems: "stretch" }}>
        <div className="admin-card" style={{ flex: "1 1 260px", border: "1px solid rgba(245,234,214,0.1)", borderRadius: 12 }}>
          <div className="admin-card-header">
            <Activity size={22} />
            <div>
              <h3>حالة النشر</h3>
            </div>
          </div>
          <div className="admin-card-body" style={{ paddingTop: 8, fontSize: "0.85rem", display: "flex", flexDirection: "column", gap: 6 }}>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ opacity: 0.6, fontWeight: 800 }}>التغييرات:</span>
              <strong style={{ color: hasChanges ? "#f3cf73" : "#4caf87" }}>
                {hasChanges ? `${pendingChangeKeys.length} مسودة` : "لا توجد تغييرات"}
              </strong>
            </div>
            {meta.lastPublishedAt && (
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ opacity: 0.6, fontWeight: 800 }}>آخر نشر:</span>
                <span>{new Date(meta.lastPublishedAt).toLocaleString("ar-EG")}</span>
              </div>
            )}
          </div>
        </div>

        <div className="admin-card" style={{ flex: "1 1 260px", border: "1px solid rgba(245,234,214,0.1)", borderRadius: 12 }}>
          <div className="admin-card-header">
            <ShieldCheck size={22} />
            <div>
              <h3>الإصدار الحالي</h3>
            </div>
          </div>
          <div className="admin-card-body" style={{ paddingTop: 8, fontSize: "0.85rem", display: "flex", flexDirection: "column", gap: 6 }}>
            {latestVersion ? (
              <>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ opacity: 0.6, fontWeight: 800 }}>رقم الإصدار:</span>
                  <strong>#{latestVersion.version}</strong>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ opacity: 0.6, fontWeight: 800 }}>الناشر:</span>
                  <span>{latestVersion.publishedBy}</span>
                </div>
                {latestVersion.commitSha && (
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ opacity: 0.6, fontWeight: 800 }}>Commit:</span>
                    <code style={{ fontSize: "0.78rem", opacity: 0.7 }}>{latestVersion.commitSha.slice(0, 12)}</code>
                  </div>
                )}
              </>
            ) : (
              <span style={{ opacity: 0.5 }}>لم ينشر بعد</span>
            )}
          </div>
        </div>

        <div className="admin-card" style={{ flex: "1 1 240px", border: "1px solid rgba(245,234,214,0.1)", borderRadius: 12 }}>
          <div className="admin-card-header">
            <Upload size={22} />
            <div>
              <h3>إجراءات</h3>
            </div>
          </div>
          <div className="admin-card-footer" style={{ paddingTop: 10, gap: 8 }}>
            <form action={handlePublish}>
              <button type="submit" className="btn btn-gold" disabled={!hasChanges} style={{ fontSize: "0.85rem", minHeight: 36, padding: "6px 14px" }}>
                نشر التغييرات
              </button>
            </form>
            <form action={handleDiscard}>
              <button type="submit" className="btn btn-soft" disabled={!hasChanges} style={{ fontSize: "0.85rem", minHeight: 36, padding: "6px 14px" }}>
                إلغاء المسودات
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* ── Pending Changes ── */}
      {hasChanges && pendingChangeKeys.length > 0 && (
        <div className="admin-card" style={{ border: "1px solid rgba(245,234,214,0.1)", borderRadius: 12, marginBottom: 14 }}>
          <div style={{ padding: "12px 18px", fontSize: "0.85rem", display: "flex", flexWrap: "wrap", gap: "6px 16px" }}>
            <span style={{ opacity: 0.6, fontWeight: 800 }}>التغييرات المعلقة:</span>
            {pendingChangeKeys.map((key) => (
              <span key={key} style={{ background: "rgba(243,207,115,0.1)", border: "1px solid rgba(243,207,115,0.2)", borderRadius: 6, padding: "2px 8px", fontSize: "0.8rem" }}>
                {key}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* ── Auto Publish ── */}
      <div className="admin-card" style={{ border: "1px solid rgba(245,234,214,0.1)", borderRadius: 12, marginBottom: 14 }}>
        <div className="admin-card-header">
          <Settings2 size={22} />
          <div>
            <h3>النشر التلقائي</h3>
          </div>
        </div>
        <div className="admin-card-body" style={{ paddingTop: 8 }}>
          <form action={handleToggleAutoPublish} style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "flex-end" }}>
            <label className="field" style={{ flex: "0 0 auto", minWidth: 0 }}>
              <span className="field-label" style={{ fontSize: "0.82rem", marginBottom: 4 }}>تفعيل</span>
              <select name="enabled" className="input" defaultValue={meta.autoPublishEnabled ? "true" : "false"} style={{ minHeight: 36, fontSize: "0.85rem" }}>
                <option value="true">مفعّل</option>
                <option value="false">معطّل</option>
              </select>
            </label>
            <label className="field" style={{ flex: "0 0 auto", minWidth: 0 }}>
              <span className="field-label" style={{ fontSize: "0.82rem", marginBottom: 4 }}>الفاصل (دقائق)</span>
              <input type="number" name="interval" className="input" defaultValue={meta.autoPublishIntervalMinutes} min="5" max="1440" style={{ minHeight: 36, fontSize: "0.85rem", width: 100 }} />
            </label>
            <button type="submit" className="btn btn-soft" style={{ fontSize: "0.85rem", minHeight: 36, padding: "6px 14px" }}>
              حفظ
            </button>
          </form>
        </div>
      </div>

      {/* ── Version History (Client Component) ── */}
      <VersionHistorySection />
    </div>
  );
}
