import Link from "next/link";
import { Activity, Download, Search, TicketPercent } from "lucide-react";
import { AdminDiscountCenterNav } from "@/components/AdminDiscountCenterNav";
import { StatsGrid } from "@/components/StatsGrid";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

type DiscountUsageParams = {
  q?: string;
  status?: string;
};

export default async function DiscountUsageHistoryPage({
  searchParams,
}: {
  searchParams: Promise<DiscountUsageParams>;
}) {
  const params = await searchParams;
  if (!prisma) return <div className="notice danger">قاعدة البيانات غير متاحة حالياً.</div>;

  const q = (params.q || "").trim();
  const status = params.status || "all";
  const orders = await prisma.orderRequest.findMany({
    where: {
      discountPromoId: { not: null },
      ...(status !== "all" ? { status: status as never } : {}),
      ...(q
        ? {
            OR: [
              { orderNumber: { contains: q, mode: "insensitive" as const } },
              { groomName: { contains: q, mode: "insensitive" as const } },
              { brideName: { contains: q, mode: "insensitive" as const } },
              { discountPromo: { code: { contains: q.toUpperCase(), mode: "insensitive" as const } } },
              { discountPromo: { internalName: { contains: q, mode: "insensitive" as const } } },
            ],
          }
        : {}),
    },
    orderBy: { createdAt: "desc" },
    take: 220,
    select: {
      id: true,
      orderNumber: true,
      groomName: true,
      brideName: true,
      status: true,
      createdAt: true,
      discountSnapshot: true,
      discountPromo: { select: { id: true, code: true, internalName: true, discountType: true, discountValue: true } },
    },
  });

  const uniqueCodes = new Set(orders.map((order) => order.discountPromo?.id).filter(Boolean)).size;
  const publishedCount = orders.filter((order) => order.status === "PUBLISHED" || order.status === "CONVERTED").length;

  return (
    <section className="admin-command-center promo-admin-page discount-center-page">
      <div className="dashboard-head">
        <div>
          <span className="eyebrow">مركز أكواد الخصم</span>
          <h1>سجل استخدام الأكواد</h1>
          <p>سجل مستقل لاستخدام أكواد الخصم العامة داخل الطلبات، بدون خلطه مع بروموكودات الشركاء.</p>
        </div>
        <div className="dashboard-actions">
          <Link className="btn btn-soft" href="/admin/promo-codes/discounts/export">
            <Download size={17} />
            تصدير الأكواد
          </Link>
        </div>
      </div>

      <AdminDiscountCenterNav />

      <StatsGrid
        stats={[
          { label: "الاستخدامات", value: orders.length, hint: "حسب الفلتر الحالي" },
          { label: "أكواد مستخدمة", value: uniqueCodes, hint: "أكواد مختلفة" },
          { label: "دعوات منشورة", value: publishedCount, hint: "طلبات وصلت للنشر أو التحويل" },
          { label: "آخر استخدام", value: orders[0]?.createdAt.toLocaleDateString("ar-EG") || "لا يوجد", hint: "أحدث طلب مرتبط بكود خصم" },
        ]}
      />

      <form className="admin-table-toolbar" action="/admin/promo-codes/discounts/history" method="get">
        <label>
          <Search size={16} />
          <input name="q" defaultValue={q} placeholder="بحث بالكود، الاسم، أو الطلب" />
        </label>
        <select name="status" defaultValue={status} aria-label="حالة الطلب">
          <option value="all">كل الحالات</option>
          <option value="NEW">جديد</option>
          <option value="REVIEWING">قيد المراجعة</option>
          <option value="PUBLISHED">منشور</option>
          <option value="CONVERTED">تم التحويل</option>
          <option value="REJECTED">مرفوض</option>
        </select>
        <button className="btn btn-soft" type="submit">تطبيق</button>
      </form>

      <section className="panel">
        <div className="admin-card-head">
          <Activity size={22} />
          <div>
            <span className="eyebrow">Timeline</span>
            <h2>الاستخدامات</h2>
          </div>
        </div>
        <div className="partner-timeline">
          {orders.map((order) => (
            <article key={order.id}>
              <span />
              <div>
                <strong>{order.discountPromo?.code || "كود غير متاح"}</strong>
                <small>
                  {order.discountPromo?.internalName || "خصم عام"} · {order.groomName} / {order.brideName} · {order.createdAt.toLocaleString("ar-EG")}
                </small>
              </div>
              <div className="button-row">
                <Link className="btn btn-soft" href="/admin/orders">فتح الطلب</Link>
                {order.discountPromo ? <Link className="btn btn-soft" href="/admin/promo-codes/discounts"><TicketPercent size={16} />الأكواد</Link> : null}
              </div>
            </article>
          ))}
          {orders.length === 0 ? <p className="admin-note">لا توجد استخدامات مطابقة.</p> : null}
        </div>
      </section>
    </section>
  );
}
