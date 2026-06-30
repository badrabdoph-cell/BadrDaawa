import Link from "next/link";
import QRCode from "qrcode";
import { headers } from "next/headers";
import { BarChart3, ExternalLink, Search, TicketPercent } from "lucide-react";
import { AdminPromoCopyPanel } from "@/components/AdminPromoCopyPanel";
import { AdminPromoQuickForm } from "@/components/AdminPromoQuickForm";
import { CopyButton } from "@/components/CopyButton";
import { StatsGrid } from "@/components/StatsGrid";
import { prisma } from "@/lib/db";
import { buildShortReferralPath, buildShortReferralUrl } from "@/lib/partner-promo";
import { getShareableSiteUrl } from "@/lib/utils";
import { createQuickPromoCodeAction } from "./actions";

export const dynamic = "force-dynamic";

type PromoCodesPageParams = {
  created?: string;
  error?: string;
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

function errorMessage(value?: string) {
  if (value === "database") return "قاعدة البيانات غير متاحة حالياً.";
  if (value === "name") return "اكتب اسم الشريك أو المصور أولاً.";
  if (value === "discount") return "قيمة الخصم مطلوبة عند اختيار نسبة أو مبلغ ثابت.";
  return value ? "تعذر إنشاء البروموكود. راجع البيانات وحاول مرة أخرى." : "";
}

export default async function PromoCodesPage({
  searchParams,
}: {
  searchParams: Promise<PromoCodesPageParams>;
}) {
  const [params, requestHeaders] = await Promise.all([searchParams, headers()]);
  if (!prisma) return <div className="notice danger">قاعدة البيانات غير متاحة حالياً.</div>;

  const siteUrl = getShareableSiteUrl(requestHeaders).replace(/\/$/, "");
  const q = (params.q || "").trim();
  const where = {
    deletedAt: null,
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

  const [promoCodes, visitLogs, latestActivity, createdPromo] = await Promise.all([
    prisma.partnerPromoCode.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 100,
      include: {
        partner: { select: { id: true, displayName: true, logoUrl: true, status: true } },
        _count: { select: { usageLogs: true, orders: true } },
      },
    }),
    prisma.partnerActivityLog.findMany({
      where: { action: "promo.short_link_visit" },
      orderBy: { createdAt: "desc" },
      take: 5000,
      select: { partnerId: true, newValue: true, createdAt: true },
    }),
    prisma.partnerActivityLog.findMany({
      where: { action: { in: ["promo.short_link_visit", "promo.applied_to_order", "partner.created", "partner.updated"] } },
      orderBy: { createdAt: "desc" },
      take: 8,
      include: { partner: { select: { displayName: true } } },
    }),
    params.created
      ? prisma.partnerPromoCode.findUnique({
          where: { id: params.created },
          include: { partner: { select: { displayName: true } } },
        })
      : Promise.resolve(null),
  ]);

  const visitsByPromoId = new Map<string, number>();
  const visitsByPartnerId = new Map<string, number>();
  for (const visit of visitLogs) {
    const promoId = readPromoIdFromActivity(visit.newValue);
    if (promoId) visitsByPromoId.set(promoId, (visitsByPromoId.get(promoId) || 0) + 1);
    if (visit.partnerId) visitsByPartnerId.set(visit.partnerId, (visitsByPartnerId.get(visit.partnerId) || 0) + 1);
  }

  const totalVisits = visitLogs.length;
  const totalUses = promoCodes.reduce((sum, promo) => sum + promo._count.usageLogs, 0);
  const totalOrders = promoCodes.reduce((sum, promo) => sum + promo._count.orders, 0);
  const activePromos = promoCodes.filter((promo) => promo.status === "ACTIVE").length;
  const createdShortUrl = createdPromo ? buildShortReferralUrl(siteUrl, createdPromo.referralSlug) : "";
  const createdQrCodeUrl = createdPromo ? await QRCode.toDataURL(createdShortUrl).catch(() => createdPromo.qrCodeUrl || "") : "";
  const message = errorMessage(params.error);

  return (
    <section className="admin-command-center promo-admin-page">
      <div className="dashboard-head">
        <div>
          <span className="eyebrow">أكواد البرومو</span>
          <h1>أكواد البرومو</h1>
          <p>أنشئ الكود، انسخ الرابط، اختبره، وتابع الزيارات والطلبات من مكان واحد واضح.</p>
        </div>
        <div className="dashboard-actions">
          <Link className="btn btn-soft" href="/admin/partners">
            إدارة الشركاء
          </Link>
        </div>
      </div>

      {message ? <div className="notice danger">{message}</div> : null}

      <StatsGrid
        stats={[
          { label: "الأكواد النشطة", value: activePromos, hint: `${promoCodes.length} كود ظاهر في القائمة` },
          { label: "زيارات الرابط", value: totalVisits, hint: "من الروابط المختصرة /r" },
          { label: "استخدامات الكود", value: totalUses, hint: "طلبات طبقت البروموكود" },
          { label: "معدل التحويل", value: conversionRate(totalOrders, totalVisits), hint: `${totalOrders} طلب من ${totalVisits} زيارة` },
        ]}
      />

      <div className="promo-admin-grid">
        <section className="panel promo-create-panel">
          <AdminPromoQuickForm action={createQuickPromoCodeAction} />
        </section>

        <aside className="promo-admin-side">
          {createdPromo ? (
            <AdminPromoCopyPanel
              code={createdPromo.code}
              shortUrl={createdShortUrl}
              qrCodeUrl={createdQrCodeUrl}
              partnerName={createdPromo.partner.displayName}
              discountLabel={discountLabel(createdPromo.discountType, createdPromo.discountValue)}
            />
          ) : (
            <div className="promo-empty-guide panel">
              <TicketPercent size={24} />
              <strong>بعد إنشاء البروموكود ستظهر هنا أدوات النسخ</strong>
              <p>الكود، الرابط المختصر، QR، ورسالة جاهزة للإرسال تظهر فوراً بدون بحث.</p>
            </div>
          )}
        </aside>
      </div>

      <form className="admin-table-toolbar" action="/admin/promo-codes" method="get">
        <label>
          <Search size={16} />
          <input name="q" defaultValue={q} placeholder="بحث بالكود، اسم الشريك، أو رابط الإحالة" />
        </label>
        <select name="status" defaultValue={params.status || "all"} aria-label="الحالة">
          <option value="all">كل الحالات</option>
          {Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
        <button className="btn btn-soft" type="submit">تطبيق</button>
      </form>

      <section className="panel">
        <div className="admin-card-head">
          <BarChart3 size={22} />
          <div>
            <span className="eyebrow">قائمة الأكواد</span>
            <h2>كل أكواد البرومو</h2>
          </div>
        </div>
        {promoCodes.length === 0 ? (
          <div className="admin-empty-state compact">
            <TicketPercent size={22} />
            <strong>لا توجد أكواد بعد</strong>
            <p>أنشئ أول بروموكود من النموذج السريع بالأعلى.</p>
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
                      <td><strong dir="ltr">{promo.code}</strong></td>
                      <td>{promo.partner.displayName}</td>
                      <td><small dir="ltr">{shortPath}</small></td>
                      <td>{discountLabel(promo.discountType, promo.discountValue)}</td>
                      <td>{visits}</td>
                      <td>{promo._count.orders}</td>
                      <td>{conversionRate(promo._count.orders, visits)}</td>
                      <td><span className={statusClass(promo.status)}>{statusLabels[promo.status]}</span></td>
                      <td>
                        <div className="button-row">
                          <CopyButton value={promo.code} label="الكود" className="btn btn-soft" />
                          <CopyButton value={shortUrl} label="الرابط" className="btn btn-soft" />
                          <Link className="btn btn-soft" href={shortPath} target="_blank">
                            <ExternalLink size={16} />
                            فتح
                          </Link>
                          <Link className="btn btn-soft" href={`/admin/partners/${promo.partnerId}`}>
                            إدارة
                          </Link>
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

      <section className="panel">
        <div className="admin-card-head">
          <TicketPercent size={22} />
          <div>
            <span className="eyebrow">آخر النشاطات</span>
            <h2>حركة البروموكود</h2>
          </div>
        </div>
        <div className="partner-activity-list">
          {latestActivity.map((activity) => (
            <div key={activity.id}>
              <TicketPercent size={16} />
              <span>
                <strong>{activity.partner?.displayName || "النظام"}</strong>
                {activity.action === "promo.short_link_visit" ? "زيارة رابط" : activity.action === "promo.applied_to_order" ? "استخدام في طلب" : activity.action === "partner.created" ? "إنشاء كود" : "تحديث بيانات"}
                <small>{activity.createdAt.toLocaleString("ar-EG")}</small>
              </span>
            </div>
          ))}
          {latestActivity.length === 0 ? <p className="admin-note">لا توجد نشاطات بعد.</p> : null}
        </div>
      </section>
    </section>
  );
}
