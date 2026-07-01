import Link from "next/link";
import { Activity, BarChart3, Handshake, PlusCircle, TicketPercent } from "lucide-react";
import { AdminPartnerCenterNav } from "@/components/AdminPartnerCenterNav";
import { StatsGrid } from "@/components/StatsGrid";
import { prisma } from "@/lib/db";
import { logLegacyPromoRouteAction } from "@/app/admin/promo-codes/actions";

export const dynamic = "force-dynamic";

const partnerTypeLabels: Record<string, string> = {
  PHOTOGRAPHER: "مصور فوتوغرافي",
  VIDEOGRAPHER: "فيديو",
  HALL: "قاعة",
  PLANNER: "منظم حفلات",
  DJ: "DJ",
  MAKEUP_ARTIST: "ميكب آرتيست",
  DECORATOR: "ديكور",
  OTHER: "أخرى",
};

function activityLabel(action: string) {
  if (action === "promo.short_link_visit") return "زيارة رابط البروموكود";
  if (action === "promo.applied_to_order") return "استخدام البروموكود في طلب";
  if (action === "partner.created") return "إنشاء شريك";
  if (action === "partner.updated") return "تعديل شريك";
  if (action === "partner.active") return "تفعيل شريك";
  if (action === "partner.paused") return "إيقاف شريك";
  if (action === "partner.archived") return "أرشفة شريك";
  if (action === "partner.message.sent") return "إرسال رسالة للشريك";
  return action;
}

function conversionRate(orders: number, visits: number) {
  if (!visits) return "0%";
  return `${Math.round((orders / visits) * 100)}%`;
}

