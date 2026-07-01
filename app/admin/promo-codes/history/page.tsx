import Link from "next/link";
import { Archive, Download, History, Percent, RotateCcw, Search, TicketPercent } from "lucide-react";
import { AdminPromoSectionNav } from "@/components/AdminPromoSectionNav";
import { AdminPromoTestButton } from "@/components/AdminPromoTestButton";
import { CopyButton } from "@/components/CopyButton";
import { prisma } from "@/lib/db";
import { buildShortReferralPath, buildShortReferralUrl } from "@/lib/partner-promo";
import { getShareableSiteUrl } from "@/lib/utils";
import { headers } from "next/headers";
import { bulkPromoAction, pausePartnerPromoUntilAction, restorePartnerPromoAction, softDeletePartnerPromoAction, updatePartnerPromoStatusAction } from "../actions";

export const dynamic = "force-dynamic";

type PageParams = {
  q?: string;
  status?: string;
};

const partnerTypeLabels: Record<string, string> = {
  PHOTOGRAPHER: "مصور",
  VIDEOGRAPHER: "مصور فيديو",
  HALL: "قاعة",
  PLANNER: "منظم حفلات",
  DJ: "DJ",
  MAKEUP_ARTIST: "ميكب آرتست",
  DECORATOR: "ديكور",
  OTHER: "مزود خدمة",
};

function codeState(input: { status: string; startDate?: Date | null; expiryDate?: Date | null; deletedAt?: Date | null; archivedAt?: Date | null }) {
  const now = Date.now();
  if (input.deletedAt) return "محذوف";
  if (input.archivedAt || input.status === "ARCHIVED") return "مؤرشف";
  if (input.startDate && input.startDate.getTime() > now) return "بانتظار البداية";
  if (input.expiryDate && input.expiryDate.getTime() < now) return "منتهي";
  if (input.status === "PAUSED") return "معلق مؤقتًا";
  if (input.status === "ACTIVE") return "نشط";
  return "بانتظار البداية";
}

