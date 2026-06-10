"use client";

import { ErrorRecoveryActions } from "@/components/ErrorRecoveryActions";

export default function AppErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="admin-error-page site-error-page">
      <section className="site-error-card">
        <ErrorRecoveryActions error={error} context="site" reset={reset} />
      </section>
    </main>
  );
}
