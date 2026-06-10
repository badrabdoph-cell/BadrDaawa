"use client";

import { ErrorRecoveryActions } from "@/components/ErrorRecoveryActions";
import "./globals.css";

export default function GlobalErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="ar" dir="rtl">
      <body>
        <main className="admin-error-page site-error-page">
          <section className="site-error-card">
            <ErrorRecoveryActions error={error} context="global" reset={reset} />
          </section>
        </main>
      </body>
    </html>
  );
}
