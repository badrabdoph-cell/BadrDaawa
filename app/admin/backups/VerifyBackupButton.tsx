"use client";

import { useState } from "react";
import { CheckCircle2, Loader2, ShieldCheck, XCircle, X } from "lucide-react";

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
    githubSha: string | null;
    githubUrl: string | null;
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
    <>
      <button
        className="btn btn-soft"
        type="button"
        onClick={runVerification}
        disabled={loading}
      >
        {loading ? (
          <Loader2 size={17} className="sync-spin" />
        ) : (
          <ShieldCheck size={17} />
        )}
        {loading ? "جاري التحقق..." : "Verify Backup"}
      </button>

      {result ? (
        <div className="backup-verify-overlay" onClick={() => setResult(null)} role="dialog" aria-modal="true">
          <div className="backup-verify-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="verify-header">
              {result.ok ? (
                <CheckCircle2 size={24} style={{ color: "#4caf87", flexShrink: 0 }} />
              ) : (
                <XCircle size={24} style={{ color: "#d9534f", flexShrink: 0 }} />
              )}
              <h3>{result.ok ? "تم التحقق من النسخة" : "فشل التحقق من النسخة"}</h3>
              <button className="verify-close" type="button" onClick={() => setResult(null)} aria-label="إغلاق">
                <X size={20} />
              </button>
            </div>

            <div className="verify-status">
              {result.ok ? (
                <span style={{ color: "#4caf87" }}>نسخة سليمة ومعتمدة</span>
              ) : (
                <span style={{ color: "#d9534f" }}>{result.error || "فشل غير متوقع"}</span>
              )}
            </div>

            <div className="verify-meta">
              {result.fileName ? `الملف: ${result.fileName}` : ""}
              {result.sizeBytes ? ` · الحجم: ${formatBytes(result.sizeBytes)}` : ""}
              {result.durationMs ? ` · المدة: ${(result.durationMs / 1000).toFixed(1)}s` : ""}
            </div>

            {result.storagePath ? (
              <code className="verify-path">{result.storagePath}</code>
            ) : null}

            <div className="verify-steps">
              {result.steps.map((step) => (
                <div key={`${step.name}-${step.timestamp}`} className="verify-step">
                  {step.ok ? (
                    <CheckCircle2 size={14} style={{ color: "#4caf87", flexShrink: 0 }} />
                  ) : (
                    <XCircle size={14} style={{ color: "#d9534f", flexShrink: 0 }} />
                  )}
                  <strong>{step.name}</strong>
                  <span>{step.detail}</span>
                </div>
              ))}
            </div>

            {result.backupJob ? (
              <div className="verify-job-info">
                BackupJob: {result.backupJob.id.slice(0, 8)}… / {result.backupJob.status}
                {result.backupJob.githubSha ? ` · SHA: ${result.backupJob.githubSha.slice(0, 12)}…` : ""}
                {result.backupJob.githubUrl ? (
                  <>
                    {" · "}
                    <a
                      href={result.backupJob.githubUrl}
                      target="_blank"
                      rel="noreferrer"
                      style={{ color: "#f3cf73", textDecoration: "underline" }}
                    >
                      GitHub
                    </a>
                  </>
                ) : null}
              </div>
            ) : null}

            <button className="btn btn-soft" type="button" onClick={() => setResult(null)}>
              إغلاق
            </button>
          </div>
        </div>
      ) : null}
    </>
  );
}
