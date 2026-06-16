"use client";

import { useCallback, useRef, useState } from "react";
import { Check, Copy } from "lucide-react";

type ErrorEvent = {
  id: string;
  route: string;
  message: string;
  stack?: string;
  user: string;
  source?: string;
  digest?: string;
  createdAt: string;
};

function formatEvent(event: ErrorEvent) {
  const lines = [
    `Route: ${event.route}`,
    `Message: ${event.message}`,
    `User: ${event.user}`,
    `Source: ${event.source || "unknown"}`,
    `Time: ${event.createdAt}`,
  ];
  if (event.digest) lines.push(`Digest: ${event.digest}`);
  if (event.stack) lines.push(`Stack:\n${event.stack}`);
  return lines.join("\n");
}

function formatAll(events: ErrorEvent[]) {
  return events.map((event, i) => `=== Error ${i + 1} ===\n${formatEvent(event)}`).join("\n\n");
}

export function AdminErrorCopyButtons({ events }: { events: ErrorEvent[] }) {
  const [copiedAll, setCopiedAll] = useState(false);
  const [copiedCount, setCopiedCount] = useState(false);
  const [count, setCount] = useState(5);
  const allTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const countTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const copyAll = useCallback(async () => {
    await navigator.clipboard.writeText(formatAll(events));
    setCopiedAll(true);
    if (allTimerRef.current) clearTimeout(allTimerRef.current);
    allTimerRef.current = setTimeout(() => setCopiedAll(false), 2000);
  }, [events]);

  const copyCount = useCallback(async () => {
    const n = Math.min(Math.max(1, count), events.length);
    const selected = events.slice(0, n);
    await navigator.clipboard.writeText(formatAll(selected));
    setCopiedCount(true);
    if (countTimerRef.current) clearTimeout(countTimerRef.current);
    countTimerRef.current = setTimeout(() => setCopiedCount(false), 2000);
  }, [events, count]);

  if (!events.length) return null;

  return (
    <div className="errors-copy-actions" style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
      <button className="btn btn-glass" type="button" onClick={copyAll} style={{ fontSize: 13 }}>
        {copiedAll ? <Check size={15} /> : <Copy size={15} />}
        {copiedAll ? "تم نسخ الكل" : "نسخ الكل"}
      </button>

      <label style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 800 }}>
        <input
          type="number"
          min={1}
          max={20}
          value={count}
          onChange={(e) => setCount(Math.min(20, Math.max(1, Number(e.target.value) || 1)))}
          style={{
            width: 52,
            minHeight: 34,
            padding: "4px 8px",
            border: "1px solid rgba(180, 139, 57, 0.18)",
            borderRadius: 6,
            background: "#fff",
            color: "#2f261e",
            fontWeight: 800,
            fontSize: 13,
            textAlign: "center",
          }}
        />
      </label>

      <button className="btn btn-glass" type="button" onClick={copyCount} style={{ fontSize: 13 }}>
        {copiedCount ? <Check size={15} /> : <Copy size={15} />}
        {copiedCount ? `تم نسخ ${count}` : "نسخ العدد"}
      </button>
    </div>
  );
}

export function AdminErrorEventCopyButton({ event }: { event: ErrorEvent }) {
  const [copied, setCopied] = useState(false);

  const copy = useCallback(async () => {
    await navigator.clipboard.writeText(formatEvent(event));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [event]);

  return (
    <button className="btn btn-glass" type="button" onClick={copy} title="نسخ تفاصيل الخطأ" style={{ fontSize: 12, padding: "2px 8px" }}>
      {copied ? <Check size={13} /> : <Copy size={13} />}
    </button>
  );
}
