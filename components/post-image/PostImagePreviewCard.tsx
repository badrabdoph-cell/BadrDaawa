"use client";

import type { CSSProperties } from "react";
import { formatPostImageCuriosityDate } from "@/lib/post-image/date";

type PostImagePreviewCardProps = {
  groomName: string;
  brideName: string;
  weddingDate: string;
  coverImageUrl?: string;
};

function displayName(value: string, fallback: string) {
  return value.trim() || fallback;
}

export function PostImagePreviewCard({ groomName, brideName, weddingDate, coverImageUrl }: PostImagePreviewCardProps) {
  const coupleLine = `${displayName(groomName, "اسم العريس")} هيتجوز ${displayName(brideName, "اسم العروسة")}`;
  const curiosityDate = formatPostImageCuriosityDate(weddingDate).replace("❤️", "♥");
  const coupleLength = coupleLine.replace(/\s+/g, "").length;
  const coupleFontCqw = coupleLength > 34 ? 5.15 : coupleLength > 26 ? 5.9 : coupleLength > 18 ? 6.8 : 7.8;

  return (
    <div className="post-image-preview-card" aria-label="معاينة صورة البوست" style={{ "--couple-font-cqw": coupleFontCqw } as CSSProperties}>
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
      <div className="post-image-preview-qr">
        <span />
        <span />
        <span />
        <small>QR</small>
      </div>
      <div className="post-image-preview-rule bottom-rule" />
      <div className="post-image-preview-footer">BADR DAAWA</div>
    </div>
  );
}
