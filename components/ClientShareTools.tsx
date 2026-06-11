"use client";

import { useMemo, useState } from "react";
import { Check, Copy, Facebook, MessageCircle, Send, Share2 } from "lucide-react";
import { MessageTemplatePicker } from "@/components/MessageTemplatePicker";
import { createMessageTemplateVariables } from "@/lib/message-template-render";
import type { MessageTemplate } from "@/lib/types";
import { withVisitSource } from "@/lib/visit-source";

type ClientShareToolsProps = {
  invitationUrl: string;
  groomName: string;
  brideName: string;
  weddingDate: string;
  venue: string;
  messageTemplates?: MessageTemplate[];
};

function formatShareDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("ar-EG-u-nu-latn", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
}

function createDefaultMessage(input: ClientShareToolsProps) {
  return [
    `يسعدنا دعوتكم لحضور حفل زفاف ${input.groomName} و ${input.brideName}`,
    `التاريخ: ${formatShareDate(input.weddingDate)}`,
    `القاعة: ${input.venue}`,
    `رابط الدعوة: ${input.invitationUrl}`,
  ].join("\n");
}

export function ClientShareTools(props: ClientShareToolsProps) {
  const defaultMessage = useMemo(() => createDefaultMessage(props), [props]);
  const templateVariables = useMemo(
    () =>
      createMessageTemplateVariables({
        groomName: props.groomName,
        brideName: props.brideName,
        weddingDate: props.weddingDate,
        venue: props.venue,
        link: props.invitationUrl,
      }),
    [props.brideName, props.groomName, props.invitationUrl, props.venue, props.weddingDate],
  );
  const [message, setMessage] = useState(defaultMessage);
  const [copied, setCopied] = useState<"url" | "message" | "">("");

  const trackedUrls = useMemo(
    () => ({
      whatsapp: withVisitSource(props.invitationUrl, "WhatsApp"),
      telegram: withVisitSource(props.invitationUrl, "Telegram"),
      facebook: withVisitSource(props.invitationUrl, "Facebook"),
    }),
    [props.invitationUrl],
  );
  const messageWithUrl = (url: string) => {
    const clean = message.trim();
    if (!clean) return url;
    return clean.includes(props.invitationUrl) ? clean.split(props.invitationUrl).join(url) : `${clean}\n${url}`;
  };
  const encodedTelegramUrl = encodeURIComponent(trackedUrls.telegram);
  const encodedWhatsAppMessage = encodeURIComponent(messageWithUrl(trackedUrls.whatsapp));
  const encodedTelegramMessage = encodeURIComponent(messageWithUrl(trackedUrls.telegram));
  const encodedFacebookUrl = encodeURIComponent(trackedUrls.facebook);
  const shareLinks = {
    whatsapp: `https://wa.me/?text=${encodedWhatsAppMessage}`,
    telegram: `https://t.me/share/url?url=${encodedTelegramUrl}&text=${encodedTelegramMessage}`,
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodedFacebookUrl}`,
  };

  async function copy(value: string, kind: "url" | "message") {
    await navigator.clipboard.writeText(value);
    setCopied(kind);
    window.setTimeout(() => setCopied(""), 1600);
  }

  return (
    <article className="panel customer-share-panel">
      <div className="customer-share-head">
        <Share2 size={24} />
        <div>
          <h2>مشاركة الدعوة</h2>
          <p>جهز الرسالة مرة واحدة ثم انسخها أو شاركها مباشرة على المنصة المناسبة.</p>
        </div>
      </div>

      <div className="customer-share-actions">
        <button className="btn btn-soft" type="button" onClick={() => copy(props.invitationUrl, "url")}>
          {copied === "url" ? <Check size={17} /> : <Copy size={17} />}
          {copied === "url" ? "تم نسخ الرابط" : "نسخ رابط الدعوة"}
        </button>
        <a className="btn btn-gold" href={shareLinks.whatsapp} target="_blank" rel="noreferrer">
          <MessageCircle size={17} />
          مشاركة فورية
        </a>
        <a className="btn btn-soft" href={shareLinks.telegram} target="_blank" rel="noreferrer">
          <Send size={17} />
          تيليجرام
        </a>
        <a className="btn btn-soft" href={shareLinks.facebook} target="_blank" rel="noreferrer">
          <Facebook size={17} />
          فيسبوك
        </a>
      </div>

      <label className="field customer-share-message">
        <span>رسالة واتساب جاهزة</span>
        <MessageTemplatePicker
          templates={props.messageTemplates || []}
          variables={templateVariables}
          allowedKinds={["whatsapp", "welcome", "reminder"]}
          onApply={(content) => setMessage(content)}
        />
        <textarea value={message} onChange={(event) => setMessage(event.target.value)} rows={6} />
      </label>

      <div className="button-row">
        <button className="btn btn-soft" type="button" onClick={() => copy(message, "message")}>
          {copied === "message" ? <Check size={17} /> : <Copy size={17} />}
          {copied === "message" ? "تم نسخ الرسالة" : "نسخ الرسالة"}
        </button>
        <button className="btn btn-soft" type="button" onClick={() => setMessage(defaultMessage)}>
          استعادة النص الجاهز
        </button>
      </div>
    </article>
  );
}
