"use client";

import { useState } from "react";
import { CheckCircle2, Loader2, ShieldCheck, XCircle } from "lucide-react";

type VerifyResult = {
  ok: boolean;
  startedAt: string;
  finishedAt: string;
  durationMs: number;
  fileName: string | null;
  storagePath: string | null;
  sizeBytes: number | null;
  backupJob: {
    id: string;
    type: string;
    status: string;
    fileName: string | null;
    startedAt: string | null;
    finishedAt: string | null;
    sizeBytes: string | null;
    error: string | null;
    createdAt: string;
  } | null;
  steps: Array<{
    name: string;
    ok: boolean;
    detail: string;
    timestamp: string;
  }>;
  error: string | null;
};

function formatBytes(value: number | null) {
  if (value === null) return "غير متاح";
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
}

export function VerifyBackupButton() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<VerifyResult | null>(null);

  async function runVerification() {
    setLoading(true);
    setResult(null);
    try {
      const response = await fetch("/api/admin/backups/verify", {
        method: "POST",
        headers: { Accept: "application/json" },
      });
      const payload = (await response.json()) as VerifyResult;
      setResult(payload);
    } catch (error) {
      setResult({
        ok: false,
        startedAt: new Date().toISOString(),
        finishedAt: new Date().toISOString(),
        durationMs: 0,
        fileName: null,
        storagePath: null,
        sizeBytes: null,
        backupJob: null,
        steps: [
          {
            name: "request",
            ok: false,
            detail: error instanceof Error ? error.message : "تعذر تنفيذ الطلب.",
            timestamp: new Date().toISOString(),
          },
        ],
        error: error instanceof Error ? error.message : "تعذر تنفيذ الطلب.",
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="panel" style={{ display: "grid", gap: 12 }}>
      <div className="admin-card-head">
        <ShieldCheck size={22} />
        <div>
          <span className="eyebrow">Runtime Verification</span>
          <h2>Verify Backup</h2>
        </div>
      </div>
      <button className="btn btn-gold btn-glow" type="button" onClick={runVerification} disabled={loading}>
        {loading ? <Loader2 size={17} className="sync-spin" /> : <ShieldCheck size={17} />}
        {loading ? "جاري التحقق..." : "Verify Backup"}
      </button>

      {result ? (
        <div className={result.ok ? "notice success" : "notice danger"} style={{ alignItems: "flex-start" }}>
          {result.ok ? <CheckCircle2 size={18} /> : <XCircle size={18} />}
          <div style={{ display: "grid", gap: 8 }}>
            <strong>{result.ok ? "تم التحقق من النسخة فعلياً" : "فشل التحقق من النسخة"}</strong>
            <span>{result.error || `الملف: ${result.fileName || "غير متاح"} - الحجم: ${formatBytes(result.sizeBytes)}`}</span>
            <span>المدة: {result.durationMs}ms</span>
            {result.storagePath ? <code>{result.storagePath}</code> : null}
            {result.backupJob ? <span>BackupJob: {result.backupJob.id} / {result.backupJob.status}</span> : <span>BackupJob: غير موجود</span>}
            <div style={{ display: "grid", gap: 6 }}>
              {result.steps.map((step) => (
                <div key={`${step.name}-${step.timestamp}`} style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                  {step.ok ? <CheckCircle2 size={14} /> : <XCircle size={14} />}
                  <strong>{step.name}</strong>
                  <span>{step.detail}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
