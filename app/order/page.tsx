import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, Crown } from "lucide-react";
import type { OrderInitialDraft } from "@/components/OrderForm";
import { OrderForm } from "@/components/OrderForm";
import { OrderRequestUxPatches } from "@/components/OrderRequestUxPatches";
import { getSiteSettings } from "@/lib/site-settings";
import { getPublicTemplatesWithSettings } from "@/lib/template-settings";

export const dynamic = "force-dynamic";

function sanitizeString(value: string): string {
  return value.replace(/<[^>]*>/g, "").trim().slice(0, 500);
}

export const metadata: Metadata = {
  title: "صمّم دعوتك الآن",
};

type PageProps = {
  searchParams?: Promise<{
    template?: string;
    groomName?: string;
    brideName?: string;
    phone?: string;
    weddingDate?: string;
    weddingTime?: string;
    mapUrl?: string;
    venue?: string;
    notes?: string;
    photographerEnabled?: string;
    photographerName?: string;
    photographerFacebookUrl?: string;
    photographerInstagramUrl?: string;
    openingText?: string;
    storyEnabled?: string;
    story?: string;
    musicEnabled?: string;
    musicChoice?: string;
    musicUrl?: string;
    gallery?: string;
  }>;
};

function parseStoryParam(value?: string) {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter((item) => item && typeof item === "object") : [];
  } catch {
    return [];
  }
}

