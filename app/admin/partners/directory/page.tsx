import Link from "next/link";
import QRCode from "qrcode";
import { headers } from "next/headers";
import { Download, Handshake, PlusCircle, Search } from "lucide-react";
import { AdminPartnerCenterNav } from "@/components/AdminPartnerCenterNav";
import { PartnerCardActions } from "@/components/PartnerCardActions";
import { prisma } from "@/lib/db";
import { buildShortReferralPath, buildShortReferralUrl } from "@/lib/partner-promo";
import { getShareableSiteUrl } from "@/lib/utils";

export const dynamic = "force-dynamic";

type PartnersDirectoryParams = {
  q?: string;
  status?: string;
  type?: string;
};

const partnerTypeLabels: Record<string, string> = {
  PHOTOGRAPHER: "مصور فوتوغرافي",
  VIDEOGRAPHER: "فيديو",
  HALL: "قاعة أفراح",
  PLANNER: "منظم حفلات",
  DJ: "DJ",
  MAKEUP_ARTIST: "ميكب آرتيست",
  DECORATOR: "ديكور",
  OTHER: "مزود خدمة",
};

const statusLabels: Record<string, string> = {
  DRAFT: "مسودة",
  ACTIVE: "نشط",
  PAUSED: "معطل",
  EXPIRED: "منتهي",
  ARCHIVED: "مؤرشف",
};

function statusClass(status: string) {
  if (status === "ACTIVE") return "status success";
  if (status === "PAUSED" || status === "EXPIRED") return "status warning";
  if (status === "ARCHIVED") return "status danger";
  return "status";
}

function conversionRate(orders: number, visits: number) {
  if (!visits) return "0%";
  return `${Math.round((orders / visits) * 100)}%`;
}

function discountLabel(type?: string, value?: unknown) {
  const amount = value === null || value === undefined ? "" : String(value);
  if (type === "PERCENTAGE") return `${amount}%`;
  if (type === "FIXED_AMOUNT") return `${amount} جنيه`;
  if (type === "FREE_INVITATION") return "100% مجاني";
  return "بدون";
}

function readPromoIdFromActivity(value: unknown) {
  if (!value || typeof value !== "object" || !("promoId" in value)) return "";
  const promoId = (value as { promoId?: unknown }).promoId;
  return typeof promoId === "string" ? promoId : "";
}

