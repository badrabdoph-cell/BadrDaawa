"use client";

import { ShieldX, FileWarning } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { RestoreBackupButton } from "../RestoreBackupButton";

type BackupData = {
  fileName: string;
  status: string;
  sizeBytes: number;
  createdAt: string;
  type?: string;
};

type SafeEntry = {
  id: string;
  backupFileName: string;
  label: string | null;
  notes: string | null;
  markedAt: string;
  markedBy: string | null;
};

function formatBytes(value: number | null) {
  if (value === null) return "—";
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
}

function typeLabel(type?: string) {
  if (type === "scheduled") return "تلقائي";
  if (type === "manual") return "يدوي";
  return type || "—";
}

export function SafeBackupRow({
  backup,
  safeEntry,
  fileExists,
  formatDate,
}: {
  backup: BackupData | null;
  safeEntry: SafeEntry;
  fileExists: boolean;
  formatDate: (iso: string) => string;
}) {
  const router = useRouter();
  const [removing, setRemoving] = useState(false);

  async function handleUnmark() {
    setRemoving(true);
    try {
      await fetch(`/api/admin/backups/${encodeURIComponent(safeEntry.backupFileName)}/safe`, {
        method: "DELETE",
      });
      router.refresh();
    } catch {
      setRemoving(false);
    }
  }

  return (
    <tr className={!fileExists ? "emergency-row-missing" : ""}>
      <td>
        <span className="safe-backup-label">{safeEntry.label || "بدون تصنيف"}</span>
        {!fileExists ? (
          <span className="emergency-file-missing-badge">
            <FileWarning size={13} />
            الملف مفقود
          </span>
        ) : null}
      </td>
      <td>
        <span className="backup-file-name">{safeEntry.backupFileName}</span>
      </td>
      <td>{backup ? formatDate(backup.createdAt) : "—"}</td>
      <td>{formatDate(safeEntry.markedAt)}</td>
      <td>
        {fileExists ? (
          <span className="safe-backup-label" style={{ background: "rgba(34,197,94,0.12)", color: "#22c55e" }}>
            موجود
          </span>
        ) : (
          <span className="safe-backup-label" style={{ background: "rgba(255,68,68,0.12)", color: "#ff4444" }}>
            مفقود
          </span>
        )}
      </td>
      <td style={{ direction: "ltr", textAlign: "right" }}>
        {backup ? formatBytes(backup.sizeBytes) : "—"}
      </td>
      <td>
        <div className="button-row">
          {fileExists ? (
            <RestoreBackupButton fileName={backup!.fileName} />
          ) : (
            <button
              className="btn btn-icon"
              disabled
              title="الملف غير موجود"
              style={{ opacity: 0.4, cursor: "not-allowed" }}
            >
              <ShieldX size={17} />
            </button>
          )}
          <button
            className="btn btn-soft btn-icon"
            type="button"
            onClick={handleUnmark}
            disabled={removing}
            title="إزالة من الموثوقة"
          >
            <ShieldX size={17} />
          </button>
        </div>
      </td>
    </tr>
  );
}
