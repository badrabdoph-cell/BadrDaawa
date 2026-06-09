import { MessageCircleHeart } from "lucide-react";
import type { GuestBookMessage, GuestBookStatus } from "@/lib/types";
import { formatArabicNumber } from "@/lib/utils";

const statusLabels: Record<GuestBookStatus, string> = {
  pending: "بانتظار الموافقة",
  approved: "منشورة",
  rejected: "مرفوضة",
};

function formatDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value || "-";
  return new Intl.DateTimeFormat("ar-EG-u-nu-latn", { dateStyle: "medium", timeStyle: "short" }).format(date);
}

export function CustomerGuestBookPanel({ messages }: { messages: GuestBookMessage[] }) {
  return (
    <section className="panel customer-guest-book-panel" aria-label="تهاني الدعوة">
      <div className="customer-messages-head">
        <MessageCircleHeart size={24} />
        <div>
          <h2>التهاني</h2>
          <p>كل رسائل التهنئة الخاصة بهذه الدعوة فقط.</p>
        </div>
        <strong className="customer-unread-badge">{formatArabicNumber(messages.length)} رسالة</strong>
      </div>

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
          <strong>لا توجد تهاني لهذه الدعوة حتى الآن.</strong>
        </div>
      )}
    </section>
  );
}
