"use client";

import { useEffect, useState } from "react";

export function InviteOpening({ groomName, brideName }: { groomName: string; brideName: string }) {
  const [isDone, setIsDone] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => setIsDone(true), 3000);
    return () => window.clearTimeout(timer);
  }, []);

  if (isDone) {
    return null;
  }

  return (
    <section className="invite-opening" aria-label="فتح ظرف الدعوة">
      <div className="opening-envelope">
        <div className="opening-envelope-base" />
        <div className="opening-envelope-flap" />
        <div className="opening-paper">
          <span>دعوة فرح</span>
          <strong>
            {groomName} &amp; {brideName}
          </strong>
        </div>
      </div>
    </section>
  );
}
