import Link from "next/link";
import { Eye, Sparkles } from "lucide-react";
import type { TemplateDefinition } from "@/lib/types";

export function TemplateCard({ template }: { template: TemplateDefinition }) {
  return (
    <article className="template-card">
      <Link href={`/templates/${template.slug}/preview`} className="template-preview" aria-label={`معاينة قالب ${template.arabicName}`}>
        <img src={template.previewImage} alt={`معاينة قالب ${template.arabicName}`} loading="lazy" />
        <span className="template-badge">{template.category}</span>
      </Link>
      <div className="template-body">
        <h3>{template.arabicName}</h3>
        <p>{template.concept}</p>
        <div className="button-row">
          <Link className="btn btn-soft" href={`/templates/${template.slug}/preview`}>
            <Eye size={17} />
            معاينة
          </Link>
          <Link className="btn btn-primary" href={`/order?template=${template.slug}`}>
            <Sparkles size={17} />
            اختار
          </Link>
        </div>
      </div>
    </article>
  );
}
