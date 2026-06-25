"use client";

import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, Clock, Copy, Download, ExternalLink, Headphones, MessageCircle, PartyPopper, QrCode, Share2 } from "lucide-react";

type OrderSuccessPayload = {
  whatsappUrl: string;
  orderNumber?: string;
  invitationCode?: string;
  groomName?: string;
  brideName?: string;
  weddingDate?: string;
  venue?: string;
  templateName?: string;
  paymentMethod?: string;
  musicChoice?: string;
  photographerEnabled?: boolean;
  storyEnabled?: boolean;
  selectedShareTemplate?: string;
  publicUrl?: string;
  sharePosterUrl?: string;
  qrCodeUrl?: string;
};

type OrderSuccessRedirectProps = {
  fallbackWhatsappUrl?: string;
  orderNumber?: string;
  invitationCode?: string;
};

const storageKey = "badrdaawa-order-success";
const extraStorageKey = "badrdaawa-order-success-extra";
const fallbackWhatsappUrl = "https://wa.me/";
const redirectCountdownSeconds = 10;

function cleanWhatsAppUrl(value?: string) {
  if (!value) return fallbackWhatsappUrl;
  try {
    const url = new URL(value);
    if (url.protocol === "https:" && (url.hostname === "wa.me" || url.hostname.endsWith(".whatsapp.com"))) return url.toString();
  } catch {}
  return fallbackWhatsappUrl;
}

function cleanPublicUrl(value?: string) {
  if (!value) return "";
  try {
    const url = new URL(value, window.location.origin);
    if (url.protocol === "http:" || url.protocol === "https:") return url.toString();
  } catch {}
  return "";
}

function readStoredPayload(): Partial<OrderSuccessPayload> {
  try {
    const raw = window.sessionStorage?.getItem(storageKey);
    const extraRaw = window.sessionStorage?.getItem(extraStorageKey);
    const parsed = raw ? (JSON.parse(raw) as Partial<OrderSuccessPayload>) : {};
    const extra = extraRaw ? (JSON.parse(extraRaw) as Partial<OrderSuccessPayload>) : {};
    const merged = { ...parsed, ...extra };
    return {
      whatsappUrl: cleanWhatsAppUrl(merged.whatsappUrl),
      orderNumber: typeof merged.orderNumber === "string" ? merged.orderNumber : "",
      invitationCode: typeof merged.invitationCode === "string" ? merged.invitationCode : "",
      groomName: typeof merged.groomName === "string" ? merged.groomName : "",
      brideName: typeof merged.brideName === "string" ? merged.brideName : "",
      weddingDate: typeof merged.weddingDate === "string" ? merged.weddingDate : "",
      venue: typeof merged.venue === "string" ? merged.venue : "",
      templateName: typeof merged.templateName === "string" ? merged.templateName : "",
      paymentMethod: typeof merged.paymentMethod === "string" ? merged.paymentMethod : "",
      musicChoice: typeof merged.musicChoice === "string" ? merged.musicChoice : "",
      photographerEnabled: typeof merged.photographerEnabled === "boolean" ? merged.photographerEnabled : false,
      storyEnabled: typeof merged.storyEnabled === "boolean" ? merged.storyEnabled : false,
      selectedShareTemplate: typeof merged.selectedShareTemplate === "string" ? merged.selectedShareTemplate : "",
      publicUrl: cleanPublicUrl(merged.publicUrl),
      sharePosterUrl: cleanPublicUrl(merged.sharePosterUrl),
      qrCodeUrl: cleanPublicUrl(merged.qrCodeUrl),
    };
  } catch {
    return {};
  }
}

function paymentMethodLabel(method?: string) {
  if (method === "bank") return "تحويل بنكي";
  if (method === "ewallet") return "محفظة إلكترونية";
  return "الدفع عند الاستلام";
}

function downloadUrl(url?: string) {
  if (!url) return;
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = url.includes("qr") ? "badrdaawa-qr-code.png" : "badrdaawa-share-poster.png";
  anchor.target = "_blank";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
}

