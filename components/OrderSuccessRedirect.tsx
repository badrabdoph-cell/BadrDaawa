"use client";

import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, MessageCircle, PartyPopper } from "lucide-react";

type OrderSuccessPayload = {
  whatsappUrl: string;
  orderNumber?: string;
  invitationCode?: string;
};

type OrderSuccessRedirectProps = {
  fallbackWhatsappUrl?: string;
  orderNumber?: string;
  invitationCode?: string;
};

const storageKey = "badrdaawa-order-success";
const fallbackWhatsappUrl = "https://wa.me/";

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
    };
  } catch {
    return {};
  }
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
  const [seconds, setSeconds] = useState(5);

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
          <h1 id="order-success-title">تم إرسال طلب الدعوة بنجاح ❤️</h1>
          <p>تم استلام طلبك وإرساله للمراجعة.</p>
          <p>سيتم تحويلك تلقائياً إلى واتساب لإرسال التفاصيل والإيصال إلى الأدمن.</p>
        </div>

        <div className="order-success-countdown" role="timer" aria-live="polite">
          <span>سيتم التحويل خلال:</span>
          <strong>{seconds || 1}</strong>
        </div>

        <button className="order-success-action" type="button" onClick={sendNow}>
          <MessageCircle size={21} />
          <span>إرسال الآن عبر واتساب</span>
        </button>

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
