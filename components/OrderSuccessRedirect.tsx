"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

type OrderSuccessPayload = {
  activationStatus: "ready" | "pending";
  orderNumber?: string;
  invitationCode?: string;
  publicUrl?: string;
  adminUrl?: string;
  trialDays?: number | null;
  trialEndsAt?: string;
  groomName?: string;
  brideName?: string;
  weddingDate?: string;
  venue?: string;
};

type OrderSuccessRedirectProps = {
  activationStatus?: "ready" | "pending";
  orderNumber?: string;
  invitationCode?: string;
  supportUrl?: string;
};

const storageKey = "badrdaawa-order-success";
const entranceDelay = 180;

function cleanHttpUrl(value?: string) {
  if (!value) return "";
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:" ? url.toString() : "";
  } catch {
    return "";
  }
}

function readStoredPayload(): Partial<OrderSuccessPayload> {
  try {
    const raw = window.sessionStorage?.getItem(storageKey);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Partial<OrderSuccessPayload>;
    return {
      activationStatus: parsed.activationStatus === "ready" ? "ready" : "pending",
      orderNumber: typeof parsed.orderNumber === "string" ? parsed.orderNumber : "",
      invitationCode: typeof parsed.invitationCode === "string" ? parsed.invitationCode : "",
      publicUrl: cleanHttpUrl(parsed.publicUrl),
      adminUrl: cleanHttpUrl(parsed.adminUrl),
      trialDays: typeof parsed.trialDays === "number" ? parsed.trialDays : null,
      trialEndsAt: typeof parsed.trialEndsAt === "string" ? parsed.trialEndsAt : "",
      groomName: typeof parsed.groomName === "string" ? parsed.groomName : "",
      brideName: typeof parsed.brideName === "string" ? parsed.brideName : "",
      weddingDate: typeof parsed.weddingDate === "string" ? parsed.weddingDate : "",
      venue: typeof parsed.venue === "string" ? parsed.venue : "",
    };
  } catch {
    return {};
  }
}

const confettiColors = ["#bd8f3f", "#ffffff", "#7dbf7d", "#c8a96e", "#e8f5e9", "#d4af37"];

