"use client";

import { useEffect, useMemo } from "react";
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

function hashText(value: string) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36).toUpperCase().padStart(7, "0");
}

function buildErrorCode(error: ErrorRecoveryActionsProps["error"], context: string) {
  if (error.digest) return error.digest;
  return `ERR-${Date.now().toString(36).toUpperCase()}-${hashText(`${context}:${error.name}:${error.message}`).slice(0, 7)}`;
}

export function ErrorRecoveryActions({ error, context, reset }: ErrorRecoveryActionsProps) {
  const report = useMemo(() => buildErrorReport(error, context), [context, error]);
  const errorCode = useMemo(() => buildErrorCode(error, context), [context, error]);
  const isAdminContext = context === "admin";

  useEffect(() => {
    const payload = {
      route: typeof window === "undefined" ? "server-render" : window.location.href,
      message: error.message || error.name || "Unknown error",
      stack: error.stack || report,
      digest: errorCode,
      source: `react-boundary:${context}`,
      user: context === "admin" ? "admin" : context,
    };

    fetch("/api/errors", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      keepalive: true,
    }).catch(() => undefined);
  }, [context, error.digest, error.message, error.name, error.stack, report]);

  if (!isAdminContext) {
    return null;
  }

  const reloadPage = () => {
    if (reset) reset();
    window.location.reload();
  };

  return (
    <div className="site-error-notice">
      <strong>error</strong>
      <button className="site-error-refresh" type="button" onClick={reloadPage}>
        <RefreshCw size={17} />
        تحديث الصفحة
      </button>
      <CopyButton className="site-error-copy" value={errorCode} label="نسخ" copiedLabel="تم" title="نسخ كود الخطأ" />
    </div>
  );
}
