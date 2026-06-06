import { Image, MonitorPlay, Save, Video } from "lucide-react";
import { ImageCropUploader } from "@/components/ImageCropUploader";
import { getHomePreviewSettings } from "@/lib/preview-settings";
import { getTemplatesWithSettings } from "@/lib/template-settings";

export const dynamic = "force-dynamic";

export default async function AdminPreviewPage({ searchParams }: { searchParams: Promise<{ saved?: string }> }) {
  const [params, settings, templates] = await Promise.all([searchParams, getHomePreviewSettings(), getTemplatesWithSettings()]);
  const selectedTemplate = templates.find((template) => template.slug === settings.templateSlug) || templates[0];

  return (
    <>
      <div className="dashboard-head">
        <div>
          <span className="eyebrow">Homepage Preview</span>
          <h1>إدارة معاينة الصفحة الرئيسية</h1>
          <p>اختار اللي يظهر داخل مربع المعاينة في الرئيسية: صورة، فيديو، أو قالب من القوالب.</p>
        </div>
      </div>

      {params.saved ? <div className="notice success">تم حفظ إعدادات المعاينة وتحديث الصفحة الرئيسية.</div> : null}

      <section className="preview-admin-grid">
        <article className="panel preview-admin-form-card">
          <div className="admin-card-head">
            <MonitorPlay size={24} />
            <div>
              <span className="eyebrow">Preview Source</span>
              <h2>محتوى المعاينة</h2>
            </div>
          </div>

          <form className="admin-form-grid compact-controls" action="/api/admin/preview" method="post" encType="multipart/form-data">
            <label className="preview-option-card">
              <input name="mode" type="radio" value="template" defaultChecked={settings.mode === "template"} />
              <span>
                <MonitorPlay size={18} />
                قالب جاهز
              </span>
            </label>
            <label className="preview-option-card">
              <input name="mode" type="radio" value="image" defaultChecked={settings.mode === "image"} />
              <span>
                <Image size={18} />
                صورة
              </span>
            </label>
            <label className="preview-option-card">
              <input name="mode" type="radio" value="video" defaultChecked={settings.mode === "video"} />
              <span>
                <Video size={18} />
                فيديو
              </span>
            </label>

            <label className="field">
              <span>اختيار قالب للمعاينة</span>
              <select name="templateSlug" defaultValue={selectedTemplate?.slug || "royal-envelope"}>
                {templates.map((template) => (
                  <option key={template.slug} value={template.slug}>
                    {template.arabicName}
                  </option>
                ))}
              </select>
            </label>

            <label className="field">
              <span>رابط صورة جاهزة</span>
              <input name="imageUrl" defaultValue={settings.imageUrl} placeholder="/assets/templates/royal-envelope.svg" />
            </label>

            <label className="field">
              <span>رابط فيديو مباشر</span>
              <input name="videoUrl" defaultValue={settings.videoUrl} placeholder="/assets/video/preview.mp4 أو https://..." />
            </label>

            <label className="field full">
              <span>رفع فيديو للمعاينة</span>
              <input name="previewVideo" type="file" accept="video/mp4,video/webm,video/quicktime" />
              <small>يفضل فيديو عمودي خفيف، والحد الأقصى 35MB.</small>
            </label>

            <div className="field full">
              <ImageCropUploader name="previewImage" label="رفع صورة للمعاينة" targetWidth={900} targetHeight={1500} maxFiles={1} defaultImages={settings.imageUrl ? [settings.imageUrl] : []} />
            </div>

            <button className="btn btn-gold btn-glow admin-submit" type="submit">
              <Save size={18} />
              حفظ المعاينة
            </button>
          </form>
        </article>

        <article className="panel preview-admin-live-card">
          <div className="admin-card-head">
            <MonitorPlay size={24} />
            <div>
              <span className="eyebrow">Live Result</span>
              <h2>شكلها في الرئيسية</h2>
            </div>
          </div>
          <div className="preview-admin-phone">
            {settings.mode === "image" && settings.imageUrl ? (
              <img src={settings.imageUrl} alt="معاينة الصورة الحالية" />
            ) : settings.mode === "video" && settings.videoUrl ? (
              <video src={settings.videoUrl} muted loop playsInline autoPlay controls />
            ) : (
              <iframe src={`/templates/${selectedTemplate?.slug || "royal-envelope"}/preview?silentPreview=1`} title="معاينة القالب الحالية" loading="lazy" allow="geolocation; notifications" />
            )}
          </div>
        </article>
      </section>
    </>
  );
}
