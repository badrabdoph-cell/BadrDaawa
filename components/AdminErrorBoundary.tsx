"use client";

import Link from "next/link";

export default function AdminErrorBoundary({
  error,
  reset,
  title = "حدث خطأ",
  message = "تعذر تحميل هذه الصفحة. حاول مرة أخرى.",
}: {
  error: Error & { digest?: string };
  reset: () => void;
  title?: string;
  message?: string;
}) {
  return (
    <div className="dashboard-head" style={{ textAlign: "center", padding: "60px 20px" }}>
      <div>
        <span className="eyebrow">Error</span>
        <h1>{title}</h1>
        <p style={{ margin: "12px 0 24px", opacity: 0.6, fontSize: "0.9rem" }}>
          {message}
        </p>
        {error.digest && (
          <p style={{ margin: "0 0 24px", opacity: 0.3, fontSize: "0.78rem", fontFamily: "monospace" }}>
            ID: {error.digest}
          </p>
        )}
        <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
          <button className="btn btn-gold" onClick={reset}>
            إعادة المحاولة
          </button>
          <Link className="btn btn-soft" href="/admin">
            العودة للرئيسية
          </Link>
        </div>
      </div>
    </div>
  );
}
