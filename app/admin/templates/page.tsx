import Link from "next/link";
import { Eye, Link2, Music2, Palette, Search, Settings2, ToggleLeft, ToggleRight } from "lucide-react";
import { AdminTextEditor } from "@/components/AdminTextEditor";
import { ImageCropUploader } from "@/components/ImageCropUploader";
import { getInvitationByCode } from "@/lib/invitation-data";
import { extractInvitationCodeFromInput, shouldShowPhotographerCard } from "@/lib/site-settings";
import { invitationTemplates } from "@/lib/templates";
import { getInvitationUrl } from "@/lib/utils";

export default async function AdminTemplatesPage({ searchParams }: { searchParams: Promise<{ invitation?: string }> }) {
  const params = await searchParams;
  const searchedCode = extractInvitationCodeFromInput(params.invitation || "");
  const searchedInvitation = searchedCode ? await getInvitationByCode(searchedCode) : undefined;
  const showPhotographer = shouldShowPhotographerCard();

  return (
    <>
      <div className="dashboard-head">
        <div>
          <span className="eyebrow">Templates</span>
          <h1>إدارة القالب الحالي</h1>
          <p>كل قالب يظهر بمعاينة مباشرة، ومن قسم التعديل تتحكم في الألوان والصور والموسيقى وطريقة العرض.</p>
        </div>
      </div>

      <section className="template-admin-tools">
        <article className="panel template-search-panel">
          <Search size={24} />
          <h2>الوصول لقالب دعوة منشأة</h2>
          <p>اكتب رابط الدعوة أو الكود فقط، وسيظهر القالب المرتبط بها للتعديل والمعاينة.</p>
          <form className="template-link-search">
            <input name="invitation" defaultValue={params.invitation || ""} placeholder="مثال: https://site.com/badr-sarah-1 أو badr-sarah-1" />
            <button className="btn btn-gold" type="submit">
              بحث
            </button>
          </form>
          {searchedCode ? (
            <div className={searchedInvitation ? "notice success" : "notice danger"}>
              <Link2 size={18} />
              {searchedInvitation ? (
                <>
                  تم العثور على دعوة {searchedInvitation.groomName} و {searchedInvitation.brideName}: <strong>{getInvitationUrl(searchedInvitation.code)}</strong>
                  <Link className="btn btn-soft" href={`/${searchedInvitation.code}`}>
                    فتح المعاينة
                  </Link>
                </>
              ) : (
                <>لم يتم العثور على دعوة بهذا الرابط.</>
              )}
            </div>
          ) : null}
        </article>

        <article className="panel photographer-admin-panel">
          <Settings2 size={24} />
          <h2>ظهور مربع المصور</h2>
          <p>هذا التحكم خاص بالادمن الرئيسي للموقع بالكامل. لتفعيله أو إخفائه على الإنتاج استخدم المتغير التالي.</p>
          <label className="admin-toggle-row">
            <input type="checkbox" checked={showPhotographer} readOnly />
            <span>{showPhotographer ? "ظاهر الآن" : "مخفي الآن"}</span>
          </label>
          <code>SHOW_PHOTOGRAPHER_CARD={showPhotographer ? "true" : "false"}</code>
        </article>

        <article className="panel text-admin-panel">
          <h2>تعديل النصوص بالبحث</h2>
          <p>ابحث عن كلمة، اختر النص المطلوب، ثم عدله بدون أن يختفي أثناء الكتابة.</p>
          <AdminTextEditor />
        </article>
      </section>

      <div className="admin-template-workspace">
        {invitationTemplates.map((template) => (
          <article className="template-editor-card" key={template.slug}>
            <div className="template-live-preview">
              <iframe src="/badr-sarah-1" title={`معاينة ${template.arabicName}`} loading="lazy" allow="geolocation; autoplay" />
            </div>
            <div className="template-editor-body">
              <div className="template-editor-head">
                <div>
                  <span className="eyebrow">Live Template</span>
                  <h2>{template.arabicName}</h2>
                  <p>{template.concept}</p>
                </div>
                <span className="template-badge">{template.score}%</span>
              </div>
              <div className="button-row">
                <a className="btn btn-soft btn-icon" href="/badr-sarah-1" title="فتح المعاينة">
                  <Eye size={17} />
                </a>
                <button className="btn btn-soft" type="button">
                  {template.enabled ? <ToggleRight size={18} /> : <ToggleLeft size={18} />}
                  {template.enabled ? "مفعل" : "متوقف"}
                </button>
              </div>
              <details className="template-edit-details">
                <summary>
                  <Settings2 size={18} />
                  تعديل القالب
                </summary>
                <form className="template-edit-panel">
                  <div className="admin-form-grid compact-controls">
                    <label className="field">
                      <span>اسم القالب</span>
                      <input defaultValue={template.arabicName} />
                    </label>
                    <label className="field">
                      <span>التصنيف</span>
                      <input defaultValue={template.category} />
                    </label>
                    <label className="field full">
                      <span>فكرة القالب</span>
                      <textarea defaultValue={template.concept} rows={3} />
                    </label>
                    <label className="field">
                      <span>طريقة الفتح</span>
                      <input defaultValue={template.opening} />
                    </label>
                    <label className="field">
                      <span>نظام العرض</span>
                      <input defaultValue={template.layout} />
                    </label>
                    <label className="field full">
                      <span>الخطوط</span>
                      <input defaultValue={template.typography} />
                    </label>
                  </div>
                  <div className="template-edit-section">
                    <h3>
                      <Palette size={18} />
                      ألوان القالب
                    </h3>
                    <div className="color-control-grid">
                      {Object.entries(template.palette).map(([key, value]) => (
                        <label className="field color-field" key={key}>
                          <span>{key}</span>
                          <input type="color" defaultValue={value} />
                        </label>
                      ))}
                    </div>
                  </div>
                  <div className="template-edit-section">
                    <h3>
                      <Eye size={18} />
                      صور معاينة القالب
                    </h3>
                    <ImageCropUploader label="صور معاينة القالب" name="templateImage" maxFiles={3} defaultImages={[template.previewImage]} />
                  </div>
                  <div className="template-edit-section">
                    <h3>
                      <Music2 size={18} />
                      موسيقى القالب الافتراضية
                    </h3>
                    <label className="field">
                      <span>رابط الأغنية الافتراضي</span>
                      <input placeholder="اتركه فارغًا للموسيقى المؤقتة" />
                    </label>
                  </div>
                  <button className="btn btn-gold btn-glow" type="button">
                    حفظ إعدادات القالب
                  </button>
                </form>
              </details>
            </div>
          </article>
        ))}
      </div>
    </>
  );
}
