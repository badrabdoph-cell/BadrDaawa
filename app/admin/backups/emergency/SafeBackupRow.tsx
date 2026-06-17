"use client";

import { ShieldX } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { RestoreBackupButton } from "../RestoreBackupButton";

type BackupData = {
  fileName: string;
  status: string;
  sizeBytes: number;
  createdAt: string;
};

type SafeEntry = {
  id: string;
  backupFileName: string;
  label: string | null;
  notes: string | null;
  markedAt: string;
  markedBy: string | null;
};

function formatBytes(value: number) {
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
}

export function SafeBackupRow({
  backup,
  safeEntry,
  formatDate,
}: {
  backup: BackupData;
  safeEntry: SafeEntry;
  formatDate: (iso: string) => string;
}) {
  const router = useRouter();
  const [removing, setRemoving] = useState(false);

  async function handleUnmark() {
    setRemoving(true);
    try {
      await fetch(`/api/admin/backups/${encodeURIComponent(backup.fileName)}/safe`, {
        method: "DELETE",
      });
      router.refresh();
    } catch {
      setRemoving(false);
    }
  }

  return (
    <tr>
      <td>
        <span className="safe-backup-label">{safeEntry.label || "بدون تصنيف"}</span>
      </td>
      <td>
        <span className="backup-file-name">{backup.fileName}</span>
      </td>
      <td>{formatDate(safeEntry.markedAt)}</td>
      <td style={{ direction: "ltr", textAlign: "right" }}>{formatBytes(backup.sizeBytes)}</td>
      <td>
        <div className="button-row">
          <RestoreBackupButton fileName={backup.fileName} />
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
