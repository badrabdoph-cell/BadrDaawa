"use client";

import { useEffect, useState } from "react";
import { Database, CloudUpload, Archive, CheckCircle2, XCircle, Github, Loader2 } from "lucide-react";
import { formatBytes, formatDate, formatDuration, formatCompressionRatio, formatBackupType, formatBackupStatus, truncateSha, type BackupDisplayRow } from "@/lib/backup-display";
import { BackupDetailsDrawer } from "@/components/BackupDetailsDrawer";

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
              إجمالي {allRows.length} نسخة
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
                <th>المسار</th>
              </tr>
            </thead>
            <tbody>
              {filteredRows.length ? (
                filteredRows.map((row) => {
                  const st = formatBackupStatus(row.status);
                  return (
                    <tr key={row.id} onClick={() => setSelectedBackup(row)}>
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
                        <span style={{ fontFamily: "var(--font-jetbrains-mono, ui-monospace, monospace)", fontSize: "0.7rem", color: "rgba(245,234,214,0.5)", direction: "ltr", display: "block", maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {row.repoPath || "—"}
                        </span>
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
    </>
  );
}
