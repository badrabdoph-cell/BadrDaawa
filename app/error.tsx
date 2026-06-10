"use client";

import { ErrorRecoveryActions } from "@/components/ErrorRecoveryActions";

export default function AppErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <ErrorRecoveryActions error={error} context="site" reset={reset} />;
}
