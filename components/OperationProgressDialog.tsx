"use client";

import { useEffect, useRef, useState } from "react";
import { CheckCircle2, XCircle, Loader2, AlertTriangle, Copy, ChevronDown, ChevronUp } from "lucide-react";
import type { OperationProgress } from "@/lib/operation-progress";

type Props<T = unknown> = {
  operationId: string | null;
  onDone: (result: T | null, error: string | null) => void;
  onCancel?: () => void;
};

export function OperationProgressDialog<T = unknown>({ operationId, onDone, onCancel }: Props<T>) {
  const [progress, setProgress] = useState<OperationProgress | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [copied, setCopied] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!operationId) return;
    pollRef.current = setInterval(async () => {
      try {
        const res = await fetch(`/api/admin/backups/operations/${operationId}/status`);
        if (!res.ok) {
          clearInterval(pollRef.current!);
          onDone(null, "تعذر التحقق من حالة العملية");
          return;
        }
        const data = (await res.json()) as OperationProgress;
        setProgress(data);
        if (data.status === "completed") {
          clearInterval(pollRef.current!);
          onDone((data.result as T) || null, null);
        } else if (data.status === "failed") {
          clearInterval(pollRef.current!);
          onDone(null, data.error || "فشلت العملية بدون تفاصيل");
        }
      } catch {
        // keep polling
      }
    }, 800);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [operationId, onDone]);

  const copyError = async () => {
    if (!progress?.error) return;
    const text = [
      `Error: ${progress.error}`,
      progress.errorDetails ? `Details: ${progress.errorDetails}` : "",
      `Code: ${progress.errorCode || "—"}`,
      `Time: ${progress.startedAt}`,
    ].filter(Boolean).join("\n");
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!progress) {
    return (
      <div className="restore-result-overlay" role="dialog" aria-modal="true">
        <div className="restore-result-dialog" style={{ minWidth: 360 }}>
          <div className="restore-result-header">
            <Loader2 size={24} className="sync-spin" />
            <h3>جاري بدء العملية...</h3>
          </div>
        </div>
      </div>
    );
  }

  const isRunning = progress.status === "pending" || progress.status === "in_progress";
  const isFailed = progress.status === "failed";
  const isDone = progress.status === "completed";

  return (
    <div className="restore-result-overlay" role="dialog" aria-modal="true">
      <div className="restore-result-dialog" style={{ minWidth: 380 }}>
        <div className="restore-result-header">
          {isRunning ? (
            <Loader2 size={24} className="sync-spin" />
          ) : isDone ? (
            <CheckCircle2 size={28} className="restore-icon-success" />
          ) : (
            <XCircle size={28} className="restore-icon-error" />
          )}
          <h3>{progress.label}</h3>
          {onCancel && isRunning ? (
            <button className="restore-result-close" type="button" onClick={onCancel} aria-label="إلغاء">
              <XCircle size={20} />
            </button>
          ) : null}
        </div>

        <div className="progress-track">
          <div className="progress-bar-bg">
            <div
              className={`progress-bar-fill ${isFailed ? "progress-bar-failed" : ""}`}
              style={{ width: `${progress.progress}%` }}
            />
          </div>
          <span className="progress-text">{progress.progress}%</span>
        </div>

        <p className="progress-step-label">{progress.step}</p>

        {isFailed ? (
          <div className="restore-result-error">
            <AlertTriangle size={18} />
            <div style={{ flex: 1, display: "grid", gap: 8 }}>
              <span>{progress.error}</span>
              {progress.errorDetails ? (
                <div className="error-details-toggle">
                  <button
                    className="btn btn-sm btn-soft"
                    type="button"
                    onClick={() => setShowDetails(!showDetails)}
                  >
                    {showDetails ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    <span>{showDetails ? "إخفاء التفاصيل" : "عرض التفاصيل"}</span>
                  </button>
                  {showDetails ? (
                    <pre className="error-details-box">{progress.errorDetails}</pre>
                  ) : null}
                </div>
              ) : null}
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                {progress.errorCode ? (
                  <span className="error-code-badge">{progress.errorCode}</span>
                ) : null}
                <button className="btn btn-sm btn-soft" type="button" onClick={copyError}>
                  <Copy size={13} />
                  <span>{copied ? "تم النسخ" : "نسخ الخطأ"}</span>
                </button>
              </div>
            </div>
          </div>
        ) : null}

        {isDone ? (
          <button className="btn btn-gold" type="button" onClick={() => onDone(null, null)} style={{ width: "100%" }}>
            حسناً
          </button>
        ) : null}
      </div>
    </div>
  );
}
