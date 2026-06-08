"use client";

import { useState } from "react";
import { Loader2, Radio } from "lucide-react";
import type { WeddingLiveModeConfig } from "@/lib/types";

export function ClientWeddingLiveModePanel({ invitationCode, initialConfig }: { invitationCode: string; initialConfig: WeddingLiveModeConfig | null }) {
  const [enabled, setEnabled] = useState(initialConfig?.enabled === true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function toggle(nextEnabled: boolean) {
    setBusy(true);
    setMessage("");
    const response = await fetch(`/api/client/live-mode/${invitationCode}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enabled: nextEnabled }),
    }).catch(() => null);
    setBusy(false);
    if (!response?.ok) {
      setMessage("تعذر تحديث وضع الحفل المباشر.");
      return;
    }
    setEnabled(nextEnabled);
    setMessage(nextEnabled ? "تم تشغيل Wedding Live Mode." : "تم إيقاف Wedding Live Mode.");
  }

  return (
    <article className="panel client-live-mode-panel">
      <Radio size={24} />
      <div>
        <span className="eyebrow">Wedding Live Mode</span>
        <h2>وضع الحفل المباشر</h2>
        <p>يمكنك تشغيله يوم الحفل ليظهر شريط مباشر داخل الدعوة دون تغيير بيانات الدعوة الأصلية.</p>
      </div>
      <button className={enabled ? "builder-toggle active" : "builder-toggle"} type="button" onClick={() => toggle(!enabled)} disabled={busy}>
        {busy ? <Loader2 size={17} /> : <Radio size={17} />}
        {enabled ? "إيقاف وضع الحفل" : "تشغيل وضع الحفل"}
      </button>
      {message ? <p className={message.includes("تعذر") ? "status danger" : "status success"}>{message}</p> : null}
      {initialConfig?.announcement ? <small>آخر إعلان من الإدارة: {initialConfig.announcement}</small> : null}
    </article>
  );
}