export function OrderSuccessRedirect({ fallbackWhatsappUrl: fallbackUrl, orderNumber, invitationCode }: OrderSuccessRedirectProps) {
  const initialPayload = useMemo<OrderSuccessPayload>(
    () => ({
      whatsappUrl: cleanWhatsAppUrl(fallbackUrl),
      orderNumber: orderNumber || "",
      invitationCode: invitationCode || "",
    }),
    [fallbackUrl, invitationCode, orderNumber],
  );
  const [payload, setPayload] = useState<OrderSuccessPayload>(initialPayload);
  const [seconds, setSeconds] = useState(redirectCountdownSeconds);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const storedPayload = readStoredPayload();
    if (!fallbackUrl && storedPayload.whatsappUrl) setPayload((current) => ({ ...current, ...storedPayload }));
  }, [fallbackUrl]);

  useEffect(() => {
    if (seconds <= 0) {
      window.location.assign(payload.whatsappUrl);
      return;
    }
    const timeoutId = window.setTimeout(() => setSeconds((current) => Math.max(0, current - 1)), 1000);
    return () => window.clearTimeout(timeoutId);
  }, [payload.whatsappUrl, seconds]);

  function sendNow() {
    window.location.assign(payload.whatsappUrl);
  }

  function shareWhatsApp() {
    const paymentLine = payload.paymentMethod ? `\nطريقة الدفع: ${paymentMethodLabel(payload.paymentMethod)}` : "";
    const posterLine = payload.sharePosterUrl ? `\nصورة المشاركة: ${payload.sharePosterUrl}` : "";
    const publicLine = payload.publicUrl ? `\nرابط الدعوة: ${payload.publicUrl}` : "";
    const text = `*طلب دعوة زفاف*\n\nالرقم: ${payload.orderNumber || "غير محدد"}\nالعروسان: ${payload.groomName || ""} و ${payload.brideName || ""}\nالتاريخ: ${payload.weddingDate || "غير محدد"}\nالقاعة: ${payload.venue || "غير محدد"}${paymentLine}${publicLine}${posterLine}\n\nتم إرسال الطلب بنجاح ✅`;
    const encoded = encodeURIComponent(text);
    const waUrl = `https://wa.me/?text=${encoded}`;
    window.open(waUrl, "_blank");
  }

  async function copyInvitationUrl() {
    if (!payload.publicUrl) return;
    try {
      await navigator.clipboard.writeText(payload.publicUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {}
  }

  return (
    <main className="order-success-page" dir="rtl">
      <div className="order-success-confetti" aria-hidden="true">
        <span />
        <span />
        <span />
        <span />
        <span />
        <span />
      </div>

      <section className="order-success-card" aria-labelledby="order-success-title">
        <div className="order-success-icon" aria-hidden="true">
          <span>
            <CheckCircle2 size={54} strokeWidth={2.4} />
          </span>
          <PartyPopper size={30} />
        </div>

        <div className="order-success-copy">
          <p className="order-success-kicker">تم استلام الطلب</p>
          <h1 id="order-success-title">تم استلام طلبكم بنجاح ❤️</h1>
          <p>هيتم تحويلك علي واتساب خدمه العملاء</p>
          <p>ابعتله نص الايصال ال هتلاقيه جاهز فالشات ✨</p>
        </div>

        {payload.orderNumber ? (
          <div className="order-success-badge">
            <span>رقم الطلب</span>
            <strong>{payload.orderNumber}</strong>
          </div>
        ) : null}

        <div className="order-success-details">
          <h3>تفاصيل الطلب</h3>
          <div className="order-success-details-grid">
            {payload.groomName || payload.brideName ? (
              <div className="order-success-detail-row">
                <span>العروسان</span>
                <strong>{payload.groomName} و {payload.brideName}</strong>
              </div>
            ) : null}
            {payload.templateName ? (
              <div className="order-success-detail-row">
                <span>القالب</span>
                <strong>{payload.templateName}</strong>
              </div>
            ) : null}
            {payload.weddingDate ? (
              <div className="order-success-detail-row">
                <span>تاريخ المناسبة</span>
                <strong>{payload.weddingDate}</strong>
              </div>
            ) : null}
            {payload.venue ? (
              <div className="order-success-detail-row">
                <span>القاعة</span>
                <strong>{payload.venue}</strong>
              </div>
            ) : null}
            {payload.selectedShareTemplate ? (
              <div className="order-success-detail-row">
                <span>صورة المشاركة</span>
                <strong>{payload.selectedShareTemplate}</strong>
              </div>
            ) : null}
          </div>
        </div>

        {payload.sharePosterUrl || payload.publicUrl || payload.qrCodeUrl ? (
          <div className="order-success-details">
            <h3>ملفات المشاركة</h3>
            <div className="order-success-actions">
              {payload.sharePosterUrl ? (
                <button className="order-success-action" type="button" onClick={() => downloadUrl(payload.sharePosterUrl)}>
                  <Download size={20} />
                  <span>تحميل صورة المشاركة</span>
                </button>
              ) : null}
              {payload.publicUrl ? (
                <button className="order-success-action secondary" type="button" onClick={copyInvitationUrl}>
                  <Copy size={18} />
                  <span>{copied ? "تم نسخ الرابط" : "نسخ رابط الدعوة"}</span>
                </button>
              ) : null}
              {payload.publicUrl ? (
                <button className="order-success-action secondary" type="button" onClick={() => window.open(payload.publicUrl, "_blank") }>
                  <ExternalLink size={18} />
                  <span>فتح الدعوة</span>
                </button>
              ) : null}
              {payload.qrCodeUrl ? (
                <button className="order-success-action secondary" type="button" onClick={() => downloadUrl(payload.qrCodeUrl)}>
                  <QrCode size={18} />
                  <span>تحميل QR Code</span>
                </button>
              ) : null}
            </div>
          </div>
        ) : null}

        <div className="order-success-info">
          <div className="order-success-info-item">
            <Clock size={16} />
            <span>مدة المعالجة المتوقعة: <strong>24-48 ساعة</strong></span>
          </div>
          <div className="order-success-info-item">
            <Headphones size={16} />
            <span>للاستفسار: <strong>واتساب 01000000000</strong></span>
          </div>
        </div>

        <div className="order-success-countdown" role="timer" aria-live="polite">
          <span>سيتم التحويل إلى واتساب خلال:</span>
          <strong>{seconds || 1}</strong>
        </div>

        <div className="order-success-actions">
          <button className="order-success-action" type="button" onClick={sendNow}>
            <MessageCircle size={21} />
            <span>إرسال الآن عبر واتساب</span>
          </button>
          <button className="order-success-action secondary" type="button" onClick={shareWhatsApp}>
            <Share2 size={18} />
            <span>مشاركة ملخص الطلب</span>
          </button>
        </div>

        <p className="order-success-hint">إذا لم يتم فتح واتساب تلقائياً، اضغط على الزر لإعادة المحاولة.</p>

        {payload.orderNumber || payload.invitationCode ? (
          <div className="order-success-meta" aria-label="بيانات الطلب">
            {payload.orderNumber ? <span>رقم الطلب: {payload.orderNumber}</span> : null}
            {payload.invitationCode ? <span>كود الدعوة: {payload.invitationCode}</span> : null}
          </div>
        ) : null}
      </section>
    </main>
  );
}
