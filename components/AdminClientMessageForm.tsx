"use client";

import { useMemo, useState } from "react";
import { Globe, Send, UserRound } from "lucide-react";
import { MessageTemplatePicker } from "@/components/MessageTemplatePicker";
import { createMessageTemplateVariables } from "@/lib/message-template-render";
import type { Invitation, MessageTemplate } from "@/lib/types";

export function AdminClientMessageForm({
  invitations,
  messageTemplates,
  siteUrl,
}: {
  invitations: Invitation[];
  messageTemplates: MessageTemplate[];
  siteUrl: string;
}) {
  const [scope, setScope] = useState("single");
  const [invitationCode, setInvitationCode] = useState("");
  const [title, setTitle] = useState("رسالة من الإدارة");
  const [body, setBody] = useState("");
  const cleanSiteUrl = siteUrl.replace(/\/$/, "");
  const selectedInvitation = invitations.find((invitation) => invitation.code === invitationCode);
  const variables = useMemo(
    () =>
      createMessageTemplateVariables({
        groomName: selectedInvitation?.groomName,
        brideName: selectedInvitation?.brideName,
        weddingDate: selectedInvitation?.weddingDate,
        venue: selectedInvitation?.venue,
        link: selectedInvitation ? `${cleanSiteUrl}/${selectedInvitation.customSlug || selectedInvitation.code}` : "",
      }),
    [cleanSiteUrl, selectedInvitation],
  );

  return (
    <form action="/api/admin/client-messages" method="post" className="admin-client-message-form">
      <input type="hidden" name="scope" value={scope} />
      <div className="message-scope-toggle">
        <button type="button" className={scope === "single" ? "active" : ""} onClick={() => setScope("single")}>
          <UserRound size={16} />
          دعوة محددة
        </button>
        <button type="button" className={scope === "all" ? "active" : ""} onClick={() => setScope("all")}>
          <Globe size={16} />
          لكل العملاء
        </button>
      </div>
      {scope === "single" ? (
        <label className="field">
          <span>العميل / الدعوة</span>
          <select name="invitationCode" required value={invitationCode} onChange={(event) => setInvitationCode(event.target.value)}>
            <option value="">اختار الدعوة</option>
            {invitations.map((invitation) => (
              <option value={invitation.code} key={invitation.code}>
                {invitation.groomName} و {invitation.brideName} - {invitation.code}
              </option>
            ))}
          </select>
        </label>
      ) : null}
      <label className="field">
        <span>عنوان الرسالة</span>
        <input name="title" value={title} onChange={(event) => setTitle(event.target.value)} maxLength={120} />
      </label>
      {scope === "single" ? (
        <div className="full">
          <MessageTemplatePicker
            templates={messageTemplates}
            variables={variables}
            onApply={(content, template) => {
              setBody(content);
              setTitle(template.title || "رسالة من الإدارة");
            }}
          />
        </div>
      ) : null}
      <label className="field full">
        <span>نص الرسالة</span>
        <textarea name="body" value={body} onChange={(event) => setBody(event.target.value)} rows={5} required placeholder="اكتب الرسالة التي ستظهر داخل لوحة العميل..." />
      </label>
      <button className="btn btn-gold" type="submit">
        <Send size={17} />
        إرسال الرسالة
      </button>
    </form>
  );
}
