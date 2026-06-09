"use client";

import { useEffect, useState } from "react";
import { Megaphone, Radio, UsersRound } from "lucide-react";
import type { GuestBookMessage, WeddingLiveEvent, WeddingLiveModeConfig } from "@/lib/types";

type LiveModePayload = {
  enabled: boolean;
  config?: WeddingLiveModeConfig | null;
  checkInCount: number;
  messages: GuestBookMessage[];
};

export function WeddingLiveMode({ code }: { code: string }) {
  const [payload, setPayload] = useState<LiveModePayload | null>(null);

  useEffect(() => {
    if (code.startsWith("preview-")) return;
    let alive = true;
    async function loadLiveMode() {
      const response = await fetch(`/api/invitations/${code}/live-mode`, { cache: "no-store" }).catch(() => null);
      if (!alive || !response?.ok) return;
      const data = (await response.json().catch(() => null)) as LiveModePayload | null;
      setPayload(data);
    }
    loadLiveMode();
    const timer = window.setInterval(loadLiveMode, 30000);
    return () => {
      alive = false;
      window.clearInterval(timer);
    };
  }, [code]);

  if (!payload?.enabled || !payload.config) return null;
  const events: WeddingLiveEvent[] = payload.config.events || [];
  const announcement = payload.config.announcement?.trim();

  return (
    <section className="wedding-live-mode" aria-label="Wedding Live Mode">
      <div className="wedding-live-bar">
        <Radio size={18} />
        <strong>الحفل جارٍ الآن</strong>
        <span>Wedding Live Mode</span>
      </div>
      <div className="wedding-live-grid">
        <article className="wedding-live-panel">
          <div className="wedding-live-panel-head">
            <Radio size={18} />
            <h2>جدول أحداث الحفل</h2>
          </div>
          <div className="wedding-live-events">
            {events.length ? (
              events.map((event) => (
                <div className="wedding-live-event" key={event.id}>
                  <time>{event.time || "الآن"}</time>
                  <strong>{event.title}</strong>
                  {event.description ? <p>{event.description}</p> : null}
                </div>
              ))
            ) : (
              <p className="wedding-live-empty">لم يتم إضافة جدول أحداث بعد.</p>
            )}
          </div>
        </article>

        <article className="wedding-live-panel wedding-live-count">
          <UsersRound size={24} />
          <span>الحضور الفعلي</span>
          <strong>{payload.checkInCount}</strong>
          <p>تم تسجيلهم عبر زر وصلت إلى الحفل.</p>
        </article>

        {announcement ? (
          <article className="wedding-live-panel wedding-live-announcement">
            <Megaphone size={22} />
            <div>
              <span>إعلان مباشر</span>
              <p>{announcement}</p>
            </div>
          </article>
        ) : null}

        <article className="wedding-live-panel">
          <div className="wedding-live-panel-head">
            <Megaphone size={18} />
            <h2>آخر رسائل العروسين</h2>
          </div>
          <div className="wedding-live-messages">
            {payload.messages.length ? (
              payload.messages.map((message) => (
                <blockquote key={message.id}>
                  <p>{message.message}</p>
                  <cite>{message.name}</cite>
                </blockquote>
              ))
            ) : (
              <p className="wedding-live-empty">لا توجد رسائل معتمدة بعد.</p>
            )}
          </div>
        </article>
      </div>
    </section>
  );
}
