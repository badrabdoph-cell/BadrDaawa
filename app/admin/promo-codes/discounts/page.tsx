import { Percent, Save } from "lucide-react";
import { AdminPromoSectionNav } from "@/components/AdminPromoSectionNav";
import { AdminPromoTestButton } from "@/components/AdminPromoTestButton";
import { CopyButton } from "@/components/CopyButton";
import { prisma } from "@/lib/db";
import { createDiscountPromoCodeAction } from "../actions";

export const dynamic = "force-dynamic";

type PageParams = {
  created?: string;
  error?: string;
};

function errorMessage(value?: string) {
  if (value === "database_unavailable" || value === "database") return "قاعدة البيانات غير متاحة حالياً.";
  if (value === "name") return "اكتب اسم الخصم أو الجملة التي تظهر.";
  if (value === "discount") return "نسبة الخصم مطلوبة عند اختيار نسبة.";
  return value ? "تعذر إنشاء كود الخصم. راجع البيانات وحاول مرة أخرى." : "";
}

function discountLabel(type: string, value: unknown) {
  const amount = value === null || value === undefined ? "" : String(value);
  if (type === "PERCENTAGE") return `${amount}%`;
  if (type === "FREE_INVITATION") return "مجاني 100%";
  if (type === "FIXED_AMOUNT") return `${amount} جنيه`;
  return "بدون خصم";
}

function statusLabel(status: string, deletedAt?: Date | null, archivedAt?: Date | null) {
  if (deletedAt) return "محذوف";
  if (archivedAt || status === "ARCHIVED") return "مؤرشف";
  if (status === "PAUSED") return "معلق مؤقتًا";
  if (status === "EXPIRED") return "منتهي";
  if (status === "ACTIVE") return "نشط";
  return "بانتظار البداية";
}

export default async function DiscountPromoCodesPage({
  searchParams,
}: {
  searchParams: Promise<PageParams>;
}) {
  const params = await searchParams;
  if (!prisma) return <div className="notice danger">قاعدة البيانات غير متاحة حالياً.</div>;

  const [createdCode, latestCodes] = await Promise.all([
    params.created ? prisma.discountPromoCode.findUnique({ where: { id: params.created } }) : Promise.resolve(null),
    prisma.discountPromoCode.findMany({ orderBy: { createdAt: "desc" }, take: 40 }),
  ]);
  const message = errorMessage(params.error);

  return (
    <section className="admin-command-center promo-admin-page promo-creative-page">
      <div className="dashboard-head">
        <div>
          <span className="eyebrow">أكواد الخصم</span>
          <h1>كود الخصم</h1>
          <p>أنشئ كود خصم عام. هذا النوع يولد كود فقط، بدون رابط مختصر، ويفعّل خصمًا داخل الطلب.</p>
        </div>
      </div>

      <AdminPromoSectionNav />

      {message ? <div className="notice danger">{message}</div> : null}
      {createdCode ? <div className="notice success">تم إنشاء كود الخصم بنجاح. يمكنك نسخه أو اختبار الكود الآن.</div> : null}

      <div className="promo-workbench">
        <form className="panel promo-builder-form" action={createDiscountPromoCodeAction}>
          <div className="admin-card-head">
            <Percent size={22} />
            <div>
              <span className="eyebrow">إنشاء كود</span>
              <h2>بيانات كود الخصم</h2>
            </div>
          </div>
          <div className="dynamic-page-form-grid">
            <label className="field">
              <span>اسم الخصم الداخلي</span>
              <input name="internalName" placeholder="مثال: خصم الافتتاح" />
            </label>
            <label className="field">
              <span>الكود</span>
              <input name="code" dir="ltr" placeholder="WELCOME20 أو اتركه للتوليد" />
            </label>
            <label className="field">
              <span>نوع الخصم</span>
              <select name="discountType" defaultValue="PERCENTAGE">
                <option value="PERCENTAGE">نسبة الخصم</option>
                <option value="FREE_INVITATION">مجاني 100%</option>
              </select>
            </label>
            <label className="field">
              <span>نسبة الخصم</span>
              <input name="discountValue" inputMode="decimal" placeholder="20" />
            </label>
            <label className="field full">
              <span>الجملة التي تظهر</span>
              <input name="displayMessage" placeholder="تم تطبيق خصم خاص على دعوتك" required />
            </label>
            <label className="field">
              <span>حد الاستخدام</span>
              <input name="usageLimit" inputMode="numeric" placeholder="اختياري" />
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
          <button className="btn btn-gold" type="submit">
            <Save size={17} />
            إنشاء كود الخصم
          </button>
        </form>

        <aside className="panel promo-result-card">
          <div className="admin-card-head">
            <Percent size={22} />
            <div>
              <span className="eyebrow">الناتج</span>
              <h2>الكود فقط</h2>
            </div>
          </div>
          {createdCode ? (
            <>
              <div className="promo-result-hero">
                <span>{createdCode.internalName}</span>
                <strong dir="ltr">{createdCode.code}</strong>
                <small>{discountLabel(createdCode.discountType, createdCode.discountValue)}</small>
                <p>{createdCode.displayMessage || "تم تطبيق كود الخصم."}</p>
              </div>
              <div className="button-row">
                <CopyButton value={createdCode.code} label="نسخ الكود" className="btn btn-soft" />
                <AdminPromoTestButton code={createdCode.code} label="اختبار الكود" />
              </div>
            </>
          ) : (
            <div className="admin-empty-state compact">
              <Percent size={24} />
              <strong>كود خصم بدون رابط</strong>
              <p>أكواد الخصم العامة لا تنشئ روابط مختصرة. العميل يكتب الكود في صفحة الطلب فقط.</p>
            </div>
          )}
        </aside>
      </div>

      <section className="panel">
        <div className="admin-card-head">
          <Percent size={22} />
          <div>
            <span className="eyebrow">آخر الأكواد</span>
            <h2>أكواد الخصم</h2>
          </div>
        </div>
        <div className="table-shell">
          <table className="data-table promo-data-table">
            <thead>
              <tr>
                <th>الكود</th>
                <th>نسبة الخصم</th>
                <th>الجملة التي تظهر</th>
                <th>الاستخدام</th>
                <th>الحالة</th>
                <th>إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {latestCodes.map((code) => (
                <tr key={code.id}>
                  <td><strong dir="ltr">{code.code}</strong></td>
                  <td>{discountLabel(code.discountType, code.discountValue)}</td>
                  <td>{code.displayMessage || code.internalDescription || "تم تطبيق كود الخصم."}</td>
                  <td>{code.currentUsage}{code.usageLimit ? ` / ${code.usageLimit}` : ""}</td>
                  <td>{statusLabel(code.status, code.deletedAt, code.archivedAt)}</td>
                  <td>
                    <div className="button-row">
                      <CopyButton value={code.code} label="نسخ" className="btn btn-soft" />
                      <AdminPromoTestButton code={code.code} label="اختبار الكود" />
                    </div>
                  </td>
                </tr>
              ))}
              {latestCodes.length === 0 ? (
                <tr>
                  <td colSpan={6}>لا توجد أكواد خصم بعد.</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
    </section>
  );
}
