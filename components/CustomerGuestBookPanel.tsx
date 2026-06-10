import { MessageCircleHeart } from "lucide-react";
import type { CoupleMessagesSettings, GuestBookMessage, GuestBookMode, GuestBookStatus } from "@/lib/types";
import { formatArabicNumber } from "@/lib/utils";

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

export function CustomerGuestBookPanel({ invitationCode, messages, settings }: { invitationCode: string; messages: GuestBookMessage[]; settings: CoupleMessagesSettings }) {
  const stats = {
    total: messages.length,
    pending: messages.filter((message) => message.status === "pending").length,
    published: messages.filter((message) => message.status === "approved").length,
  };

  return (
    <section className="panel customer-guest-book-panel" aria-label="رسائل العروسين">
      <div className="customer-messages-head">
        <MessageCircleHeart size={24} />
        <div>
          <h2>رسائل للعروسين</h2>
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

      {messages.length ? (
        <div className="customer-guest-book-list">
          {messages.map((message) => (
            <article className="customer-guest-book-card" key={message.id}>
              <header>
                <strong>{message.name || "ضيف عزيز"}</strong>
                <span className={`guest-book-status-pill ${message.status}`}>{statusLabels[message.status]}</span>
              </header>
              <p>{message.message}</p>
              <time dateTime={message.createdAt}>{formatDateTime(message.createdAt)}</time>
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
