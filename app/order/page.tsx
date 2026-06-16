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
    <div className="page-shell order-builder-page order-visual-refresh">
      <style>{`
        .order-visual-refresh {
          --order-ivory: #fffdf8;
          --order-cream: #fbf4e9;
          --order-champagne: #f4e2c2;
          --order-soft-gold: #bd8f3f;
          --order-deep-gold: #80571f;
          --order-ink: #211812;
          --order-muted: #74665a;
          --order-line: rgba(128, 87, 31, 0.16);
          --order-shadow-sm: 0 10px 26px rgba(47, 34, 21, 0.08);
          --order-shadow-md: 0 18px 48px rgba(47, 34, 21, 0.12);
          --order-shadow-lg: 0 30px 84px rgba(47, 34, 21, 0.15);
          background:
            radial-gradient(circle at 88% 6%, rgba(189, 143, 63, 0.16), transparent 28rem),
            radial-gradient(circle at 7% 18%, rgba(255, 255, 255, 0.82), transparent 24rem),
            linear-gradient(180deg, #fff9ee 0%, #fbf4e9 44%, #fffdf8 100%);
        }

        .order-visual-refresh .order-builder-header {
          border-bottom: 1px solid rgba(128, 87, 31, 0.12);
          background: rgba(255, 253, 248, 0.78);
          backdrop-filter: blur(18px);
        }

        .order-visual-refresh .brand-mark {
          background: linear-gradient(135deg, #80571f, #bd8f3f 62%, #dec27a);
          color: #fffdf8;
          box-shadow: 0 12px 26px rgba(128, 87, 31, 0.2);
        }

        .order-visual-refresh .order-builder-back-link {
          border: 1px solid rgba(128, 87, 31, 0.16);
          background: rgba(255, 253, 248, 0.84);
          color: var(--order-ink);
          box-shadow: var(--order-shadow-sm);
        }

        .order-visual-refresh .order-builder-main {
          padding-block: clamp(24px, 5vw, 48px) 72px;
        }

        .order-visual-refresh .order-shell {
          width: min(1120px, calc(100% - 28px));
          margin-inline: auto;
        }

        .order-visual-refresh .order-flow {
          color: var(--order-ink);
        }

        .order-visual-refresh .order-wizard-card {
          position: relative;
          overflow: hidden;
          border: 1px solid var(--order-line);
          border-radius: 30px;
          background:
            radial-gradient(circle at 12% 7%, rgba(255, 255, 255, 0.9), transparent 22rem),
            linear-gradient(180deg, rgba(255, 253, 248, 0.98), rgba(250, 240, 224, 0.92));
          box-shadow: var(--order-shadow-lg);
        }

        .order-visual-refresh .order-wizard-card::before {
          content: "";
          position: absolute;
          inset: 16px;
          pointer-events: none;
          border: 1px solid rgba(189, 143, 63, 0.16);
          border-radius: 24px;
        }

        .order-visual-refresh .order-wizard-card > * {
          position: relative;
          z-index: 1;
        }

        .order-visual-refresh .order-wizard-header {
          gap: 18px;
          border-bottom: 1px solid rgba(128, 87, 31, 0.11);
          padding-bottom: 18px;
        }

        .order-visual-refresh .order-wizard-header span,
        .order-visual-refresh .field-preview,
        .order-visual-refresh .order-step-copy p {
          color: var(--order-muted);
        }

        .order-visual-refresh .order-wizard-header h2 {
          color: var(--order-ink);
          font-size: clamp(1.55rem, 4vw, 2.25rem);
          line-height: 1.25;
          letter-spacing: -0.025em;
        }

        .order-visual-refresh .order-wizard-trust-note {
          max-width: 720px;
          color: rgba(116, 102, 90, 0.92);
        }

        .order-visual-refresh .order-wizard-header > strong {
          min-width: 70px;
          min-height: 50px;
          border: 1px solid rgba(189, 143, 63, 0.28);
          border-radius: 999px;
          background: linear-gradient(180deg, rgba(255, 253, 248, 0.96), rgba(244, 226, 194, 0.78));
          color: var(--order-deep-gold);
          box-shadow: var(--order-shadow-sm);
        }

        .order-visual-refresh .order-progress-track {
          height: 7px;
          border-radius: 999px;
          background: rgba(128, 87, 31, 0.1);
          overflow: hidden;
        }

        .order-visual-refresh .order-progress-track span {
          border-radius: inherit;
          background: linear-gradient(90deg, #80571f, #bd8f3f 58%, #e4c87d);
          box-shadow: 0 0 22px rgba(189, 143, 63, 0.28);
        }

        .order-visual-refresh .order-step-tabs {
          gap: 9px;
        }

        .order-visual-refresh .order-step-tabs button {
          min-height: 62px;
          border: 1px solid rgba(128, 87, 31, 0.14);
          border-radius: 17px;
          background: rgba(255, 253, 248, 0.74);
          color: #7d7064;
          box-shadow: none;
        }

        .order-visual-refresh .order-step-tabs button > span {
          background: rgba(128, 87, 31, 0.08);
          color: var(--order-ink);
        }

        .order-visual-refresh .order-step-tabs button.active {
          border-color: rgba(189, 143, 63, 0.46);
          background: linear-gradient(180deg, rgba(255, 253, 248, 0.98), rgba(244, 226, 194, 0.82));
          color: var(--order-ink);
          box-shadow: 0 14px 30px rgba(128, 87, 31, 0.14);
        }

        .order-visual-refresh .order-step-tabs button.active > span {
          background: linear-gradient(135deg, #80571f, #bd8f3f);
          color: #fffdf8;
          box-shadow: 0 8px 18px rgba(128, 87, 31, 0.2);
        }

        .order-visual-refresh .order-step-tabs button.done {
          border-color: rgba(189, 143, 63, 0.22);
          background: rgba(244, 226, 194, 0.48);
        }

        .order-visual-refresh .field label {
          color: var(--order-ink);
          font-weight: 850;
        }

        .order-visual-refresh .field input,
        .order-visual-refresh .field textarea,
        .order-visual-refresh .field select {
          min-height: 56px;
          border: 1px solid rgba(128, 87, 31, 0.18);
          border-radius: 16px;
          background: linear-gradient(180deg, rgba(255, 255, 252, 0.98), rgba(255, 249, 239, 0.86));
          color: var(--order-ink);
          box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.78);
        }

        .order-visual-refresh .field input:hover,
        .order-visual-refresh .field textarea:hover,
        .order-visual-refresh .field select:hover {
          border-color: rgba(189, 143, 63, 0.38);
        }

        .order-visual-refresh .field input:focus,
        .order-visual-refresh .field textarea:focus,
        .order-visual-refresh .field select:focus {
          border-color: rgba(189, 143, 63, 0.68);
          box-shadow: 0 0 0 4px rgba(189, 143, 63, 0.16), inset 0 1px 0 rgba(255, 255, 255, 0.9);
        }

        .order-visual-refresh .field input::placeholder,
        .order-visual-refresh .field textarea::placeholder {
          color: rgba(116, 102, 90, 0.62);
        }

        .order-visual-refresh .field-optional-badge,
        .order-visual-refresh .order-review-location-warning {
          border-color: rgba(189, 143, 63, 0.24);
          background: rgba(244, 226, 194, 0.64);
          color: var(--order-deep-gold);
        }

        .order-visual-refresh .btn,
        .order-visual-refresh .location-picker-trigger,
        .order-visual-refresh .order-template-card,
        .order-visual-refresh .compact-image-card,
        .order-visual-refresh .order-location-preview,
        .order-visual-refresh .order-review-item,
        .order-visual-refresh .order-review-final-note,
        .order-visual-refresh .order-review-confidence span,
        .order-visual-refresh .order-music-choice-grid button {
          border-color: rgba(128, 87, 31, 0.15);
        }

        .order-visual-refresh .btn {
          border-radius: 999px;
          font-weight: 900;
        }

        .order-visual-refresh .btn-gold,
        .order-visual-refresh .order-submit {
          border: 1px solid rgba(255, 244, 214, 0.48);
          background: linear-gradient(135deg, #80571f, #bd8f3f 58%, #dec27a);
          color: #fffdf8;
          box-shadow: 0 16px 38px rgba(128, 87, 31, 0.25), inset 0 1px 0 rgba(255, 255, 255, 0.24);
        }

        .order-visual-refresh .btn-soft,
        .order-visual-refresh .btn-glass,
        .order-visual-refresh .order-preview-action,
        .order-visual-refresh .location-picker-trigger {
          background: rgba(255, 253, 248, 0.82);
          color: var(--order-ink);
          box-shadow: var(--order-shadow-sm);
        }

        .order-visual-refresh .order-template-card,
        .order-visual-refresh .compact-image-card,
        .order-visual-refresh .order-location-preview,
        .order-visual-refresh .order-review-item,
        .order-visual-refresh .order-review-final-note,
        .order-visual-refresh .order-review-confidence span {
          border-radius: 20px;
          background: rgba(255, 253, 248, 0.82);
          box-shadow: var(--order-shadow-sm);
        }

        .order-visual-refresh .order-template-card.active,
        .order-visual-refresh .order-music-choice-grid button.active {
          border-color: rgba(189, 143, 63, 0.46);
          background: linear-gradient(180deg, rgba(255, 253, 248, 0.98), rgba(244, 226, 194, 0.74));
          box-shadow: 0 14px 34px rgba(128, 87, 31, 0.14);
        }

        .order-visual-refresh .order-template-thumb,
        .order-visual-refresh .compact-image-card img,
        .order-visual-refresh .compact-image-card picture,
        .order-visual-refresh .compact-image-card figure {
          border-radius: 16px;
          overflow: hidden;
        }

        .order-visual-refresh .order-compact-section-head,
        .order-visual-refresh .builder-section-head {
          color: var(--order-ink);
        }

        .order-visual-refresh .order-review-final-note {
          background: linear-gradient(180deg, rgba(255, 253, 248, 0.94), rgba(244, 226, 194, 0.68));
          color: var(--order-deep-gold);
        }

        .order-visual-refresh .order-alert,
        .order-visual-refresh .order-upload-floating-warning {
          border-radius: 18px;
          box-shadow: var(--order-shadow-md);
        }

        .order-visual-refresh .location-picker-overlay {
          background: rgba(33, 24, 18, 0.58);
          backdrop-filter: blur(10px);
        }

        .order-visual-refresh .location-picker-container {
          border: 1px solid rgba(189, 143, 63, 0.22);
          border-radius: 28px;
          background: linear-gradient(180deg, rgba(255, 253, 248, 0.98), rgba(250, 240, 224, 0.96));
          box-shadow: 0 30px 90px rgba(0, 0, 0, 0.22);
        }

        .order-visual-refresh .location-picker-header,
        .order-visual-refresh .location-picker-actions {
          border-color: rgba(128, 87, 31, 0.12);
        }

        .order-visual-refresh .location-picker-map-wrapper {
          border-radius: 20px;
          overflow: hidden;
          box-shadow: var(--order-shadow-md);
        }

        @media (max-width: 720px) {
          .order-visual-refresh .order-shell {
            width: min(100% - 18px, 1120px);
          }

          .order-visual-refresh .order-builder-main {
            padding-block: 18px 48px;
          }

          .order-visual-refresh .order-wizard-card {
            border-radius: 24px;
          }

          .order-visual-refresh .order-wizard-card::before {
            inset: 10px;
            border-radius: 19px;
          }

          .order-visual-refresh .order-step-tabs button {
            min-height: 66px;
            flex-basis: 118px;
          }

          .order-visual-refresh .field input,
          .order-visual-refresh .field textarea,
          .order-visual-refresh .field select,
          .order-visual-refresh .btn,
          .order-visual-refresh .location-picker-trigger {
            min-height: 56px;
          }

          .order-visual-refresh .order-wizard-actions {
            border-top-color: rgba(128, 87, 31, 0.12);
            background: rgba(251, 244, 233, 0.96);
            box-shadow: 0 -10px 28px rgba(47, 34, 21, 0.08);
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
