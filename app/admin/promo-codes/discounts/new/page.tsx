import Link from "next/link";
import { ArrowLeft, Percent, Save, TicketPercent } from "lucide-react";
import { AdminDiscountCenterNav } from "@/components/AdminDiscountCenterNav";
import { createDiscountPromoCodeAction } from "../../actions";

export const dynamic = "force-dynamic";

export default async function NewDiscountPromoCodePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;

  return (
    <section className="admin-command-center promo-admin-page discount-center-page">
      <div className="dashboard-head">
        <div>
          <span className="eyebrow">مركز أكواد الخصم</span>
          <h1>إنشاء كود خصم</h1>
          <p>كود خصم عام مستقل عن الشركاء. يستخدم للخصم فقط ولا يربط الطلب بأي مصور أو شريك.</p>
        </div>
        <div className="dashboard-actions">
          <Link className="btn btn-soft" href="/admin/promo-codes/discounts">
            <ArrowLeft size={17} />
            رجوع
          </Link>
        </div>
      </div>

      <AdminDiscountCenterNav />

      {params.error ? <div className="notice danger">راجع بيانات كود الخصم. الاسم مطلوب وقيمة الخصم مطلوبة عند اختيار نسبة أو مبلغ ثابت.</div> : null}

      <form className="partner-editor-form discount-code-form" action={createDiscountPromoCodeAction}>
        <section className="panel">
          <div className="admin-card-head">
            <TicketPercent size={22} />
            <div>
              <span className="eyebrow">البيانات الأساسية</span>
              <h2>بيانات الكود</h2>
            </div>
          </div>
          <div className="dynamic-page-form-grid">
            <label className="field">
              <span>الاسم الداخلي</span>
              <input name="internalName" placeholder="مثال: خصم الصيف" required minLength={2} />
            </label>
            <label className="field">
              <span>الكود</span>
              <input name="code" dir="ltr" placeholder="SUMMER20" />
            </label>
            <label className="field">
              <span>الوصف الداخلي</span>
              <input name="internalDescription" placeholder="يظهر للإدارة فقط" />
            </label>
            <label className="field">
              <span>الحالة</span>
              <select name="status" defaultValue="ACTIVE">
                <option value="ACTIVE">نشط</option>
                <option value="PAUSED">متوقف</option>
                <option value="DRAFT">مسودة</option>
              </select>
            </label>
          </div>
        </section>

        <section className="panel">
          <div className="admin-card-head">
            <Percent size={22} />
            <div>
              <span className="eyebrow">الخصم والاستخدام</span>
              <h2>إعدادات الخصم</h2>
            </div>
          </div>
          <div className="dynamic-page-form-grid">
            <label className="field">
              <span>نوع الخصم</span>
              <select name="discountType" defaultValue="PERCENTAGE">
                <option value="PERCENTAGE">نسبة مئوية</option>
                <option value="FIXED_AMOUNT">مبلغ ثابت</option>
                <option value="FREE_INVITATION">مجاني 100%</option>
                <option value="NONE">بدون خصم</option>
              </select>
            </label>
            <label className="field">
              <span>قيمة الخصم</span>
              <input name="discountValue" inputMode="decimal" placeholder="20 أو 150" />
            </label>
            <label className="field">
              <span>حد الاستخدام</span>
              <input name="usageLimit" inputMode="numeric" placeholder="اتركه فارغًا بلا حد" />
            </label>
            <label className="field">
              <span>ملاحظات</span>
              <input name="notes" placeholder="ملاحظات داخلية عن الحملة" />
            </label>
            <label className="field">
              <span>تاريخ البداية</span>
              <input name="startDate" type="date" />
            </label>
            <label className="field">
              <span>تاريخ الانتهاء</span>
              <input name="expiryDate" type="date" />
            </label>
          </div>
        </section>

        <div className="button-row">
          <button className="btn btn-gold" type="submit">
            <Save size={17} />
            إنشاء كود الخصم
          </button>
          <Link className="btn btn-soft" href="/admin/promo-codes/discounts">إلغاء</Link>
        </div>
      </form>
    </section>
  );
}
