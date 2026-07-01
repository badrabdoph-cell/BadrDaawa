"use client";

import { CheckCircle2, FlaskConical, XCircle } from "lucide-react";
import { useState } from "react";

type TestState = {
  tone: "idle" | "success" | "error";
  message: string;
};

export function AdminPromoTestButton({ code, label = "اختبار الكود" }: { code: string; label?: string }) {
  const [state, setState] = useState<TestState>({ tone: "idle", message: "" });
  const [busy, setBusy] = useState(false);

  async function testCode() {
    const promoCode = code.trim();
    if (!promoCode) {
      setState({ tone: "error", message: "اكتب الكود أولاً." });
      return;
    }
    setBusy(true);
    setState({ tone: "idle", message: "جاري اختبار الكود..." });
    try {
      const response = await fetch("/api/promo/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ promoCode, source: "admin-test" }),
      });
      const data = (await response.json().catch(() => null)) as { ok?: boolean; message?: string; error?: string; status?: string } | null;
      if (response.ok && data?.ok) {
        setState({ tone: "success", message: data.message || "الكود يعمل." });
      } else {
        const statusMessage = data?.status === "PAUSED" ? "الكود معطل." : data?.status === "EXPIRED" ? "انتهت صلاحيته." : data?.status === "LIMIT_REACHED" ? "تجاوز الحد." : data?.status === "DELETED" ? "محذوف." : data?.status === "ARCHIVED" ? "مؤرشف." : "";
        setState({ tone: "error", message: statusMessage || data?.error || data?.message || "الكود لا يعمل." });
      }
    } catch {
      setState({ tone: "error", message: "تعذر اختبار الكود حالياً." });
    } finally {
      setBusy(false);
    }
  }

  return (
    <span className={`promo-test-control ${state.tone !== "idle" ? `is-${state.tone}` : ""}`}>
      <button className="btn btn-soft" type="button" onClick={testCode} disabled={busy || !code.trim()}>
        {state.tone === "success" ? <CheckCircle2 size={16} /> : state.tone === "error" ? <XCircle size={16} /> : <FlaskConical size={16} />}
        {busy ? "جاري الاختبار" : label}
      </button>
      {state.message ? <small>{state.message}</small> : null}
    </span>
  );
}
