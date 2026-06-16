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
  const allTimerRef = useRef<ReturnType<typeof setTimeout>>();

  const copyAll = useCallback(async () => {
    await navigator.clipboard.writeText(formatAll(events));
    setCopiedAll(true);
    if (allTimerRef.current) clearTimeout(allTimerRef.current);
    allTimerRef.current = setTimeout(() => setCopiedAll(false), 2000);
  }, [events]);

  if (!events.length) return null;

  return (
    <div className="errors-copy-actions" style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
      <button className="btn btn-glass" type="button" onClick={copyAll} style={{ fontSize: 13 }}>
        {copiedAll ? <Check size={15} /> : <Copy size={15} />}
        {copiedAll ? "تم نسخ الكل" : "نسخ الكل"}
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
