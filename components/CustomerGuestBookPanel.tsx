"use client";

import { CheckCircle2, Loader2, MessageCircleHeart, XCircle } from "lucide-react";
import type { CoupleMessagesSettings, GuestBookMessage, GuestBookMode, GuestBookStatus } from "@/lib/types";
import { formatArabicNumber, formatDateTime } from "@/lib/utils";
import { useMemo, useState } from "react";

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

type ModerateAction = "approve" | "reject";

export function CustomerGuestBookPanel({ invitationCode, messages, settings }: { invitationCode: string; messages: GuestBookMessage[]; settings: CoupleMessagesSettings }) {
  const [items, setItems] = useState(messages);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [settingsMode, setSettingsMode] = useState<GuestBookMode>(settings.mode);
  const [settingsBusy, setSettingsBusy] = useState(false);
  const [settingsMessage, setSettingsMessage] = useState("");
  const [filterStatus, setFilterStatus] = useState<"all" | GuestBookStatus>("all");

  const stats = {
    total: items.length,
    pending: items.filter((message) => message.status === "pending").length,
    published: items.filter((message) => message.status === "approved").length,
    rejected: items.filter((message) => message.status === "rejected").length,
  };

  const filteredItems = useMemo(() => {
    if (filterStatus === "all") return items;
    return items.filter((message) => message.status === filterStatus);
  }, [items, filterStatus]);

  async function saveSettings() {
    setSettingsBusy(true);
    setSettingsMessage("");
    try {
      const res = await fetch("/api/client/guest-book/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ invitationCode, mode: settingsMode }),
      });
      if (res.ok) {
        setSettingsMessage("تم حفظ الإعداد.");
      } else {
        setSettingsMessage("تعذر حفظ الإعداد.");
      }
    } catch {
      setSettingsMessage("تعذر حفظ الإعداد.");
    } finally {
      setSettingsBusy(false);
    }
  }

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
          <h2>كلمات وذكريات للعرسان</h2>
          <p>رسائل وتهاني الضيوف الخاصة بهذه الدعوة فقط، وتبقى كجزء من الذكريات بعد الفرح.</p>
        </div>
        <strong className="customer-unread-badge">{formatArabicNumber(stats.total)} رسالة</strong>
      </div>

      <div className="customer-guest-book-filters">
        <button
          type="button"
          className={`customer-guest-book-filter-card ${filterStatus === "all" ? "active" : ""}`}
          onClick={() => setFilterStatus("all")}
        >
          <span className="customer-guest-book-filter-label">الكل</span>
          <strong>{formatArabicNumber(stats.total)}</strong>
        </button>
        <button
          type="button"
          className={`customer-guest-book-filter-card ${filterStatus === "pending" ? "active" : ""}`}
          onClick={() => setFilterStatus("pending")}
        >
          <span className="customer-guest-book-filter-label">جديده</span>
          <strong>{formatArabicNumber(stats.pending)}</strong>
        </button>
        <button
          type="button"
          className={`customer-guest-book-filter-card ${filterStatus === "approved" ? "active" : ""}`}
          onClick={() => setFilterStatus("approved")}
        >
          <span className="customer-guest-book-filter-label">منشوره</span>
          <strong>{formatArabicNumber(stats.published)}</strong>
        </button>
        <button
          type="button"
          className={`customer-guest-book-filter-card ${filterStatus === "rejected" ? "active" : ""}`}
          onClick={() => setFilterStatus("rejected")}
        >
          <span className="customer-guest-book-filter-label">مرفوضه</span>
          <strong>{formatArabicNumber(stats.rejected)}</strong>
        </button>
      </div>

      <div className="customer-guest-book-settings">
        <label>
          <span>إعدادات القسم</span>
          <select value={settingsMode} onChange={(e) => setSettingsMode(e.target.value as GuestBookMode)}>
            {Object.entries(modeLabels).map(([value, label]) => (
              <option value={value} key={value}>{label}</option>
            ))}
          </select>
        </label>
        <button className="btn btn-soft" type="button" onClick={saveSettings} disabled={settingsBusy}>
          {settingsBusy ? <Loader2 size={16} /> : null}
          حفظ الإعداد
        </button>
        {settingsMessage ? <small className={settingsMessage.includes("تعذر") ? "status danger" : "status success"}>{settingsMessage}</small> : null}
      </div>

      {filteredItems.length ? (
        <div className="customer-guest-book-list">
          {filteredItems.map((message) => (
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
