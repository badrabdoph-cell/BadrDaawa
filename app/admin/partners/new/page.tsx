import Link from "next/link";
import { ArrowLeft, Save, Sparkles, UploadCloud } from "lucide-react";
import { AdminPartnerCenterNav } from "@/components/AdminPartnerCenterNav";
import { PartnerPromoPreviewFields } from "@/components/PartnerPromoPreviewFields";
import { createPartnerAction } from "../actions";

export const dynamic = "force-dynamic";

export default async function NewPartnerPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;
  return (
    <section className="admin-command-center partner-admin-page">
      <div className="dashboard-head">
        <div>
          <span className="eyebrow">شريك جديد</span>
          <h1>إنشاء شريك جديد</h1>
          <p>سيتم إنشاء شريك عام مع بروموكود افتراضي ورابط إحالة قصير وQR واشتراك أولي.</p>
        </div>
        <div className="dashboard-actions">
          <Link className="btn btn-soft" href="/admin/partners/directory">
            <ArrowLeft size={17} />
            رجوع
          </Link>
        </div>
      </div>

      <AdminPartnerCenterNav />

      {params.error ? <div className="notice danger">راجع بيانات الشريك. الاسم مطلوب والكود يجب ألا يكون مكررًا.</div> : null}

      <form className="partner-editor-form partner-wizard" action={createPartnerAction} encType="multipart/form-data">
        <div className="partner-wizard-steps" aria-label="خطوات إنشاء الشريك">
          <span className="active">بيانات الشريك</span>
          <span>البروموكود</span>
          <span>الخصم</span>
          <span>المراجعة</span>
        </div>

        <section className="panel partner-wizard-panel">
          <div className="admin-card-head">
            <Sparkles size={22} />
            <div>
              <span className="eyebrow">الخطوة 1</span>
              <h2>بيانات الشريك</h2>
            </div>
          </div>
          <div className="dynamic-page-form-grid">
            <label className="field">
              <span>اسم الشريك</span>
              <input name="displayName" placeholder="مثال: Badr Studio" required minLength={2} />
            </label>
            <label className="field">
              <span>لوجو المصور / الشريك</span>
              <input name="logoFile" type="file" accept="image/png,image/jpeg,image/webp,image/avif,image/heic,image/heif" />
              <small>
                <UploadCloud size={13} />
                إذا لم ترفع صورة سيتم استخدام شعار الموقع الأساسي تلقائيًا.
              </small>
            </label>
            <label className="field">
              <span>رابط فيسبوك</span>
              <input name="facebookUrl" dir="ltr" placeholder="https://facebook.com/..." />
            </label>
            <label className="field">
              <span>رابط إنستجرام</span>
              <input name="instagramUrl" dir="ltr" placeholder="https://instagram.com/..." />
            </label>
          </div>
        </section>

        <section className="panel partner-wizard-panel">
          <div className="admin-card-head">
            <Sparkles size={22} />
            <div>
              <span className="eyebrow">تصنيف الشريك</span>
              <h2>إعدادات الشريك</h2>
            </div>
          </div>
          <div className="dynamic-page-form-grid">
            <label className="field">
              <span>نوع الشريك</span>
              <select name="partnerType" defaultValue="PHOTOGRAPHER">
                <option value="PHOTOGRAPHER">مصور فوتوغرافي</option>
                <option value="VIDEOGRAPHER">مصور فيديو</option>
                <option value="HALL">قاعة أفراح</option>
                <option value="PLANNER">منظم حفلات</option>
                <option value="DJ">DJ</option>
                <option value="MAKEUP_ARTIST">ميكب آرتيست</option>
                <option value="DECORATOR">ديكور</option>
                <option value="OTHER">أخرى</option>
              </select>
            </label>
            <label className="field">
              <span>الفئة</span>
              <select name="tier" defaultValue="FREE">
                <option value="FREE">مجاني</option>
                <option value="SILVER">فضي</option>
                <option value="GOLD">ذهبي</option>
                <option value="PLATINUM">بلاتيني</option>
              </select>
            </label>
            <label className="field">
              <span>الحالة</span>
              <select name="status" defaultValue="ACTIVE">
                <option value="DRAFT">مسودة</option>
                <option value="ACTIVE">نشط</option>
                <option value="PAUSED">متوقف</option>
              </select>
            </label>
          </div>
        </section>

        <section className="panel partner-wizard-panel">
          <div className="admin-card-head">
            <Sparkles size={22} />
            <div>
              <span className="eyebrow">الخطوة 2</span>
              <h2>البروموكود</h2>
            </div>
          </div>
          <div className="dynamic-page-form-grid">
            <PartnerPromoPreviewFields />
          </div>
        </section>

        <section className="panel partner-wizard-panel">
          <div className="admin-card-head">
            <Sparkles size={22} />
            <div>
              <span className="eyebrow">الخطوة 3</span>
              <h2>الخصم</h2>
            </div>
          </div>
          <div className="dynamic-page-form-grid">
            <label className="field">
              <span>نوع الخصم</span>
              <select name="discountType" defaultValue="NONE">
                <option value="NONE">بدون خصم</option>
                <option value="PERCENTAGE">نسبة مئوية</option>
                <option value="FIXED_AMOUNT">مبلغ ثابت</option>
                <option value="FREE_INVITATION">دعوة مجانية</option>
              </select>
            </label>
            <label className="field">
              <span>قيمة الخصم</span>
              <input name="discountValue" inputMode="decimal" placeholder="20 أو 150" />
            </label>
            <label className="toggle-field">
              <input name="showPartnerCard" type="checkbox" defaultChecked />
              <span>إظهار بطاقة الشريك داخل الدعوة</span>
            </label>
          </div>
        </section>

        <section className="panel partner-wizard-panel">
          <div className="admin-card-head">
            <Sparkles size={22} />
            <div>
              <span className="eyebrow">الخطوة 4</span>
              <h2>المراجعة</h2>
            </div>
          </div>
          <p className="admin-note">راجع البيانات قبل الحفظ. سيتم إنشاء UUID ثابت للشريك، وبروموكود قابل للتعديل، ورابط قصير، واشتراك أولي بدون التأثير على أي بيانات قديمة.</p>
          <label className="field">
            <span>ملاحظات خاصة</span>
            <textarea name="internalNotes" rows={5} placeholder="أي تفاصيل داخلية عن الاتفاق أو الاشتراك." />
          </label>
        </section>

        <div className="button-row">
          <button className="btn btn-gold" type="submit">
            <Save size={17} />
            حفظ الشريك
          </button>
          <Link className="btn btn-soft" href="/admin/partners/directory">إلغاء</Link>
        </div>
      </form>
    </section>
  );
}
