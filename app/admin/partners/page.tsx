import Link from "next/link";
import { Activity, Copy, ExternalLink, Handshake, MessageSquareText, PlusCircle, Search, TicketPercent } from "lucide-react";
import { StatsGrid } from "@/components/StatsGrid";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

type PartnersPageParams = {
  q?: string;
  status?: string;
  type?: string;
  error?: string;
};

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

export default async function PartnerPromoCenterPage({
  searchParams,
}: {
  searchParams: Promise<PartnersPageParams>;
}) {
  const params = await searchParams;
  if (!prisma) {
    return <div className="notice danger">قاعدة البيانات غير متاحة حالياً.</div>;
  }

  const q = (params.q || "").trim();
  const where = {
    ...(q
      ? {
          OR: [
            { displayName: { contains: q, mode: "insensitive" as const } },
            { id: { contains: q, mode: "insensitive" as const } },
            { slug: { contains: q, mode: "insensitive" as const } },
            { promoCodes: { some: { code: { contains: q.toUpperCase(), mode: "insensitive" as const } } } },
            { promoCodes: { some: { referralSlug: { contains: q, mode: "insensitive" as const } } } },
          ],
        }
      : {}),
    ...(params.status && params.status !== "all" ? { status: params.status as never } : {}),
    ...(params.type && params.type !== "all" ? { partnerType: params.type as never } : {}),
  };

  const [partners, promoCodes, usageToday, usageWeek, usageMonth, latestActivity] = await Promise.all([
    prisma.partner.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 100,
      include: {
        promoCodes: { where: { deletedAt: null }, orderBy: { createdAt: "desc" }, take: 3 },
        _count: { select: { promoCodes: true, orders: true, usageLogs: true } },
      },
    }),
    prisma.partnerPromoCode.findMany({ where: { deletedAt: null }, select: { status: true } }),
    prisma.partnerUsageLog.count({ where: { result: "SUCCESS", createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } } }),
    prisma.partnerUsageLog.count({ where: { result: "SUCCESS", createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } } }),
    prisma.partnerUsageLog.count({ where: { result: "SUCCESS", createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } } }),
    prisma.partnerActivityLog.findMany({ orderBy: { createdAt: "desc" }, take: 8, include: { partner: { select: { displayName: true } } } }),
  ]);

  const activePartners = partners.filter((partner) => partner.status === "ACTIVE").length;
  const pausedPartners = partners.filter((partner) => partner.status === "PAUSED").length;
  const archivedPartners = partners.filter((partner) => partner.status === "ARCHIVED").length;
  const topPartners = [...partners].sort((a, b) => b._count.orders - a._count.orders).slice(0, 10);
  const activePromos = promoCodes.filter((promo) => promo.status === "ACTIVE").length;
  const pausedPromos = promoCodes.filter((promo) => promo.status === "PAUSED").length;
  const expiredPromos = promoCodes.filter((promo) => promo.status === "EXPIRED").length;

  return (
    <section className="admin-command-center partner-admin-page">
      <div className="dashboard-head">
        <div>
          <span className="eyebrow">مركز الشركاء والبروموكود</span>
          <h1>مركز الشركاء والبروموكود</h1>
          <p>إدارة الشركاء، البروموكودات، الخصومات، الرسائل، والسجلات التشغيلية بدون التأثير على رحلة الدعوة الحالية.</p>
        </div>
        <div className="dashboard-actions">
          <Link className="btn btn-gold" href="/admin/partners/new">
            <PlusCircle size={17} />
            شريك جديد
          </Link>
        </div>
      </div>

      {params.error ? <div className="notice danger">تعذر تنفيذ العملية. راجع البيانات وحاول مرة أخرى.</div> : null}

      <StatsGrid
        stats={[
          { label: "إجمالي الشركاء", value: partners.length, hint: `${activePartners} نشط / ${pausedPartners} متوقف / ${archivedPartners} مؤرشف` },
          { label: "إجمالي البروموكودات", value: promoCodes.length, hint: `${activePromos} نشط / ${pausedPromos} متوقف / ${expiredPromos} منتهي` },
          { label: "الاستخدامات", value: usageMonth, hint: `اليوم ${usageToday} / الأسبوع ${usageWeek} / الشهر ${usageMonth}` },
          { label: "طلبات الشركاء", value: partners.reduce((sum, partner) => sum + partner._count.orders, 0), hint: "طلبات مرتبطة بنسخة الشريك المحفوظة" },
        ]}
      />

      <nav className="admin-page-tabs" aria-label="تبويبات مركز الشركاء والبروموكود">
        <Link className="active" href="/admin/partners">الشركاء</Link>
        <Link href="/admin/partners?tab=promos">أكواد البرومو</Link>
        <Link href="/admin/partners?tab=discounts">أكواد الخصم</Link>
        <Link href="/admin/partners?tab=messages">الرسائل</Link>
        <Link href="/admin/partners?tab=analytics">التحليلات</Link>
        <Link href="/admin/partners?tab=settings">الإعدادات</Link>
      </nav>

      <form className="admin-table-toolbar" action="/admin/partners" method="get">
        <label>
          <Search size={16} />
          <input name="q" defaultValue={q} placeholder="بحث بالاسم، البرومو، المعرّف، رابط الإحالة" />
        </label>
        <select name="type" defaultValue={params.type || "all"} aria-label="نوع الشريك">
          <option value="all">كل الأنواع</option>
          {Object.entries(partnerTypeLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
        <select name="status" defaultValue={params.status || "all"} aria-label="الحالة">
          <option value="all">كل الحالات</option>
          {Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
        <button className="btn btn-soft" type="submit">تطبيق</button>
      </form>

      <div className="partner-admin-grid">
        <section className="panel">
          <div className="admin-card-head">
            <Handshake size={22} />
            <div>
              <span className="eyebrow">الشركاء</span>
              <h2>الشركاء</h2>
            </div>
          </div>
          {partners.length === 0 ? (
            <div className="admin-empty-state compact">
              <Handshake size={22} />
              <strong>لا يوجد شركاء بعد</strong>
              <p>ابدأ بإنشاء شريك وسيتم توليد بروموكود ورابط إحالة تلقائيًا.</p>
            </div>
          ) : (
            <div className="table-shell">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>الشريك</th>
                    <th>النوع</th>
                    <th>الفئة</th>
                    <th>الحالة</th>
                    <th>البرومو</th>
                    <th>الطلبات</th>
                    <th>الاستخدام</th>
                    <th>الإجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {partners.map((partner) => {
                    const primaryPromo = partner.promoCodes[0];
                    return (
                      <tr key={partner.id}>
                        <td>
                          <strong>{partner.displayName}</strong>
                          <small dir="ltr">{partner.slug}</small>
                        </td>
                        <td>{partnerTypeLabels[partner.partnerType] || partner.partnerType}</td>
                        <td>{partner.tier}</td>
                        <td><span className={statusClass(partner.status)}>{statusLabels[partner.status]}</span></td>
                        <td>
                          {primaryPromo ? (
                            <span title={discountLabel(primaryPromo.discountType, primaryPromo.discountValue)}>
                              {primaryPromo.code}
                            </span>
                          ) : "لا يوجد"}
                        </td>
                        <td>{partner._count.orders}</td>
                        <td>{partner._count.usageLogs}</td>
                        <td>
                          <div className="button-row">
                            <Link className="btn btn-soft" href={`/admin/partners/${partner.id}`}>
                              <ExternalLink size={16} />
                              عرض
                            </Link>
                            {primaryPromo ? (
                              <Link className="btn btn-soft" href={`/p/${encodeURIComponent(primaryPromo.referralSlug)}`} target="_blank">
                                <Copy size={16} />
                                اختبار
                              </Link>
                            ) : null}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <aside className="partner-side-stack">
          <section className="panel">
            <div className="admin-card-head">
              <TicketPercent size={22} />
              <div>
                <span className="eyebrow">أفضل الشركاء</span>
                <h2>أفضل الشركاء</h2>
              </div>
            </div>
            <div className="partner-mini-list">
              {topPartners.map((partner) => (
                <Link href={`/admin/partners/${partner.id}`} key={partner.id}>
                  <strong>{partner.displayName}</strong>
                  <span>{partner._count.orders} طلب / {partner._count.usageLogs} استخدام</span>
                </Link>
              ))}
              {topPartners.length === 0 ? <p className="admin-note">لا توجد بيانات بعد.</p> : null}
            </div>
          </section>

          <section className="panel">
            <div className="admin-card-head">
              <Activity size={22} />
              <div>
                <span className="eyebrow">آخر النشاطات</span>
                <h2>آخر النشاطات</h2>
              </div>
            </div>
            <div className="partner-activity-list">
              {latestActivity.map((activity) => (
                <div key={activity.id}>
                  <MessageSquareText size={16} />
                  <span>
                    <strong>{activity.partner?.displayName || "النظام"}</strong>
                    {activity.action}
                    <small>{activity.createdAt.toLocaleString("ar-EG")}</small>
                  </span>
                </div>
              ))}
              {latestActivity.length === 0 ? <p className="admin-note">لا توجد نشاطات بعد.</p> : null}
            </div>
          </section>
        </aside>
      </div>
    </section>
  );
}
