import { Activity, AlertTriangle, CheckCircle2, HeartPulse } from "lucide-react";
import { AdminPromoSectionNav } from "@/components/AdminPromoSectionNav";
import { PromoCodeService } from "@/lib/promo-code-service";

export const dynamic = "force-dynamic";

const healthLabels = [
  ["partnerPromoCount", "عدد أكواد المصورين"],
  ["discountPromoCount", "عدد أكواد الخصومات"],
  ["activeCount", "عدد الأكواد النشطة"],
  ["pausedCount", "عدد الأكواد المعطلة"],
  ["expiredCount", "عدد الأكواد المنتهية"],
  ["archivedCount", "عدد الأكواد المؤرشفة"],
  ["brokenShortLinks", "عدد الروابط المختصرة المعطلة"],
  ["invalidQrCodes", "عدد QR غير الصالحة"],
  ["duplicateCodes", "عدد الأكواد المكررة"],
  ["relationErrors", "أي أخطاء في العلاقات"],
] as const;

export default async function PromoHealthPage() {
  let health = {
    partnerPromoCount: 0,
    discountPromoCount: 0,
    activeCount: 0,
    pausedCount: 0,
    expiredCount: 0,
    archivedCount: 0,
    brokenShortLinks: 0,
    invalidQrCodes: 0,
    duplicateCodes: 0,
    relationErrors: 0,
  };
  let error = "";
  try {
    health = await PromoCodeService.getPromoHealth();
  } catch {
    error = "تعذر قراءة صحة البروموكود لأن قاعدة البيانات غير متاحة حالياً.";
  }

  const hasIssues = health.brokenShortLinks + health.invalidQrCodes + health.duplicateCodes + health.relationErrors > 0;

  return (
    <section className="admin-command-center promo-admin-page promo-health-page">
      <div className="dashboard-head">
        <div>
          <span className="eyebrow">أكواد الخصم</span>
          <h1>Promo Health</h1>
          <p>فحص سريع لصحة أكواد المصورين والخصومات والروابط والعلاقات قبل حدوث مشاكل للعميل.</p>
        </div>
      </div>

      <AdminPromoSectionNav />

      {error ? <div className="notice danger">{error}</div> : null}

      <section className={`panel promo-health-summary ${hasIssues ? "has-issues" : "is-clean"}`}>
        <div className="admin-card-head">
          {hasIssues ? <AlertTriangle size={24} /> : <CheckCircle2 size={24} />}
          <div>
            <span className="eyebrow">الحالة العامة</span>
            <h2>{hasIssues ? "توجد نقاط تحتاج مراجعة" : "كل شيء يبدو مستقراً"}</h2>
          </div>
        </div>
      </section>

      <div className="promo-health-grid">
        {healthLabels.map(([key, label]) => (
          <article className="panel promo-health-card" key={key}>
            <HeartPulse size={22} />
            <span>{label}</span>
            <strong>{health[key]}</strong>
            <small dir="ltr">{key}</small>
          </article>
        ))}
      </div>

      <section className="panel">
        <div className="admin-card-head">
          <Activity size={22} />
          <div>
            <span className="eyebrow">ملاحظات</span>
            <h2>قراءة النتائج</h2>
          </div>
        </div>
        <p className="admin-note">الأكواد المكررة تُحسب بدون حساسية لحالة الأحرف. الروابط المختصرة المعطلة تشمل الأكواد غير النشطة أو المؤرشفة أو التي لا تحتوي slug صالح.</p>
      </section>
    </section>
  );
}
