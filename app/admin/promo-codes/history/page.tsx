import Link from "next/link";
import { Activity, History, Search } from "lucide-react";
import { AdminPromoSectionNav } from "@/components/AdminPromoSectionNav";
import { StatsGrid } from "@/components/StatsGrid";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

type PageParams = {
  q?: string;
  action?: string;
};

function actionLabel(action: string) {
  if (action === "promo.short_link_visit") return "زيارة رابط";
  if (action === "promo.applied_to_order") return "استخدام في طلب";
  if (action === "partner.created") return "إنشاء شريك/كود";
  if (action === "partner.updated") return "تحديث شريك/كود";
  if (action === "promo.active") return "تفعيل كود";
  if (action === "promo.paused") return "إيقاف كود";
  if (action === "promo.archived") return "أرشفة كود";
  if (action === "promo.deleted") return "حذف آمن";
  if (action === "promo.restored") return "استعادة كود";
  return action;
}

function readValue(value: unknown, key: "promoId" | "code" | "referralSlug" | "orderId") {
  if (!value || typeof value !== "object" || !(key in value)) return "";
  const next = (value as Record<string, unknown>)[key];
  return typeof next === "string" ? next : "";
}

export default async function PromoCodeHistoryPage({
  searchParams,
}: {
  searchParams: Promise<PageParams>;
}) {
  const params = await searchParams;
  if (!prisma) return <div className="notice danger">قاعدة البيانات غير متاحة حالياً.</div>;

  const q = (params.q || "").trim();
  const action = params.action || "all";
  const actionFilter = action === "all" ? undefined : action;

  const activity = await prisma.partnerActivityLog.findMany({
    where: {
      ...(actionFilter ? { action: actionFilter } : { action: { startsWith: "promo." } }),
      ...(q ? { partner: { displayName: { contains: q, mode: "insensitive" as const } } } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: 160,
    include: { partner: { select: { id: true, displayName: true } } },
  });

  const visits = activity.filter((item) => item.action === "promo.short_link_visit").length;
  const applications = activity.filter((item) => item.action === "promo.applied_to_order").length;
  const adminActions = activity.filter((item) => item.action !== "promo.short_link_visit" && item.action !== "promo.applied_to_order").length;

  return (
    <section className="admin-command-center promo-admin-page">
      <div className="dashboard-head">
        <div>
          <span className="eyebrow">أكواد البرومو</span>
          <h1>سجل البروموكود</h1>
          <p>كل زيارات الروابط، الاستخدامات، وإجراءات الإدارة في صفحة واحدة سهلة البحث.</p>
        </div>
      </div>

      <AdminPromoSectionNav />

      <StatsGrid
        stats={[
          { label: "الحركات", value: activity.length, hint: "آخر الحركات حسب الفلتر" },
          { label: "زيارات", value: visits, hint: "فتح الروابط المختصرة" },
          { label: "استخدامات", value: applications, hint: "طلبات استخدمت كوداً" },
          { label: "إجراءات إدارة", value: adminActions, hint: "تفعيل، إيقاف، حذف، استعادة" },
        ]}
      />

      <form className="admin-table-toolbar" action="/admin/promo-codes/history" method="get">
        <label>
          <Search size={16} />
          <input name="q" defaultValue={q} placeholder="بحث باسم الشريك" />
        </label>
        <select name="action" defaultValue={action} aria-label="نوع الحركة">
          <option value="all">كل الحركات</option>
          <option value="promo.short_link_visit">زيارات الروابط</option>
          <option value="promo.applied_to_order">استخدامات الطلبات</option>
          <option value="promo.active">تفعيل</option>
          <option value="promo.paused">إيقاف</option>
          <option value="promo.deleted">حذف آمن</option>
          <option value="promo.restored">استعادة</option>
        </select>
        <button className="btn btn-soft" type="submit">تطبيق</button>
      </form>

      <section className="panel">
        <div className="admin-card-head">
          <History size={22} />
          <div>
            <span className="eyebrow">الحركة الزمنية</span>
            <h2>آخر سجل البروموكود</h2>
          </div>
        </div>
        {activity.length === 0 ? (
          <div className="admin-empty-state compact">
            <Activity size={22} />
            <strong>لا توجد حركات مطابقة</strong>
            <p>غيّر الفلتر أو افتح رابط بروموكود لاختبار التسجيل.</p>
          </div>
        ) : (
          <div className="promo-history-list">
            {activity.map((item) => {
              const promoId = readValue(item.newValue, "promoId");
              const code = readValue(item.newValue, "code");
              const referralSlug = readValue(item.newValue, "referralSlug");
              const orderId = readValue(item.newValue, "orderId");
              return (
                <article key={item.id}>
                  <Activity size={17} />
                  <div>
                    <strong>{actionLabel(item.action)}</strong>
                    <span>{item.partner?.displayName || "النظام"}{code ? ` · ${code}` : ""}</span>
                    <small>{item.createdAt.toLocaleString("ar-EG")}</small>
                  </div>
                  <div className="button-row">
                    {promoId ? <Link className="btn btn-soft" href={`/admin/promo-codes/${promoId}`}>إدارة الكود</Link> : null}
                    {referralSlug ? <Link className="btn btn-soft" href={`/r/${encodeURIComponent(referralSlug)}`} target="_blank">فتح الرابط</Link> : null}
                    {orderId ? <Link className="btn btn-soft" href="/admin/orders">الطلبات</Link> : null}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </section>
  );
}
