"use client";

import AdminErrorBoundary from "@/components/AdminErrorBoundary";

export default function PublishError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <AdminErrorBoundary
      error={error}
      reset={reset}
      title="فشل تحميل صفحة النشر"
      message="تعذر تحميل بيانات النشر والإصدارات. حاول مرة أخرى."
    />
  );
}
