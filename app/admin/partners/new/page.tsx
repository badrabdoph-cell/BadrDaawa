import Link from "next/link";
import { ArrowLeft, Save, Sparkles } from "lucide-react";
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
          <span className="eyebrow">New Partner</span>
          <h1>إنشاء شريك جديد</h1>
          <p>سيتم إنشاء Partner عام مع بروموكود افتراضي ورابط إحالة وQR واشتراك أولي.</p>
        </div>
        <div className="dashboard-actions">
          <Link className="btn btn-soft" href="/admin/partners">
            <ArrowLeft size={17} />
            رجوع
          </Link>
        </div>
      </div>

      {params.error ? <div className="notice danger">راجع بيانات الشريك. الاسم مطلوب والكود يجب ألا يكون مكررًا.</div> : null}

      <form className="partner-editor-form" action={createPartnerAction}>
        <section className="panel">
          <div className="admin-card-head">
            <Sparkles size={22} />
            <div>
              <span className="eyebrow">General Information</span>
              <h2>البيانات العامة</h2>
            </div>
          </div>
          <div className="dynamic-page-form-grid">
            <label className="field">
              <span>Partner Name</span>
              <input name="displayName" placeholder="Badr Studio" required minLength={2} />
            </label>
            <label className="field">
              <span>Logo URL</span>
              <input name="logoUrl" dir="ltr" placeholder="https://..." />
            </label>
            <label className="field">
              <span>Facebook</span>
              <input name="facebookUrl" dir="ltr" placeholder="https://facebook.com/..." />
            </label>
            <label className="field">
              <span>Instagram</span>
              <input name="instagramUrl" dir="ltr" placeholder="https://instagram.com/..." />
            </label>
          </div>
        </section>

        <section className="panel">
          <div className="admin-card-head">
            <Sparkles size={22} />
            <div>
              <span className="eyebrow">Partner Settings</span>
              <h2>إعدادات الشريك</h2>
            </div>
          </div>
          <div className="dynamic-page-form-grid">
            <label className="field">
              <span>Partner Type</span>
              <select name="partnerType" defaultValue="PHOTOGRAPHER">
                <option value="PHOTOGRAPHER">Photographer</option>
                <option value="VIDEOGRAPHER">Videographer</option>
                <option value="HALL">Wedding Hall</option>
                <option value="PLANNER">Planner</option>
                <option value="DJ">DJ</option>
                <option value="MAKEUP_ARTIST">Makeup Artist</option>
                <option value="DECORATOR">Decorator</option>
                <option value="OTHER">Other</option>
              </select>
            </label>
            <label className="field">
              <span>Tier</span>
              <select name="tier" defaultValue="FREE">
                <option value="FREE">Free</option>
                <option value="SILVER">Silver</option>
                <option value="GOLD">Gold</option>
                <option value="PLATINUM">Platinum</option>
              </select>
            </label>
            <label className="field">
              <span>Status</span>
              <select name="status" defaultValue="ACTIVE">
                <option value="DRAFT">Draft</option>
                <option value="ACTIVE">Active</option>
                <option value="PAUSED">Paused</option>
              </select>
            </label>
          </div>
        </section>

        <section className="panel">
          <div className="admin-card-head">
            <Sparkles size={22} />
            <div>
              <span className="eyebrow">Promo Settings</span>
              <h2>البروموكود والخصم</h2>
            </div>
          </div>
          <div className="dynamic-page-form-grid">
            <label className="field">
              <span>Promo Code</span>
              <input name="promoCode" dir="ltr" placeholder="اتركه فارغًا للتوليد التلقائي" />
            </label>
            <label className="field">
              <span>Discount</span>
              <select name="discountType" defaultValue="NONE">
                <option value="NONE">No Discount</option>
                <option value="PERCENTAGE">Percentage</option>
                <option value="FIXED_AMOUNT">Fixed Amount</option>
                <option value="FREE_INVITATION">Free Invitation</option>
              </select>
            </label>
            <label className="field">
              <span>Discount Value</span>
              <input name="discountValue" inputMode="decimal" placeholder="20 أو 150" />
            </label>
            <label className="toggle-field">
              <input name="showPartnerCard" type="checkbox" defaultChecked />
              <span>Show Partner Card</span>
            </label>
          </div>
        </section>

        <section className="panel">
          <div className="admin-card-head">
            <Sparkles size={22} />
            <div>
              <span className="eyebrow">Notes</span>
              <h2>ملاحظات داخلية</h2>
            </div>
          </div>
          <label className="field">
            <span>Private Notes</span>
            <textarea name="internalNotes" rows={5} placeholder="أي تفاصيل داخلية عن الاتفاق أو الاشتراك." />
          </label>
        </section>

        <div className="button-row">
          <button className="btn btn-gold" type="submit">
            <Save size={17} />
            Save
          </button>
          <Link className="btn btn-soft" href="/admin/partners">Cancel</Link>
        </div>
      </form>
    </section>
  );
}
