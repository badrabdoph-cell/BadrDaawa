import Link from "next/link";
import { Activity, Download, Search } from "lucide-react";
import { AdminPartnerCenterNav } from "@/components/AdminPartnerCenterNav";
import { StatsGrid } from "@/components/StatsGrid";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

type ActivityParams = {
  q?: string;
  action?: string;
  dateFrom?: string;
  dateTo?: string;
};

function actionLabel(action: string) {
  if (action === "promo.short_link_visit") return "زيارة رابط";
  if (action === "promo.applied_to_order") return "استخدام بروموكود";
  if (action === "partner.created") return "إنشاء شريك";
  if (action === "partner.updated") return "تعديل شريك";
  if (action === "partner.active") return "تفعيل شريك";
  if (action === "partner.paused") return "تعطيل شريك";
  if (action === "partner.archived") return "أرشفة شريك";
  if (action === "partner.message.sent") return "إرسال رسالة";
  if (action === "promo.deleted") return "حذف كود";
  if (action === "promo.restored") return "استعادة كود";
  return action;
}

function readValue(value: unknown, key: string) {
  if (!value || typeof value !== "object" || !(key in value)) return "";
  const next = (value as Record<string, unknown>)[key];
  return typeof next === "string" || typeof next === "number" ? String(next) : "";
}

function validDate(value?: string) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function exportHref(filters: ActivityParams) {
  const queryParams = new URLSearchParams();
  if (filters.q) queryParams.set("q", filters.q);
  if (filters.action && filters.action !== "all") queryParams.set("action", filters.action);
  if (filters.dateFrom) queryParams.set("dateFrom", filters.dateFrom);
  if (filters.dateTo) queryParams.set("dateTo", filters.dateTo);
  const query = queryParams.toString();
  return `/admin/partners/activity/export${query ? `?${query}` : ""}`;
}

export default async function PartnerOperationsActivityPage({
  searchParams,
}: {
  searchParams: Promise<ActivityParams>;
}) {
  const params = await searchParams;
  if (!prisma) return <div className="notice danger">قاعدة البيانات غير متاحة حالياً.</div>;

  const q = (params.q || "").trim();
  const action = params.action || "all";
  const dateFrom = validDate(params.dateFrom);
  const dateTo = validDate(params.dateTo);
  const activity = await prisma.partnerActivityLog.findMany({
    where: {
      ...(action !== "all" ? { action } : {}),
      ...(q ? { partner: { displayName: { contains: q, mode: "insensitive" as const } } } : {}),
      ...(dateFrom || dateTo
        ? {
            createdAt: {
              ...(dateFrom ? { gte: dateFrom } : {}),
              ...(dateTo ? { lte: new Date(`${params.dateTo}T23:59:59`) } : {}),
            },
          }
        : {}),
    },
    orderBy: { createdAt: "desc" },
    take: 220,
    include: { partner: { select: { id: true, displayName: true } } },
  });

  const visitCount = activity.filter((item) => item.action === "promo.short_link_visit").length;
  const useCount = activity.filter((item) => item.action === "promo.applied_to_order").length;
  const adminCount = activity.length - visitCount - useCount;

  return (
    <section className="admin-command-center partner-admin-page partner-activity-page">
      <div className="dashboard-head">
        <div>
          <span className="eyebrow">مركز الشركاء</span>
          <h1>سجل العمليات</h1>
          <p>كل الأحداث في مكان واحد: زيارات، استخدام، إنشاء، تعديل، تعطيل، حذف، ورسائل.</p>
        </div>
        <div className="dashboard-actions">
          <Link className="btn btn-soft" href={exportHref(params)}>
            <Download size={17} />
            تصدير
          </Link>
        </div>
      </div>

      <AdminPartnerCenterNav />

      <StatsGrid
        stats={[
          { label: "كل الأحداث", value: activity.length, hint: "حسب الفلتر الحالي" },
          { label: "زيارات", value: visitCount, hint: "فتح روابط الشركاء" },
          { label: "استخدام", value: useCount, hint: "استخدامات في الطلبات" },
          { label: "إدارة", value: adminCount, hint: "إنشاء وتعديل ورسائل" },
        ]}
      />

      <form className="admin-table-toolbar" action="/admin/partners/activity" method="get">
        <label>
          <Search size={16} />
          <input name="q" defaultValue={q} placeholder="بحث باسم الشريك" />
        </label>
        <select name="action" defaultValue={action} aria-label="نوع الحدث">
          <option value="all">كل الأحداث</option>
          <option value="partner.created">إنشاء شريك</option>
          <option value="partner.updated">تعديل شريك</option>
          <option value="partner.active">تفعيل</option>
          <option value="partner.paused">تعطيل</option>
          <option value="promo.short_link_visit">زيارات</option>
          <option value="promo.applied_to_order">استخدام بروموكود</option>
          <option value="partner.message.sent">رسائل</option>
        </select>
        <label>
          <input name="dateFrom" type="date" defaultValue={params.dateFrom || ""} aria-label="من تاريخ" />
        </label>
        <label>
          <input name="dateTo" type="date" defaultValue={params.dateTo || ""} aria-label="إلى تاريخ" />
        </label>
        <button className="btn btn-soft" type="submit">تطبيق</button>
      </form>

      <section className="panel">
        <div className="admin-card-head">
          <Activity size={22} />
          <div>
            <span className="eyebrow">Timeline</span>
            <h2>الأحداث</h2>
          </div>
        </div>
        <div className="partner-timeline">
          {activity.map((item) => {
            const promoId = readValue(item.newValue, "promoId");
            const code = readValue(item.newValue, "code") || readValue(item.newValue, "promoCode");
            return (
              <article key={item.id}>
                <span />
                <div>
                  <strong>{actionLabel(item.action)}</strong>
                  <small>{item.partner?.displayName || "النظام"}{code ? ` · ${code}` : ""} · {item.createdAt.toLocaleString("ar-EG")}</small>
                </div>
                <div className="button-row">
                  {item.partnerId ? <Link className="btn btn-soft" href={`/admin/partners/${item.partnerId}`}>الشريك</Link> : null}
                  {promoId ? <Link className="btn btn-soft" href={`/admin/promo-codes/${promoId}`}>الكود</Link> : null}
                </div>
              </article>
            );
          })}
          {activity.length === 0 ? <p className="admin-note">لا توجد أحداث مطابقة.</p> : null}
        </div>
      </section>
    </section>
  );
}
