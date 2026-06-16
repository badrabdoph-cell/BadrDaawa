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

  const orderUxPatch = `
    (() => {
      if (window.__badrOrderUxPatch) return;
      window.__badrOrderUxPatch = true;

      const text = (element) => (element?.textContent || "").replace(/\s+/g, " ").trim();
      const hasUploadWait = () => Boolean(document.querySelector("#order-upload-wait-hint"));

      function findPhotoReviewCard() {
        return Array.from(document.querySelectorAll(".order-review-item")).find((item) => text(item).includes("الصور"));
      }

      function syncUploadReviewState() {
        const submit = document.querySelector(".order-review-actions .order-submit");
        const waiting = hasUploadWait();
        const photoCard = findPhotoReviewCard();

        if (photoCard) {
          photoCard.classList.toggle("order-review-photos-warning", waiting);
          if (waiting) photoCard.setAttribute("aria-invalid", "true");
          else photoCard.removeAttribute("aria-invalid");
        }

        if (!submit) return;
        if (waiting && submit.disabled && !text(submit).includes("جاري")) {
          submit.disabled = false;
          submit.removeAttribute("disabled");
          submit.dataset.uploadWaitOverride = "true";
        } else if (!waiting && submit.dataset.uploadWaitOverride === "true") {
          delete submit.dataset.uploadWaitOverride;
        }
      }

      function clickMusicInput(kind) {
        window.setTimeout(() => {
          const inputs = Array.from(document.querySelectorAll(".order-music-upload input[type='file']"));
          const input = inputs.find((item) => kind === "video" ? (item.accept || "").includes("video") : ((item.accept || "").includes("audio") || (item.accept || "").includes(".mp3")));
          if (input && !input.disabled) input.click();
        }, 120);
      }

      document.addEventListener("click", (event) => {
        const musicButton = event.target.closest?.(".order-music-choice-grid button");
        if (musicButton) {
          const label = text(musicButton);
          if (label.includes("رفع MP3")) clickMusicInput("audio");
          if (label.includes("صوت من فيديو")) clickMusicInput("video");
          if (label.includes("رابط أغنية")) window.setTimeout(() => document.querySelector("#musicUrl")?.focus(), 120);
        }

        const submit = event.target.closest?.(".order-review-actions .order-submit[data-upload-wait-override='true']");
        if (submit && hasUploadWait()) {
          window.setTimeout(() => {
            const alert = document.querySelector(".order-alert.danger");
            const target = alert || findPhotoReviewCard() || document.querySelector("#order-upload-wait-hint");
            target?.scrollIntoView({ behavior: "smooth", block: "center" });
          }, 120);
        }
      }, true);

      const observer = new MutationObserver(syncUploadReviewState);
      observer.observe(document.documentElement, { childList: true, subtree: true, attributes: true, attributeFilter: ["disabled", "class"] });
      window.setInterval(syncUploadReviewState, 600);
      window.setTimeout(syncUploadReviewState, 80);
    })();
  `;

  return (
    <div className="page-shell order-builder-page">
      <style>{`
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
      <script dangerouslySetInnerHTML={{ __html: orderUxPatch }} />
    </div>
  );
}
