"use client";

import { useMemo, useState } from "react";
import { Bell, CheckCheck, Mail, MailOpen } from "lucide-react";
import type { ClientMessage } from "@/lib/types";
import { formatArabicNumber } from "@/lib/utils";

export function CustomerMessagesPanel({ invitationCode, messages }: { invitationCode: string; messages: ClientMessage[] }) {
  const [items, setItems] = useState(messages);
  const [busyId, setBusyId] = useState("");
  const unreadCount = useMemo(() => items.filter((message) => !message.readAt).length, [items]);

  async function markRead(messageId?: string) {
    setBusyId(messageId || "all");
    const response = await fetch("/api/client/messages/read", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: invitationCode, messageId, all: !messageId }),
    });
    const data = (await response.json().catch(() => null)) as { messages?: ClientMessage[] } | null;
    if (response.ok && data?.messages) setItems(data.messages);
    setBusyId("");
  }

  return (
    <section className="panel customer-messages-panel">
      <div className="customer-messages-head">
        <Bell size={24} />
        <div>
          <h2>مركز الرسائل</h2>
          <p>رسائل الإدارة الخاصة بهذه الدعوة فقط.</p>
        </div>
        <strong className={unreadCount ? "customer-unread-badge active" : "customer-unread-badge"}>
          {formatArabicNumber(unreadCount)} جديد
        </strong>
      </div>

      {items.length ? (
        <>
          {unreadCount ? (
            <button className="btn btn-soft customer-mark-all" type="button" onClick={() => markRead()} disabled={busyId === "all"}>
              <CheckCheck size={17} />
              تعليم الكل كمقروء
            </button>
          ) : null}
          <div className="customer-message-list">
            {items.map((message) => (
              <article className={message.readAt ? "customer-message-card read" : "customer-message-card unread"} key={message.id}>
                <div>
                  {message.readAt ? <MailOpen size={18} /> : <Mail size={18} />}
                  <span className={message.readAt ? "status success" : "status warning"}>{message.readAt ? "مقروء" : "غير مقروء"}</span>
                </div>
                <h3>{message.title}</h3>
                <p>{message.body}</p>
                <footer>
                  <time dateTime={message.createdAt}>{new Intl.DateTimeFormat("ar-EG", { dateStyle: "medium", timeStyle: "short" }).format(new Date(message.createdAt))}</time>
                  {!message.readAt ? (
                    <button className="btn btn-soft" type="button" onClick={() => markRead(message.id)} disabled={busyId === message.id}>
                      <CheckCheck size={16} />
                      تعليم كمقروء
                    </button>
                  ) : null}
                </footer>
              </article>
            ))}
          </div>
        </>
      ) : (
        <div className="admin-empty-state compact">
          <MailOpen size={22} />
          <strong>لا توجد رسائل حالياً.</strong>
        </div>
      )}
    </section>
  );
}
