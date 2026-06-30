import Link from "next/link";
import { headers } from "next/headers";
import { ExternalLink, Search, TicketPercent } from "lucide-react";
import { AdminPromoSectionNav } from "@/components/AdminPromoSectionNav";
import { CopyButton } from "@/components/CopyButton";
import { StatsGrid } from "@/components/StatsGrid";
import { prisma } from "@/lib/db";
import { buildShortReferralPath, buildShortReferralUrl } from "@/lib/partner-promo";
import { getShareableSiteUrl } from "@/lib/utils";
import { softDeletePartnerPromoAction, updatePartnerPromoStatusAction } from "../actions";

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

function conversionRate(orders: number, visits: number) {
  if (!visits) return "0%";
  return `${Math.round((orders / visits) * 100)}%`;
}

function readPromoIdFromActivity(value: unknown) {
  if (!value || typeof value !== "object" || !("promoId" in value)) return "";
  const promoId = (value as { promoId?: unknown }).promoId;
  return typeof promoId === "string" ? promoId : "";
}

export default async function PartnerPromoCodesPage({
  searchParams,
}: {
  searchParams: Promise<PageParams>;
}) {
  const [params, requestHeaders] = await Promise.all([searchParams, headers()]);
  if (!prisma) return <div className="notice danger">قاعدة البيانات غير متاحة حالياً.</div>;

  const siteUrl = getShareableSiteUrl(requestHeaders).replace(/\/$/, "");
  const q = (params.q || "").trim();
  const where = {
    ...(q
      ? {
          OR: [
            { code: { contains: q.toUpperCase(), mode: "insensitive" as const } },
            { referralSlug: { contains: q, mode: "insensitive" as const } },
            { partner: { displayName: { contains: q, mode: "insensitive" as const } } },
          ],
        }
      : {}),
    ...(params.status && params.status !== "all" ? { status: params.status as never } : {}),
  };

  const [promoCodes, visitLogs] = await Promise.all([
    prisma.partnerPromoCode.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 120,
      include: {
        partner: { select: { id: true, displayName: true, partnerType: true, status: true } },
        _count: { select: { usageLogs: true, orders: true } },
      },
    }),
    prisma.partnerActivityLog.findMany({
      where: { action: "promo.short_link_visit" },
      orderBy: { createdAt: "desc" },
      take: 5000,
      select: { partnerId: true, newValue: true },
    }),
  ]);

  const visitsByPromoId = new Map<string, number>();
  const visitsByPartnerId = new Map<string, number>();
  for (const visit of visitLogs) {
    const promoId = readPromoIdFromActivity(visit.newValue);
    if (promoId) visitsByPromoId.set(promoId, (visitsByPromoId.get(promoId) || 0) + 1);
    if (visit.partnerId) visitsByPartnerId.set(visit.partnerId, (visitsByPartnerId.get(visit.partnerId) || 0) + 1);
  }

  const activeCount = promoCodes.filter((promo) => promo.status === "ACTIVE" && !promo.deletedAt).length;
  const deletedCount = promoCodes.filter((promo) => promo.deletedAt).length;
  const totalOrders = promoCodes.reduce((sum, promo) => sum + promo._count.orders, 0);
  const totalVisits = promoCodes.reduce((sum, promo) => sum + (visitsByPromoId.get(promo.id) || visitsByPartnerId.get(promo.partnerId) || 0), 0);

  return (
    <section className="admin-command-center promo-admin-page">
      <div className="dashboard-head">
        <div>
          <span className="eyebrow">أكواد البرومو</span>
          <h1>بروموكود المصورين والشركاء</h1>
          <p>كل رابط إحالة مرتبط بمصور أو شريك، مع النسخ والإدارة والنتائج في مكان واحد.</p>
        </div>
        <div className="dashboard-actions">
          <Link className="btn btn-gold" href="/admin/promo-codes">
            إنشاء سريع
          </Link>
        </div>
      </div>

      <AdminPromoSectionNav />

      <StatsGrid
        stats={[
          { label: "الأكواد النشطة", value: activeCount, hint: `${promoCodes.length} كود في القائمة` },
          { label: "زيارات الروابط", value: totalVisits, hint: "زيارات الروابط المختصرة" },
          { label: "الطلبات", value: totalOrders, hint: "طلبات مرتبطة ببروموكود" },
          { label: "معدل التحويل", value: conversionRate(totalOrders, totalVisits), hint: `${totalOrders} طلب من ${totalVisits} زيارة` },
          { label: "محذوف آمن", value: deletedCount, hint: "يمكن استعادتها من صفحة الإدارة" },
        ]}
      />

      <form className="admin-table-toolbar" action="/admin/promo-codes/partners" method="get">
        <label>
          <Search size={16} />
          <input name="q" defaultValue={q} placeholder="بحث بالكود، اسم الشريك، أو /r/BADR" />
        </label>
        <select name="status" defaultValue={params.status || "all"} aria-label="الحالة">
          <option value="all">كل الحالات</option>
          {Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
        <button className="btn btn-soft" type="submit">تطبيق</button>
      </form>

      <section className="panel">
        <div className="admin-card-head">
          <TicketPercent size={22} />
          <div>
            <span className="eyebrow">القائمة العملية</span>
            <h2>أكواد المصورين والشركاء</h2>
          </div>
        </div>
        {promoCodes.length === 0 ? (
          <div className="admin-empty-state compact">
            <TicketPercent size={22} />
            <strong>لا توجد أكواد مطابقة</strong>
            <p>أنشئ بروموكود جديد أو غيّر فلاتر البحث.</p>
          </div>
        ) : (
          <div className="table-shell">
            <table className="data-table promo-data-table">
              <thead>
                <tr>
                  <th>الكود</th>
                  <th>الشريك</th>
                  <th>الرابط</th>
                  <th>الخصم</th>
                  <th>زيارات</th>
                  <th>طلبات</th>
                  <th>تحويل</th>
                  <th>الحالة</th>
                  <th>إجراءات</th>
                </tr>
              </thead>
              <tbody>
                {promoCodes.map((promo) => {
                  const visits = visitsByPromoId.get(promo.id) || visitsByPartnerId.get(promo.partnerId) || 0;
                  const shortPath = buildShortReferralPath(promo.referralSlug);
                  const shortUrl = buildShortReferralUrl(siteUrl, promo.referralSlug);
                  return (
                    <tr key={promo.id}>
                      <td>
                        <strong dir="ltr">{promo.code}</strong>
                        <small>{promo.deletedAt ? "محذوف آمن" : promo.kind}</small>
                      </td>
                      <td>
                        <strong>{promo.partner.displayName}</strong>
                        <small>{promo.partner.partnerType}</small>
                      </td>
                      <td><small dir="ltr">{shortPath}</small></td>
                      <td>{discountLabel(promo.discountType, promo.discountValue)}</td>
                      <td>{visits}</td>
                      <td>{promo._count.orders}</td>
                      <td>{conversionRate(promo._count.orders, visits)}</td>
                      <td><span className={statusClass(promo.deletedAt ? "ARCHIVED" : promo.status)}>{promo.deletedAt ? "محذوف" : statusLabels[promo.status]}</span></td>
                      <td>
                        <div className="button-row">
                          <CopyButton value={promo.code} label="نسخ الكود" className="btn btn-soft" />
                          <CopyButton value={shortUrl} label="نسخ الرابط" className="btn btn-soft" />
                          <Link className="btn btn-soft" href={shortPath} target="_blank">
                            <ExternalLink size={16} />
                            فتح
                          </Link>
                          <Link className="btn btn-gold" href={`/admin/promo-codes/${promo.id}`}>
                            إدارة
                          </Link>
                          {!promo.deletedAt ? (
                            <>
                              <form action={updatePartnerPromoStatusAction}>
                                <input type="hidden" name="id" value={promo.id} />
                                <input type="hidden" name="returnTo" value="/admin/promo-codes/partners" />
                                <input type="hidden" name="status" value={promo.status === "ACTIVE" ? "PAUSED" : "ACTIVE"} />
                                <button className="btn btn-soft" type="submit">{promo.status === "ACTIVE" ? "إيقاف" : "تفعيل"}</button>
                              </form>
                              <form action={softDeletePartnerPromoAction}>
                                <input type="hidden" name="id" value={promo.id} />
                                <input type="hidden" name="returnTo" value="/admin/promo-codes/partners" />
                                <button className="btn btn-soft danger-button" type="submit">حذف</button>
                              </form>
                            </>
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
    </section>
  );
}
