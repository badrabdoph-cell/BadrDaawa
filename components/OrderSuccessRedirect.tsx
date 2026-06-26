"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type OrderSuccessPayload = {
  whatsappUrl: string;
  orderNumber?: string;
  invitationCode?: string;
  groomName?: string;
  brideName?: string;
  weddingDate?: string;
  venue?: string;
};

type OrderSuccessRedirectProps = {
  fallbackWhatsappUrl?: string;
  orderNumber?: string;
  invitationCode?: string;
};

const storageKey = "badrdaawa-order-success";
const fallbackWhatsapp = "https://wa.me/";
const redirectCountdownSeconds = 20;
const entranceDelay = 180;

function cleanWhatsAppUrl(value?: string) {
  if (!value) return fallbackWhatsapp;
  try {
    const url = new URL(value);
    if (url.protocol === "https:" && (url.hostname === "wa.me" || url.hostname.endsWith(".whatsapp.com"))) return url.toString();
  } catch {}
  return fallbackWhatsapp;
}

function extractPhoneFromUrl(url: string): string {
  try {
    const parsed = new URL(url);
    const path = parsed.pathname.replace(/^\//, "");
    if (!path) return "";
    if (path.startsWith("20") && path.length >= 11) return "0" + path.slice(2);
    return path;
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
      whatsappUrl: cleanWhatsAppUrl(parsed.whatsappUrl),
      orderNumber: typeof parsed.orderNumber === "string" ? parsed.orderNumber : "",
      invitationCode: typeof parsed.invitationCode === "string" ? parsed.invitationCode : "",
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
  const [isCancelled, setIsCancelled] = useState(false);
  const [copied, setCopied] = useState(false);
  const [visibleItems, setVisibleItems] = useState<Set<string>>(new Set());
  const [showConfetti, setShowConfetti] = useState(false);
  const [redirectFailed, setRedirectFailed] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const redirectAttemptedRef = useRef(false);
  const cancelledRef = useRef(false);

  const countdownDone = seconds <= 0 && !isCancelled;

  const progressPercent = useMemo(() => {
    if (isCancelled) return 0;
    return (seconds / redirectCountdownSeconds) * 100;
  }, [seconds, isCancelled]);

  const displayPhone = useMemo(() => extractPhoneFromUrl(payload.whatsappUrl), [payload.whatsappUrl]);

  useEffect(() => {
    const storedPayload = readStoredPayload();
    if (!fallbackUrl && storedPayload.whatsappUrl) setPayload((current) => ({ ...current, ...storedPayload }));
  }, [fallbackUrl]);

  useEffect(() => {
    setReducedMotion(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  }, []);

  const entranceItems = useMemo(() => ["checkmark", "title", "description", "order-number", "details", "countdown", "button", "cancel"], []);

  useEffect(() => {
    if (reducedMotion) {
      setVisibleItems(new Set(entranceItems));
      setShowConfetti(true);
      return;
    }
    entranceItems.forEach((item, i) => {
      setTimeout(() => {
        setVisibleItems((prev) => new Set(prev).add(item));
      }, i * entranceDelay);
    });
    setTimeout(() => setShowConfetti(true), entranceDelay + 600);
    const confettiTimer = setTimeout(() => setShowConfetti(false), 4600);
    return () => clearTimeout(confettiTimer);
  }, [entranceItems, reducedMotion]);

  /* countdown */
  useEffect(() => {
    if (isCancelled || seconds <= 0) return;
    const id = setTimeout(() => setSeconds((s) => s - 1), 1000);
    return () => clearTimeout(id);
  }, [seconds, isCancelled]);

  /* auto-redirect when countdown hits 0 */
  useEffect(() => {
    if (!countdownDone) return;
    if (redirectAttemptedRef.current) return;
    redirectAttemptedRef.current = true;
    doRedirect();
  }, [countdownDone]);

  const doRedirect = useCallback(() => {
    if (!payload.whatsappUrl || payload.whatsappUrl === fallbackWhatsapp) return;
    try {
      window.location.assign(payload.whatsappUrl);
    } catch {
      setRedirectFailed(true);
    }
    setTimeout(() => {
      if (!redirectAttemptedRef.current) return;
      setRedirectFailed(true);
    }, 3000);
  }, [payload.whatsappUrl]);

  const sendNow = useCallback(() => {
    setIsCancelled(true);
    cancelledRef.current = true;
    if (redirectAttemptedRef.current) return;
    redirectAttemptedRef.current = true;
    doRedirect();
  }, [doRedirect]);

  const cancelRedirect = useCallback(() => {
    setIsCancelled(true);
    cancelledRef.current = true;
  }, []);

  const copyOrderNumber = useCallback(async () => {
    if (!payload.orderNumber) return;
    try {
      await navigator.clipboard.writeText(payload.orderNumber);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = payload.orderNumber;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2200);
  }, [payload.orderNumber]);

  const showItem = (item: string) => reducedMotion || visibleItems.has(item);
  const showLast10 = seconds <= 10 && !isCancelled && seconds > 0;

  return (
    <main className="order-success-page" dir="rtl">
      {showConfetti && !reducedMotion ? (
        <div className="success-confetti" aria-hidden="true">
          {Array.from({ length: 24 }).map((_, i) => (
            <span
              key={i}
              className="success-confetti-particle"
              style={{
                left: `${4 + Math.random() * 92}%`,
                background: confettiColors[i % confettiColors.length],
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
        {/* 1. Success Animation */}
        <div className={`success-section success-checkmark-section ${showItem("checkmark") ? "visible" : ""}`}>
          <svg className="success-svg" viewBox="0 0 100 100" aria-hidden="true">
            <circle className="success-circle" cx="50" cy="50" r="44" />
            <path className="success-check" d="M28 50 L46 68 L74 36" />
          </svg>
        </div>

        {/* 2. Title */}
        <div className={`success-section success-title-section ${showItem("title") ? "visible" : ""}`}>
          <h1 className="success-title">تم استلام طلبك بنجاح ❤️</h1>
        </div>

        {/* 3. Description */}
        <div className={`success-section success-desc-section ${showItem("description") ? "visible" : ""}`}>
          <p className="success-desc">
            تم استلام طلبك بنجاح، وسيتم تحويلك تلقائياً إلى واتساب خدمة العملاء لإكمال إجراءات الدعوة.
          </p>
        </div>

        {/* 4. Order Number Card */}
        {payload.orderNumber ? (
          <div className={`success-section success-number-section ${showItem("order-number") ? "visible" : ""}`}>
            <div className="success-number-card">
              <span className="success-number-label">رقم الطلب</span>
              <strong className="success-number-value">{payload.orderNumber}</strong>
              <button className="success-copy-btn" type="button" onClick={copyOrderNumber}>
                📋 نسخ
              </button>
            </div>
          </div>
        ) : null}

        {/* 5. Order Details */}
        {payload.groomName || payload.brideName || payload.weddingDate || payload.venue ? (
          <div className={`success-section success-details-section ${showItem("details") ? "visible" : ""}`}>
            <div className="success-details">
              {payload.groomName || payload.brideName ? (
                <div className="success-detail-row">
                  <span>👰 أسماء العروسين</span>
                  <strong>{payload.groomName} و {payload.brideName}</strong>
                </div>
              ) : null}
              {payload.weddingDate ? (
                <div className="success-detail-row">
                  <span>📅 تاريخ المناسبة</span>
                  <strong>{payload.weddingDate}</strong>
                </div>
              ) : null}
              {payload.venue ? (
                <div className="success-detail-row">
                  <span>📍 اسم القاعة</span>
                  <strong>{payload.venue}</strong>
                </div>
              ) : null}
            </div>
          </div>
        ) : null}

        {/* 6. Countdown */}
        {!isCancelled ? (
          <div className={`success-section success-countdown-section ${showItem("countdown") ? "visible" : ""}`}>
            {!countdownDone ? (
              <>
                <p className="success-countdown-label">سيتم تحويلك إلى واتساب خلال</p>
                <div className="success-countdown-timer" role="timer" aria-live="polite" aria-label={`التحويل خلال ${Math.floor(seconds / 60)} دقيقة و ${seconds % 60} ثانية`}>
                  <span className={`success-countdown-digits ${showLast10 ? "countdown-warning" : ""}`}>
                    {String(Math.floor(seconds / 60)).padStart(2, "0")}:{String(seconds % 60).padStart(2, "0")}
                  </span>
                </div>
                <div className="success-progress-track">
                  <div
                    className={`success-progress-fill ${showLast10 ? "progress-warning" : ""}`}
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
              </>
            ) : null}
            {countdownDone && !redirectFailed ? (
              <p className="success-redirecting-text">جاري تحويلك إلى واتساب…</p>
            ) : null}
            {redirectFailed || (countdownDone && !redirectAttemptedRef.current) ? (
              <p className="success-failed-text">
                تعذر التحويل التلقائي، يمكنك الضغط على الزر بالأسفل.
              </p>
            ) : null}
          </div>
        ) : null}

        {/* 7. WhatsApp Button */}
        <div className={`success-section success-whatsapp-section ${showItem("button") ? "visible" : ""}`}>
          <button
            className={`success-whatsapp-btn ${!isCancelled && !countdownDone ? "btn-pulse" : ""}`}
            type="button"
            onClick={sendNow}
            disabled={!payload.whatsappUrl || payload.whatsappUrl === fallbackWhatsapp}
          >
            💬 فتح واتساب الآن
          </button>
        </div>

        {/* 8. Cancel link */}
        {!isCancelled && !countdownDone ? (
          <div className={`success-section success-cancel-section ${showItem("cancel") ? "visible" : ""}`}>
            <button className="success-cancel-btn" type="button" onClick={cancelRedirect}>
              إلغاء التحويل التلقائي
            </button>
          </div>
        ) : null}

        {/* Phone footer */}
        {displayPhone ? (
          <p className="success-phone-footer">
            للاستفسار: واتساب <strong>{displayPhone}</strong>
          </p>
        ) : null}
      </div>
    </main>
  );
}
