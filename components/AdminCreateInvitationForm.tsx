import { ImagePlus, Link2, WandSparkles } from "lucide-react";
import { CopyButton } from "@/components/CopyButton";
import { ImageCropUploader } from "@/components/ImageCropUploader";
import type { TemplateDefinition } from "@/lib/types";
import { getCustomerAdminPath } from "@/lib/slug";
import { getInvitationUrl, getSiteUrl } from "@/lib/utils";

export function AdminCreateInvitationForm({ created, error, demo, templates }: { created?: string; error?: string; demo?: string; templates: TemplateDefinition[] }) {
  const invitationUrl = created ? getInvitationUrl(created) : "";
  const clientAdminUrl = created ? `${getSiteUrl().replace(/\/$/, "")}${getCustomerAdminPath(created)}` : "";

  return (
    <section className="admin-create-card">
      <div className="admin-create-head">
        <div>
          <span className="eyebrow">Create Client Invitation</span>
          <h2>إنشاء دعوة عميل جديدة</h2>
          <p>اكتب بيانات الفرح وبيانات دخول العميل. الرابط بيتولد تلقائيًا مثل: `badr-sarah-1` ولو الاسم اتكرر هيزود الرقم.</p>
        </div>
        <WandSparkles size={30} />
      </div>
      {created ? (
        <div className="admin-created-links">
          <div className="admin-created-links-head">
            <Link2 size={18} />
            <strong>تم إنشاء الدعوة بنجاح</strong>
            {demo ? <span>وضع ديمو بدون حفظ في قاعدة البيانات.</span> : null}
          </div>
          <div className="admin-created-link-box">
            <span>رابط الدعوة للعميل</span>
            <strong>{invitationUrl}</strong>
            <CopyButton className="btn btn-soft btn-glass" value={invitationUrl} label="نسخ الرابط" copiedLabel="تم النسخ" />
          </div>
          <div className="admin-created-link-box">
            <span>رابط لوحة تعديل العميل</span>
            <strong>{clientAdminUrl}</strong>
            <CopyButton className="btn btn-soft btn-glass" value={clientAdminUrl} label="نسخ رابط الأدمن" copiedLabel="تم النسخ" />
          </div>
        </div>
      ) : null}
      {error ? <div className="notice danger">راجع البيانات المطلوبة قبل الإنشاء.</div> : null}
      <form className="admin-form-grid" action="/api/admin/invitations" method="post">
        <label className="field">
          <span>اسم العريس</span>
          <input name="groomName" placeholder="بدر" required />
        </label>
        <label className="field">
          <span>اسم العروسة</span>
          <input name="brideName" placeholder="Sara" required />
        </label>
        <label className="field">
          <span>اسم العريس بالإنجليزي للرابط</span>
          <input name="groomEnglish" placeholder="badr" pattern="[A-Za-z0-9 -]+" required />
        </label>
        <label className="field">
          <span>اسم العروسة بالإنجليزي للرابط</span>
          <input name="brideEnglish" placeholder="Sara" pattern="[A-Za-z0-9 -]+" required />
        </label>
        <label className="field">
          <span>رقم موبايل العميل</span>
          <input name="phone" inputMode="tel" placeholder="01011511561" required />
        </label>
        <label className="field">
          <span>اسم دخول العميل</span>
          <input name="username" placeholder="badr-sarah" required />
        </label>
        <label className="field">
          <span>باسورد العميل</span>
          <input name="password" type="password" minLength={8} required />
        </label>
        <label className="field">
          <span>تاريخ الفرح</span>
          <input name="weddingDate" type="date" required />
        </label>
        <label className="field">
          <span>وقت الفرح</span>
          <input name="weddingTime" placeholder="07:00 مساءً" />
        </label>
        <label className="field">
          <span>اسم القاعة والعنوان</span>
          <input name="venue" placeholder="قاعة رويال - البحيرة" required />
        </label>
        <label className="field">
          <span>المدينة</span>
          <input name="city" placeholder="البحيرة" />
        </label>
        <label className="field">
          <span>رابط Google Maps</span>
          <input name="mapUrl" placeholder="https://maps.google.com/..." />
        </label>
        <label className="field">
          <span>رابط الأغنية</span>
          <input name="musicUrl" placeholder="اتركه فارغًا لاستخدام موسيقى القالب الافتراضية" />
        </label>
        <label className="field">
          <span>القالب</span>
          <select name="templateSlug" defaultValue={templates[0]?.slug || "featured-1"}>
            {templates.map((template) => (
              <option key={template.slug} value={template.slug}>
                {template.arabicName}
              </option>
            ))}
          </select>
        </label>
        <div className="field full admin-gallery-field">
          <span className="admin-gallery-title">
            <ImagePlus size={17} />
            صور الدعوة
          </span>
          <p>ارفع 3 صور صغيرة بالترتيب: الغلاف، لقطة ثانية، ولقطة ثالثة. الصور تتحفظ كرابط وتظهر للعميل مباشرة.</p>
          <div className="admin-gallery-slots">
            {["الغلاف", "الصورة الثانية", "الصورة الثالثة"].map((label, index) => (
              <div className="admin-gallery-slot" key={label}>
                <strong>{index + 1}</strong>
                <span>{label}</span>
                <ImageCropUploader label="اختار صورة" name="galleryImage" targetWidth={1200} targetHeight={1500} maxFiles={1} />
              </div>
            ))}
          </div>
        </div>
        <button className="btn btn-gold btn-glow admin-submit" type="submit">
          إنشاء دعوة العميل والرابط
        </button>
      </form>
    </section>
  );
}
