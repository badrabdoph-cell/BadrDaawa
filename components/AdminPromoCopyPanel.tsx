"use client";

import { Check, Copy, ExternalLink, MessageSquareText, QrCode } from "lucide-react";
import { useMemo, useState } from "react";

type AdminPromoCopyPanelProps = {
  code: string;
  shortUrl: string;
  qrCodeUrl?: string;
  partnerName: string;
  discountLabel: string;
};

export function AdminPromoCopyPanel({ code, shortUrl, qrCodeUrl, partnerName, discountLabel }: AdminPromoCopyPanelProps) {
  const [copied, setCopied] = useState("");
  const readyMessage = useMemo(() => {
    const discountLine = discountLabel && discountLabel !== "بدون خصم" ? `${discountLabel}\n` : "";
    return `كود خصم ${partnerName}\n${discountLine}الكود: ${code}\nالرابط: ${shortUrl}`;
  }, [code, discountLabel, partnerName, shortUrl]);

  async function copyValue(key: string, value: string) {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(key);
      window.setTimeout(() => setCopied(""), 1800);
    } catch {
      setCopied("");
    }
  }

  function buttonIcon(key: string) {
    return copied === key ? <Check size={17} /> : <Copy size={17} />;
  }

  return (
    <div className="promo-result-panel" aria-live="polite">
      <div>
        <span className="eyebrow">جاهز للمشاركة</span>
        <h2>{code}</h2>
        <p>{partnerName} · {discountLabel}</p>
        <strong dir="ltr">{shortUrl}</strong>
      </div>
      {qrCodeUrl ? <div className="promo-result-qr" style={{ backgroundImage: `url(${qrCodeUrl})` }} aria-label="QR" /> : null}
      <div className="promo-result-actions">
        <button className="btn btn-soft" type="button" onClick={() => copyValue("code", code)}>
          {buttonIcon("code")}
          {copied === "code" ? "تم نسخ الكود" : "نسخ الكود"}
        </button>
        <button className="btn btn-soft" type="button" onClick={() => copyValue("url", shortUrl)}>
          {buttonIcon("url")}
          {copied === "url" ? "تم نسخ الرابط" : "نسخ الرابط"}
        </button>
        <button className="btn btn-gold" type="button" onClick={() => copyValue("message", readyMessage)}>
          {copied === "message" ? <Check size={17} /> : <MessageSquareText size={17} />}
          {copied === "message" ? "تم نسخ الرسالة" : "نسخ رسالة جاهزة"}
        </button>
        <a className="btn btn-soft" href={shortUrl} target="_blank">
          <ExternalLink size={17} />
          فتح الرابط
        </a>
        {qrCodeUrl ? (
          <a className="btn btn-soft" href={qrCodeUrl} target="_blank">
            <QrCode size={17} />
            تحميل QR
          </a>
        ) : null}
      </div>
    </div>
  );
}
