import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, Crown } from "lucide-react";
import type { OrderInitialDraft } from "@/components/OrderForm";
import { OrderForm } from "@/components/OrderForm";
import { getSiteSettings } from "@/lib/site-settings";
import { getPublicTemplatesWithSettings } from "@/lib/template-settings";

export const dynamic = "force-dynamic";

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
    groomName: params.groomName || "",
    brideName: params.brideName || "",
    phone: params.phone || "",
    weddingDate: params.weddingDate || "",
    mapUrl: params.mapUrl || "",
    venue: params.venue || "",
    notes: params.notes || "",
    photographerEnabled: params.photographerEnabled === "1",
    photographerName: params.photographerName || "",
    photographerFacebookUrl: params.photographerFacebookUrl || "",
    photographerInstagramUrl: params.photographerInstagramUrl || "",
    openingText: params.openingText || "",
    storyEnabled: params.storyEnabled === "1",
    story: parseStoryParam(params.story),
    musicEnabled: params.musicEnabled ? params.musicEnabled === "1" : true,
    musicChoice: params.musicChoice === "upload" || params.musicChoice === "video" || params.musicChoice === "url" ? params.musicChoice : "default",
    musicUrl: params.musicUrl || "",
    imageUrls: (params.gallery || "").split(",").map((item) => item.trim()).filter(Boolean).slice(0, 3),
  };

  return (
    <div className="page-shell order-builder-page order-creative-theme">
      <style>{`
        .order-creative-theme {
          --oc-bg: #20130d;
          --oc-bg-2: #2c1b12;
          --oc-card: #fff9ed;
          --oc-card-2: #f3e4cf;
          --oc-ink: #21140d;
          --oc-muted: #6d5a49;
          --oc-gold: #d5a247;
          --oc-gold-2: #f2d27d;
          --oc-gold-dark: #805315;
          --oc-copper: #9d562d;
          --oc-line: rgba(89, 54, 24, 0.28);
          --oc-shadow: 0 28px 90px rgba(0, 0, 0, 0.35);
          min-height: 100vh;
          background:
            radial-gradient(circle at 8% 10%, rgba(213, 162, 71, 0.2), transparent 22rem),
            radial-gradient(circle at 92% 4%, rgba(242, 210, 125, 0.22), transparent 28rem),
            radial-gradient(circle at 48% 110%, rgba(157, 86, 45, 0.2), transparent 30rem),
            linear-gradient(145deg, var(--oc-bg), var(--oc-bg-2) 58%, #120a07);
          color: var(--oc-card);
        }

        .order-creative-theme .order-builder-header {
          border-bottom: 1px solid rgba(242, 210, 125, 0.14);
          background: rgba(25, 14, 9, 0.78);
          backdrop-filter: blur(18px);
          box-shadow: 0 16px 42px rgba(0, 0, 0, 0.22);
        }

        .order-creative-theme .brand {
          color: var(--oc-card);
        }

        .order-creative-theme .brand-mark {
          background: linear-gradient(135deg, #8d5a19, var(--oc-gold), var(--oc-gold-2));
          color: #1d110b;
          box-shadow: 0 0 0 1px rgba(242, 210, 125, 0.32), 0 12px 32px rgba(213, 162, 71, 0.35);
        }

        .order-creative-theme .order-builder-back-link {
          border: 1px solid rgba(242, 210, 125, 0.3);
          background: rgba(255, 249, 237, 0.1);
          color: var(--oc-card);
          box-shadow: 0 12px 28px rgba(0, 0, 0, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.08);
        }

        .order-creative-theme .order-builder-main {
          padding-block: clamp(22px, 5vw, 48px) 74px;
        }

        .order-creative-theme .order-wizard-card {
          position: relative;
          overflow: hidden;
          border: 1px solid rgba(242, 210, 125, 0.32);
          border-radius: 30px;
          background: linear-gradient(180deg, rgba(255, 249, 237, 0.98), rgba(243, 228, 207, 0.98));
          color: var(--oc-ink);
          box-shadow: var(--oc-shadow), inset 0 1px 0 rgba(255, 255, 255, 0.78);
        }

        .order-creative-theme .order-wizard-card::before {
          content: "";
          position: absolute;
          inset: 12px;
          border: 1px solid rgba(128, 83, 21, 0.18);
          border-radius: 23px;
          pointer-events: none;
          z-index: 0;
        }

        .order-creative-theme .order-wizard-card::after {
          content: "";
          position: absolute;
          top: -42%;
          right: -22%;
          width: 52%;
          height: 120%;
          transform: rotate(22deg);
          background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.42), transparent);
          opacity: 0.32;
          pointer-events: none;
          z-index: 0;
        }

        .order-creative-theme .order-wizard-card > * {
          position: relative;
          z-index: 1;
        }

        .order-creative-theme .order-wizard-header {
          border-bottom: 1px solid rgba(89, 54, 24, 0.16);
          padding-bottom: 18px;
        }

        .order-creative-theme .order-wizard-header span,
        .order-creative-theme .order-wizard-trust-note,
        .order-creative-theme .field-preview,
        .order-creative-theme .order-step-copy p {
          color: var(--oc-muted);
        }

        .order-creative-theme .order-wizard-header h2,
        .order-creative-theme .order-compact-section-head h2,
        .order-creative-theme .field label,
        .order-creative-theme .order-review-item strong {
          color: var(--oc-ink);
        }

        .order-creative-theme .order-wizard-header > strong {
          border: 1px solid rgba(128, 83, 21, 0.34);
          background: linear-gradient(135deg, #1f130c, #5c3718 54%, #d5a247);
          color: #fff7df;
          box-shadow: 0 12px 32px rgba(128, 83, 21, 0.34);
        }

        .order-creative-theme .order-progress-track {
          background: rgba(89, 54, 24, 0.16);
          box-shadow: inset 0 1px 3px rgba(0, 0, 0, 0.12);
        }

        .order-creative-theme .order-progress-track span {
          background: linear-gradient(90deg, #6a3d10, var(--oc-gold), var(--oc-gold-2));
          box-shadow: 0 0 18px rgba(213, 162, 71, 0.42);
        }

        .order-creative-theme .order-step-tabs button {
          border: 1px solid rgba(89, 54, 24, 0.18);
          background: #ead9c0;
          color: #4f3a2a;
          box-shadow: none;
        }

        .order-creative-theme .order-step-tabs button > span {
          background: #fff5e0;
          color: var(--oc-ink);
          box-shadow: inset 0 0 0 1px rgba(89, 54, 24, 0.16);
        }

        .order-creative-theme .order-step-tabs button.active {
          border-color: rgba(128, 83, 21, 0.5);
          background: linear-gradient(135deg, #2a170c, #5f3b16 56%, #d5a247);
          color: #fff8e8;
          box-shadow: 0 16px 34px rgba(128, 83, 21, 0.28);
        }

        .order-creative-theme .order-step-tabs button.active > span {
          background: #fff2cf;
          color: #4b2a0d;
        }

        .order-creative-theme .order-step-tabs button.done {
          border-color: rgba(128, 83, 21, 0.28);
          background: #dfc79e;
          color: #3f2a1b;
        }

        .order-creative-theme .field input,
        .order-creative-theme .field textarea,
        .order-creative-theme .field select {
          border: 1.5px solid rgba(89, 54, 24, 0.32);
          border-radius: 16px;
          background: #fffdf7;
          color: var(--oc-ink);
          box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.8), 0 8px 18px rgba(89, 54, 24, 0.07);
        }

        .order-creative-theme .field input:focus,
        .order-creative-theme .field textarea:focus,
        .order-creative-theme .field select:focus {
          border-color: var(--oc-gold-dark);
          box-shadow: 0 0 0 4px rgba(213, 162, 71, 0.2), 0 12px 26px rgba(128, 83, 21, 0.12);
        }

        .order-creative-theme .btn,
        .order-creative-theme .location-picker-trigger,
        .order-creative-theme .order-music-choice-grid button {
          border-radius: 999px;
          font-weight: 900;
        }

        .order-creative-theme .btn-gold,
        .order-creative-theme .order-submit,
        .order-creative-theme .order-wizard-actions .btn-gold {
          position: relative;
          overflow: hidden;
          border: 1px solid rgba(255, 242, 200, 0.62);
          background: linear-gradient(135deg, #59320d, #a66a1f 42%, #d5a247 72%, #f2d27d);
          color: #fff9e9;
          text-shadow: 0 1px 1px rgba(0, 0, 0, 0.28);
          box-shadow: 0 18px 42px rgba(128, 83, 21, 0.38), 0 0 0 1px rgba(242, 210, 125, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.24);
        }

        .order-creative-theme .btn-gold::after,
        .order-creative-theme .order-submit::after {
          content: "";
          position: absolute;
          inset: -80% auto -80% -32%;
          width: 34%;
          transform: rotate(18deg);
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.6), transparent);
          pointer-events: none;
        }

        .order-creative-theme .btn-soft,
        .order-creative-theme .btn-glass,
        .order-creative-theme .order-preview-action,
        .order-creative-theme .location-picker-trigger {
          border: 1px solid rgba(89, 54, 24, 0.28);
          background: #fff6e5;
          color: var(--oc-ink);
          box-shadow: 0 10px 22px rgba(89, 54, 24, 0.12);
        }

        .order-creative-theme .order-template-card,
        .order-creative-theme .compact-image-card,
        .order-creative-theme .order-location-preview,
        .order-creative-theme .order-review-item,
        .order-creative-theme .order-review-final-note,
        .order-creative-theme .order-review-confidence span,
        .order-creative-theme .order-music-upload,
        .order-creative-theme .order-extra-card {
          border: 1px solid rgba(89, 54, 24, 0.2);
          background: #fff5e3;
          color: var(--oc-ink);
          box-shadow: 0 12px 26px rgba(89, 54, 24, 0.11);
        }

        .order-creative-theme .order-template-card.active,
        .order-creative-theme .order-music-choice-grid button.active,
        .order-creative-theme .order-extra-card.is-added {
          border-color: rgba(128, 83, 21, 0.5);
          background: linear-gradient(180deg, #fff7e6, #e9c98f);
          box-shadow: 0 16px 34px rgba(128, 83, 21, 0.2);
        }

        .order-creative-theme .order-review-photos-warning {
          border-color: rgba(204, 76, 34, 0.72) !important;
          background: linear-gradient(180deg, #fff4e5, #ffd8c6) !important;
          box-shadow: 0 16px 34px rgba(150, 45, 18, 0.22) !important;
        }

        .order-creative-theme .order-review-photos-warning span,
        .order-creative-theme .order-review-photos-warning strong {
          color: #6e250f !important;
        }

        .order-creative-theme .order-review-photos-warning::after {
          content: "الصور مازالت قيد الرفع — انتظر اكتمالها قبل تأكيد الدعوة";
          display: block;
          margin-top: 6px;
          color: #7a2d15;
          font-size: 0.88rem;
          font-weight: 900;
          line-height: 1.6;
        }

        .order-creative-theme .location-picker-overlay {
          background: rgba(18, 10, 7, 0.72);
          backdrop-filter: blur(10px);
        }

        .order-creative-theme .location-picker-container {
          border: 1px solid rgba(242, 210, 125, 0.28);
          background: #fff8eb;
          box-shadow: 0 36px 100px rgba(0, 0, 0, 0.42);
        }

        @media (max-width: 720px) {
          .order-creative-theme .order-builder-main {
            padding-top: 18px;
          }

          .order-creative-theme .order-wizard-card {
            border-radius: 24px;
          }

          .order-creative-theme .order-wizard-card::before {
            inset: 8px;
            border-radius: 18px;
          }

          .order-creative-theme .order-wizard-actions {
            border-top-color: rgba(89, 54, 24, 0.18);
            background: rgba(32, 19, 13, 0.92);
            box-shadow: 0 -16px 42px rgba(0, 0, 0, 0.28);
          }
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
            <ArrowRight size={17} />
            رجوع للقوالب
          </Link>
        </div>
      </header>
      <main className="order-builder-main">
        <div className="container order-shell">
          <OrderForm initialTemplate={selected.slug} initialDraft={initialDraft} templates={templateOptions} skipTemplateStep={Boolean(params.template)} />
        </div>
      </main>
    </div>
  );
}
