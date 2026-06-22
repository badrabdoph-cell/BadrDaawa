"use client";

import { useEffect, useState } from "react";
import { Database, CloudUpload, Archive, CheckCircle2, XCircle, Github, Loader2, RotateCcw } from "lucide-react";
import { formatBytes, formatDate, formatDuration, formatCompressionRatio, formatBackupType, formatBackupStatus, truncateSha, type BackupDisplayRow } from "@/lib/backup-display";
import { BackupDetailsDrawer } from "@/components/BackupDetailsDrawer";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { OperationProgressDialog } from "@/components/OperationProgressDialog";

type BackupMap = {
  database: BackupDisplayRow[];
  uploads: BackupDisplayRow[];
  full: BackupDisplayRow[];
};

const TYPE_ICONS: Record<string, React.ElementType> = {
  database: Database,
  uploads: CloudUpload,
  full: Archive,
};

const TYPE_COLORS: Record<string, string> = {
  database: "#4a9eff",
  uploads: "#4caf87",
  full: "#d9534f",
};

const TYPE_ENDPOINT: Record<string, string> = {
  database: "/api/admin/backups/github/restore/database",
  uploads: "/api/admin/backups/github/restore/uploads",
  full: "/api/admin/backups/github/restore/full",
};

function BackupTypeBadge({ type }: { type: string }) {
  const Icon = TYPE_ICONS[type] || Archive;
  const color = TYPE_COLORS[type] || "rgba(245, 234, 214, 0.5)";
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 4, color }}>
      <Icon size={14} />
      <span>{formatBackupType(type)}</span>
    </span>
  );
}

