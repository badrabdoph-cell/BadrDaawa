"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Check } from "lucide-react";
import PosterRenderer from "./social-posters/PosterRenderer";
import { SHARE_POSTER_TEMPLATES, type SharePosterTemplateId } from "./social-posters/poster-templates";

const storageKey = "badrdaawa-selected-share-template";
const successExtraStorageKey = "badrdaawa-order-success-extra";
const fallbackCover = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='900' height='520' viewBox='0 0 900 520'%3E%3Crect width='900' height='520' fill='%23251b13'/%3E%3Ctext x='450' y='250' fill='%23fff7e8' font-size='52' font-family='Arial' font-weight='700' text-anchor='middle'%3EWedding Photo%3C/text%3E%3Ctext x='450' y='310' fill='%23d7b76b' font-size='28' font-family='Arial' font-weight='700' text-anchor='middle'%3EUpload cover image%3C/text%3E%3C/svg%3E";

type PosterSnapshot = {
  groomName: string;
  brideName: string;
  coverImage: string;
  weddingDate: string;
  venueName: string;
  venueAddress: string;
  weddingTime: string;
  invitationUrl: string;
};

type OrderResponseExtra = {
  publicUrl?: string;
  sharePosterUrl?: string;
  qrCodeUrl?: string;
  invitationCode?: string;
};

function textInputValue(name: string) {
  return document.querySelector<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>(`[name="${name}"]`)?.value?.trim() || "";
}

function activeStepText() {
  return (document.querySelector<HTMLElement>(".order-wizard-step.is-active")?.textContent || "").replace(/\s+/g, " ").trim();
}

function getCoverImage() {
  return document.querySelector<HTMLImageElement>(".compact-image-slot.has-image img")?.src || fallbackCover;
}

function slugify(value: string) {
  return (value || "invitation")
    .trim()
    .toLowerCase()
    .replace(/[\u064B-\u065F]/g, "")
    .replace(/[^a-z0-9\u0600-\u06FF]+/gi, "-")
    .replace(/^-+|-+$/g, "") || "invitation";
}

function getPosterSnapshot(): PosterSnapshot {
  const groomName = textInputValue("groomName") || "أحمد";
  const brideName = textInputValue("brideName") || "نور";
  const weddingDate = textInputValue("weddingDate") || new Date().toISOString().slice(0, 10);
  const venueName = textInputValue("venue") || "LALIT ELOMR HALL";
  const weddingTime = textInputValue("weddingTime") || "8 pm";
  const venueAddress = textInputValue("mapUrl") || "";
  const invitationUrl = `${window.location.origin}/invitation/${slugify(`${groomName}-${brideName}`)}`;

  return { groomName, brideName, coverImage: getCoverImage(), weddingDate, venueName, venueAddress, weddingTime, invitationUrl };
}

function readSelectedTemplate(): SharePosterTemplateId {
  try {
    const saved = window.sessionStorage?.getItem(storageKey) || window.localStorage?.getItem(storageKey) || "classic";
    return SHARE_POSTER_TEMPLATES.some((template) => template.id === saved) ? (saved as SharePosterTemplateId) : "classic";
  } catch {
    return "classic";
  }
}

function saveSelectedTemplate(value: SharePosterTemplateId) {
  try {
    window.sessionStorage?.setItem(storageKey, value);
    window.localStorage?.setItem(storageKey, value);
  } catch {}
}

function saveOrderResponseExtra(data: OrderResponseExtra, selectedShareTemplate: SharePosterTemplateId) {
  try {
    window.sessionStorage?.setItem(
      successExtraStorageKey,
      JSON.stringify({
        selectedShareTemplate,
        publicUrl: data.publicUrl || "",
        sharePosterUrl: data.sharePosterUrl || "",
        qrCodeUrl: data.qrCodeUrl || "",
        invitationCode: data.invitationCode || "",
      }),
    );
  } catch {}
}

function scaledPoster(snapshot: PosterSnapshot, selectedShareTemplate: SharePosterTemplateId, scaleClass: string) {
  return (
    <div className={`share-poster-scale ${scaleClass}`}>
      <PosterRenderer {...snapshot} selectedShareTemplate={selectedShareTemplate} />
    </div>
  );
}

