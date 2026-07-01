"use client";

import { useState, useTransition } from "react";
import { Check, Clipboard, Download, ExternalLink, Maximize2, RefreshCw, X } from "lucide-react";

type AdminPostImageState = {
  url?: string | null;
  status?: string | null;
  templateId?: string | null;
  generatedAt?: string | null;
  error?: string | null;
  width?: number | null;
  height?: number | null;
  downloadFileName?: string | null;
};

type PostImageAdminPanelProps = {
  code: string;
  invitationUrl: string;
  initial: AdminPostImageState;
};

const statusLabels: Record<string, string> = {
  GENERATED: "Generated",
  NEEDS_REGENERATION: "Needs Regeneration",
  GENERATING: "Generating",
  FAILED: "Failed",
};

function statusClassName(status: string) {
  if (status === "GENERATED") return "status success";
  if (status === "GENERATING" || status === "NEEDS_REGENERATION") return "status warning";
  return "status danger";
}

export function PostImageAdminPanel({ code, invitationUrl, initial }: PostImageAdminPanelProps) {
  const [postImage, setPostImage] = useState<AdminPostImageState>(initial);
  const [message, setMessage] = useState("");
  const [expanded, setExpanded] = useState(false);
  const [isPending, startTransition] = useTransition();
  const status = isPending ? "GENERATING" : postImage.status || "NEEDS_REGENERATION";
  const imageUrl = postImage.url || "";
  const downloadFileName = postImage.downloadFileName || `post-image-${code}.png`;

  async function refresh() {
    const response = await fetch(`/api/admin/invitations/${encodeURIComponent(code)}/post-image`, { cache: "no-store" });
    const data = await response.json().catch(() => null);
    if (response.ok && data?.postImage) setPostImage(data.postImage);
  }

  function regenerate() {
    setMessage("");
    startTransition(async () => {
      const response = await fetch(`/api/admin/invitations/${encodeURIComponent(code)}/post-image`, { method: "POST" });
      const data = await response.json().catch(() => null);
      if (data?.postImage) setPostImage(data.postImage);
      setMessage(response.ok && data?.ok !== false ? "تم إعادة توليد الصورة." : data?.result?.error || data?.error || "تعذر إعادة توليد الصورة.");
    });
  }

  async function copyImage() {
    if (!imageUrl) return;
    setMessage("");
    try {
      if (!navigator.clipboard || typeof ClipboardItem === "undefined") {
        setMessage("المتصفح لا يدعم نسخ الصور مباشرة. استخدم زر التحميل.");
        return;
      }
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      await navigator.clipboard.write([new ClipboardItem({ [blob.type || "image/png"]: blob })]);
      setMessage("تم نسخ الصورة إلى الحافظة.");
    } catch {
      setMessage("لم ينجح النسخ المباشر. استخدم زر التحميل كبديل.");
    }
  }

  return (
    <div className="post-image-admin-panel">
      <div className="post-image-admin-preview">
        {imageUrl ? (
          <button type="button" className="post-image-admin-preview-button" onClick={() => setExpanded(true)} aria-label="تكبير صورة البوست">
            <img src={imageUrl} alt="صورة البوست" />
          </button>
        ) : (
          <div className="post-image-admin-empty">
            <span>لا توجد صورة محفوظة بعد</span>
          </div>
        )}
      </div>

      <div className="post-image-admin-meta">
        <div className="post-image-admin-status-row">
          <span className={statusClassName(status)}>{statusLabels[status] || status}</span>
          {postImage.templateId ? <small>{postImage.templateId}</small> : null}
        </div>
        <div className="invitation-detail-info-list">
          <div>
            <span>رابط الدعوة</span>
            <strong dir="ltr">{invitationUrl}</strong>
          </div>
          <div>
            <span>المقاس</span>
            <strong>{postImage.width && postImage.height ? `${postImage.width} x ${postImage.height}` : "1080 x 1350"}</strong>
          </div>
          <div>
            <span>آخر توليد</span>
            <strong>{postImage.generatedAt ? new Date(postImage.generatedAt).toLocaleString("ar-EG") : "لم يتم التوليد بعد"}</strong>
          </div>
        </div>
        {postImage.error ? <p className="post-image-admin-error">{postImage.error}</p> : null}
        {message ? <p className="post-image-admin-message">{message}</p> : null}
        <div className="post-image-admin-actions">
          <button className="btn btn-soft" type="button" onClick={() => setExpanded(true)} disabled={!imageUrl}>
            <Maximize2 size={16} />
            تكبير
          </button>
          <a className="btn btn-soft" href={imageUrl || "#"} download={downloadFileName} aria-disabled={!imageUrl}>
            <Download size={16} />
            تحميل الأصلية
          </a>
          <button className="btn btn-soft" type="button" onClick={copyImage} disabled={!imageUrl}>
            <Clipboard size={16} />
            نسخ الصورة
          </button>
          <button className="btn btn-gold" type="button" onClick={regenerate} disabled={isPending}>
            {isPending ? <RefreshCw size={16} className="spin" /> : <RefreshCw size={16} />}
            إعادة توليد
          </button>
          <button className="btn btn-soft" type="button" onClick={refresh}>
            <Check size={16} />
            تحديث الحالة
          </button>
          {imageUrl ? (
            <a className="btn btn-soft" href={imageUrl} target="_blank" rel="noreferrer">
              <ExternalLink size={16} />
              فتح
            </a>
          ) : null}
        </div>
      </div>

      {expanded && imageUrl ? (
        <div className="post-image-admin-modal" role="dialog" aria-modal="true" aria-label="معاينة صورة البوست">
          <button className="post-image-admin-modal-close" type="button" onClick={() => setExpanded(false)} aria-label="إغلاق">
            <X size={20} />
          </button>
          <img src={imageUrl} alt="صورة البوست بالحجم الكبير" />
        </div>
      ) : null}
    </div>
  );
}
