"use client";

import { useEffect, useMemo, useRef } from "react";

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
  const reportedRef = useRef(false);

  useEffect(() => {
    if (reportedRef.current) return;
    reportedRef.current = true;
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

  if (isAdminContext) {
    return null;
  }

  return (
    <main className="site-fallback-error" dir="rtl">
      <section>
        <span>تعذر تحميل الصفحة</span>
        <h1>حصل خطأ مؤقت داخل الموقع.</h1>
        <p>تم تسجيل المشكلة تلقائياً للمراجعة. يمكنك الرجوع للصفحة الرئيسية والمتابعة من هناك.</p>
        <a className="btn btn-primary" href="/">العودة للرئيسية</a>
      </section>
    </main>
  );
}