function referralSearchToken(value: string) {
  return value
    .replace(/^https?:\/\/[^/]+\/[rp]\//i, "")
    .replace(/^\/?[rp]\//i, "")
    .replace(/^https?:\/\/[^/]+/i, "")
    .replace(/[?#].*$/, "")
    .trim();
}

function exportHref(params: PartnersDirectoryParams) {
  const query = new URLSearchParams();
  if (params.q) query.set("q", params.q);
  if (params.status && params.status !== "all") query.set("status", params.status);
  if (params.type && params.type !== "all") query.set("type", params.type);
  const suffix = query.toString();
  return `/admin/partners/directory/export${suffix ? `?${suffix}` : ""}`;
}

export default async function PartnersDirectoryPage({
  searchParams,
}: {
  searchParams: Promise<PartnersDirectoryParams>;
}) {
  const [params, requestHeaders] = await Promise.all([searchParams, headers()]);
  if (!prisma) return <div className="notice danger">قاعدة البيانات غير متاحة حالياً.</div>;

  const siteUrl = getShareableSiteUrl(requestHeaders).replace(/\/$/, "");
  const q = (params.q || "").trim();
  const referralToken = referralSearchToken(q);
  const where = {
    ...(q
      ? {
          OR: [
            { id: { contains: q, mode: "insensitive" as const } },
            { displayName: { contains: q, mode: "insensitive" as const } },
            { slug: { contains: q, mode: "insensitive" as const } },
            { facebookUrl: { contains: q, mode: "insensitive" as const } },
            { instagramUrl: { contains: q, mode: "insensitive" as const } },
            { partnerType: { equals: q.toUpperCase() as never } },
            { promoCodes: { some: { code: { contains: q.toUpperCase(), mode: "insensitive" as const } } } },
            { promoCodes: { some: { referralSlug: { contains: referralToken || q, mode: "insensitive" as const } } } },
          ],
        }
      : {}),
    ...(params.status && params.status !== "all" ? { status: params.status as never } : {}),
    ...(params.type && params.type !== "all" ? { partnerType: params.type as never } : {}),
  };

  const [partners, visitLogs, latestActivity] = await Promise.all([
    prisma.partner.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 160,
      include: {
        promoCodes: { where: { deletedAt: null }, orderBy: { createdAt: "desc" }, take: 1 },
        orders: { select: { status: true } },
        _count: { select: { orders: true, usageLogs: true, messages: true } },
      },
    }),
    prisma.partnerActivityLog.findMany({
      where: { action: "promo.short_link_visit" },
      orderBy: { createdAt: "desc" },
      take: 5000,
      select: { partnerId: true, newValue: true },
    }),
    prisma.partnerActivityLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 500,
      select: { partnerId: true, action: true, createdAt: true },
    }),
  ]);

  const visitsByPromoId = new Map<string, number>();
  const visitsByPartnerId = new Map<string, number>();
  for (const visit of visitLogs) {
    const promoId = readPromoIdFromActivity(visit.newValue);
    if (promoId) visitsByPromoId.set(promoId, (visitsByPromoId.get(promoId) || 0) + 1);
    if (visit.partnerId) visitsByPartnerId.set(visit.partnerId, (visitsByPartnerId.get(visit.partnerId) || 0) + 1);
  }
  const latestByPartnerId = new Map(latestActivity.filter((activity) => activity.partnerId).map((activity) => [activity.partnerId, activity]));

  const partnerRows = await Promise.all(
    partners.map(async (partner) => {
      const promo = partner.promoCodes[0];
      const shortPath = promo ? buildShortReferralPath(promo.referralSlug) : "";
      const shortUrl = promo ? buildShortReferralUrl(siteUrl, promo.referralSlug) : "";
      const qrCodeUrl = promo ? promo.qrCodeUrl || (await QRCode.toDataURL(shortUrl).catch(() => "")) : "";
      const visits = promo ? visitsByPromoId.get(promo.id) || visitsByPartnerId.get(partner.id) || 0 : visitsByPartnerId.get(partner.id) || 0;
      const invitationCount = partner.orders.filter((order) => order.status === "PUBLISHED" || order.status === "CONVERTED").length;
      return { partner, promo, shortPath, shortUrl, qrCodeUrl, visits, invitationCount, latestActivity: latestByPartnerId.get(partner.id) };
    }),
  );

  return (
    <section className="admin-command-center partner-admin-page partner-directory-page">
      <div className="dashboard-head">
        <div>
          <span className="eyebrow">مركز الشركاء</span>
          <h1>الشركاء</h1>
          <p>جدول CRM واضح للشركاء والمصورين والمزودين، مع كل الإجراءات داخل قائمة واحدة لكل شريك.</p>
        </div>
        <div className="dashboard-actions">
          <Link className="btn btn-gold" href="/admin/partners/new">
            <PlusCircle size={17} />
            إنشاء شريك
          </Link>
          <Link className="btn btn-soft" href={exportHref(params)}>
            <Download size={17} />
            CSV
          </Link>
        </div>
      </div>

      <AdminPartnerCenterNav />

      <form className="admin-table-toolbar partner-directory-toolbar" action="/admin/partners/directory" method="get">
        <label>
          <Search size={16} />
          <input name="q" defaultValue={q} placeholder="بحث بالاسم، البروموكود، الرابط المختصر، UUID، فيسبوك، إنستجرام، أو النوع" />
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

      {partnerRows.length === 0 ? (
        <div className="admin-empty-state compact panel">
          <Handshake size={24} />
          <strong>لا توجد شركاء مطابقة</strong>
          <p>غيّر البحث أو أنشئ شريكاً جديداً من صفحة إنشاء شريك.</p>
        </div>
      ) : (
        <section className="panel partner-crm-panel">
          <div className="table-shell">
            <table className="data-table partner-crm-table">
              <thead>
                <tr>
                  <th>الصورة</th>
                  <th>الاسم</th>
                  <th>النوع</th>
                  <th>البروموكود</th>
                  <th>نسبة الخصم</th>
                  <th>الحالة</th>
                  <th>الدعوات</th>
                  <th>الطلبات</th>
                  <th>الزيارات</th>
                  <th>معدل التحويل</th>
                  <th>آخر نشاط</th>
                  <th>الإجراءات</th>
                </tr>
              </thead>
              <tbody>
                {partnerRows.map(({ partner, promo, shortPath, shortUrl, qrCodeUrl, visits, invitationCount, latestActivity }) => (
                  <tr key={partner.id}>
                    <td>
                      <span className="partner-avatar partner-crm-avatar" style={partner.logoUrl ? { backgroundImage: `url(${partner.logoUrl})` } : undefined}>
                        {partner.logoUrl ? "" : partner.displayName.slice(0, 2)}
                      </span>
                    </td>
                    <td>
                      <strong>{partner.displayName}</strong>
                      <small dir="ltr">{partner.id}</small>
                    </td>
                    <td>{partnerTypeLabels[partner.partnerType] || partner.partnerType}</td>
                    <td>
                      <strong dir="ltr">{promo?.code || "لا يوجد"}</strong>
                      {shortPath ? <small dir="ltr">{shortPath}</small> : null}
                    </td>
                    <td>{discountLabel(promo?.discountType, promo?.discountValue)}</td>
                    <td><span className={statusClass(partner.status)}>{statusLabels[partner.status]}</span></td>
                    <td>{invitationCount}</td>
                    <td>{partner._count.orders}</td>
                    <td>{visits}</td>
                    <td>{conversionRate(partner._count.orders, visits)}</td>
                    <td>{latestActivity ? latestActivity.createdAt.toLocaleDateString("ar-EG") : "لا يوجد"}</td>
                    <td>
                      <PartnerCardActions
                        partnerId={partner.id}
                        partnerStatus={partner.status}
                        promoCode={promo?.code}
                        shortUrl={shortUrl}
                        shortPath={shortPath}
                        qrCodeUrl={qrCodeUrl}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </section>
  );
}