export default async function PartnerCenterDashboardPage() {
  if (!prisma) return <div className="notice danger">قاعدة البيانات غير متاحة حالياً.</div>;
  await logLegacyPromoRouteAction("/admin/partners");

  const sinceMonth = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const [partners, activePartners, pausedPartners, archivedPartners, partnerOrders, usageCount, visitCount, latestActivity, latestOrders] = await Promise.all([
    prisma.partner.findMany({
      where: { deletedAt: null },
      orderBy: { createdAt: "desc" },
      include: {
        promoCodes: { where: { deletedAt: null }, orderBy: { createdAt: "desc" }, take: 1 },
        _count: { select: { orders: true, usageLogs: true, messages: true } },
      },
    }),
    prisma.partner.count({ where: { deletedAt: null, status: "ACTIVE" } }),
    prisma.partner.count({ where: { deletedAt: null, status: "PAUSED" } }),
    prisma.partner.count({ where: { deletedAt: null, status: "ARCHIVED" } }),
    prisma.orderRequest.count({ where: { partnerId: { not: null } } }),
    prisma.partnerUsageLog.count({ where: { result: "SUCCESS" } }),
    prisma.partnerActivityLog.count({ where: { action: "promo.short_link_visit" } }),
    prisma.partnerActivityLog.findMany({ orderBy: { createdAt: "desc" }, take: 8, include: { partner: { select: { id: true, displayName: true } } } }),
    prisma.orderRequest.findMany({
      where: { partnerId: { not: null } },
      orderBy: { createdAt: "desc" },
      take: 6,
      select: {
        id: true,
        orderNumber: true,
        groomName: true,
        brideName: true,
        status: true,
        createdAt: true,
        publishedInvitationCode: true,
        partner: { select: { id: true, displayName: true } },
      },
    }),
  ]);

  const topPartner = [...partners].sort((a, b) => b._count.orders - a._count.orders || b._count.usageLogs - a._count.usageLogs)[0];
  const monthlyOrders = latestOrders.filter((order) => order.createdAt >= sinceMonth).length;

  return (
    <section className="admin-command-center partner-admin-page partner-dashboard-page">
      <div className="dashboard-head">
        <div>
          <span className="eyebrow">مركز الشركاء</span>
          <h1>لوحة التحكم</h1>
          <p>نظرة تشغيلية سريعة على الشركاء، الدعوات، الزيارات، الاستخدامات، والتحويلات بدون ازدحام أو جداول.</p>
        </div>
        <div className="dashboard-actions">
          <Link className="btn btn-gold" href="/admin/partners/new">
            <PlusCircle size={17} />
            إنشاء شريك
          </Link>
          <Link className="btn btn-soft" href="/admin/partners/directory">
            <Handshake size={17} />
            الشركاء
          </Link>
        </div>
      </div>

      <AdminPartnerCenterNav />

      <StatsGrid
        stats={[
          { label: "عدد الشركاء", value: partners.length, hint: `${activePartners} نشط / ${pausedPartners} معطل / ${archivedPartners} مؤرشف` },
          { label: "إجمالي الدعوات", value: partnerOrders, hint: `${monthlyOrders} من أحدث الطلبات خلال آخر 30 يوم` },
          { label: "استخدام البروموكود", value: usageCount, hint: "استخدامات ناجحة محفوظة" },
          { label: "إجمالي الزيارات", value: visitCount, hint: "زيارات روابط /r" },
          { label: "معدل التحويل", value: conversionRate(partnerOrders, visitCount), hint: `${partnerOrders} دعوة من ${visitCount} زيارة` },
        ]}
      />

      <div className="partner-dashboard-grid">
        <section className="panel partner-spotlight-panel">
          <div className="admin-card-head">
            <BarChart3 size={22} />
            <div>
              <span className="eyebrow">أعلى شريك</span>
              <h2>أعلى شريك</h2>
            </div>
          </div>
          {topPartner ? (
            <Link className="partner-spotlight-card" href={`/admin/partners/${topPartner.id}`}>
              <span className="partner-avatar" style={topPartner.logoUrl ? { backgroundImage: `url(${topPartner.logoUrl})` } : undefined}>
                {topPartner.logoUrl ? "" : topPartner.displayName.slice(0, 2)}
              </span>
              <div>
                <strong>{topPartner.displayName}</strong>
                <small>{partnerTypeLabels[topPartner.partnerType] || topPartner.partnerType}</small>
                <span>{topPartner._count.orders} دعوة / {topPartner._count.usageLogs} استخدام / {topPartner._count.messages} رسالة</span>
              </div>
            </Link>
          ) : (
            <p className="admin-note">لا توجد بيانات شركاء بعد.</p>
          )}
        </section>

        <section className="panel">
          <div className="admin-card-head">
            <Activity size={22} />
            <div>
              <span className="eyebrow">آخر نشاط</span>
              <h2>آخر نشاط</h2>
            </div>
          </div>
          <div className="partner-activity-list">
            {latestActivity.map((activity) => (
              <div key={activity.id}>
                <TicketPercent size={16} />
                <span>
                  <strong>{activity.partner?.displayName || "النظام"}</strong>
                  {activityLabel(activity.action)}
                  <small>{activity.createdAt.toLocaleString("ar-EG")}</small>
                </span>
              </div>
            ))}
            {latestActivity.length === 0 ? <p className="admin-note">لا يوجد نشاط بعد.</p> : null}
          </div>
        </section>

        <section className="panel partner-dashboard-wide">
          <div className="admin-card-head">
            <Handshake size={22} />
            <div>
              <span className="eyebrow">آخر دعوات</span>
              <h2>آخر دعوات تم إنشاؤها بواسطة الشركاء</h2>
            </div>
          </div>
          <div className="partner-mini-list partner-order-strip">
            {latestOrders.map((order) => (
              <Link href="/admin/orders" key={order.id}>
                <strong>{order.orderNumber || `${order.groomName} / ${order.brideName}`}</strong>
                <span>{order.partner?.displayName || "شريك"} · {order.status} · {order.createdAt.toLocaleDateString("ar-EG")}</span>
              </Link>
            ))}
            {latestOrders.length === 0 ? <p className="admin-note">لا توجد دعوات مرتبطة بشركاء بعد.</p> : null}
          </div>
        </section>
      </div>
    </section>
  );
}
