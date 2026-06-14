import Link from "next/link";
import { Eye, Sparkles } from "lucide-react";
import type { CSSProperties } from "react";
import type { TemplateDefinition } from "@/lib/types";

export function TemplateCard({ template }: { template: TemplateDefinition }) {
  const previewHref = `/templates/${template.slug}/preview?hidePreviewChrome=1&galleryPreview=1`;
  const orderHref = `/order?template=${template.slug}`;
  const previewImage = template.previewImage.endsWith(".svg") && template.previewImage.startsWith("/assets/templates/") ? `/templates/${template.slug}/card-preview.svg` : template.previewImage;

  return (
    <article
      className="template-card"
      style={
        {
          "--template-accent": template.palette.accent,
          "--template-ink": template.palette.ink,
          "--template-surface": template.palette.surface,
          "--template-primary": template.palette.primary,
        } as CSSProperties
      }
    >
      <Link href={previewHref} className="template-card-hit" aria-label={`معاينة تصميم ${template.arabicName}`} />
      <div className="template-preview">
        <span className="template-preview-screen">
          <img src={previewImage} alt={`معاينة تصميم ${template.arabicName}`} loading="lazy" decoding="async" />
        </span>
        <span className="template-preview-peek" aria-hidden="true">
          <Eye size={28} />
        </span>
        <span className="template-badge">{template.category}</span>
        <span className="template-preview-caption">
          <strong>{template.arabicName}</strong>
          <small>{template.name}</small>
        </span>
      </div>
      <div className="template-body">
        <h3>{template.arabicName}</h3>
        <p>{template.concept}</p>
        <div className="template-card-actions button-row">
          <Link className="btn btn-gold btn-glow template-card-select-button" href={orderHref}>
            <Sparkles size={17} />
            استخدم هذا التصميم
          </Link>
          <Link className="btn btn-soft btn-glass template-card-preview-button" href={previewHref}>
            <Eye size={17} />
            معاينة
          </Link>
        </div>
      </div>
    </article>
  );
}
