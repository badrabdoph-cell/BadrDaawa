"use client";

import { useEffect, useMemo, useState } from "react";

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

export function Countdown({ targetDate }: { targetDate: string }) {
  const target = useMemo(() => `${targetDate}T20:00:00`, [targetDate]);
  const [remaining, setRemaining] = useState(initialRemaining);

  useEffect(() => {
    setRemaining(getRemaining(target));
    const timer = window.setInterval(() => setRemaining(getRemaining(target)), 1000);
    return () => window.clearInterval(timer);
  }, [target]);

  return (
    <div className="countdown" aria-label="العد التنازلي">
      <div>
        <strong>{remaining.days}</strong>
        <span>يوم</span>
      </div>
      <div>
        <strong>{remaining.hours}</strong>
        <span>ساعة</span>
      </div>
      <div>
        <strong>{remaining.minutes}</strong>
        <span>دقيقة</span>
      </div>
      <div>
        <strong>{remaining.seconds}</strong>
        <span>ثانية</span>
      </div>
    </div>
  );
}
