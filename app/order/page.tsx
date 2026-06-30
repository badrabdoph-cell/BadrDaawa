import type { Metadata } from "next";
import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ArrowLeft, Crown } from "lucide-react";
import type { OrderInitialDraft } from "@/components/OrderForm";
import { OrderForm } from "@/components/OrderForm";
import { OrderRequestUxPatches } from "@/components/OrderRequestUxPatches";
import { PARTNER_PROMO_COOKIE, PARTNER_PROMO_STATUS_COOKIE } from "@/lib/partner-promo";
import { getPublishedSiteSettings } from "@/lib/site-settings";
import { getPublicPublishedTemplatesWithSettings } from "@/lib/template-settings";

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
    promo?: string;
    appliedPromoCode?: string;
    partnerPromoId?: string;
    referralSource?: string;
    promoStatus?: string;
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
  const [templates, siteSettings, cookieStore] = await Promise.all([getPublicPublishedTemplatesWithSettings(), getPublishedSiteSettings(), cookies()]);
  const selected = (params.template ? templates.find((template) => template.slug === params.template) : undefined) || templates[0];
  if (!selected) redirect("/templates");
  const templateOptions = templates.map(({ slug, name, arabicName, previewImage }) => ({ slug, name, arabicName, previewImage }));
  const cookiePromoCode = sanitizeString(cookieStore.get(PARTNER_PROMO_COOKIE)?.value || "");
  const cookiePromoStatus = sanitizeString(cookieStore.get(PARTNER_PROMO_STATUS_COOKIE)?.value || "");
  const requestedPromoCode = sanitizeString(params.promo || params.appliedPromoCode || cookiePromoCode);
  const requestedReferralSource = sanitizeString(params.referralSource || (params.promo || cookiePromoCode ? "short-link" : ""));
  const initialPromoStatus = sanitizeString(params.promoStatus || (!requestedPromoCode ? cookiePromoStatus : ""));
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
    appliedPromoCode: requestedPromoCode,
    partnerPromoId: sanitizeString(params.partnerPromoId || ""),
    referralSource: requestedReferralSource,
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

        @media (min-width: 861px) {
          .order-studio-page .order-compact-grid {
            grid-template-columns: repeat(2, 1fr) !important;
          }

          .order-studio-page .order-summary-items {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 10px;
          }

          .order-studio-page .order-step-tabs {
            gap: 10px;
          }

          .order-studio-page .order-step-tabs button {
            min-height: 80px;
            padding: 12px 18px;
          }

          .order-studio-page .order-wizard-flow .field input,
          .order-studio-page .order-wizard-flow .field textarea,
          .order-studio-page .order-wizard-flow .field select {
            min-height: 64px;
            font-size: 1.05rem;
          }

          .order-studio-page .compact-image-card {
            min-height: 200px;
          }

          .order-studio-page .order-summary-item {
            min-height: 56px;
            padding: 10px 14px;
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
            <ArrowLeft size={17} />
            رجوع للقوالب
          </Link>
        </div>
      </header>
      <main className="order-builder-main">
        <div className="container order-shell">
          <OrderForm initialTemplate={selected.slug} initialDraft={initialDraft} initialPromoStatus={initialPromoStatus} templates={templateOptions} skipTemplateStep={Boolean(params.template)} showPaymentMethods={siteSettings.order.showPaymentMethods} />
        </div>
      </main>
      <OrderRequestUxPatches />
    </div>
  );
}
