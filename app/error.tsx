"use client";

import { AlertTriangle } from "lucide-react";
import { ErrorRecoveryActions } from "@/components/ErrorRecoveryActions";

export default function AppErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="admin-error-page site-error-page">
      <section className="admin-error-card site-error-card">
        <AlertTriangle size={34} />
        <span className="eyebrow">Site Safety</span>
        <h1>حصل خطأ في الموقع</h1>
        <p>اضغط تحديث الصفحة، ولو المشكلة اتكررت انسخ الخطأ وابعته كما هو عشان نصلحه بسرعة.</p>
        {error.digest ? <code>{error.digest}</code> : null}
        <ErrorRecoveryActions error={error} context="site" reset={reset} />
      </section>
    </main>
  );
}