export function V2BackupTable() {
  const [data, setData] = useState<BackupMap | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedBackup, setSelectedBackup] = useState<BackupDisplayRow | null>(null);
  const [filterType, setFilterType] = useState<string>("all");
  const [restoreTarget, setRestoreTarget] = useState<BackupDisplayRow | null>(null);
  const [operationId, setOperationId] = useState<string | null>(null);
  const [restoreLoading, setRestoreLoading] = useState(false);
  const [restoreError, setRestoreError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    fetch("/api/admin/backups/v2/stats?all=true")
      .then((r) => r.json())
      .then((json) => {
        if (json.backups) setData(json.backups as BackupMap);
        else setError(json.error || "فشل تحميل البيانات");
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  async function confirmRestore() {
    if (!restoreTarget) return;
    setRestoreLoading(true);
    setRestoreError(null);

    try {
      const opRes = await fetch("/api/admin/backups/operations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: `restore-${restoreTarget.type}` }),
      });
      const { operationId: opId } = await opRes.json();
      setOperationId(opId);

      const endpoint = TYPE_ENDPOINT[restoreTarget.type] || TYPE_ENDPOINT.database;
      const body = {
        operationId: opId,
        fileName: restoreTarget.fileName,
        sha: restoreTarget.commitSha,
      };

      const response = await fetch(endpoint, {
        method: "POST",
        headers: { Accept: "application/json", "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const payload = await response.json();
      setOperationId(null);
      setRestoreTarget(null);
      setRestoreLoading(false);
      if (payload.ok) {
        setTimeout(() => window.location.reload(), 3000);
      } else {
        setRestoreError(payload.error || "فشلت الاستعادة");
      }
    } catch (err) {
      setOperationId(null);
      setRestoreError(err instanceof Error ? err.message : "فشل الاتصال");
      setRestoreLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="panel" style={{ marginTop: "2rem" }}>
        <div className="admin-card-head">
          <Archive size={20} />
          <div>
            <span className="eyebrow">Backup History</span>
            <h3>جميع النسخ الاحتياطية v2</h3>
          </div>
        </div>
        <div style={{ display: "grid", placeItems: "center", padding: "2rem" }}>
          <Loader2 size={24} className="sync-spin" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="panel" style={{ marginTop: "2rem" }}>
        <div className="admin-card-head">
          <Archive size={20} />
          <div>
            <span className="eyebrow">Backup History</span>
            <h3>جميع النسخ الاحتياطية v2</h3>
          </div>
        </div>
        <div className="notice danger">{error}</div>
      </div>
    );
  }

  if (!data) return null;

  const allRows: BackupDisplayRow[] = [
    ...data.database,
    ...data.uploads,
    ...data.full,
  ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const filteredRows = filterType === "all" ? allRows : allRows.filter((r) => r.type === filterType);

  return (
    <>
      <div className="panel" style={{ marginTop: "2rem" }}>
        <div className="admin-card-head">
          <Archive size={20} />
          <div>
            <span className="eyebrow">Backup History</span>
            <h3>جميع النسخ الاحتياطية v2</h3>
            <p style={{ fontSize: "0.82rem", color: "rgba(245, 234, 214, 0.5)", marginTop: 2 }}>
              إجمالي {allRows.length} نسخة — اضغط على أي صف للتفاصيل
            </p>
          </div>
        </div>

        <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
          {["all", "database", "uploads", "full"].map((t) => {
            const count = t === "all" ? allRows.length : data[t as keyof BackupMap].length;
            return (
              <button
                key={t}
                className={`btn btn-sm ${filterType === t ? "btn-gold" : "btn-soft"}`}
                type="button"
                onClick={() => setFilterType(t)}
              >
                {t === "all" ? "الكل" : formatBackupType(t)}
                <span style={{ opacity: 0.6, marginRight: 4 }}>({count})</span>
              </button>
            );
          })}
        </div>

        <div className="table-shell" style={{ marginTop: 14 }}>
          <table className="backup-v2-table">
            <thead>
              <tr>
                <th>النوع</th>
                <th>الحالة</th>
                <th>التاريخ</th>
                <th>الحجم</th>
                <th>الضغط</th>
                <th>السجلات</th>
                <th>الملفات</th>
                <th>GitHub SHA</th>
                <th>استعادة</th>
              </tr>
            </thead>
            <tbody>
              {filteredRows.length ? (
                filteredRows.map((row) => {
                  const st = formatBackupStatus(row.status);
                  return (
                    <tr key={row.id} onClick={() => setSelectedBackup(row)} style={{ cursor: "pointer" }}>
                      <td><BackupTypeBadge type={row.type} /></td>
                      <td>
                        <span style={{ color: st.color, display: "inline-flex", alignItems: "center", gap: 4 }}>
                          {row.status === "SUCCESS" ? <CheckCircle2 size={14} /> : <XCircle size={14} />}
                          {st.label}
                        </span>
                      </td>
                      <td style={{ fontSize: "0.78rem" }}>{formatDate(row.createdAt)}</td>
                      <td style={{ direction: "ltr", textAlign: "right", fontSize: "0.78rem" }}>{formatBytes(row.sizeBytes)}</td>
                      <td style={{ fontSize: "0.78rem", color: row.compressedSizeBytes ? "#4caf87" : "rgba(245,234,214,0.3)" }}>
                        {row.compressedSizeBytes ? formatCompressionRatio(row.compressedSizeBytes, row.sizeBytes) : "—"}
                      </td>
                      <td>{row.items > 0 ? row.items.toLocaleString("ar-EG") : "—"}</td>
                      <td>{row.uploadsCount > 0 ? `${row.uploadsCount} ملف` : "—"}</td>
                      <td>
                        <span style={{ fontFamily: "var(--font-jetbrains-mono, ui-monospace, monospace)", fontSize: "0.72rem", direction: "ltr" }}>
                          {truncateSha(row.commitSha)}
                        </span>
                      </td>
                      <td>
                        <button
                          className="btn btn-sm btn-danger"
                          type="button"
                          title="استعادة هذه النسخة"
                          onClick={(e) => {
                            e.stopPropagation();
                            setRestoreTarget(row);
                            setRestoreError(null);
                          }}
                          disabled={restoreLoading}
                        >
                          {restoreLoading && restoreTarget?.id === row.id ? (
                            <Loader2 size={13} className="sync-spin" />
                          ) : (
                            <RotateCcw size={13} />
                          )}
                        </button>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={9}>
                    <div className="admin-empty-state">
                      <strong>لا توجد نسخ احتياطية v2</strong>
                      <p>أنشئ نسخة احتياطية أولى من الأزرار أعلاه.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <BackupDetailsDrawer backup={selectedBackup} onClose={() => setSelectedBackup(null)} />

      <ConfirmDialog
        isOpen={!!restoreTarget}
        title={`استعادة ${formatBackupType(restoreTarget?.type || "")}`}
        message={restoreTarget ? `سيتم استعادة النسخة التالية:\n\nالملف: ${restoreTarget.fileName}\nالتاريخ: ${formatDate(restoreTarget.createdAt)}\n\n${restoreTarget.type === "full" ? "سيتم حذف جميع البيانات والملفات الحالية." : restoreTarget.type === "database" ? "سيتم حذف بيانات قاعدة البيانات الحالية." : "سيتم استبدال الملفات المرفوعة."}\nهذا الإجراء لا يمكن التراجع عنه!` : ""}
        confirmText="تأكيد الاستعادة"
        cancelText="إلغاء"
        isDangerous={true}
        isLoading={restoreLoading}
        onConfirm={confirmRestore}
        onCancel={() => { setRestoreTarget(null); setRestoreError(null); }}
      />

      {operationId ? (
        <OperationProgressDialog
          operationId={operationId}
          onDone={(_result, error) => {
            setOperationId(null);
            setRestoreLoading(false);
            setRestoreTarget(null);
            if (!error) {
              setTimeout(() => window.location.reload(), 3000);
            } else {
              setRestoreError(error);
            }
          }}
        />
      ) : null}

      {restoreError ? (
        <div className="restore-result-overlay" onClick={() => setRestoreError(null)} role="dialog" aria-modal="true">
          <div className="restore-result-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="restore-result-header">
              <XCircle size={28} className="restore-icon-error" />
              <h3>فشلت الاستعادة</h3>
              <button className="restore-result-close" type="button" onClick={() => setRestoreError(null)} aria-label="إغلاق">
                <XCircle size={20} />
              </button>
            </div>
            <div className="restore-result-error">
              <span>{restoreError}</span>
            </div>
            <button className="btn btn-soft" type="button" onClick={() => setRestoreError(null)}>
              إغلاق
            </button>
          </div>
        </div>
      ) : null}
    </>
  );
}
