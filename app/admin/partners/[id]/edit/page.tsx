import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Save, Sparkles, UploadCloud } from "lucide-react";
import { prisma } from "@/lib/db";
import { updatePartnerAction } from "../../actions";

export const dynamic = "force-dynamic";

export default async function EditPartnerPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  if (!prisma) return <div className="notice danger">قاعدة البيانات غير متاحة حالياً.</div>;

  const partner = await prisma.partner.findUnique({
    where: { id },
    include: { promoCodes: { where: { deletedAt: null }, orderBy: { createdAt: "desc" }, take: 1 } },
  });

  if (!partner) notFound();
  const primaryPromo = partner.promoCodes[0];

  return (
    <section className="admin-command-center partner-admin-page">
      <div className="dashboard-head">
        <div>
          <span className="eyebrow">تعديل الشريك</span>
          <h1>{partner.displayName}</h1>
          <p>عدّل بيانات الشريك أو البروموكود. عند تغيير الكود يتم تحديث الرابط المختصر والـ QR تلقائياً.</p>
        </div>
        <div className="dashboard-actions">
          <Link className="btn btn-soft" href={`/admin/partners/${partner.id}`}>
            <ArrowLeft size={17} />
            رجوع
          </Link>
        </div>
      </div>

      {query.error ? <div className="notice danger">راجع البيانات. الاسم مطلوب والكود لا يمكن أن يكون مكررًا.</div> : null}

      <form className="partner-editor-form" action={updatePartnerAction} encType="multipart/form-data">
        <input type="hidden" name="id" value={partner.id} />
        <section className="panel">
          <div className="admin-card-head">
            <Sparkles size={22} />
            <div>
              <span className="eyebrow">البيانات العامة</span>
              <h2>البيانات العامة</h2>
            </div>
          </div>
          <div className="dynamic-page-form-grid">
            <label className="field">
              <span>اسم الشريك</span>
              <input name="displayName" defaultValue={partner.displayName} required minLength={2} />
            </label>
            <label className="field">
              <span>لوجو المصور / الشريك</span>
              <input name="logoFile" type="file" accept="image/png,image/jpeg,image/webp,image/avif,image/heic,image/heif" />
              <small>
                <UploadCloud size={13} />
                اتركها فارغة للاحتفاظ بالصورة الحالية.
              </small>
            </label>
            <label className="field">
              <span>رابط فيسبوك</span>
              <input name="facebookUrl" dir="ltr" defaultValue={partner.facebookUrl || ""} placeholder="https://facebook.com/..." />
            </label>
            <label className="field">
              <span>رابط إنستجرام</span>
              <input name="instagramUrl" dir="ltr" defaultValue={partner.instagramUrl || ""} placeholder="https://instagram.com/..." />
            </label>
          </div>
        </section>

        <section className="panel">
          <div className="admin-card-head">
            <Sparkles size={22} />
            <div>
              <span className="eyebrow">إعدادات الشريك</span>
              <h2>إعدادات الشريك</h2>
            </div>
          </div>
          <div className="dynamic-page-form-grid">
            <label className="field">
              <span>نوع الشريك</span>
              <select name="partnerType" defaultValue={partner.partnerType}>
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
              <select name="tier" defaultValue={partner.tier}>
                <option value="FREE">مجاني</option>
                <option value="SILVER">فضي</option>
                <option value="GOLD">ذهبي</option>
                <option value="PLATINUM">بلاتيني</option>
              </select>
            </label>
            <label className="field">
              <span>الحالة</span>
              <select name="status" defaultValue={partner.status}>
                <option value="DRAFT">مسودة</option>
                <option value="ACTIVE">نشط</option>
                <option value="PAUSED">متوقف</option>
                <option value="EXPIRED">منتهي</option>
                <option value="ARCHIVED">مؤرشف</option>
              </select>
            </label>
          </div>
        </section>

        <section className="panel">
          <div className="admin-card-head">
            <Sparkles size={22} />
            <div>
              <span className="eyebrow">إعدادات البروموكود</span>
              <h2>البروموكود والخصم</h2>
            </div>
          </div>
          <div className="dynamic-page-form-grid">
            <label className="field">
              <span>البروموكود</span>
              <input name="promoCode" dir="ltr" defaultValue={primaryPromo?.code || ""} placeholder="مثال: BADR" />
              <small>سيصبح الرابط المختصر بهذا الشكل: /r/BADR</small>
            </label>
            <label className="field">
              <span>نوع الخصم</span>
              <select name="discountType" defaultValue={primaryPromo?.discountType || "NONE"}>
                <option value="NONE">بدون خصم</option>
                <option value="PERCENTAGE">نسبة مئوية</option>
                <option value="FIXED_AMOUNT">مبلغ ثابت</option>
                <option value="FREE_INVITATION">دعوة مجانية</option>
              </select>
            </label>
            <label className="field">
              <span>قيمة الخصم</span>
              <input name="discountValue" inputMode="decimal" defaultValue={primaryPromo?.discountValue ? String(primaryPromo.discountValue) : ""} placeholder="20 أو 150" />
            </label>
            <label className="toggle-field">
              <input name="showPartnerCard" type="checkbox" defaultChecked={partner.showPartnerCard} />
              <span>إظهار بطاقة الشريك داخل الدعوة</span>
            </label>
          </div>
        </section>

        <section className="panel">
          <div className="admin-card-head">
            <Sparkles size={22} />
            <div>
              <span className="eyebrow">ملاحظات</span>
              <h2>ملاحظات داخلية</h2>
            </div>
          </div>
          <label className="field">
            <span>ملاحظات خاصة</span>
            <textarea name="internalNotes" rows={5} defaultValue={partner.internalNotes || ""} />
          </label>
        </section>

        <div className="button-row">
          <button className="btn btn-gold" type="submit">
            <Save size={17} />
            حفظ التعديلات
          </button>
          <Link className="btn btn-soft" href={`/admin/partners/${partner.id}`}>إلغاء</Link>
        </div>
      </form>
    </section>
  );
}
