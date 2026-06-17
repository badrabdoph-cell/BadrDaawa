"use client";

import { useState } from "react";
import { Bell, Mail, MailOpen, X } from "lucide-react";
import type { ClientMessage } from "@/lib/types";
import { formatArabicNumber } from "@/lib/utils";

export function AdminMessagesBanner({ invitationCode, messages }: { invitationCode: string; messages: ClientMessage[] }) {
  const [items, setItems] = useState(messages);
  const [dismissed, setDismissed] = useState(false);

  if (!items.length || dismissed) return null;

  async function markRead(messageId: string) {
    const response = await fetch("/api/client/messages/read", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: invitationCode, messageId }),
    });
    const data = (await response.json().catch(() => null)) as { messages?: ClientMessage[] } | null;
    if (response.ok && data?.messages) setItems(data.messages);
  }

  return (
    <div className="admin-messages-banner">
      <div className="admin-messages-banner-head">
        <Bell size={20} />
        <span>رسائل الإدارة</span>
        <strong>{formatArabicNumber(items.filter((m) => !m.readAt).length)} غير مقروء</strong>
      </div>
      <div className="admin-messages-banner-list">
        {items.map((message) => (
          <article className={message.readAt ? "admin-message-banner-card read" : "admin-message-banner-card unread"} key={message.id}>
            <div className="admin-message-banner-icon">
              {message.readAt ? <MailOpen size={16} /> : <Mail size={16} />}
            </div>
            <div className="admin-message-banner-body">
              <span className="admin-message-banner-title">{message.title}</span>
              <p>{message.body}</p>
              <time dateTime={message.createdAt}>
                {new Intl.DateTimeFormat("ar-EG", { dateStyle: "medium", timeStyle: "short" }).format(new Date(message.createdAt))}
              </time>
            </div>
            {!message.readAt ? (
              <button className="admin-message-banner-mark" type="button" onClick={() => markRead(message.id)} title="تعليم كمقروء">
                <MailOpen size={15} />
              </button>
            ) : null}
          </article>
        ))}
      </div>
      <button className="admin-messages-banner-dismiss" type="button" onClick={() => setDismissed(true)} aria-label="إخفاء">
        <X size={16} />
      </button>
    </div>
  );
}
