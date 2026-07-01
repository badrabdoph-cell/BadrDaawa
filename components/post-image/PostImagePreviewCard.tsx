"use client";

import { formatPostImageCuriosityDate } from "@/lib/post-image/date";
import { getPostImageTemplate, getPostImageTemplates } from "@/lib/post-image/registry";
import { DEFAULT_POST_IMAGE_TEMPLATE_ID, type PostImageTemplateId } from "@/lib/post-image/types";
import { getPostImageTemplatePreview } from "./template-previews";

type PostImagePreviewCardProps = {
  groomName: string;
  brideName: string;
  weddingDate: string;
  coverImageUrl?: string;
  selectedTemplateId?: string;
  onTemplateChange?: (templateId: PostImageTemplateId) => void;
};

function displayName(value: string, fallback: string) {
  return value.trim() || fallback;
}

export function PostImagePreviewCard({ groomName, brideName, weddingDate, coverImageUrl, selectedTemplateId = DEFAULT_POST_IMAGE_TEMPLATE_ID, onTemplateChange }: PostImagePreviewCardProps) {
  const templates = getPostImageTemplates();
  const selectedTemplate = getPostImageTemplate(selectedTemplateId);
  const safeSelectedTemplateId = selectedTemplate.id;
  const groom = displayName(groomName, "اسم العريس");
  const bride = displayName(brideName, "اسم العروسة");
  const coupleLine = `${displayName(groomName, "اسم العريس")} هيتجوز ${displayName(brideName, "اسم العروسة")}`;
  const curiosityDate = formatPostImageCuriosityDate(weddingDate).replace("❤️", "♥");
  const coupleLength = coupleLine.replace(/\s+/g, "").length;
  const coupleFontCqw = coupleLength > 34 ? 5.15 : coupleLength > 26 ? 5.9 : coupleLength > 18 ? 6.8 : 7.8;

  function renderPreview(templateId: string) {
    const Preview = getPostImageTemplatePreview(templateId);
    return <Preview groomName={groom} brideName={bride} coupleLine={coupleLine} curiosityDate={curiosityDate} coupleFontCqw={coupleFontCqw} coverImageUrl={coverImageUrl} />;
  }

  return (
    <div className="post-image-template-showcase">
      <div className="post-image-template-main" aria-live="polite">
        {renderPreview(safeSelectedTemplateId)}
      </div>
      <div className="post-image-template-picker" role="listbox" aria-label="اختيار قالب صورة البوست">
        {templates.map((template) => {
          const selected = template.id === safeSelectedTemplateId;
          return (
            <button
              key={template.id}
              type="button"
              className={`post-image-template-option ${selected ? "is-selected" : ""}`}
              aria-pressed={selected}
              role="option"
              aria-selected={selected}
              onClick={() => onTemplateChange?.(template.id)}
            >
              <span className="post-image-template-check">✓</span>
              <span className="post-image-template-thumb">{renderPreview(template.id)}</span>
              <strong>{template.name}</strong>
            </button>
          );
        })}
      </div>
    </div>
  );
}
