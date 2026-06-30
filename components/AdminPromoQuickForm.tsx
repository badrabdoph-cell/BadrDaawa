"use client";

import { Save, UploadCloud } from "lucide-react";
import { useMemo, useState } from "react";

type AdminPromoQuickFormProps = {
  action: (formData: FormData) => void | Promise<void>;
};

function cleanCode(value: string) {
  return value.trim().replace(/\s+/g, "").toUpperCase().replace(/[^\p{L}\p{N}_-]+/gu, "").slice(0, 32);
}

export function AdminPromoQuickForm({ action }: AdminPromoQuickFormProps) {
  const [promoCode, setPromoCode] = useState("");
  const [discountType, setDiscountType] = useState("NONE");
  const needsDiscountValue = discountType === "PERCENTAGE" || discountType === "FIXED_AMOUNT";
  const previewPath = useMemo(() => `/r/${cleanCode(promoCode) || "BADR"}`, [promoCode]);

  return (
    <form className="promo-quick-form" action={action} encType="multipart/form-data">
      <div className="promo-quick-form-head">
        <span className="eyebrow">إنشاء سريع</span>
        <h2>بروموكود جديد</h2>
        <p>املأ أهم البيانات فقط، وسيتم إنشاء الشريك والرابط وQR تلقائياً.</p>
      </div>

      <label className="field">
        <span>اسم الشريك أو المصور</span>
        <input name="displayName" placeholder="مثال: Badr Studio" required minLength={2} />
      </label>

      <label className="field">
        <span>البروموكود</span>
        <input name="promoCode" dir="ltr" placeholder="BADR" value={promoCode} onChange={(event) => setPromoCode(event.target.value)} />
        <small dir="ltr">الرابط المختصر: {previewPath}</small>
      </label>

      <div className="promo-form-row">
        <label className="field">
          <span>نوع الخصم</span>
          <select name="discountType" value={discountType} onChange={(event) => setDiscountType(event.target.value)}>
            <option value="NONE">بدون خصم</option>
            <option value="PERCENTAGE">نسبة مئوية</option>
            <option value="FIXED_AMOUNT">مبلغ ثابت</option>
            <option value="FREE_INVITATION">دعوة مجانية</option>
          </select>
        </label>
        {needsDiscountValue ? (
          <label className="field">
            <span>{discountType === "PERCENTAGE" ? "نسبة الخصم" : "قيمة الخصم"}</span>
            <input name="discountValue" inputMode="decimal" placeholder={discountType === "PERCENTAGE" ? "20" : "150"} required />
          </label>
        ) : null}
      </div>

      <label className="field">
        <span>لوجو المصور / الشريك</span>
        <input name="logoFile" type="file" accept="image/png,image/jpeg,image/webp,image/avif,image/heic,image/heif" />
        <small>
          <UploadCloud size={13} />
          اختياري. إذا لم ترفع صورة سيتم استخدام شعار الموقع الأساسي.
        </small>
      </label>

      <label className="toggle-field">
        <input name="showPartnerCard" type="checkbox" defaultChecked />
        <span>إظهار بطاقة الشريك داخل الدعوة</span>
      </label>

      <button className="btn btn-gold btn-glow" type="submit">
        <Save size={17} />
        إنشاء البروموكود
      </button>
    </form>
  );
}
