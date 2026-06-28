"use client";

import { useCallback, useEffect, useState } from "react";

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
  error?: string;
};

export function VersionHistorySection() {
  const [versions, setVersions] = useState<ContentVersion[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rollbackId, setRollbackId] = useState<number | null>(null);
  const [rolling, setRolling] = useState(false);
  const [result, setResult] = useState<RollbackResult | null>(null);
  const [expanded, setExpanded] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/versions?limit=100", { cache: "no-store" });
      if (res.ok) {
        const d = await res.json();
        setVersions(d.versions || []);
        setTotal(d.total || 0);
      } else {
        setError("فشل تحميل سجل الإصدارات");
      }
    } catch {
      setError("تعذر الاتصال بالخادم");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleRollback = useCallback(async () => {
    if (rollbackId === null) return;
    setRolling(true);
    setResult(null);
    try {
      const res = await fetch("/api/admin/publish/rollback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ version: rollbackId }),
      });
      const data: RollbackResult = await res.json();
      setResult(data);
      if (data.ok) await load();
    } catch (err) {
      setResult({ ok: false, message: err instanceof Error ? err.message : "Network error" });
    } finally {
      setRolling(false);
      setRollbackId(null);
    }
  }, [rollbackId, load]);

  return (
    <div style={{ border: "1px solid rgba(245,234,214,0.06)", borderRadius: 10, background: "rgba(255,255,255,0.01)", overflow: "hidden" }}>
      <div style={{ padding: "10px 14px", display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer", userSelect: "none" }} onClick={() => setExpanded(!expanded)}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: "0.9rem", fontWeight: 600, color: "#fff7e8" }}>سجل الإصدارات</span>
          <span style={{ fontSize: "0.76rem", opacity: 0.45 }}>({total} إصدار)</span>
        </div>
        <span style={{ opacity: 0.4, fontSize: "0.8rem" }}>{expanded ? "▲" : "▼"}</span>
      </div>

      {result && (
        <div style={{ padding: "0 14px 8px" }}>
          <div className={`notice ${result.ok ? "success" : "danger"}`} style={{ margin: 0, padding: "6px 10px", fontSize: "0.82rem" }}>
            {result.message}
          </div>
        </div>
      )}

      {error && (
        <div className="notice danger" style={{ margin: "8px 14px", padding: "6px 10px", fontSize: "0.82rem" }}>
          <span>{error}</span>
          <button className="btn btn-soft" onClick={load} style={{ marginRight: 8, fontSize: "0.78rem", padding: "2px 8px", minHeight: 0 }}>إعادة</button>
        </div>
      )}
      {expanded && (
        <div style={{ overflowX: "auto", borderTop: "1px solid rgba(245,234,214,0.05)" }}>
          {loading ? (
            <div style={{ padding: 20, textAlign: "center", opacity: 0.5, fontSize: "0.82rem" }}>جاري التحميل...</div>
          ) : versions.length === 0 ? (
            <div style={{ padding: 20, textAlign: "center", opacity: 0.5, fontSize: "0.82rem" }}>لا توجد إصدارات بعد</div>
          ) : (
            <table className="data-table" style={{ width: "100%", fontSize: "0.8rem" }}>
              <thead>
                <tr>
                  <th style={{ padding: "8px 12px", whiteSpace: "nowrap" }}>#</th>
                  <th style={{ padding: "8px 12px", whiteSpace: "nowrap" }}>التاريخ</th>
                  <th style={{ padding: "8px 12px", whiteSpace: "nowrap" }}>الناشر</th>
                  <th style={{ padding: "8px 12px", whiteSpace: "nowrap" }}>Commit</th>
                  <th style={{ padding: "8px 12px", whiteSpace: "nowrap" }}>المفاتيح</th>
                  <th style={{ padding: "8px 12px", whiteSpace: "nowrap" }}></th>
                </tr>
              </thead>
              <tbody>
                {versions.map((v) => (
                  <tr key={v.id}>
                    <td style={{ padding: "6px 12px", fontWeight: 600 }}>#{v.version}</td>
                    <td style={{ padding: "6px 12px", whiteSpace: "nowrap", fontSize: "0.76rem" }}>{new Date(v.publishedAt).toLocaleString("ar-EG")}</td>
                    <td style={{ padding: "6px 12px" }}>{v.publishedBy}</td>
                    <td style={{ padding: "6px 12px" }}>
                      {v.commitUrl ? (
                        <a href={v.commitUrl} target="_blank" rel="noreferrer" style={{ fontFamily: "monospace", fontSize: "0.76rem", color: "#f3cf73" }}>
                          {v.commitSha?.slice(0, 10) || "—"}
                        </a>
                      ) : (
                        <code style={{ fontSize: "0.76rem", opacity: 0.5 }}>{v.commitSha?.slice(0, 10) || "—"}</code>
                      )}
                    </td>
                    <td style={{ padding: "6px 12px", fontSize: "0.76rem", opacity: 0.6, maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {(v.changedKeys as string[]).join(", ") || "—"}
                    </td>
                    <td style={{ padding: "6px 12px", whiteSpace: "nowrap" }}>
                      {v.version > 1 && (
                        <button
                          className="btn btn-danger btn-sm"
                          style={{ padding: "3px 8px", fontSize: "0.76rem", minHeight: 0 }}
                          onClick={() => setRollbackId(v.version)}
                          disabled={rolling}
                        >
                          استعادة
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {rollbackId !== null && (
        <div style={{ position: "fixed", inset: 0, zIndex: 200, display: "grid", placeItems: "center", background: "rgba(0,0,0,0.6)", backdropFilter: "blur(6px)" }}>
          <div className="panel" style={{ maxWidth: 420, width: "calc(100% - 32px)", padding: 20 }}>
            <div className="admin-card-head">
              <div>
                <span className="eyebrow">Rollback</span>
                <h2 style={{ fontSize: "1.1rem" }}>تأكيد استعادة الإصدار #{rollbackId}</h2>
              </div>
            </div>
            <p style={{ margin: "12px 0", fontSize: "0.9rem", lineHeight: 1.6 }}>
              سيتم استعادة المحتوى من الإصدار <strong>#{rollbackId}</strong>. سيتم إنشاء إصدار جديد بنفس المحتوى. هل أنت متأكد؟
            </p>
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button className="btn btn-soft" onClick={() => { setRollbackId(null); setResult(null); }} disabled={rolling}>إلغاء</button>
              <button className="btn btn-danger" onClick={handleRollback} disabled={rolling}>
                {rolling ? "جاري..." : "تأكيد الاستعادة"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
