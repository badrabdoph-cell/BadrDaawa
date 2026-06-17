import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, Crown } from "lucide-react";
import type { OrderInitialDraft } from "@/components/OrderForm";
import { OrderForm } from "@/components/OrderForm";
import { OrderRequestUxPatches } from "@/components/OrderRequestUxPatches";
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
    groomName: params.groomName || "",
    brideName: params.brideName || "",
    phone: params.phone || "",
    weddingDate: params.weddingDate || "",
    weddingTime: params.weddingTime || "07:00 مساءً",
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
      <OrderRequestUxPatches />
    </div>
  );
}
