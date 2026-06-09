"use client";

import { useEffect, useMemo, useState } from "react";
import { getInvitationTranslator, resolveLocale } from "@/lib/i18n";
import type { Language } from "@/lib/types";

type RemainingTime = {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
};

type CountdownState = {
  remaining: RemainingTime;
  isComplete: boolean;
};

const initialRemaining: RemainingTime = {
  days: 0,
  hours: 0,
  minutes: 0,
  seconds: 0,
};

const initialState: CountdownState = {
  remaining: initialRemaining,
  isComplete: false,
};

function normalizeDigits(value: string) {
  return value.replace(/[٠-٩۰-۹]/g, (digit) => {
    const arabicDigits = "٠١٢٣٤٥٦٧٨٩";
    const persianDigits = "۰۱۲۳۴۵۶۷۸۹";
    const arabicIndex = arabicDigits.indexOf(digit);
    return String(arabicIndex >= 0 ? arabicIndex : persianDigits.indexOf(digit));
  });
}

function parseWeddingTime(weddingTime?: string) {
  const normalized = normalizeDigits(weddingTime || "").trim().toLowerCase();
  const hasPm = /\b(pm|p\.m\.)\b|مساء|مساءً|مساءا|مساءًا|(?:^|\s)م(?:\s|$)/i.test(normalized);
  const hasAm = /\b(am|a\.m\.)\b|صباح|صباحاً|صباحا|صباحًا|(?:^|\s)ص(?:\s|$)/i.test(normalized);
  const match = normalized.match(/(\d{1,2})(?:\s*[:.]\s*(\d{1,2}))?/);
  let hours = match ? Number(match[1]) : 20;
  let minutes = match?.[2] ? Number(match[2]) : 0;

  if (!Number.isFinite(hours)) hours = 20;
  if (!Number.isFinite(minutes)) minutes = 0;
  if (hasPm && hours < 12) hours += 12;
  if (hasAm && hours === 12) hours = 0;

  return {
    hours: Math.min(Math.max(hours, 0), 23),
    minutes: Math.min(Math.max(minutes, 0), 59),
  };
}

function getDateParts(weddingDate: string) {
  const isoDate = normalizeDigits(weddingDate).match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (isoDate) {
    return {
      year: Number(isoDate[1]),
      month: Number(isoDate[2]),
      day: Number(isoDate[3]),
    };
  }

  const parsedDate = new Date(weddingDate);
  if (Number.isNaN(parsedDate.getTime())) return null;

  return {
    year: parsedDate.getFullYear(),
    month: parsedDate.getMonth() + 1,
    day: parsedDate.getDate(),
  };
}

function getTargetDate(weddingDate: string, weddingTime?: string) {
  const dateParts = getDateParts(weddingDate);
  if (!dateParts) return null;
  const timeParts = parseWeddingTime(weddingTime);
  return new Date(dateParts.year, dateParts.month - 1, dateParts.day, timeParts.hours, timeParts.minutes, 0, 0);
}

function getCountdownState(target: Date | null): CountdownState {
  const targetTime = target?.getTime() ?? Number.NaN;
  if (!Number.isFinite(targetTime)) return initialState;

  const diff = Math.max(0, targetTime - Date.now());
  const day = 1000 * 60 * 60 * 24;
  const hour = 1000 * 60 * 60;
  const minute = 1000 * 60;
  return {
    remaining: {
      days: Math.floor(diff / day),
      hours: Math.floor((diff % day) / hour),
      minutes: Math.floor((diff % hour) / minute),
      seconds: Math.floor((diff % minute) / 1000),
    },
    isComplete: targetTime <= Date.now(),
  };
}

export function Countdown({ targetDate, targetTime, locale = "ar" }: { targetDate: string; targetTime?: string; locale?: Language }) {
  const t = getInvitationTranslator(resolveLocale(locale));
  const target = useMemo(() => getTargetDate(targetDate, targetTime), [targetDate, targetTime]);
  const [{ remaining, isComplete }, setCountdownState] = useState<CountdownState>(initialState);

  useEffect(() => {
    let timer: number | undefined;
    const tick = () => {
      const nextState = getCountdownState(target);
      setCountdownState(nextState);
      if (nextState.isComplete && timer) window.clearInterval(timer);
    };

    tick();
    if (!getCountdownState(target).isComplete) {
      timer = window.setInterval(tick, 1000);
    }

    return () => {
      if (timer) window.clearInterval(timer);
    };
  }, [target]);

  return (
    <div className="countdown-wrap">
      <div className={["countdown", isComplete ? "is-complete" : ""].filter(Boolean).join(" ")} aria-label={t("invitation.countdownLabel")}>
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
      {isComplete ? (
        <div className="countdown-complete" role="status" aria-live="polite">
          <span>{t("invitation.countdownComplete")}</span>
          <span className="countdown-celebration" aria-hidden="true">
            {Array.from({ length: 8 }).map((_, index) => (
              <i key={index} />
            ))}
          </span>
        </div>
      ) : null}
    </div>
  );
}
