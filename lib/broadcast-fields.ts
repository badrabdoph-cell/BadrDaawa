import type { HomeContent } from "./home-content";

export type BroadcastField = {
  key: string;
  label: string;
  kind: "text" | "media";
  value: string;
};

export function getBroadcastPreviewValue(settings: { mode: string; videoUrl: string; imageUrl: string; templateSlug: string }) {
  if (settings.mode === "video") return settings.videoUrl;
  if (settings.mode === "image") return settings.imageUrl;
  return settings.templateSlug;
}

export function buildBroadcastFields(content: HomeContent, previewValue: string): BroadcastField[] {
  return [
    { key: "hero.kicker", label: "النص العلوي", kind: "text", value: content.hero.kicker },
    { key: "hero.mainTitle", label: "العنوان الرئيسي", kind: "text", value: content.hero.mainTitle },
    { key: "hero.accentTitle", label: "العنوان الملون", kind: "text", value: content.hero.accentTitle },
    { key: "hero.description", label: "وصف البداية", kind: "text", value: content.hero.description },
    { key: "hero.primaryCta", label: "زر الطلب", kind: "text", value: content.hero.primaryCta },
    { key: "hero.secondaryCta", label: "زر الأشكال", kind: "text", value: content.hero.secondaryCta },
    { key: "features.title", label: "عنوان المميزات", kind: "text", value: content.features.title },
    ...content.features.points.map((point) => ({ key: `features.points.${point.id}.text`, label: `ميزة: ${point.text}`, kind: "text" as const, value: point.text })),
    { key: "preview.eyebrow", label: "نص المعاينة الصغير", kind: "text", value: content.preview.eyebrow },
    { key: "preview.title", label: "عنوان المعاينة", kind: "text", value: content.preview.title },
    { key: "preview.badge", label: "شارة المعاينة", kind: "text", value: content.preview.badge },
    { key: "preview.fullInviteCta", label: "زر فتح الدعوة", kind: "text", value: content.preview.fullInviteCta },
    { key: "preview.orderCta", label: "زر طلب مشابه", kind: "text", value: content.preview.orderCta },
    { key: "preview.media", label: "ميديا المعاينة", kind: "media", value: previewValue },
    { key: "pricing.eyebrow", label: "نص الباقات الصغير", kind: "text", value: content.pricing.eyebrow },
    { key: "pricing.title", label: "عنوان الباقات", kind: "text", value: content.pricing.title },
    { key: "pricing.invitationPlanName", label: "اسم الباقة الأولى", kind: "text", value: content.pricing.invitationPlanName },
    { key: "pricing.invitationPrice", label: "سعر الباقة الأولى", kind: "text", value: content.pricing.invitationPrice },
    { key: "pricing.plusPlanName", label: "اسم الباقة الثانية", kind: "text", value: content.pricing.plusPlanName },
    { key: "pricing.plusPrice", label: "سعر الباقة الثانية", kind: "text", value: content.pricing.plusPrice },
    ...content.pricing.rows.map((row) => ({ key: `pricing.rows.${row.id}.feature`, label: `ميزة باقة: ${row.feature}`, kind: "text" as const, value: row.feature })),
  ];
}
