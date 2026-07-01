"use client";

import type { CSSProperties } from "react";
import { formatPostImageCuriosityDate } from "@/lib/post-image/date";
import { getPostImageTemplate, getPostImageTemplates } from "@/lib/post-image/registry";
import { DEFAULT_POST_IMAGE_TEMPLATE_ID, type PostImageTemplateId } from "@/lib/post-image/types";

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

function PreviewQrMark() {
  return (
    <div className="post-image-preview-qr">
      <span />
      <span />
      <span />
      <small>QR</small>
    </div>
  );
}

function BreakingNewsPreview({ coupleLine, curiosityDate, coupleFontCqw, coverImageUrl }: { coupleLine: string; curiosityDate: string; coupleFontCqw: number; coverImageUrl?: string }) {
  return (
    <div className="post-image-preview-card breaking-news-v1-template" aria-label="معاينة قالب الخبر العاجل" style={{ "--couple-font-cqw": coupleFontCqw } as CSSProperties}>
      <div className="post-image-preview-paper" aria-hidden="true" />
      <div className="post-image-preview-masthead">
        <span>Wedding invitation</span>
        <strong>BADR_DAAWA</strong>
      </div>
      <div className="post-image-preview-rule double" />
      <h3>خبر عاجل!!</h3>
      <div className="post-image-preview-rule title-rule" />
      <strong className="post-image-preview-couple">{coupleLine}</strong>
      <div className="post-image-preview-rule thin" />
      <div className="post-image-preview-photo">
        {coverImageUrl ? <img src={coverImageUrl} alt="" /> : <span>صورة الدعوة</span>}
      </div>
      <div className="post-image-preview-date-label">SAVE THE DATE</div>
      <div className="post-image-preview-date-row">
        <span className="post-image-preview-heart">♥</span>
        <span className="post-image-preview-date">{curiosityDate}</span>
        <span className="post-image-preview-heart">♥</span>
      </div>
      <PreviewQrMark />
      <div className="post-image-preview-rule bottom-rule" />
      <div className="post-image-preview-footer">BADR DAAWA</div>
    </div>
  );
}

function WhatsAppChatPreview({ groomName, brideName, curiosityDate, coverImageUrl }: { groomName: string; brideName: string; curiosityDate: string; coverImageUrl?: string }) {
  return (
    <div className="post-image-preview-card whatsapp-chat-template" aria-label="معاينة قالب محادثة واتساب">
      <div className="post-image-chat-frame" aria-hidden="true" />
      <div className="post-image-chat-header">
        <span className="post-image-chat-avatar">♥</span>
        <div>
          <strong>❤️ {groomName} &amp; {brideName}</strong>
          <small>دعوة زفاف رقمية</small>
        </div>
      </div>
      <div className="post-image-chat-bubble">مساء الخير ❤️</div>
      <div className="post-image-chat-bubble second">عندنا خبر حلو…</div>
      <div className="post-image-chat-bubble third is-green">أخيرًا قررنا نتجوز 🎉</div>
      <div className="post-image-chat-bubble save-date">SAVE THE DATE</div>
      <div className="post-image-chat-photo">
        {coverImageUrl ? <img src={coverImageUrl} alt="" /> : <span>صورة الدعوة</span>}
      </div>
      <div className="post-image-chat-bubble date">📅 {curiosityDate}</div>
      <div className="post-image-chat-cta">
        <span>👇 اضغط على الصورة وشوف الدعوة كاملة</span>
        <PreviewQrMark />
      </div>
      <div className="post-image-preview-footer">BADR DAAWA</div>
    </div>
  );
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
    if (templateId === "whatsapp-chat") {
      return <WhatsAppChatPreview groomName={groom} brideName={bride} curiosityDate={curiosityDate} coverImageUrl={coverImageUrl} />;
    }
    return <BreakingNewsPreview coupleLine={coupleLine} curiosityDate={curiosityDate} coupleFontCqw={coupleFontCqw} coverImageUrl={coverImageUrl} />;
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
