"use client";

import { UsersRound } from "lucide-react";
import { useEffect, useState } from "react";

function randomVisitors() {
  return Math.floor(Math.random() * 11) + 3;
}

export function LiveVisitorsCounter() {
  const [count, setCount] = useState(7);

  useEffect(() => {
    setCount(randomVisitors());
    const timer = window.setInterval(() => {
      setCount((current) => {
        const direction = Math.random() > 0.48 ? 1 : -1;
        const step = Math.random() > 0.72 ? 2 : 1;
        const next = current + direction * step;
        if (next < 3) return 3 + Math.floor(Math.random() * 3);
        if (next > 13) return 11 - Math.floor(Math.random() * 3);
        return next;
      });
    }, 1900 + Math.floor(Math.random() * 900));

    return () => window.clearInterval(timer);
  }, []);

  return (
    <section className="live-visitors-section" aria-label="عدد الزوار الحالي">
      <div className="container">
        <div className="live-visitors-card">
          <span className="live-visitors-icon">
            <UsersRound size={22} />
          </span>
          <div>
            <span>عدد الزوار في الوقت الحالي</span>
            <strong>{count}</strong>
          </div>
          <em>Live</em>
        </div>
      </div>
    </section>
  );
}
