"use client";

import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, Clock, Headphones, MessageCircle, PartyPopper, Share2 } from "lucide-react";

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
};

type OrderSuccessRedirectProps = {
  fallbackWhatsappUrl?: string;
  orderNumber?: string;
  invitationCode?: string;
};

const storageKey = "badrdaawa-order-success";
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

function readStoredPayload(): Partial<OrderSuccessPayload> {
  try {
    const raw = window.sessionStorage?.getItem(storageKey);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Partial<OrderSuccessPayload>;
    return {
      whatsappUrl: cleanWhatsAppUrl(parsed.whatsappUrl),
      orderNumber: typeof parsed.orderNumber === "string" ? parsed.orderNumber : "",
      invitationCode: typeof parsed.invitationCode === "string" ? parsed.invitationCode : "",
      groomName: typeof parsed.groomName === "string" ? parsed.groomName : "",
      brideName: typeof parsed.brideName === "string" ? parsed.brideName : "",
      weddingDate: typeof parsed.weddingDate === "string" ? parsed.weddingDate : "",
      venue: typeof parsed.venue === "string" ? parsed.venue : "",
      templateName: typeof parsed.templateName === "string" ? parsed.templateName : "",
      paymentMethod: typeof parsed.paymentMethod === "string" ? parsed.paymentMethod : "",
      musicChoice: typeof parsed.musicChoice === "string" ? parsed.musicChoice : "",
      photographerEnabled: typeof parsed.photographerEnabled === "boolean" ? parsed.photographerEnabled : false,
      storyEnabled: typeof parsed.storyEnabled === "boolean" ? parsed.storyEnabled : false,
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
    const text = `*طلب دعوة زفاف*\n\nالرقم: ${payload.orderNumber || "غير محدد"}\nالعروسان: ${payload.groomName || ""} و ${payload.brideName || ""}\nالتاريخ: ${payload.weddingDate || "غير محدد"}\nالقاعة: ${payload.venue || "غير محدد"}\nطريقة الدفع: ${paymentMethodLabel(payload.paymentMethod)}\n\nتم إرسال الطلب بنجاح ✅`;
    const encoded = encodeURIComponent(text);
    const waUrl = `https://wa.me/?text=${encoded}`;
    window.open(waUrl, "_blank");
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
          <p>تم إرسال طلب الدعوة وسنتواصل معكم خلال وقت قصير.</p>
          <p>سيتم فتح واتساب لإكمال التفاصيل وتأكيد الطلب.</p>
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
            {payload.paymentMethod ? (
              <div className="order-success-detail-row">
                <span>طريقة الدفع</span>
                <strong>{paymentMethodLabel(payload.paymentMethod)}</strong>
              </div>
            ) : null}
          </div>
        </div>

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