export function OrderSharePosterExperience() {
  const [selectedShareTemplate, setSelectedShareTemplate] = useState<SharePosterTemplateId>("classic");
  const [snapshot, setSnapshot] = useState<PosterSnapshot | null>(null);
  const [shareStepOpen, setShareStepOpen] = useState(false);
  const [reviewTarget, setReviewTarget] = useState<HTMLElement | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setSelectedShareTemplate(readSelectedTemplate());
    setSnapshot(getPosterSnapshot());
  }, []);

  useEffect(() => {
    function sync() {
      setSnapshot(getPosterSnapshot());
      const review = document.querySelector<HTMLElement>(".order-wizard-step.is-active .order-review-final-note")?.parentElement || null;
      setReviewTarget(review);
    }

    sync();
    const interval = window.setInterval(sync, 450);
    document.addEventListener("input", sync, true);
    document.addEventListener("change", sync, true);
    return () => {
      window.clearInterval(interval);
      document.removeEventListener("input", sync, true);
      document.removeEventListener("change", sync, true);
    };
  }, []);

  useEffect(() => {
    let allowNextOnce = false;

    function handleClick(event: MouseEvent) {
      const target = event.target;
      if (!(target instanceof Element)) return;
      const nextButton = target.closest<HTMLButtonElement>(".order-wizard-actions button.btn-gold:not(.order-submit)");
      if (!nextButton) return;
      if (allowNextOnce) {
        allowNextOnce = false;
        return;
      }
      if (!activeStepText().includes("إضافات مهمة")) return;
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      setSnapshot(getPosterSnapshot());
      setShareStepOpen(true);
      window.setTimeout(() => document.querySelector<HTMLElement>(".share-poster-step-panel")?.scrollIntoView({ behavior: "smooth", block: "center" }), 80);
    }

    function continueToReview() {
      allowNextOnce = true;
      setShareStepOpen(false);
      window.setTimeout(() => document.querySelector<HTMLButtonElement>(".order-wizard-actions button.btn-gold:not(.order-submit)")?.click(), 80);
    }

    (window as unknown as { __continueSharePosterToReview?: () => void }).__continueSharePosterToReview = continueToReview;
    document.addEventListener("click", handleClick, true);
    return () => {
      document.removeEventListener("click", handleClick, true);
      delete (window as unknown as { __continueSharePosterToReview?: () => void }).__continueSharePosterToReview;
    };
  }, []);

  useEffect(() => {
    const originalFetch = window.fetch.bind(window);
    window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
      if (url.includes("/api/orders") && init?.body && typeof init.body === "string") {
        try {
          const body = JSON.parse(init.body) as Record<string, unknown>;
          body.selectedShareTemplate = selectedShareTemplate;
          init = { ...init, body: JSON.stringify(body) };
        } catch {}
      }
      const response = await originalFetch(input, init);
      if (url.includes("/api/orders")) {
        const originalJson = response.json.bind(response);
        (response as Response & { json: () => Promise<unknown> }).json = async () => {
          const data = (await originalJson()) as OrderResponseExtra;
          saveOrderResponseExtra(data, selectedShareTemplate);
          return data;
        };
      }
      return response;
    };
    return () => {
      window.fetch = originalFetch;
    };
  }, [selectedShareTemplate]);

  useEffect(() => {
    const originalSetItem = Storage.prototype.setItem;
    Storage.prototype.setItem = function patchedSetItem(key: string, value: string) {
      if (key === "badrdaawa-order-success") {
        try {
          const base = JSON.parse(value) as Record<string, unknown>;
          const extra = JSON.parse(window.sessionStorage.getItem(successExtraStorageKey) || "{}") as Record<string, unknown>;
          return originalSetItem.call(this, key, JSON.stringify({ ...base, ...extra, selectedShareTemplate }));
        } catch {}
      }
      return originalSetItem.call(this, key, value);
    };
    return () => {
      Storage.prototype.setItem = originalSetItem;
    };
  }, [selectedShareTemplate]);

  const selectedTemplateInfo = useMemo(() => SHARE_POSTER_TEMPLATES.find((template) => template.id === selectedShareTemplate) || SHARE_POSTER_TEMPLATES[0], [selectedShareTemplate]);

  if (!mounted || !snapshot) return null;

  const stepPanel = shareStepOpen ? (
    <section className="share-poster-step-panel" dir="rtl" aria-label="اختيار صورة المشاركة">
      <style>{`
        .share-poster-step-panel{width:min(1040px,calc(100% - 24px));margin:20px auto;padding:22px;border:1px solid rgba(126,88,35,.22);border-radius:28px;background:linear-gradient(180deg,#fffdf8,#fbf1e4);box-shadow:0 24px 70px rgba(46,33,21,.13)}
        .share-poster-head{display:grid;gap:8px;margin-bottom:18px;text-align:center}.share-poster-head h2{margin:0;color:#23170f;font-size:clamp(1.55rem,5vw,2.45rem);font-weight:950}.share-poster-head p{margin:0;color:#715f50;font-size:1rem;font-weight:800;line-height:1.8}.share-poster-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px}.share-poster-card{position:relative;display:grid;gap:12px;padding:12px;border:1.5px solid rgba(116,82,38,.18);border-radius:22px;background:#fffefb;box-shadow:0 14px 34px rgba(46,33,21,.09);cursor:pointer;text-align:right}.share-poster-card.active{border-color:rgba(185,137,61,.68);box-shadow:0 20px 48px rgba(126,88,31,.18),0 0 0 4px rgba(185,137,61,.1)}.share-poster-thumb{height:230px;overflow:hidden;border-radius:16px;background:#eee0cd}.share-poster-scale{width:1080px;height:1350px;transform-origin:top left;pointer-events:none}.share-poster-scale.thumb{transform:scale(.17)}.share-poster-scale.large{transform:scale(.32)}.share-poster-card strong{color:#22150e;font-weight:950}.share-poster-card small{color:#75685c;font-weight:800;line-height:1.6}.share-poster-check{position:absolute;top:12px;left:12px;display:grid;width:32px;height:32px;place-items:center;border-radius:999px;background:#111;color:#fff}.share-poster-preview-large{margin-top:18px;display:grid;justify-items:center;gap:14px;padding:18px;border-radius:24px;background:rgba(255,255,255,.58);border:1px solid rgba(116,82,38,.14)}.share-poster-large-frame{width:346px;height:432px;overflow:hidden;border-radius:20px;box-shadow:0 18px 44px rgba(46,33,21,.16);background:#f8efe3}.share-poster-actions{display:flex;flex-wrap:wrap;justify-content:center;gap:10px;margin-top:18px}.share-poster-actions button{min-height:48px;border-radius:999px;border:1px solid rgba(116,82,38,.18);padding:0 18px;font-weight:950}.share-poster-actions .primary{border:0;background:linear-gradient(135deg,#7f581f,#bd8f3f,#e4c174);color:#fffdf8;box-shadow:0 16px 34px rgba(126,88,31,.22)}@media(max-width:760px){.share-poster-step-panel{padding:14px;border-radius:22px}.share-poster-grid{grid-template-columns:1fr}.share-poster-thumb{height:180px}.share-poster-scale.thumb{transform:scale(.135)}.share-poster-large-frame{width:285px;height:356px}.share-poster-scale.large{transform:scale(.264)}}
      `}</style>
      <div className="share-poster-head">
        <h2>📸 اختر صورة المشاركة</h2>
        <p>اختر تصميماً جاهزاً لمشاركة دعوتك على واتساب وإنستجرام وفيسبوك. سيتم إنشاء الصورة تلقائياً باستخدام بيانات دعوتك.</p>
      </div>
      <div className="share-poster-grid">
        {SHARE_POSTER_TEMPLATES.map((template) => (
          <button
            type="button"
            key={template.id}
            className={`share-poster-card ${selectedShareTemplate === template.id ? "active" : ""}`}
            onClick={() => {
              setSelectedShareTemplate(template.id);
              saveSelectedTemplate(template.id);
            }}
          >
            {selectedShareTemplate === template.id ? <span className="share-poster-check"><Check size={17} /></span> : null}
            <div className="share-poster-thumb">{scaledPoster({ ...snapshot, headline: template.headline }, template.id, "thumb")}</div>
            <strong>{template.name}</strong>
            <small>{template.description}</small>
          </button>
        ))}
      </div>
      <div className="share-poster-preview-large">
        <strong>المعاينة المختارة: {selectedTemplateInfo.name}</strong>
        <div className="share-poster-large-frame">{scaledPoster({ ...snapshot, headline: selectedTemplateInfo.headline }, selectedShareTemplate, "large")}</div>
      </div>
      <div className="share-poster-actions">
        <button type="button" onClick={() => setShareStepOpen(false)}>رجوع للإضافات</button>
        <button className="primary" type="button" onClick={() => (window as unknown as { __continueSharePosterToReview?: () => void }).__continueSharePosterToReview?.()}>المتابعة للمراجعة النهائية</button>
      </div>
    </section>
  ) : null;

  const reviewPreview = reviewTarget ? (
    <div className="share-poster-review-preview" dir="rtl">
      <style>{`.share-poster-review-preview{margin:18px 0;padding:16px;border:1px solid rgba(126,88,35,.2);border-radius:22px;background:linear-gradient(180deg,#fffdf8,#fbf1e4);box-shadow:0 14px 34px rgba(46,33,21,.08)}.share-poster-review-preview h3{margin:0 0 10px;color:#22150e;font-size:1.15rem;font-weight:950}.share-poster-review-preview p{margin:0 0 12px;color:#75685c;font-weight:800}.share-poster-review-frame{width:220px;height:275px;overflow:hidden;border-radius:16px;background:#f8efe3;box-shadow:0 14px 32px rgba(46,33,21,.12)}.share-poster-scale.review{transform:scale(.204);transform-origin:top left}@media(max-width:720px){.share-poster-review-frame{width:190px;height:238px}.share-poster-scale.review{transform:scale(.176)}}`}</style>
      <h3>📸 صورة المشاركة المختارة</h3>
      <p>سيتم تجهيز هذه الصورة للنشر بعد تأكيد الطلب.</p>
      <div className="share-poster-review-frame">{scaledPoster({ ...snapshot, headline: selectedTemplateInfo.headline }, selectedShareTemplate, "review")}</div>
    </div>
  ) : null;

  return (
    <>
      {stepPanel}
      {reviewTarget ? createPortal(reviewPreview, reviewTarget) : null}
    </>
  );
}
