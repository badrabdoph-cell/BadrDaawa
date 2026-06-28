"use client";

import AdminErrorBoundary from "@/components/AdminErrorBoundary";

export default function SyncError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <AdminErrorBoundary
      error={error}
      reset={reset}
      title="فشل تحميل المزامنة"
      message="تعذر الاتصال بخدمة المزامنة. تحقق من اتصال GitHub."
    />
  );
}
