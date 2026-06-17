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
        <div
          className={`backup-verify-result ${result.ok ? "ok" : "fail"}`}
          style={{ gridColumn: "1 / -1" }}
        >
          <div className="backup-verify-head">
            {result.ok ? (
              <CheckCircle2 size={18} style={{ color: "#4caf87", flexShrink: 0 }} />
            ) : (
              <XCircle size={18} style={{ color: "#d9534f", flexShrink: 0 }} />
            )}
            {result.ok ? "تم التحقق من النسخة فعلياً" : "فشل التحقق من النسخة"}
          </div>

          <div style={{ fontSize: "0.85rem", fontWeight: 800, lineHeight: 1.7 }}>
            {result.error || (
              <>
                الملف: {result.fileName || "غير متاح"} · الحجم:{" "}
                {formatBytes(result.sizeBytes)} · المدة: {result.durationMs}ms
              </>
            )}
          </div>

          {result.storagePath ? (
            <code
              style={{
                direction: "ltr",
                display: "block",
                fontSize: "0.78rem",
                overflowWrap: "anywhere",
                background: "rgba(0,0,0,0.2)",
                padding: "6px 10px",
                borderRadius: 8,
              }}
            >
              {result.storagePath}
            </code>
          ) : null}

          <div className="backup-verify-steps">
            {result.steps.map((step) => (
              <div key={`${step.name}-${step.timestamp}`} className="backup-verify-step">
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
            <div
              style={{
                fontSize: "0.8rem",
                fontWeight: 800,
                color: "rgba(245, 234, 214, 0.6)",
              }}
            >
              BackupJob: {result.backupJob.id} / {result.backupJob.status}
              {result.backupJob.githubSha
                ? ` · SHA: ${result.backupJob.githubSha}`
                : null}
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
        </div>
      ) : null}
    </>
  );
}
