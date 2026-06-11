"use client";

import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, Loader2, MapPinCheckInside } from "lucide-react";
import { getInvitationTranslator, resolveLocale } from "@/lib/i18n";
import type { Language } from "@/lib/types";

type CheckInState = "idle" | "loading" | "success" | "error";

function createVisitorKey(code: string) {
  const storageKey = `badrdaawa-check-in-${code}`;
  const existing = window.localStorage.getItem(storageKey);
  if (existing) return existing;
  const key = typeof crypto !== "undefined" && "randomUUID" in crypto ? `visitor_${crypto.randomUUID()}` : `visitor_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
  window.localStorage.setItem(storageKey, key);
  return key;
}

export function InviteCheckIn({ code, isPreview = false, locale = "ar" }: { code: string; isPreview?: boolean; locale?: Language }) {
  const t = getInvitationTranslator(resolveLocale(locale));
  const apiCode = encodeURIComponent(code);
  const storageKey = useMemo(() => `badrdaawa-checked-in-${code}`, [code]);
  const [state, setState] = useState<CheckInState>(isPreview ? "idle" : "idle");
  const [checkedIn, setCheckedIn] = useState(false);
  const [message, setMessage] = useState(isPreview ? t("invitation.checkIn.previewMessage") : "");

  useEffect(() => {
    if (isPreview) return;
    setCheckedIn(window.localStorage.getItem(storageKey) === "1");
  }, [isPreview, storageKey]);

  async function submit() {
    if (isPreview || checkedIn) return;
    setState("loading");
    setMessage("");

    try {
      const visitorKey = createVisitorKey(code);
      const response = await fetch(`/api/invitations/${apiCode}/check-in`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ visitorKey }),
      });
      const data = (await response.json().catch(() => null)) as { error?: string; duplicate?: boolean } | null;
      if (!response.ok) {
        setState("error");
        setMessage(data?.error || t("invitation.checkIn.error"));
        return;
      }
      window.localStorage.setItem(storageKey, "1");
      setCheckedIn(true);
      setState("success");
      setMessage(data?.duplicate ? t("invitation.checkIn.duplicate") : t("invitation.checkIn.success"));
    } catch {
      setState("error");
      setMessage(t("common.connectionError"));
    }
  }

  return (
    <section className="invite-card check-in-card" id="check-in">
      <span className="invite-kicker">{t("invitation.checkIn.kicker")}</span>
      <div className="check-in-content">
        <MapPinCheckInside size={26} />
        <div>
          <h2>{t("invitation.checkIn.title")}</h2>
          <p>{t("invitation.checkIn.description")}</p>
        </div>
      </div>
      <button className="btn btn-gold btn-glow check-in-button" type="button" onClick={submit} disabled={isPreview || checkedIn || state === "loading"}>
        {state === "loading" ? <Loader2 size={18} className="animate-float" /> : <CheckCircle2 size={18} />}
        {checkedIn ? t("invitation.checkIn.done") : t("invitation.checkIn.button")}
      </button>
      {message ? <p className={state === "error" ? "status danger" : "status success"}>{message}</p> : null}
    </section>
  );
}
