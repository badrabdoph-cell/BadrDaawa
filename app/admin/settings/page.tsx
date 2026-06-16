import Link from "next/link";
import { Camera, ExternalLink, Home, Image, Mail, Map, Phone, Save, Search, Settings } from "lucide-react";
import { acceptedImageFormats } from "@/lib/image-formats";
import { getHomePreviewSettings } from "@/lib/preview-settings";
import { getSiteSettings } from "@/lib/site-settings";
import { getTemplatesWithSettings } from "@/lib/template-settings";
import { getGoogleMapsSettings } from "@/lib/google-maps-settings";

export const dynamic = "force-dynamic";

function notice(saved?: string, error?: string) {
  if (error) return { kind: "danger", text: "تعذر حفظ الإعدادات. راجع البيانات وحاول مرة أخرى." };
  if (saved) return { kind: "success", text: "تم حفظ إعدادات الموقع وتحديث الصفحات العامة." };
  return null;
}

export default async function AdminSiteSettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string; error?: string }>;
}) {
  const [params, settings, previewSettings, templates, googleMapsSettings] = await Promise.all([searchParams, getSiteSettings(), getHomePreviewSettings(), getTemplatesWithSettings(), getGoogleMapsSettings()]);
  const message = notice(params.saved, params.error);

  return (
    <section className="admin-command-center site-settings-admin">
      <div className="dashboard-head">
        <div>
          <span className="eyebrow">Site Settings</span>
          <h1>مركز إعدادات الموقع</h1>
          <p>إدارة الهوية، التواصل، SEO، الصفحة الرئيسية، وظهور بيانات المصور من مكان واحد مع الحفاظ على الإعدادات الحالية.</p>
        </div>
        <Link className="btn btn-soft" href="/" target="_blank">
          <ExternalLink size={17} />
          فتح الموقع
        </Link>
      </div>

      {message ? <div className={message.kind === "danger" ? "notice danger" : "notice success"}>{message.text}</div> : null}

      <form className="site-settings-form" action="/api/admin/settings" method="post" encType="multipart/form-data">
        <article className="panel site-settings-card">
          <div className="admin-card-head">
            <Settings size={22} />
            <div>
              <span className="eyebrow">Identity</span>
              <h2>هوية الموقع</h2>
            </div>
          </div>
          <div className="admin-form-grid">
            <label className="field">
              <span>اسم الموقع</span>
              <input name="siteName" defaultValue={settings.siteName} required maxLength={80} />
            </label>
            <label className="field">
              <span>رابط الشعار</span>
              <input name="logoUrl" defaultValue={settings.logoUrl} placeholder="/uploads/previews/logo.webp" />
            </label>
            <label className="field">
              <span>رفع شعار جديد</span>
              <input name="logoFile" type="file" accept={acceptedImageFormats} />
            </label>
            <label className="field full">
              <span>وصف الموقع</span>
              <textarea name="siteDescription" defaultValue={settings.siteDescription} rows={3} maxLength={260} />
            </label>
          </div>
          {settings.logoUrl ? (
            <div className="site-settings-logo-preview">
              <Image size={18} />
              <img src={settings.logoUrl} alt="الشعار الحالي" />
              <span>{settings.logoUrl}</span>
            </div>
          ) : null}
        </article>

        <article className="panel site-settings-card">
          <div className="admin-card-head">
            <Phone size={22} />
            <div>
              <span className="eyebrow">Contact</span>
              <h2>التواصل والروابط الاجتماعية</h2>
              <p>هذه الروابط عامة للموقع كله، وتتحكم في أزرار السوشيال داخل الدعوات عند إضافتها.</p>
            </div>
          </div>
          <div className="admin-form-grid">
            <label className="field">
              <span>رقم هاتف الموقع العام</span>
              <textarea name="contactPhones" defaultValue={settings.contactPhones.join("\n")} rows={4} placeholder="رقم في كل سطر" />
            </label>
            <label className="field">
              <span>رابط واتساب</span>
              <input name="whatsappUrl" defaultValue={settings.whatsappUrl} placeholder="https://wa.me/..." />
            </label>
            <label className="field">
              <span>البريد الإلكتروني</span>
              <input name="email" type="email" defaultValue={settings.email} placeholder="hello@example.com" />
            </label>
            <label className="field">
              <span>فيسبوك</span>
              <input name="facebook" defaultValue={settings.socialLinks.facebook} />
            </label>
            <label className="field">
              <span>إنستجرام</span>
              <input name="instagram" defaultValue={settings.socialLinks.instagram} />
            </label>
            <label className="field">
              <span>تيك توك</span>
              <input name="tiktok" defaultValue={settings.socialLinks.tiktok} />
            </label>
            <label className="field">
              <span>يوتيوب</span>
              <input name="youtube" defaultValue={settings.socialLinks.youtube} />
            </label>
            <label className="field">
              <span>تيليجرام</span>
              <input name="telegram" defaultValue={settings.socialLinks.telegram} />
            </label>
          </div>
        </article>

        <article className="panel site-settings-card">
          <div className="admin-card-head">
            <Search size={22} />
            <div>
              <span className="eyebrow">SEO</span>
              <h2>إعدادات SEO الأساسية</h2>
            </div>
          </div>
          <div className="admin-form-grid">
            <label className="field">
              <span>عنوان الموقع</span>
              <input name="seoTitle" defaultValue={settings.seo.title} maxLength={90} />
            </label>
            <label className="field">
              <span>عنوان المشاركة</span>
              <input name="ogTitle" defaultValue={settings.seo.ogTitle} maxLength={90} />
            </label>
            <label className="field">
              <span>الكلمات المفتاحية</span>
              <input name="seoKeywords" defaultValue={settings.seo.keywords} />
            </label>
            <label className="field">
              <span>وصف البحث</span>
              <textarea name="seoDescription" defaultValue={settings.seo.description} rows={3} maxLength={180} />
            </label>
            <label className="field">
              <span>وصف المشاركة</span>
              <textarea name="ogDescription" defaultValue={settings.seo.ogDescription} rows={3} maxLength={180} />
            </label>
          </div>
        </article>

        <article className="panel site-settings-card">
          <div className="admin-card-head">
            <Home size={22} />
            <div>
              <span className="eyebrow">Homepage</span>
              <h2>إعدادات الصفحة الرئيسية</h2>
            </div>
          </div>
          <div className="site-settings-toggles">
            <label className="admin-toggle-row template-inline-toggle">
              <input name="showFeatures" type="checkbox" defaultChecked={settings.homepage.showFeatures} />
              عرض قسم المميزات
            </label>
            <label className="admin-toggle-row template-inline-toggle">
              <input name="showPreview" type="checkbox" defaultChecked={settings.homepage.showPreview} />
              عرض معاينة القالب
            </label>
            <label className="admin-toggle-row template-inline-toggle">
              <input name="showPricing" type="checkbox" defaultChecked={settings.homepage.showPricing} />
              عرض الأسعار
            </label>
          </div>
          <div className="admin-form-grid">
            <label className="field">
              <span>زر الطلب الرئيسي</span>
              <input name="primaryCtaLabel" defaultValue={settings.homepage.primaryCtaLabel} />
            </label>
            <label className="field">
              <span>زر القوالب</span>
              <input name="secondaryCtaLabel" defaultValue={settings.homepage.secondaryCtaLabel} />
            </label>
            <label className="field">
              <span>قالب معاينة الرئيسية</span>
              <select name="homePreviewTemplateSlug" defaultValue={previewSettings.templateSlug}>
                {templates.map((template) => (
                  <option key={template.slug} value={template.slug}>
                    {template.arabicName}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>نوع المعاينة</span>
              <select name="homePreviewMode" defaultValue={previewSettings.mode}>
                <option value="template">قالب جاهز</option>
                <option value="image">صورة</option>
                <option value="video">فيديو</option>
              </select>
            </label>
            <label className="field full">
              <span>رابط ميديا المعاينة</span>
              <input name="homePreviewMediaUrl" defaultValue={previewSettings.mode === "video" ? previewSettings.videoUrl : previewSettings.imageUrl} placeholder="/uploads/previews/file.jpg أو https://example.com/preview.mp4" />
              <small>يمكنك استخدام صفحة المعاينة المتخصصة لرفع صورة أو فيديو جديد.</small>
            </label>
          </div>
        </article>

        <article className="panel site-settings-card">
          <div className="admin-card-head">
            <Camera size={22} />
            <div>
              <span className="eyebrow">Photographer</span>
              <h2>ظهور بيانات المصور</h2>
            </div>
          </div>
          <label className="admin-toggle-row template-inline-toggle site-settings-main-toggle">
            <input name="showPhotographerCard" type="checkbox" defaultChecked={settings.photographer.showPhotographerCard} />
            إظهار بيانات المصور داخل الدعوات عند تفعيلها في الدعوة
          </label>
          <div className="admin-form-grid">
            <label className="field">
              <span>اسم المصور الافتراضي</span>
              <input name="photographerName" defaultValue={settings.photographer.defaultName} />
            </label>
            <label className="field">
              <span>إنستجرام المصور الافتراضي</span>
              <input name="photographerInstagramUrl" defaultValue={settings.photographer.defaultInstagramUrl} />
            </label>
            <label className="field">
              <span>فيسبوك المصور الافتراضي</span>
              <input name="photographerFacebookUrl" defaultValue={settings.photographer.defaultFacebookUrl} />
            </label>
          </div>
          <p className="site-settings-note">هذا الإعداد لا يضيف المصور تلقائياً لأي دعوة؛ هو يتحكم فقط في السماح بظهور بيانات المصور عندما تكون مفعلة داخل الدعوة نفسها.</p>
        </article>

        <article className="panel site-settings-card">
          <div className="admin-card-head">
            <Map size={22} />
            <div>
              <span className="eyebrow">Google Maps</span>
              <h2>مفتاح Google Maps API</h2>
            </div>
          </div>
          <div className="admin-form-grid">
            <label className="field full">
              <span>مفتاح API</span>
              <input name="googleMapsApiKey" defaultValue={googleMapsSettings.apiKey} placeholder="AIzaSy..." dir="ltr" />
              <small>مطلوب لاستخدام خرائط Google في اختيار الموقع. يمكنك الحصول على مفتاح من <a href="https://console.cloud.google.com/apis/credentials" target="_blank" rel="noopener">Google Cloud Console</a>. يجب تفعيل <strong>Maps JavaScript API</strong> و <strong>Geocoding API</strong>.</small>
            </label>
          </div>
        </article>

        <div className="site-settings-sticky-actions">
          <span>
            <Mail size={16} />
            يتم تحديث ملفات الإعدادات الحالية بدون كسر التوافق.
          </span>
          <button className="btn btn-gold btn-glow" type="submit">
            <Save size={18} />
            حفظ إعدادات الموقع
          </button>
        </div>
      </form>
    </section>
  );
}
