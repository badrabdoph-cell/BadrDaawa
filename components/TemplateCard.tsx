import Link from "next/link";
import { Eye, Sparkles } from "lucide-react";
import type { CSSProperties } from "react";
import type { TemplateDefinition } from "@/lib/types";

export function TemplateCard({ template }: { template: TemplateDefinition }) {
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
      <Link href={`/templates/${template.slug}/preview`} className="template-preview" aria-label={`معاينة قالب ${template.arabicName}`}>
        <span className="template-preview-screen">
          <img src={template.previewImage} alt={`معاينة قالب ${template.arabicName}`} loading="lazy" decoding="async" />
        </span>
        <span className="template-badge">{template.category}</span>
        <span className="template-preview-caption">
          <strong>{template.arabicName}</strong>
          <small>{template.name}</small>
        </span>
      </Link>
      <div className="template-body">
        <Link className="template-name-link" href={`/templates/${template.slug}/preview`}>
          <h3>{template.arabicName}</h3>
        </Link>
        <p>{template.concept}</p>
        <div className="button-row">
          <Link className="btn btn-soft btn-glass template-card-preview-button" href={`/templates/${template.slug}/preview`}>
            <Eye size={17} />
            معاينة
          </Link>
          <Link className="btn btn-gold btn-glow template-card-select-button" href={`/order?template=${template.slug}`}>
            <Sparkles size={17} />
            اختار
          </Link>
        </div>
      </div>
    </article>
  );
}
