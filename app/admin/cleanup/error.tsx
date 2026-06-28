"use client";

import AdminErrorBoundary from "@/components/AdminErrorBoundary";

export default function CleanupError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <AdminErrorBoundary
      error={error}
      reset={reset}
      title="فشل فحص النظام"
      message="تعذر إجراء فحص التنظيف. قد يكون الخادم مشغولاً."
    />
  );
}