export default async function OrderPage({ searchParams }: PageProps) {
  const params = searchParams ? await searchParams : {};
  const [templates, siteSettings] = await Promise.all([getPublicTemplatesWithSettings(), getSiteSettings()]);
  const selected = (params.template ? templates.find((template) => template.slug === params.template) : undefined) || templates[0];
  if (!selected) redirect("/templates");
  const templateOptions = templates.map(({ slug, name, arabicName, previewImage }) => ({ slug, name, arabicName, previewImage }));
  const initialDraft: OrderInitialDraft = {
    groomName: sanitizeString(params.groomName || ""),
    brideName: sanitizeString(params.brideName || ""),
    phone: sanitizeString(params.phone || ""),
    weddingDate: sanitizeString(params.weddingDate || ""),
    weddingTime: params.weddingTime || "07:00 مساءً",
    mapUrl: sanitizeString(params.mapUrl || ""),
    venue: sanitizeString(params.venue || ""),
    notes: sanitizeString(params.notes || ""),
    photographerEnabled: params.photographerEnabled === "1",
    photographerName: sanitizeString(params.photographerName || ""),
    photographerFacebookUrl: sanitizeString(params.photographerFacebookUrl || ""),
    photographerInstagramUrl: sanitizeString(params.photographerInstagramUrl || ""),
    openingText: sanitizeString(params.openingText || ""),
    storyEnabled: params.storyEnabled === "1",
    story: parseStoryParam(params.story),
    musicEnabled: params.musicEnabled ? params.musicEnabled === "1" : true,
    musicChoice: params.musicChoice === "upload" || params.musicChoice === "video" || params.musicChoice === "url" ? params.musicChoice : "default",
    musicUrl: sanitizeString(params.musicUrl || ""),
    imageUrls: (params.gallery || "").split(",").map((item) => item.trim()).filter(Boolean).slice(0, 3),
  };

  return (
    <div className="page-shell order-builder-page order-studio-page">
      <style>{`
        .order-studio-page {
          --studio-line: rgba(116, 82, 38, 0.18);
          background:
            radial-gradient(circle at 12% 8%, rgba(185, 137, 61, 0.14), transparent 25rem),
            radial-gradient(circle at 88% 4%, rgba(168, 67, 90, 0.08), transparent 24rem),
            linear-gradient(180deg, #fff8ef 0%, #fbf4e9 42%, #fffdf8 100%);
        }

        .order-studio-page .order-builder-header {
          border-bottom: 1px solid rgba(116, 82, 38, 0.12);
          background: rgba(255, 253, 248, 0.82);
          backdrop-filter: blur(18px);
          box-shadow: 0 10px 30px rgba(46, 33, 21, 0.07);
        }

        .order-studio-page .order-builder-main {
          padding-block: 18px 80px;
        }

        .order-studio-page .order-shell {
          width: min(1120px, calc(100% - 28px));
        }

        .order-studio-page .order-wizard-card {
          border-radius: 28px;
          border-color: rgba(116, 82, 38, 0.18);
          box-shadow: 0 24px 70px rgba(46, 33, 21, 0.12);
        }

        .order-studio-page .order-wizard-header h2 {
          font-size: clamp(1.6rem, 4vw, 2.4rem);
          letter-spacing: -0.025em;
        }

        .order-studio-page .order-step-tabs {
          padding: 10px;
          border: 1px solid rgba(116, 82, 38, 0.1);
          border-radius: 20px;
          background: rgba(255, 248, 239, 0.68);
        }

        .order-studio-page .order-step-tabs button {
          min-height: 64px;
          border-radius: 16px;
          transition: transform 0.18s ease, box-shadow 0.18s ease, border-color 0.18s ease;
        }

        .order-studio-page .order-step-tabs button:hover {
          transform: translateY(-1px);
        }

        .order-studio-page .order-step-tabs button.active {
          transform: translateY(-2px);
          box-shadow: 0 16px 34px rgba(150, 104, 42, 0.16);
        }

        .order-studio-page .order-wizard-flow .field input,
        .order-studio-page .order-wizard-flow .field textarea,
        .order-studio-page .order-wizard-flow .field select {
          border-width: 1.5px;
          border-color: rgba(116, 82, 38, 0.2);
          background: #fffefb;
          box-shadow: 0 8px 22px rgba(46, 33, 21, 0.045), inset 0 1px 0 rgba(255,255,255,0.82);
        }

        .order-studio-page .order-template-card,
        .order-studio-page .compact-image-card,
        .order-studio-page .order-music-upload,
        .order-studio-page .order-extra-card,
        .order-studio-page .order-review-item,
        .order-studio-page .order-review-final-note,
        .order-studio-page .order-review-confidence span {
          border-color: rgba(116, 82, 38, 0.16);
          box-shadow: 0 12px 28px rgba(46, 33, 21, 0.075);
        }

        .order-studio-page .compact-image-card {
          border-radius: 24px;
          background:
            linear-gradient(180deg, rgba(255,253,248,0.98), rgba(255,248,239,0.9));
        }

        .order-studio-page .order-music-choice-grid button,
        .order-studio-page .order-extra-card {
          min-height: 74px;
          border-radius: 20px;
        }

        .order-studio-page .order-music-choice-grid button.active,
        .order-studio-page .order-extra-card.is-added,
        .order-studio-page .order-template-card.active {
          border-color: rgba(185, 137, 61, 0.48);
          background: linear-gradient(180deg, rgba(255,253,248,0.99), rgba(246,234,213,0.85));
          box-shadow: 0 16px 36px rgba(150, 104, 42, 0.15);
        }

        .order-studio-page .order-review-final-note {
          display: flex;
          align-items: center;
          gap: 10px;
          min-height: 64px;
          font-size: clamp(1.05rem, 2.4vw, 1.18rem);
        }

        .order-studio-page .order-review-final-note::before {
          content: "✦";
          display: inline-grid;
          place-items: center;
          width: 34px;
          height: 34px;
          border-radius: 999px;
          background: linear-gradient(135deg, #8e6428, #d7b76b);
          color: #fffdf8;
          box-shadow: 0 10px 24px rgba(142, 100, 40, 0.2);
        }

        .order-studio-page .btn-gold,
        .order-studio-page .order-submit {
          position: relative;
          overflow: hidden;
        }

        .order-studio-page .btn-gold::after,
        .order-studio-page .order-submit::after {
          content: "";
          position: absolute;
          inset: -80% auto -80% -38%;
          width: 34%;
          transform: rotate(18deg);
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.5), transparent);
          pointer-events: none;
        }

        .order-review-photos-warning {
          border-color: rgba(185, 82, 47, 0.48) !important;
          background: linear-gradient(180deg, rgba(255, 252, 248, 0.98), rgba(255, 235, 224, 0.76)) !important;
          box-shadow: 0 12px 28px rgba(185, 82, 47, 0.14) !important;
        }

        .order-review-photos-warning span,
        .order-review-photos-warning strong {
          color: #7d341d !important;
        }

        .order-review-photos-warning::after {
          content: "الصور مازالت قيد الرفع — انتظر اكتمالها قبل تأكيد الدعوة";
          display: block;
          margin-top: 6px;
          color: #8b3b23;
          font-size: 0.86rem;
          font-weight: 800;
          line-height: 1.6;
        }

        .order-studio-page .order-wizard-layout {
          display: flex;
          gap: 24px;
          align-items: flex-start;
        }

        .order-studio-page .order-wizard-layout .form-panel {
          flex: 1;
          min-width: 0;
        }

        .order-studio-page .order-summary-sidebar {
          width: 280px;
          flex-shrink: 0;
          position: sticky;
          top: 24px;
        }

        .order-studio-page .order-summary-card {
          border: 1px solid var(--studio-line);
          border-radius: 20px;
          padding: 18px;
          background: linear-gradient(180deg, rgba(255,253,248,0.98), rgba(255,248,239,0.9));
          box-shadow: 0 12px 28px rgba(46, 33, 21, 0.075);
        }

        .order-studio-page .order-summary-card h3 {
          font-size: 1rem;
          margin-bottom: 14px;
          color: #4a3520;
        }

        .order-studio-page .order-summary-card hr {
          border: none;
          border-top: 1px solid var(--studio-line);
          margin: 12px 0;
        }

        .order-studio-page .order-summary-template {
          display: flex;
          gap: 10px;
          align-items: center;
          padding-bottom: 12px;
          margin-bottom: 12px;
          border-bottom: 1px solid var(--studio-line);
        }

        .order-studio-page .order-summary-template img {
          width: 48px;
          height: 48px;
          border-radius: 10px;
          object-fit: cover;
          border: 1px solid var(--studio-line);
        }

        .order-studio-page .order-summary-template div strong {
          display: block;
          font-size: 0.9rem;
          color: #3a2a18;
        }

        .order-studio-page .order-summary-template div small {
          font-size: 0.78rem;
          color: #7a6a58;
        }

        .order-studio-page .order-summary-options {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .order-studio-page .order-summary-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 0.85rem;
        }

        .order-studio-page .order-summary-row span {
          color: #7a6a58;
        }

        .order-studio-page .order-summary-row strong {
          color: #3a2a18;
          font-weight: 600;
        }

        .order-studio-page .order-summary-row.total strong {
          font-size: 1.1rem;
          color: #8e6428;
        }

        .order-studio-page .order-summary-pricing .order-summary-row strong {
          font-weight: 700;
        }

        .order-studio-page .order-review-payment {
          margin-top: 20px;
          padding-top: 16px;
          border-top: 1px solid var(--studio-line);
        }

        .order-studio-page .order-review-payment h3 {
          font-size: 1rem;
          margin-bottom: 12px;
          color: #4a3520;
        }

        .order-studio-page .order-review-payment h3 span {
          display: inline-flex;
          align-items: center;
          gap: 6px;
        }

        .order-studio-page .order-payment-options {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .order-studio-page .order-payment-option {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 12px 14px;
          border: 1.5px solid var(--studio-line);
          border-radius: 16px;
          cursor: pointer;
          transition: border-color 0.18s, background 0.18s;
          background: #fffefb;
        }

        .order-studio-page .order-payment-option:hover {
          border-color: rgba(185, 137, 61, 0.4);
        }

        .order-studio-page .order-payment-option.active {
          border-color: rgba(185, 137, 61, 0.48);
          background: linear-gradient(180deg, rgba(255,253,248,0.99), rgba(246,234,213,0.85));
        }

        .order-studio-page .order-payment-option input[type="radio"] {
          accent-color: #8e6428;
          width: 18px;
          height: 18px;
        }

        .order-studio-page .order-payment-option span {
          font-weight: 600;
          color: #3a2a18;
          font-size: 0.9rem;
        }

        .order-studio-page .order-payment-option small {
          display: block;
          font-size: 0.78rem;
          color: #7a6a58;
          font-weight: 400;
        }

        @media (max-width: 860px) {
          .order-studio-page .order-wizard-layout {
            flex-direction: column;
          }

          .order-studio-page .order-summary-sidebar {
            width: 100%;
            position: static;
          }
        }

        @media (max-width: 720px) {
          .order-studio-page .order-builder-main {
            padding-block: 8px 56px;
          }

          .order-studio-page .order-shell {
            width: min(100% - 18px, 1120px);
          }

          .order-studio-page .order-wizard-card {
            border-radius: 22px;
          }

          .order-studio-page .order-step-tabs {
            padding: 8px;
            border-radius: 18px;
          }
        }

        /* ===== Premium order request redesign: steps 2-8 ===== */
        .order-builder-page {
          --order-luxury-gold: #b8893d;
          --order-luxury-gold-deep: #81551f;
          --order-luxury-rose: #a8435a;
          --order-luxury-ink: #302113;
          --order-luxury-muted: #806f5e;
          --order-luxury-ivory: #fffdf8;
          --order-luxury-card: rgba(255, 253, 248, 0.86);
          --order-luxury-border: rgba(184, 137, 61, 0.24);
          --order-luxury-shadow: 0 24px 70px rgba(58, 39, 20, 0.14);
          --order-luxury-shadow-sm: 0 14px 34px rgba(58, 39, 20, 0.1);
        }

        .order-builder-page.order-studio-page {
          background:
            radial-gradient(circle at 10% 8%, rgba(184, 137, 61, 0.2), transparent 30rem),
            radial-gradient(circle at 88% 5%, rgba(168, 67, 90, 0.13), transparent 26rem),
            radial-gradient(circle at 50% 95%, rgba(255, 228, 177, 0.34), transparent 34rem),
            linear-gradient(180deg, #fffaf2 0%, #fbf1e3 48%, #fffdf8 100%);
        }

        .order-builder-page .order-wizard-card {
          position: relative;
          overflow: hidden;
          border: 1px solid var(--order-luxury-border) !important;
          background:
            linear-gradient(145deg, rgba(255, 253, 248, 0.96), rgba(255, 246, 232, 0.88)),
            radial-gradient(circle at 0 0, rgba(184, 137, 61, 0.12), transparent 22rem);
          box-shadow: var(--order-luxury-shadow) !important;
        }

        .order-builder-page .order-wizard-card::before {
          content: "";
          position: absolute;
          inset: 0;
          pointer-events: none;
          background:
            linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.34), transparent) -70% 0 / 42% 100% no-repeat,
            radial-gradient(circle at 16% 0%, rgba(184, 137, 61, 0.1), transparent 18rem);
        }

        .order-builder-page .order-wizard-header {
          position: relative;
          padding: 22px;
          border: 1px solid rgba(184, 137, 61, 0.18);
          border-radius: 24px;
          background: linear-gradient(135deg, rgba(255, 253, 248, 0.92), rgba(255, 241, 218, 0.72));
          box-shadow: var(--order-luxury-shadow-sm);
        }

        .order-builder-page .order-wizard-header span,
        .order-stage-intro span,
        .order-review-hero > span,
        .order-summary-eyebrow {
          display: inline-flex;
          align-items: center;
          width: fit-content;
          gap: 6px;
          padding: 6px 12px;
          border: 1px solid rgba(184, 137, 61, 0.22);
          border-radius: 999px;
          background: rgba(255, 248, 236, 0.88);
          color: var(--order-luxury-gold-deep);
          font-size: 0.76rem;
          font-weight: 950;
        }

        .order-builder-page .order-wizard-header h2 {
          margin-top: 10px;
          color: var(--order-luxury-ink);
        }

        .order-builder-page .order-step-tabs {
          position: relative;
          grid-template-columns: repeat(8, minmax(76px, 1fr));
          padding: 12px;
          border: 1px solid rgba(184, 137, 61, 0.18) !important;
          border-radius: 26px !important;
          background: rgba(255, 252, 246, 0.78) !important;
          backdrop-filter: blur(16px);
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.82), 0 16px 38px rgba(57, 37, 17, 0.08);
        }

        .order-builder-page .order-step-tabs button {
          position: relative;
          min-height: 74px !important;
          border-radius: 20px !important;
          transition: transform 180ms ease, box-shadow 180ms ease, border-color 180ms ease, background 180ms ease;
        }

        .order-builder-page .order-step-tabs button:hover:not(:disabled) {
          transform: translateY(-3px);
          box-shadow: 0 14px 32px rgba(73, 48, 20, 0.11);
        }

        .order-builder-page .order-step-tabs button.active {
          background: linear-gradient(145deg, #fffdf8, #f5e0b9) !important;
          border-color: rgba(184, 137, 61, 0.58) !important;
          box-shadow: 0 18px 38px rgba(143, 92, 31, 0.18) !important;
        }

        .order-builder-page .order-step-tabs button > span {
          width: 32px;
          height: 32px;
          background: rgba(184, 137, 61, 0.1);
        }

        .order-builder-page .order-step-tabs button.active > span,
        .order-builder-page .order-step-tabs button.done > span {
          background: linear-gradient(135deg, var(--order-luxury-gold-deep), #d9b56d);
          color: #fffdf8;
          box-shadow: 0 10px 22px rgba(142, 100, 40, 0.25);
        }

        .order-builder-page .order-wizard-step {
          animation: orderLuxuryStepIn 320ms ease both;
        }

        @keyframes orderLuxuryStepIn {
          from { opacity: 0; transform: translateY(12px) scale(0.992); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }

        .order-stage-intro {
          display: grid;
          gap: 8px;
          margin-bottom: 16px;
          padding: 18px;
          border: 1px solid rgba(184, 137, 61, 0.18);
          border-radius: 22px;
          background: linear-gradient(135deg, rgba(255, 253, 248, 0.92), rgba(255, 243, 224, 0.72));
          box-shadow: var(--order-luxury-shadow-sm);
        }

        .order-stage-intro h3,
        .order-review-hero h3 {
          margin: 0;
          color: var(--order-luxury-ink);
          font-size: clamp(1.24rem, 3vw, 1.72rem);
          font-weight: 950;
          letter-spacing: -0.02em;
        }

        .order-stage-intro p,
        .order-review-hero p {
          margin: 0;
          color: var(--order-luxury-muted);
          font-weight: 750;
          line-height: 1.8;
        }

        .order-live-name-card,
        .order-date-hero,
        .order-upload-showcase,
        .order-review-hero {
          position: relative;
          overflow: hidden;
          margin-bottom: 16px;
          padding: 20px;
          border: 1px solid rgba(184, 137, 61, 0.24);
          border-radius: 26px;
          background:
            radial-gradient(circle at 12% 0%, rgba(184, 137, 61, 0.18), transparent 16rem),
            linear-gradient(135deg, rgba(52, 34, 17, 0.96), rgba(126, 82, 31, 0.9));
          color: #fff8e9;
          box-shadow: 0 22px 52px rgba(75, 49, 20, 0.2);
        }

        .order-live-name-card::after,
        .order-review-hero::after {
          content: "✦";
          position: absolute;
          inset-inline-end: 18px;
          top: 14px;
          color: rgba(255, 228, 176, 0.72);
          font-size: 2rem;
        }

        .order-live-name-card span,
        .order-date-hero span {
          display: block;
          color: rgba(255, 246, 226, 0.72);
          font-size: 0.86rem;
          font-weight: 850;
        }

        .order-live-name-card strong,
        .order-date-hero strong,
        .order-review-hero h3 {
          display: block;
          color: #fffdf8;
          font-size: clamp(1.45rem, 4vw, 2.4rem);
          font-weight: 950;
          line-height: 1.35;
        }

        .order-live-name-card em,
        .order-summary-row em,
        .order-review-hero em {
          color: #e5c47a;
          font-style: normal;
        }

        .order-date-hero {
          display: flex;
          align-items: center;
          gap: 14px;
        }

        .order-date-hero > svg {
          width: 48px;
          height: 48px;
          padding: 12px;
          border-radius: 18px;
          background: rgba(255, 255, 255, 0.12);
        }

        .order-date-hero div { flex: 1; }
        .order-date-hero em {
          padding: 9px 13px;
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.12);
          color: #fff7df;
          font-style: normal;
          font-weight: 950;
        }

        .order-builder-page .order-wizard-flow .field {
          position: relative;
        }

        .order-builder-page .order-wizard-flow .field input,
        .order-builder-page .order-wizard-flow .field textarea,
        .order-builder-page .order-wizard-flow .field select {
          min-height: 62px !important;
          border: 1.5px solid rgba(184, 137, 61, 0.24) !important;
          border-radius: 20px !important;
          background: linear-gradient(180deg, rgba(255,255,253,0.98), rgba(255,248,236,0.9)) !important;
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.9), 0 12px 24px rgba(55, 35, 16, 0.055) !important;
          transition: transform 180ms ease, border-color 180ms ease, box-shadow 180ms ease, background 180ms ease;
        }

        .order-builder-page .order-wizard-flow .field input:hover,
        .order-builder-page .order-wizard-flow .field textarea:hover,
        .order-builder-page .order-wizard-flow .field select:hover {
          transform: translateY(-1px);
          border-color: rgba(184, 137, 61, 0.42) !important;
        }

        .order-builder-page .order-wizard-flow .field input:focus,
        .order-builder-page .order-wizard-flow .field textarea:focus,
        .order-builder-page .order-wizard-flow .field select:focus {
          transform: translateY(-2px);
          border-color: rgba(184, 137, 61, 0.72) !important;
          box-shadow: 0 0 0 5px rgba(184, 137, 61, 0.15), 0 18px 35px rgba(77, 48, 19, 0.12) !important;
        }

        .order-featured-fields .field {
          padding: 12px;
          border: 1px solid rgba(184, 137, 61, 0.13);
          border-radius: 24px;
          background: rgba(255, 253, 248, 0.68);
        }

        .order-builder-page .location-picker-trigger {
          display: grid;
          grid-template-columns: auto 1fr;
          align-items: center;
          column-gap: 12px;
          min-height: 74px !important;
          width: 100%;
          padding: 16px 18px;
          text-align: start;
          border-radius: 24px !important;
          background: linear-gradient(135deg, rgba(255,253,248,0.98), rgba(244,225,190,0.85)) !important;
          box-shadow: 0 18px 38px rgba(71, 46, 19, 0.12) !important;
        }

        .order-builder-page .location-picker-trigger svg {
          grid-row: span 2;
          width: 42px;
          height: 42px;
          padding: 10px;
          border-radius: 16px;
          background: linear-gradient(135deg, var(--order-luxury-gold-deep), #d8b568);
          color: #fffdf8;
        }

        .order-builder-page .location-picker-trigger strong,
        .order-builder-page .location-picker-trigger small {
          display: block;
        }

        .order-builder-page .location-picker-trigger small {
          color: var(--order-luxury-muted);
          font-size: 0.82rem;
          font-weight: 750;
        }

        .order-upload-showcase {
          background: linear-gradient(135deg, rgba(255,253,248,0.96), rgba(255,239,211,0.76));
          color: var(--order-luxury-ink);
          box-shadow: var(--order-luxury-shadow-sm);
        }

        .order-upload-showcase strong,
        .order-upload-showcase span {
          display: block;
        }

        .order-upload-showcase strong {
          font-size: 1.12rem;
          font-weight: 950;
        }

        .order-upload-showcase span {
          color: var(--order-luxury-muted);
          font-weight: 780;
        }

        .order-builder-page .compact-image-grid {
          grid-template-columns: 1.18fr 1fr 1fr;
          align-items: stretch;
        }

        .order-builder-page .compact-image-card:first-child,
        .order-builder-page .compact-image-card:first-child .compact-image-slot {
          min-height: 100%;
        }

        .order-builder-page .compact-image-card:first-child .compact-image-preview {
          min-height: 214px;
        }

        .order-builder-page .compact-image-slot,
        .order-builder-page .order-music-choice-grid button,
        .order-builder-page .order-extra-card,
        .order-builder-page .order-review-item,
        .order-builder-page .order-payment-option {
          border-radius: 24px !important;
          transition: transform 180ms ease, box-shadow 180ms ease, border-color 180ms ease, background 180ms ease;
        }

        .order-builder-page .compact-image-slot:hover,
        .order-builder-page .order-music-choice-grid button:hover,
        .order-builder-page .order-extra-card:hover,
        .order-builder-page .order-review-item:hover,
        .order-builder-page .order-payment-option:hover {
          transform: translateY(-3px);
          box-shadow: 0 18px 42px rgba(60, 39, 18, 0.14) !important;
        }

        .compact-image-meta strong em {
          margin-inline-start: 6px;
          padding: 3px 8px;
          border-radius: 999px;
          background: rgba(184, 137, 61, 0.12);
          color: var(--order-luxury-gold-deep);
          font-size: 0.68rem;
          font-style: normal;
          font-weight: 950;
        }

        .order-builder-page .compact-image-slot.is-uploading .compact-image-preview,
        .order-builder-page .compact-image-slot.is-compressing .compact-image-preview {
          background-image: linear-gradient(110deg, rgba(255,248,236,0.8), rgba(255,255,255,0.96), rgba(255,248,236,0.8));
          background-size: 220% 100%;
          animation: orderLuxuryShimmer 1.3s linear infinite;
        }

        @keyframes orderLuxuryShimmer {
          from { background-position: 200% 0; }
          to { background-position: -200% 0; }
        }

        .order-builder-page .order-music-default-card {
          border-radius: 28px;
          border-color: rgba(184, 137, 61, 0.26);
          background: radial-gradient(circle at 10% 0%, rgba(184,137,61,0.18), transparent 16rem), linear-gradient(135deg, rgba(255,253,248,0.96), rgba(255,241,218,0.78));
          box-shadow: var(--order-luxury-shadow-sm);
        }

        .order-builder-page .order-music-default-card div em,
        .order-extra-card em {
          display: inline-flex;
          width: fit-content;
          margin-bottom: 5px;
          padding: 4px 10px;
          border-radius: 999px;
          background: rgba(168, 67, 90, 0.1);
          color: var(--order-luxury-rose);
          font-size: 0.72rem;
          font-style: normal;
          font-weight: 950;
        }

        .order-builder-page .order-music-choice-grid button.active,
        .order-builder-page .order-extra-card.is-added,
        .order-builder-page .order-payment-option.active {
          border-color: rgba(184, 137, 61, 0.62) !important;
          background: linear-gradient(145deg, #fffdf8, #f4dfb7) !important;
          box-shadow: 0 18px 42px rgba(142, 91, 27, 0.18) !important;
        }

        .order-builder-page .order-music-upload {
          border-radius: 22px !important;
          border-style: dashed !important;
          border-color: rgba(184, 137, 61, 0.38) !important;
          background: rgba(255, 253, 248, 0.78) !important;
        }

        .order-builder-page .order-extras-grid {
          gap: 16px;
        }

        .order-builder-page .order-extra-card {
          min-height: 128px !important;
          align-items: flex-start;
          padding: 20px !important;
          background: linear-gradient(135deg, rgba(255,253,248,0.98), rgba(255,243,224,0.72));
        }

        .order-builder-page .order-extra-card svg {
          width: 44px;
          height: 44px;
          padding: 10px;
          border-radius: 17px;
          background: rgba(184, 137, 61, 0.12);
          color: var(--order-luxury-gold-deep);
        }

        .order-builder-page .order-story-list {
          position: relative;
        }

        .order-builder-page .order-story-item {
          position: relative;
          border-radius: 24px;
          border-color: rgba(184, 137, 61, 0.18);
          background: linear-gradient(135deg, rgba(255,253,248,0.96), rgba(255,246,233,0.82));
          box-shadow: var(--order-luxury-shadow-sm);
        }

        .order-builder-page .order-story-item::before {
          content: "";
          position: absolute;
          inset-inline-start: -9px;
          top: 24px;
          width: 18px;
          height: 18px;
          border-radius: 999px;
          background: linear-gradient(135deg, var(--order-luxury-gold-deep), #d8b568);
          box-shadow: 0 0 0 6px rgba(184, 137, 61, 0.12);
        }

        .order-review-hero {
          margin-bottom: 12px;
        }

        .order-builder-page .order-review-grid {
          gap: 13px;
        }

        .order-builder-page .order-review-item {
          min-height: 94px !important;
          padding: 17px !important;
          background: linear-gradient(135deg, rgba(255,253,248,0.98), rgba(255,245,229,0.84)) !important;
        }

        .order-builder-page .order-review-item span {
          color: var(--order-luxury-gold-deep) !important;
        }

        .order-builder-page .order-review-actions .order-submit {
          min-height: 64px;
          padding-inline: 34px;
          font-size: 1.08rem;
          box-shadow: 0 18px 42px rgba(142, 91, 27, 0.28) !important;
        }

        .order-builder-page .order-preview-action {
          border-color: rgba(184, 137, 61, 0.26) !important;
          background: rgba(255, 253, 248, 0.78) !important;
          color: var(--order-luxury-ink) !important;
        }

        .order-builder-page .order-summary-card {
          position: relative;
          overflow: hidden;
          border-radius: 28px !important;
          background:
            radial-gradient(circle at 20% 0%, rgba(184, 137, 61, 0.16), transparent 15rem),
            linear-gradient(145deg, rgba(255,253,248,0.96), rgba(255,244,226,0.82)) !important;
          box-shadow: var(--order-luxury-shadow-sm) !important;
        }

        .order-builder-page .order-summary-template img {
          width: 62px !important;
          height: 62px !important;
          border-radius: 18px !important;
        }

        .order-builder-page .order-summary-row {
          padding: 10px 0;
          border-bottom: 1px solid rgba(184, 137, 61, 0.1);
        }

        @media (max-width: 980px) {
          .order-builder-page .order-step-tabs {
            grid-template-columns: repeat(4, minmax(0, 1fr));
          }

          .order-builder-page .compact-image-grid {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 720px) {
          .order-builder-page .order-wizard-header,
          .order-stage-intro,
          .order-live-name-card,
          .order-date-hero,
          .order-review-hero {
            border-radius: 20px;
            padding: 16px;
          }

          .order-builder-page .order-step-tabs {
            grid-template-columns: repeat(4, minmax(0, 1fr));
            gap: 7px;
          }

          .order-builder-page .order-step-tabs button {
            min-height: 64px !important;
          }

          .order-builder-page .order-step-tabs button > strong {
            font-size: 0.72rem;
          }

          .order-date-hero {
            align-items: flex-start;
            flex-direction: column;
          }

          .order-builder-page .order-wizard-actions {
            position: sticky;
            bottom: 10px;
            z-index: 20;
            padding: 10px;
            border: 1px solid rgba(184, 137, 61, 0.18);
            border-radius: 22px;
            background: rgba(255, 253, 248, 0.88);
            backdrop-filter: blur(16px);
            box-shadow: 0 18px 44px rgba(47, 31, 13, 0.18);
          }
        }

        .order-builder-page .order-review-hero p {
          color: rgba(255, 246, 226, 0.78);
          font-weight: 850;
        }
      `}</style>
      <header className="order-builder-header">
        <div className="container order-builder-nav">
          <Link href="/" className="brand" aria-label={siteSettings.siteName}>
            <span className="brand-mark">
              {siteSettings.logoUrl ? <img className="brand-logo-image" src={siteSettings.logoUrl} alt="" /> : <Crown size={21} />}
            </span>
            <span>{siteSettings.siteName}</span>
          </Link>
          <Link className="btn btn-soft order-builder-back-link" href="/templates">
            <ArrowLeft size={17} />
            رجوع للقوالب
          </Link>
        </div>
      </header>
      <main className="order-builder-main">
        <div className="container order-shell">
          <OrderForm initialTemplate={selected.slug} initialDraft={initialDraft} templates={templateOptions} skipTemplateStep={Boolean(params.template)} showPaymentMethods={siteSettings.order.showPaymentMethods} />
        </div>
      </main>
      <OrderRequestUxPatches />
    </div>
  );
}
