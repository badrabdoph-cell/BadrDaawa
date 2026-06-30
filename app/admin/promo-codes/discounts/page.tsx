import { Percent, Search } from "lucide-react";
import { AdminPartnerCenterNav } from "@/components/AdminPartnerCenterNav";
import { StatsGrid } from "@/components/StatsGrid";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

type PageParams = {
  q?: string;
  status?: string;
};

const statusLabels: Record<string, string> = {
  DRAFT: "مسودة",
  ACTIVE: "نشط",
  PAUSED: "متوقف",
  EXPIRED: "منتهي",
  ARCHIVED: "مؤرشف",
};

function statusClass(status: string) {
  if (status === "ACTIVE") return "status success";
  if (status === "PAUSED" || status === "EXPIRED") return "status warning";
  if (status === "ARCHIVED") return "status danger";
  return "status";
}

function discountLabel(type: string, value: unknown) {
  const amount = value === null || value === undefined ? "" : String(value);
  if (type === "PERCENTAGE") return `خصم ${amount}%`;
  if (type === "FIXED_AMOUNT") return `خصم ${amount} جنيه`;
  if (type === "FREE_INVITATION") return "دعوة مجانية";
  return "بدون خصم";
}

export default async function DiscountPromoCodesPage({
  searchParams,
}: {
  searchParams: Promise<PageParams>;
}) {
  const params = await searchParams;
  if (!prisma) return <div className="notice danger">قاعدة البيانات غير متاحة حالياً.</div>;

  const q = (params.q || "").trim();
  const where = {
    ...(q
      ? {
          OR: [
            { code: { contains: q.toUpperCase(), mode: "insensitive" as const } },
            { internalName: { contains: q, mode: "insensitive" as const } },
          ],
        }
      : {}),
    ...(params.status && params.status !== "all" ? { status: params.status as never } : {}),
  };

  const codes = await prisma.discountPromoCode.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 120,
  });

  const activeCount = codes.filter((code) => code.status === "ACTIVE" && !code.deletedAt).length;
  const usageCount = codes.reduce((sum, code) => sum + code.currentUsage, 0);
  const limitedCount = codes.filter((code) => code.usageLimit !== null).length;

  return (
    <section className="admin-command-center promo-admin-page">
      <div className="dashboard-head">
        <div>
          <span className="eyebrow">أكواد البرومو</span>
          <h1>أكواد الخصم المستقلة</h1>
          <p>أكواد خصم غير مرتبطة بمصور أو شريك. هذه الصفحة تفصلها بوضوح حتى لا تختلط بروابط الإحالة.</p>
        </div>
      </div>

      <AdminPartnerCenterNav />

      <StatsGrid
        stats={[
          { label: "أكواد الخصم", value: codes.length, hint: "كل الأكواد المستقلة" },
          { label: "النشطة", value: activeCount, hint: "جاهزة حسب الحالة والتاريخ" },
          { label: "الاستخدامات", value: usageCount, hint: "إجمالي الاستخدامات المسجلة" },
          { label: "لها حد استخدام", value: limitedCount, hint: "أكواد لها سقف محدد" },
        ]}
      />

      <div className="notice warning">
        هذا القسم منفصل عن بروموكود المصورين. تطبيق هذه الأكواد داخل رحلة الطلب يحتاج ربط API خصومات مستقل حتى لا تختلط ببيانات المصور.
      </div>

      <form className="admin-table-toolbar" action="/admin/promo-codes/discounts" method="get">
        <label>
          <Search size={16} />
          <input name="q" defaultValue={q} placeholder="بحث باسم الخصم أو الكود" />
        </label>
        <select name="status" defaultValue={params.status || "all"} aria-label="الحالة">
          <option value="all">كل الحالات</option>
          {Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
        <button className="btn btn-soft" type="submit">تطبيق</button>
      </form>

      <section className="panel">
        <div className="admin-card-head">
          <Percent size={22} />
          <div>
            <span className="eyebrow">الخصومات</span>
            <h2>قائمة أكواد الخصم المستقلة</h2>
          </div>
        </div>
        {codes.length === 0 ? (
          <div className="admin-empty-state compact">
            <Percent size={22} />
            <strong>لا توجد أكواد خصم مستقلة</strong>
            <p>عند إنشاء أكواد خصم مستقلة ستظهر هنا منفصلة عن أكواد المصورين.</p>
          </div>
        ) : (
          <div className="table-shell">
            <table className="data-table promo-data-table">
              <thead>
                <tr>
                  <th>الكود</th>
                  <th>الاسم الداخلي</th>
                  <th>الخصم</th>
                  <th>الاستخدام</th>
                  <th>الصلاحية</th>
                  <th>الحالة</th>
                </tr>
              </thead>
              <tbody>
                {codes.map((code) => (
                  <tr key={code.id}>
                    <td><strong dir="ltr">{code.code}</strong></td>
                    <td>
                      <strong>{code.internalName}</strong>
                      {code.internalDescription ? <small>{code.internalDescription}</small> : null}
                    </td>
                    <td>{discountLabel(code.discountType, code.discountValue)}</td>
                    <td>{code.currentUsage}{code.usageLimit ? ` / ${code.usageLimit}` : ""}</td>
                    <td>{code.expiryDate ? code.expiryDate.toLocaleDateString("ar-EG") : "بدون تاريخ انتهاء"}</td>
                    <td><span className={statusClass(code.deletedAt ? "ARCHIVED" : code.status)}>{code.deletedAt ? "محذوف" : statusLabels[code.status]}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </section>
  );
}
