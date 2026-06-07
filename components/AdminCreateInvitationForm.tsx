import { ImagePlus, Link2, UploadCloud, WandSparkles } from "lucide-react";
import { CopyButton } from "@/components/CopyButton";
import { ImageCropUploader } from "@/components/ImageCropUploader";
import type { TemplateDefinition } from "@/lib/types";
import { getCustomerAdminPath } from "@/lib/slug";
import { getInvitationUrl, getSiteUrl } from "@/lib/utils";

const invitationImageSlots = [
  {
    title: "الغلاف",
    hint: "الصورة الأساسية",
    uploadLabel: "رفع الغلاف",
    targetWidth: 1200,
    targetHeight: 1600,
  },
  {
    title: "لقطة ثانية",
    hint: "تظهر في المعرض",
    uploadLabel: "رفع صورة ثانية",
    targetWidth: 1200,
    targetHeight: 1500,
  },
  {
    title: "تفاصيل",
    hint: "تستخدمها القوالب كصورة إضافية",
    uploadLabel: "رفع التفاصيل",
    targetWidth: 1200,
    targetHeight: 1500,
  },
];

export function AdminCreateInvitationForm({ created, error, demo, templates }: { created?: string; error?: string; demo?: string; templates: TemplateDefinition[] }) {
  const invitationUrl = created ? getInvitationUrl(created) : "";
  const clientAdminUrl = created ? `${getSiteUrl().replace(/\/$/, "")}${getCustomerAdminPath(created)}` : "";

  return (
    <section className="admin-create-card">
      <div className="admin-create-head">
        <div>
          <span className="eyebrow">Create Client Invitation</span>
          <h2>إنشاء دعوة عميل جديدة</h2>
          <p>اكتب بيانات الفرح وبيانات دخول العميل، وبعد الإنشاء هتظهر روابط الدعوة ولوحة تعديل العميل جاهزة للنسخ والإرسال.</p>
        </div>
        <WandSparkles size={30} />
      </div>
      {created ? (
        <div className="admin-created-links">
          <div className="admin-created-links-head">
            <Link2 size={18} />
            <strong>تم إنشاء الدعوة بنجاح</strong>
            {demo ? <span>تم حفظها احتياطيا لأن قاعدة البيانات لم تكمل العملية.</span> : null}
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
      {error ? <div className="notice danger">{error === "music" ? "رابط الموسيقى غير قابل للتشغيل. استخدم ملف مرفوع أو رابط صوت مباشر مثل MP3/WAV، وليس YouTube." : "راجع البيانات المطلوبة قبل الإنشاء، خصوصا تاريخ الفرح والحقول الأساسية."}</div> : null}
      <form className="admin-form-grid" action="/api/admin/invitations" method="post" encType="multipart/form-data">
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
          <span>القالب</span>
          <select name="templateSlug" defaultValue={templates[0]?.slug || "featured-1"}>
            {templates.map((template) => (
              <option key={template.slug} value={template.slug}>
                {template.arabicName}
              </option>
            ))}
          </select>
        </label>
        <div className="field full admin-audio-field">
          <span className="admin-gallery-title">
            <UploadCloud size={17} />
            موسيقى خاصة بالدعوة
          </span>
          <p>اختياري. لو رفعت ملف أو أضفت رابط صوت مباشر هنا، هيشتغل لهذه الدعوة فقط بدل موسيقى القالب. روابط YouTube لا تعمل كصوت مباشر.</p>
          <div className="admin-audio-grid">
            <label className="music-upload-box admin-audio-upload">
              <input name="audioFile" type="file" accept="audio/*,.mp3,.wav,.ogg,.webm,.m4a,.aac" />
              <UploadCloud size={22} />
              <strong>رفع صوت للدعوة</strong>
              <small>MP3, WAV, OGG, WEBM, M4A حتى 35MB</small>
            </label>
            <label className="field music-url-field">
              <span>أو رابط صوت مباشر</span>
              <input name="musicUrl" placeholder="https://example.com/song.mp3" />
              <small>اتركه فارغًا لاستخدام موسيقى القالب أو الموسيقى العامة.</small>
            </label>
          </div>
        </div>
        <div className="field full admin-gallery-field">
          <span className="admin-gallery-title">
            <ImagePlus size={17} />
            صور الدعوة
          </span>
          <p>ارفع الصور حسب دورها. كل القوالب هتقرأ نفس الترتيب: الغلاف ثم صورة ثانية ثم صورة تفاصيل، ولو صورة ناقصة هنكمل من صور نفس الدعوة بدل صور الديمو.</p>
          <div className="admin-gallery-slots">
            {invitationImageSlots.map((slot, index) => (
              <div className="admin-gallery-slot" key={slot.title}>
                <strong>{index + 1}</strong>
                <span>{slot.title}</span>
                <small>{slot.hint}</small>
                <ImageCropUploader label={slot.uploadLabel} name="galleryImage" targetWidth={slot.targetWidth} targetHeight={slot.targetHeight} maxFiles={1} />
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
