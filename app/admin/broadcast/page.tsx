import { BroadcastStudio, type BroadcastField } from "@/components/BroadcastStudio";
import { getHomeContent } from "@/lib/home-content";
import { getHomePreviewSettings } from "@/lib/preview-settings";
import { getTemplatesWithSettings } from "@/lib/template-settings";

export const dynamic = "force-dynamic";

export default async function AdminBroadcastPage({ searchParams }: { searchParams: Promise<{ saved?: string; error?: string }> }) {
  const [params, content, previewSettings, templates] = await Promise.all([searchParams, getHomeContent(), getHomePreviewSettings(), getTemplatesWithSettings()]);
  const previewValue = previewSettings.mode === "video" ? previewSettings.videoUrl : previewSettings.mode === "image" ? previewSettings.imageUrl : previewSettings.templateSlug;
  const fields: BroadcastField[] = [
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

  return (
    <>
      <div className="dashboard-head">
        <div>
          <span className="eyebrow">Broadcast Studio</span>
          <h1>شاشة بث الموقع</h1>
          <p>الموقع الحقيقي داخل لوحة الأدمن. اختار شكل الهاتف أو الكمبيوتر، واضغط علامة القلم بجانب أي عنصر لتعديله مباشرة.</p>
        </div>
      </div>

      {params.saved ? <div className="notice success">تم حفظ التعديل وتحديث الموقع وإرساله للمزامنة التلقائية.</div> : null}
      {params.error ? <div className="notice danger">تعذر حفظ التعديل. اختر عنصرًا صالحًا وحاول مرة أخرى.</div> : null}

      <BroadcastStudio
        fields={fields}
        previewTemplateSlug={previewSettings.templateSlug}
        templates={templates.filter((template) => template.enabled).map((template) => ({ slug: template.slug, arabicName: template.arabicName }))}
      />
    </>
  );
}
