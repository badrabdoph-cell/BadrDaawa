"use client";

import AdminErrorBoundary from "@/components/AdminErrorBoundary";

export default function TasksError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <AdminErrorBoundary
      error={error}
      reset={reset}
      title="فشل تحميل المهام"
      message="تعذر تحميل بيانات المهام المجدولة."
    />
  );
}
