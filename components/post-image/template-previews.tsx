import type { CSSProperties, ReactNode } from "react";

export type PostImageTemplatePreviewProps = {
  groomName: string;
  brideName: string;
  coupleLine: string;
  curiosityDate: string;
  coupleFontCqw: number;
  coverImageUrl?: string;
};

type PostImageTemplatePreviewComponent = (props: PostImageTemplatePreviewProps) => ReactNode;

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

function BreakingNewsPreview({ coupleLine, curiosityDate, coupleFontCqw, coverImageUrl }: PostImageTemplatePreviewProps) {
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

function WhatsAppChatPreview({ groomName, brideName, curiosityDate, coverImageUrl }: PostImageTemplatePreviewProps) {
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

export const postImageTemplatePreviews: Record<string, PostImageTemplatePreviewComponent> = {
  "breaking-news-v1": BreakingNewsPreview,
  "whatsapp-chat": WhatsAppChatPreview,
};

export function getPostImageTemplatePreview(templateId: string): PostImageTemplatePreviewComponent {
  return postImageTemplatePreviews[templateId] || postImageTemplatePreviews["breaking-news-v1"];
}
