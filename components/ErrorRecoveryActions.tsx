"use client";

import { RefreshCw } from "lucide-react";
import { CopyButton } from "./CopyButton";

type ErrorRecoveryActionsProps = {
  error: Error & { digest?: string };
  context: string;
  reset?: () => void;
};

function buildErrorReport(error: ErrorRecoveryActionsProps["error"], context: string) {
  const lines = [
    `Context: ${context}`,
    `URL: ${typeof window === "undefined" ? "server-render" : window.location.href}`,
    `Time: ${new Date().toISOString()}`,
    `Digest: ${error.digest || "not-available"}`,
    `Name: ${error.name || "Error"}`,
    `Message: ${error.message || "No public message. Check server logs with the digest above."}`,
  ];

  if (error.stack) {
    lines.push("", "Stack:", error.stack);
  }

  return lines.join("\n");
}

export function ErrorRecoveryActions({ error, context, reset }: ErrorRecoveryActionsProps) {
  const reloadPage = () => {
    if (reset) reset();
    window.location.reload();
  };

  return (
    <div className="error-actions">
      <button className="btn btn-gold btn-glow" type="button" onClick={reloadPage}>
        <RefreshCw size={17} />
        تحديث الصفحة
      </button>
      <CopyButton className="btn btn-soft btn-glass" value={buildErrorReport(error, context)} label="نسخ الخطأ" copiedLabel="تم النسخ" title="نسخ تفاصيل الخطأ" />
    </div>
  );
}
