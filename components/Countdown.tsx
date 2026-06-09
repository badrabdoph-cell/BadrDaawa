"use client";

import { useEffect, useMemo, useState } from "react";
import { getInvitationTranslator, resolveLocale } from "@/lib/i18n";
import type { Language } from "@/lib/types";

const initialRemaining = {
  days: 0,
  hours: 0,
  minutes: 0,
  seconds: 0,
};

function getRemaining(target: string) {
  const diff = Math.max(0, new Date(target).getTime() - Date.now());
  const day = 1000 * 60 * 60 * 24;
  const hour = 1000 * 60 * 60;
  const minute = 1000 * 60;
  return {
    days: Math.floor(diff / day),
    hours: Math.floor((diff % day) / hour),
    minutes: Math.floor((diff % hour) / minute),
    seconds: Math.floor((diff % minute) / 1000),
  };
}

export function Countdown({ targetDate, locale = "ar" }: { targetDate: string; locale?: Language }) {
  const t = getInvitationTranslator(resolveLocale(locale));
  const target = useMemo(() => `${targetDate}T20:00:00`, [targetDate]);
  const [remaining, setRemaining] = useState(initialRemaining);

  useEffect(() => {
    setRemaining(getRemaining(target));
    const timer = window.setInterval(() => setRemaining(getRemaining(target)), 1000);
    return () => window.clearInterval(timer);
  }, [target]);

  return (
    <div className="countdown" aria-label={t("invitation.countdownLabel")}>
      <div>
        <strong>{remaining.days}</strong>
        <span>{t("invitation.countdown.day")}</span>
      </div>
      <div>
        <strong>{remaining.hours}</strong>
        <span>{t("invitation.countdown.hour")}</span>
      </div>
      <div>
        <strong>{remaining.minutes}</strong>
        <span>{t("invitation.countdown.minute")}</span>
      </div>
      <div>
        <strong>{remaining.seconds}</strong>
        <span>{t("invitation.countdown.second")}</span>
      </div>
    </div>
  );
}
