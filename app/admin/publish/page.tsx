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

      {/* ── Status + Actions (flat) ── */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginBottom: 14, padding: "10px 16px", border: "1px solid rgba(245,234,214,0.06)", borderRadius: 10, background: "rgba(255,255,255,0.015)", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <Activity size={15} style={{ opacity: 0.4 }} />
          <span style={{ opacity: 0.6, fontWeight: 800, fontSize: "0.8rem" }}>النشر:</span>
          <strong style={{ fontSize: "0.84rem", color: hasChanges ? "#f3cf73" : "#4caf87" }}>
            {hasChanges ? `${pendingChangeKeys.length} مسودة` : "لا توجد تغييرات"}
          </strong>
          {meta.lastPublishedAt && (
            <span style={{ fontSize: "0.76rem", opacity: 0.45, marginInlineStart: 4 }}>
              آخر نشر: {new Date(meta.lastPublishedAt).toLocaleString("ar-EG")}
            </span>
          )}
        </div>
        <div style={{ width: 1, height: 22, background: "rgba(245,234,214,0.08)" }} />
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <ShieldCheck size={15} style={{ opacity: 0.4 }} />
          <span style={{ opacity: 0.6, fontWeight: 800, fontSize: "0.8rem" }}>الإصدار:</span>
          <strong style={{ fontSize: "0.84rem" }}>
            {latestVersion ? `#${latestVersion.version}` : "—"}
          </strong>
          {latestVersion && (
            <span style={{ fontSize: "0.74rem", opacity: 0.45 }}>بواسطة {latestVersion.publishedBy}</span>
          )}
        </div>
        <div style={{ marginInlineStart: "auto", display: "flex", gap: 8 }}>
          <form action={handlePublish}>
            <button type="submit" className="btn btn-gold" disabled={!hasChanges} style={{ fontSize: "0.82rem", minHeight: 32, padding: "4px 12px" }}>
              نشر التغييرات
            </button>
          </form>
          <form action={handleDiscard}>
            <button type="submit" className="btn btn-soft" disabled={!hasChanges} style={{ fontSize: "0.82rem", minHeight: 32, padding: "4px 12px" }}>
              إلغاء المسودات
            </button>
          </form>
        </div>
      </div>

      {/* ── Pending Changes ── */}
      {hasChanges && pendingChangeKeys.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: "6px 14px", marginBottom: 14, padding: "8px 14px", border: "1px solid rgba(245,234,214,0.06)", borderRadius: 8, background: "rgba(255,255,255,0.01)", fontSize: "0.82rem", alignItems: "center" }}>
          <span style={{ opacity: 0.6, fontWeight: 800, fontSize: "0.8rem" }}>التغييرات المعلقة:</span>
          {pendingChangeKeys.map((key) => (
            <span key={key} style={{ background: "rgba(243,207,115,0.1)", border: "1px solid rgba(243,207,115,0.2)", borderRadius: 6, padding: "2px 8px", fontSize: "0.76rem" }}>
              {key}
            </span>
          ))}
        </div>
      )}

      {/* ── Auto Publish (flat) ── */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 14, padding: "10px 16px", border: "1px solid rgba(245,234,214,0.06)", borderRadius: 10, background: "rgba(255,255,255,0.01)", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <Settings2 size={15} style={{ opacity: 0.4 }} />
          <span style={{ opacity: 0.6, fontWeight: 800, fontSize: "0.8rem" }}>النشر التلقائي</span>
        </div>
        <form action={handleToggleAutoPublish} style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <select name="enabled" className="input" defaultValue={meta.autoPublishEnabled ? "true" : "false"} style={{ minHeight: 30, fontSize: "0.82rem", padding: "2px 8px", width: "auto" }}>
            <option value="true">مفعّل</option>
            <option value="false">معطّل</option>
          </select>
          <input type="number" name="interval" className="input" defaultValue={meta.autoPublishIntervalMinutes} min="5" max="1440" style={{ minHeight: 30, fontSize: "0.82rem", width: 70, padding: "2px 8px" }} />
          <span style={{ fontSize: "0.78rem", opacity: 0.45 }}>دقيقة</span>
          <button type="submit" className="btn btn-soft btn-sm" style={{ fontSize: "0.82rem", minHeight: 30, padding: "4px 10px" }}>حفظ</button>
        </form>
      </div>

      {/* ── Version History (Client Component) ── */}
      <VersionHistorySection />
    </div>
  );
}
