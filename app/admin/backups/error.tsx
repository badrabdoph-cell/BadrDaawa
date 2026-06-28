"use client";

import AdminErrorBoundary from "@/components/AdminErrorBoundary";

export default function BackupsError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <AdminErrorBoundary
      error={error}
      reset={reset}
      title="فشل تحميل النسخ الاحتياطية"
      message="تعذر الاتصال بخدمة النسخ الاحتياطي. قد يكون الخادم مشغولاً أو قاعدة البيانات غير متصلة."
    />
  );
}
