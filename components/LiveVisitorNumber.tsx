"use client";

import { useEffect, useState } from "react";

function nextVisitorCount(current: number) {
  const direction = Math.random() > 0.52 ? 1 : -1;
  const step = Math.random() > 0.93 ? 2 : 1;
  const next = current + direction * step;
  if (next < 3) return 3 + Math.floor(Math.random() * 3);
  if (next > 13) return 11 - Math.floor(Math.random() * 3);
  return next;
}

export function LiveVisitorNumber({ initial = 10 }: { initial?: number }) {
  const [count, setCount] = useState(initial);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setCount((current) => nextVisitorCount(current));
    }, 24000);

    return () => window.clearInterval(timer);
  }, []);

  return <>{count}</>;
}
