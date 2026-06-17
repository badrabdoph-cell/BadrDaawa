"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, ShieldCheck } from "lucide-react";

type BackupData = {
  fileName: string;
  status: string;
  createdAt: string;
  type?: string;
  sizeBytes?: number;
};

type Props = {
  backups: BackupData[];
  safeFileNames: Set<string>;
};

function formatBackupDate(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return new Intl.DateTimeFormat("ar-EG-u-nu-latn", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Africa/Cairo",
  }).format(d);
}

function typeLabel(type?: string) {
  if (type === "scheduled") return "تلقائي";
  if (type === "manual") return "يدوي";
  return type || "—";
}

export function MarkSafePanel({ backups, safeFileNames }: Props) {
  const router = useRouter();
  const [selectedFile, setSelectedFile] = useState("");
  const [label, setLabel] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const eligibleBackups = backups.filter(
    (b) => b.status === "SUCCESS" && !safeFileNames.has(b.fileName)
  );

  async function handleMark() {
    if (!selectedFile || !label.trim()) return;
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/admin/backups/${encodeURIComponent(selectedFile)}/safe`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ label: label.trim() }),
      });
      if (!res.ok) throw new Error("فشلت العملية");
      setMessage({ type: "success", text: "تمت إضافة النسخة إلى الموثوقة بنجاح" });
      setSelectedFile("");
      setLabel("");
      setTimeout(() => router.refresh(), 1000);
    } catch {
      setMessage({ type: "error", text: "فشلت إضافة النسخة" });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="panel emergency-mark-panel">
      <div className="admin-card-head">
        <ShieldCheck size={22} />
        <div>
          <span className="eyebrow">Mark Backup as Safe</span>
          <h2>إضافة نسخة موثوقة</h2>
          <p>حدد نسخة احتياطية سليمة وأضف تصنيفًا واضحًا (مثلاً: &quot;قبل تعديلات الدعوات&quot;)</p>
        </div>
      </div>

      <div className="emergency-mark-form">
        <div className="emergency-mark-field">
          <label>اختر النسخة</label>
          <select
            value={selectedFile}
            onChange={(e) => setSelectedFile(e.target.value)}
            disabled={saving}
          >
            <option value="">-- اختر نسخة --</option>
            {eligibleBackups.map((b) => (
              <option key={b.fileName} value={b.fileName}>
                {b.fileName} — {formatBackupDate(b.createdAt)} — {typeLabel(b.type)}
              </option>
            ))}
          </select>
        </div>
        <div className="emergency-mark-field">
          <label>تصنيف (مثال: &quot;نسخة نظيفة قبل التعديلات&quot;)</label>
          <input
            type="text"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="مثال: نسخة نظيفة قبل تعديلات يونيو"
            disabled={saving}
          />
        </div>
        <button
          className="btn btn-primary"
          type="button"
          onClick={handleMark}
          disabled={!selectedFile || !label.trim() || saving}
        >
          {saving ? "جاري الحفظ..." : <><Plus size={18} /> إضافة إلى الموثوقة</>}
        </button>
      </div>

      {message ? (
        <div className={`emergency-mark-message ${message.type}`}>
          {message.text}
        </div>
      ) : null}
    </div>
  );
}