export function OrderSuccessRedirect({ activationStatus = "pending", orderNumber, invitationCode, supportUrl }: OrderSuccessRedirectProps) {
  const initialPayload = useMemo<OrderSuccessPayload>(() => ({ activationStatus, orderNumber, invitationCode }), [activationStatus, invitationCode, orderNumber]);
  const [payload, setPayload] = useState<OrderSuccessPayload>(initialPayload);
  const [copied, setCopied] = useState(false);
  const [visibleItems, setVisibleItems] = useState<Set<string>>(new Set());
  const [showConfetti, setShowConfetti] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const cleanSupportUrl = useMemo(() => cleanHttpUrl(supportUrl), [supportUrl]);

  useEffect(() => {
    setPayload((current) => ({ ...current, ...readStoredPayload() }));
    setReducedMotion(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  }, []);

  const entranceItems = useMemo(() => ["checkmark", "title", "description", "order-number", "details", "actions", "support"], []);

  useEffect(() => {
    if (reducedMotion) {
      setVisibleItems(new Set(entranceItems));
      return;
    }
    const timers = entranceItems.map((item, index) => setTimeout(() => setVisibleItems((previous) => new Set(previous).add(item)), index * entranceDelay));
    const confettiTimer = setTimeout(() => setShowConfetti(false), 4600);
    setShowConfetti(true);
    return () => {
      timers.forEach(clearTimeout);
      clearTimeout(confettiTimer);
    };
  }, [entranceItems, reducedMotion]);

  const copyOrderNumber = useCallback(async () => {
    if (!payload.orderNumber) return;
    try {
      await navigator.clipboard.writeText(payload.orderNumber);
    } catch {
      const textarea = document.createElement("textarea");
      textarea.value = payload.orderNumber;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2200);
  }, [payload.orderNumber]);

  const showItem = (item: string) => reducedMotion || visibleItems.has(item);
  const isReady = payload.activationStatus === "ready" && Boolean(payload.publicUrl && payload.adminUrl);

  return (
    <main className="order-success-page" dir="rtl">
      {showConfetti && !reducedMotion ? (
        <div className="success-confetti" aria-hidden="true">
          {Array.from({ length: 24 }).map((_, index) => (
            <span
              key={index}
              className="success-confetti-particle"
              style={{
                left: `${4 + Math.random() * 92}%`,
                background: confettiColors[index % confettiColors.length],
                animationDelay: `${Math.random() * 1.2}s`,
                animationDuration: `${2 + Math.random() * 1.5}s`,
                width: `${4 + Math.random() * 5}px`,
                height: `${8 + Math.random() * 8}px`,
                borderRadius: `${Math.random() > 0.5 ? "50%" : "2px"}`,
              }}
            />
          ))}
        </div>
      ) : null}

      {copied ? <div className="success-toast">✅ تم نسخ رقم الطلب.</div> : null}

      <div className="success-card">
        <div className={`success-section success-checkmark-section ${showItem("checkmark") ? "visible" : ""}`}>
          <svg className="success-svg" viewBox="0 0 100 100" aria-hidden="true">
            <circle className="success-circle" cx="50" cy="50" r="44" />
            <path className="success-check" d="M28 50 L46 68 L74 36" />
          </svg>
        </div>

        <div className={`success-section success-title-section ${showItem("title") ? "visible" : ""}`}>
          <h1 className="success-title">{isReady ? "دعوتك جاهزة للتجربة ❤️" : "تم استلام طلبك بنجاح"}</h1>
        </div>

        <div className={`success-section success-desc-section ${showItem("description") ? "visible" : ""}`}>
          <p className="success-desc">
            {isReady
              ? `تم تفعيل دعوتك${payload.trialDays ? ` لمدة ${payload.trialDays} أيام` : ""}. جرّبها الآن وراجع كل التفاصيل قبل الدفع.`
              : "تم حفظ طلبك، لكن تفعيل رابط التجربة يحتاج مراجعة سريعة. لا تحتاج لإعادة إرسال الطلب وسيتولى فريق الدعم متابعته."}
          </p>
        </div>

        {payload.orderNumber ? (
          <div className={`success-section success-number-section ${showItem("order-number") ? "visible" : ""}`}>
            <div className="success-number-card">
              <span className="success-number-label">رقم الطلب</span>
              <strong className="success-number-value">{payload.orderNumber}</strong>
              <button className="success-copy-btn" type="button" onClick={copyOrderNumber}>📋 نسخ</button>
            </div>
          </div>
        ) : null}

        {payload.groomName || payload.brideName || payload.weddingDate || payload.venue ? (
          <div className={`success-section success-details-section ${showItem("details") ? "visible" : ""}`}>
            <div className="success-details">
              {payload.groomName || payload.brideName ? <div className="success-detail-row"><span>👰 أسماء العروسين</span><strong>{payload.groomName} و {payload.brideName}</strong></div> : null}
              {payload.weddingDate ? <div className="success-detail-row"><span>📅 تاريخ المناسبة</span><strong>{payload.weddingDate}</strong></div> : null}
              {payload.venue ? <div className="success-detail-row"><span>📍 اسم القاعة</span><strong>{payload.venue}</strong></div> : null}
            </div>
          </div>
        ) : null}

        {isReady ? (
          <div className={`success-section success-whatsapp-section ${showItem("actions") ? "visible" : ""}`}>
            <a className="success-whatsapp-btn" href={payload.adminUrl}>فتح لوحة التحكم</a>
            <a className="btn btn-soft" href={payload.publicUrl} target="_blank" rel="noreferrer">مشاهدة الدعوة</a>
          </div>
        ) : null}

        {cleanSupportUrl ? (
          <div className={`success-section success-cancel-section ${showItem("support") ? "visible" : ""}`}>
            <a className="success-cancel-btn" href={cleanSupportUrl} target="_blank" rel="noreferrer">تواصل مع الدعم</a>
          </div>
        ) : null}
      </div>
    </main>
  );
}