function discountLabel(type: string, value: unknown) {
  const amount = value === null || value === undefined ? "" : String(value);
  if (type === "PERCENTAGE") return `${amount}%`;
  if (type === "FREE_INVITATION") return "مجاني 100%";
  if (type === "FIXED_AMOUNT") return `${amount} جنيه`;
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

export default async function PromoCodeHistoryPage({
  searchParams,
}: {
  searchParams: Promise<PageParams>;
}) {
  const [params, requestHeaders] = await Promise.all([searchParams, headers()]);
  if (!prisma) return <div className="notice danger">قاعدة البيانات غير متاحة حالياً.</div>;

  const siteUrl = getShareableSiteUrl(requestHeaders).replace(/\/$/, "");
  const q = (params.q || "").trim();
  const partnerTypeSearch = Object.keys(partnerTypeLabels).includes(q.toUpperCase()) ? q.toUpperCase() : "";
  const [discountCodes, partnerPromos, visitLogs] = await Promise.all([
    prisma.discountPromoCode.findMany({
      where: q
        ? {
            OR: [
              { code: { contains: q.toUpperCase(), mode: "insensitive" as const } },
              { internalName: { contains: q, mode: "insensitive" as const } },
              { displayMessage: { contains: q, mode: "insensitive" as const } },
            ],
          }
        : {},
      orderBy: { createdAt: "desc" },
      take: 120,
    }),
    prisma.partnerPromoCode.findMany({
      where: q
        ? {
            OR: [
              { code: { contains: q.toUpperCase(), mode: "insensitive" as const } },
              { referralSlug: { contains: q, mode: "insensitive" as const } },
              { partner: { displayName: { contains: q, mode: "insensitive" as const } } },
              { partner: { facebookUrl: { contains: q, mode: "insensitive" as const } } },
              { partner: { instagramUrl: { contains: q, mode: "insensitive" as const } } },
              ...(partnerTypeSearch ? [{ partner: { partnerType: { equals: partnerTypeSearch as never } } }] : []),
            ],
          }
        : {},
      orderBy: { createdAt: "desc" },
      take: 120,
      include: { partner: true, _count: { select: { orders: true, usageLogs: true } } },
    }),
    prisma.partnerActivityLog.findMany({ where: { action: "promo.short_link_visit" }, take: 5000, select: { partnerId: true, newValue: true } }),
  ]);

  const visitsByPromoId = new Map<string, number>();
  const visitsByPartnerId = new Map<string, number>();
  for (const visit of visitLogs) {
    const promoId = readPromoIdFromActivity(visit.newValue);
    if (promoId) visitsByPromoId.set(promoId, (visitsByPromoId.get(promoId) || 0) + 1);
    if (visit.partnerId) visitsByPartnerId.set(visit.partnerId, (visitsByPartnerId.get(visit.partnerId) || 0) + 1);
  }

  return (
    <section className="admin-command-center promo-admin-page promo-history-unified">
      <div className="dashboard-head">
        <div>
          <span className="eyebrow">أكواد الخصم</span>
          <h1>السجل</h1>
          <p>كل الأكواد في مكان واحد: أكواد الخصم العامة، ثم المصورين والقاعات مع كل الدعوات والإحصائيات.</p>
        </div>
      </div>

      <AdminPromoSectionNav />

      <form className="admin-table-toolbar" action="/admin/promo-codes/history" method="get">
        <label>
          <Search size={16} />
          <input name="q" defaultValue={q} placeholder="بحث ذكي: الاسم، الكود، Facebook، Instagram، الرابط المختصر، نوع الشريك، الحالة" />
        </label>
        <select name="status" defaultValue={params.status || "all"} aria-label="الحالة">
          <option value="all">كل الحالات</option>
          <option value="ACTIVE">نشط</option>
          <option value="PAUSED">معلق مؤقتًا</option>
          <option value="PENDING">بانتظار البداية</option>
          <option value="EXPIRED">منتهي</option>
          <option value="ARCHIVED">مؤرشف</option>
        </select>
        <button className="btn btn-soft" type="submit">تطبيق</button>
      </form>

      <section className="panel">
        <div className="admin-card-head">
          <Percent size={22} />
          <div>
            <span className="eyebrow">أكواد الخصم</span>
            <h2>أكواد الخصم ونسبتها</h2>
          </div>
        </div>
        <div className="table-shell">
          <table className="data-table promo-data-table">
            <thead>
              <tr>
                <th>الكود</th>
                <th>نسبة الخصم</th>
                <th>الجملة</th>
                <th>الاستخدام</th>
                <th>الحالة</th>
                <th>إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {discountCodes.map((code) => (
                <tr key={code.id}>
                  <td><strong dir="ltr">{code.code}</strong></td>
                  <td>{discountLabel(code.discountType, code.discountValue)}</td>
                  <td>{code.displayMessage || "تم تطبيق كود الخصم."}</td>
                  <td>{code.currentUsage}{code.usageLimit ? ` / ${code.usageLimit}` : ""}</td>
                  <td>{codeState(code)}</td>
                  <td>
                    <div className="button-row">
                      <CopyButton value={code.code} label="نسخ" className="btn btn-soft" />
                      <AdminPromoTestButton code={code.code} label="اختبار الكود" />
                    </div>
                  </td>
                </tr>
              ))}
              {discountCodes.length === 0 ? <tr><td colSpan={6}>لا توجد أكواد خصم مطابقة.</td></tr> : null}
            </tbody>
          </table>
        </div>
      </section>

      <section className="panel">
        <div className="admin-card-head">
          <TicketPercent size={22} />
          <div>
            <span className="eyebrow">المصورين والقاعات</span>
            <h2>سجل المصورين والقاعات وكل الدعوات</h2>
          </div>
        </div>
        <form id="promo-bulk-form" className="promo-bulk-bar" action={bulkPromoAction}>
          <input type="hidden" name="returnTo" value="/admin/promo-codes/history" />
          <strong>Bulk Actions</strong>
          <select name="bulkAction" defaultValue="pause" aria-label="Bulk Actions">
            <option value="activate">تفعيل</option>
            <option value="pause">تعطيل</option>
            <option value="delete">حذف آمن</option>
            <option value="archive">أرشفة</option>
            <option value="restore">استعادة</option>
          </select>
          <button className="btn btn-soft" type="submit">تنفيذ</button>
          <Link className="btn btn-soft" href="/admin/partners/activity/export">
            <Download size={16} />
            تصدير CSV
          </Link>
          <span>إرسال رسالة</span>
        </form>
        <div className="table-shell">
          <table className="data-table promo-data-table">
            <thead>
              <tr>
                <th>تحديد</th>
                <th>الاسم</th>
                <th>الصفة</th>
                <th>الكود</th>
                <th>الرابط</th>
                <th>الدعوات</th>
                <th>الزيارات</th>
                <th>التحويل</th>
                <th>الحالة</th>
                <th>إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {partnerPromos.map((promo) => {
                const visits = visitsByPromoId.get(promo.id) || visitsByPartnerId.get(promo.partnerId) || 0;
                const shortPath = buildShortReferralPath(promo.referralSlug);
                const shortUrl = buildShortReferralUrl(siteUrl, promo.referralSlug);
                return (
                  <tr key={promo.id}>
                    <td><input form="promo-bulk-form" type="checkbox" name="promoIds" value={promo.id} aria-label={`تحديد ${promo.code}`} /></td>
                    <td><strong>{promo.partner.displayName}</strong></td>
                    <td>{partnerTypeLabels[promo.partner.partnerType] || promo.partner.partnerType}</td>
                    <td><strong dir="ltr">{promo.code}</strong></td>
                    <td><small dir="ltr">{shortPath}</small></td>
                    <td>{promo._count.orders}</td>
                    <td>{visits}</td>
                    <td>{conversionRate(promo._count.orders, visits)}</td>
                    <td>{codeState(promo)}</td>
                    <td>
                      <div className="button-row">
                        <Link className="btn btn-gold" href={`/admin/promo-codes/${promo.id}`}>كل الدعوات</Link>
                        <CopyButton value={promo.code} label="نسخ الكود" className="btn btn-soft" />
                        <CopyButton value={shortUrl} label="نسخ الرابط" className="btn btn-soft" />
                        <AdminPromoTestButton code={promo.code} label="اختبار الكود" />
                        <Link className="btn btn-soft" href={shortPath} target="_blank">اختبار الرابط</Link>
                        <form action={pausePartnerPromoUntilAction}>
                          <input type="hidden" name="id" value={promo.id} />
                          <input type="hidden" name="returnTo" value="/admin/promo-codes/history" />
                          <button className="btn btn-soft" type="submit">تعطيل مؤقت</button>
                        </form>
                        <form action={updatePartnerPromoStatusAction}>
                          <input type="hidden" name="id" value={promo.id} />
                          <input type="hidden" name="returnTo" value="/admin/promo-codes/history" />
                          <input type="hidden" name="status" value="ACTIVE" />
                          <button className="btn btn-soft" type="submit"><RotateCcw size={16} />إعادة تشغيل</button>
                        </form>
                        <form action={softDeletePartnerPromoAction}>
                          <input type="hidden" name="id" value={promo.id} />
                          <input type="hidden" name="returnTo" value="/admin/promo-codes/history" />
                          <button className="btn btn-soft" type="submit"><Archive size={16} />أرشفة</button>
                        </form>
                        {promo.archivedAt || promo.status === "ARCHIVED" ? (
                          <form action={restorePartnerPromoAction}>
                            <input type="hidden" name="id" value={promo.id} />
                            <input type="hidden" name="returnTo" value="/admin/promo-codes/history" />
                            <button className="btn btn-gold" type="submit">استعادة</button>
                          </form>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {partnerPromos.length === 0 ? <tr><td colSpan={10}>لا توجد أكواد مصورين مطابقة.</td></tr> : null}
            </tbody>
          </table>
        </div>
      </section>
    </section>
  );
}
