"use client";

import { CheckCircle2, MessageCircleHeart, XCircle } from "lucide-react";
import type { CoupleMessagesSettings, GuestBookMessage, GuestBookMode, GuestBookStatus } from "@/lib/types";
import { formatArabicNumber } from "@/lib/utils";
import { useState } from "react";

const statusLabels: Record<GuestBookStatus, string> = {
  pending: "بانتظار الموافقة",
  approved: "منشورة",
  rejected: "مرفوضة",
};

const modeLabels: Record<GuestBookMode, string> = {
  disabled: "تعطيل القسم",
  auto: "نشر تلقائي",
  moderated: "مراجعة قبل النشر",
};

function formatDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value || "-";
  return new Intl.DateTimeFormat("ar-EG-u-nu-latn", { dateStyle: "medium", timeStyle: "short" }).format(date);
}

type ModerateAction = "approve" | "reject";

export function CustomerGuestBookPanel({ invitationCode, messages, settings }: { invitationCode: string; messages: GuestBookMessage[]; settings: CoupleMessagesSettings }) {
  const [items, setItems] = useState(messages);
  const [busyId, setBusyId] = useState<string | null>(null);

  const stats = {
    total: items.length,
    pending: items.filter((message) => message.status === "pending").length,
    published: items.filter((message) => message.status === "approved").length,
  };

  async function moderate(messageId: string, action: ModerateAction) {
    setBusyId(messageId);
    try {
      const res = await fetch("/api/client/guest-book/moderate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messageId, action }),
      });
      if (!res.ok) return;
      const data = await res.json();
      if (data.success) {
        setItems((prev) => prev.map((m) => (m.id === messageId ? { ...m, status: data.status } : m)));
      }
    } finally {
      setBusyId(null);
    }
  }

  return (
    <section className="panel customer-guest-book-panel" aria-label="كلمات وذكريات للعرسان">
      <div className="customer-messages-head">
        <MessageCircleHeart size={24} />
        <div>
          <h2>كلمات وذكريات للعرسان ❤️</h2>
          <p>رسائل وتهاني الضيوف الخاصة بهذه الدعوة فقط، وتبقى كجزء من الذكريات بعد الفرح.</p>
        </div>
        <strong className="customer-unread-badge">{formatArabicNumber(stats.total)} رسالة</strong>
      </div>

      <div className="customer-guest-book-stats">
        <span>الإجمالي <strong>{formatArabicNumber(stats.total)}</strong></span>
        <span>معلقة <strong>{formatArabicNumber(stats.pending)}</strong></span>
        <span>منشورة <strong>{formatArabicNumber(stats.published)}</strong></span>
      </div>

      <form className="customer-guest-book-settings" action="/api/client/guest-book/settings" method="post">
        <input type="hidden" name="invitationCode" value={invitationCode} />
        <label>
          <span>إعدادات القسم</span>
          <select name="mode" defaultValue={settings.mode}>
            {Object.entries(modeLabels).map(([value, label]) => (
              <option value={value} key={value}>{label}</option>
            ))}
          </select>
        </label>
        <button className="btn btn-soft" type="submit">حفظ الإعداد</button>
      </form>

      {items.length ? (
        <div className="customer-guest-book-list">
          {items.map((message) => (
            <article className="customer-guest-book-card" key={message.id}>
              <header>
                <strong>{message.name || "ضيف عزيز"}</strong>
                <span className={`guest-book-status-pill ${message.status}`}>{statusLabels[message.status]}</span>
              </header>
              <p>{message.message}</p>
              <time dateTime={message.createdAt}>{formatDateTime(message.createdAt)}</time>
              {message.status === "pending" ? (
                <div className="customer-guest-book-actions">
                  <button className="btn btn-soft btn-sm" type="button" onClick={() => moderate(message.id, "approve")} disabled={busyId === message.id}>
                    <CheckCircle2 size={15} /> نشر
                  </button>
                  <button className="btn btn-soft btn-sm" type="button" onClick={() => moderate(message.id, "reject")} disabled={busyId === message.id}>
                    <XCircle size={15} /> رفض
                  </button>
                </div>
              ) : null}
            </article>
          ))}
        </div>
      ) : (
        <div className="admin-empty-state compact">
          <MessageCircleHeart size={22} />
          <strong>لا توجد رسائل لهذه الدعوة حتى الآن.</strong>
        </div>
      )}
    </section>
  );
}
