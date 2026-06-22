"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type ContentVersion = {
  id: string;
  version: number;
  commitSha: string | null;
  commitUrl: string | null;
  publishedBy: string;
  publishedAt: string;
  changedKeys: string[];
};

type RollbackResult = {
  ok: boolean;
  message: string;
  rollbackVersion?: number;
  rolledBackToSha?: string | null;
  restoredKeys?: string[];
  newVersion?: number | null;
  newCommitSha?: string | null;
  newCommitUrl?: string | null;
  error?: string;
};

export default function AdminVersionsPage() {
  const router = useRouter();
  const [versions, setVersions] = useState<ContentVersion[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rollbackVersion, setRollbackVersion] = useState<number | null>(null);
  const [rollbacking, setRollbacking] = useState(false);
  const [rollbackResult, setRollbackResult] = useState<RollbackResult | null>(null);

  const loadVersions = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/versions?limit=100", { cache: "no-store" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `HTTP ${res.status}`);
      }
      const data = await res.json();
      setVersions(data.versions || []);
      setTotal(data.total || 0);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load versions");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadVersions();
  }, [loadVersions]);

  const handleRollback = useCallback(async () => {
    if (rollbackVersion === null) return;
    setRollbacking(true);
    setRollbackResult(null);
    try {
      const res = await fetch("/api/admin/publish/rollback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ version: rollbackVersion }),
      });
      const data: RollbackResult = await res.json();
      setRollbackResult(data);
      if (data.ok) {
        await loadVersions();
      }
    } catch (err) {
      setRollbackResult({ ok: false, message: err instanceof Error ? err.message : "Network error" });
    } finally {
      setRollbacking(false);
      setRollbackVersion(null);
    }
  }, [rollbackVersion, loadVersions]);

  return (
    <section className="admin-command-center">
      <div className="dashboard-head">
        <div>
          <span className="eyebrow">Version History</span>
          <h1>سجل الإصدارات</h1>
          <p>جميع إصدارات المحتوى المنشورة مع إمكانية الاستعادة</p>
        </div>
        <div>
          <button className="btn btn-soft" onClick={() => router.push("/admin/publish")}>
            العودة إلى إدارة النشر
          </button>
        </div>
      </div>

      {rollbackResult && (
        <div className={`notice ${rollbackResult.ok ? "success" : "danger"}`}>
          {rollbackResult.message}
        </div>
      )}

      {error && <div className="notice danger">{error}</div>}

      {loading ? (
        <div className="panel" style={{ textAlign: "center", padding: "48px" }}>
          <p>جاري تحميل الإصدارات...</p>
        </div>
      ) : versions.length === 0 ? (
        <div className="panel" style={{ textAlign: "center", padding: "48px" }}>
          <p>لا توجد إصدارات بعد. قم بنشر المحتوى من صفحة إدارة النشر.</p>
        </div>
      ) : (
        <div className="panel" style={{ overflowX: "auto", padding: 0 }}>
          <table className="version-history-table full">
            <thead>
              <tr>
                <th>#</th>
                <th>التاريخ</th>
                <th>الناشر</th>
                <th>Commit SHA</th>
                <th>GitHub</th>
                <th>المفاتيح المتغيرة</th>
                <th>إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {versions.map((v) => (
                <tr key={v.id}>
                  <td><strong style={{ fontSize: "1.1em" }}>#{v.version}</strong></td>
                  <td>{new Date(v.publishedAt).toLocaleString("ar-EG")}</td>
                  <td>{v.publishedBy}</td>
                  <td>
                    <code style={{ fontSize: "0.8em" }}>{v.commitSha ? v.commitSha.slice(0, 12) : "—"}</code>
                  </td>
                  <td>
                    {v.commitUrl ? (
                      <a href={v.commitUrl} target="_blank" rel="noopener noreferrer" className="btn btn-soft btn-sm">
                        فتح
                      </a>
                    ) : (
                      <span style={{ color: "var(--text-muted)" }}>—</span>
                    )}
                  </td>
                  <td style={{ fontSize: "0.85em", color: "var(--text-muted)", maxWidth: "250px", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {(v.changedKeys as string[]).join(", ") || "—"}
                  </td>
                  <td>
                    {v.version > 1 && (
                      <button
                        className="btn btn-danger btn-sm"
                        onClick={() => setRollbackVersion(v.version)}
                        disabled={rollbacking}
                      >
                        استعادة
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="panel" style={{ fontSize: "0.9em", color: "var(--text-muted)" }}>
        <p>إجمالي الإصدارات: <strong>{total}</strong></p>
      </div>

      {rollbackVersion !== null && (
        <div
          className="rollback-confirm-backdrop"
          style={{
            position: "fixed", inset: 0, zIndex: 200,
            display: "grid", placeItems: "center",
            background: "rgba(0,0,0,0.6)", backdropFilter: "blur(6px)",
          }}
        >
          <div className="panel" style={{ maxWidth: "480px", width: "calc(100% - 32px)", padding: "24px" }}>
            <div className="admin-card-head">
              <div>
                <span className="eyebrow">Rollback Confirmation</span>
                <h2>تأكيد استعادة الإصدار #{rollbackVersion}</h2>
              </div>
            </div>
            <p style={{ margin: "16px 0", lineHeight: 1.7 }}>
              سيتم استعادة المحتوى من الإصدار <strong>#{rollbackVersion}</strong>.
              سيتم إنشاء إصدار جديد بنفس المحتوى.
              هل أنت متأكد؟
            </p>
            <div style={{ display: "flex", gap: "12px", justifyContent: "flex-end" }}>
              <button
                className="btn btn-soft"
                onClick={() => { setRollbackVersion(null); setRollbackResult(null); }}
                disabled={rollbacking}
              >
                إلغاء
              </button>
              <button
                className="btn btn-danger"
                onClick={handleRollback}
                disabled={rollbacking}
              >
                {rollbacking ? "جاري الاستعادة..." : "تأكيد الاستعادة"}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
