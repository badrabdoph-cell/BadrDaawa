"use client";

import { useEffect, useRef, useState } from "react";
import { formatArabicNumber } from "@/lib/utils";

export function CountUpNumber({
  value,
  duration = 1200,
  fakeOffset = 0,
  continuous = false,
}: {
  value: number;
  duration?: number;
  fakeOffset?: number;
  continuous?: boolean;
}) {
  const ref = useRef<HTMLSpanElement | null>(null);
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReducedMotion) {
      setDisplayValue(value + fakeOffset);
      return;
    }

    const targetValue = value + fakeOffset;
    if (targetValue <= 0) {
      setDisplayValue(0);
      return;
    }

    let frame = 0;
    let startedAt = 0;
    let hasPlayed = false;
    let currentValue = 0;
    let tickTimer: ReturnType<typeof setTimeout> | null = null;

    const animate = (timestamp: number) => {
      if (!startedAt) startedAt = timestamp;
      const progress = Math.min((timestamp - startedAt) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      currentValue = Math.round(targetValue * eased);
      setDisplayValue(currentValue);

      if (progress < 1) {
        frame = window.requestAnimationFrame(animate);
      } else if (continuous) {
        scheduleNextTick();
      }
    };

    const scheduleNextTick = () => {
      const delay = 800 + Math.random() * 1800;
      tickTimer = setTimeout(() => {
        currentValue += 1;
        setDisplayValue(currentValue);
        scheduleNextTick();
      }, delay);
    };

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting || hasPlayed) return;
        hasPlayed = true;
        frame = window.requestAnimationFrame(animate);
        observer.disconnect();
      },
      { threshold: 0.35 },
    );

    observer.observe(element);

    return () => {
      observer.disconnect();
      window.cancelAnimationFrame(frame);
      if (tickTimer) clearTimeout(tickTimer);
    };
  }, [duration, value, fakeOffset, continuous]);

  return <span ref={ref}>{formatArabicNumber(displayValue)}</span>;
}
