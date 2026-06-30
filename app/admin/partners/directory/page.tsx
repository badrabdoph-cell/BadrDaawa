import QRCode from "qrcode";
import { headers } from "next/headers";
import { Handshake, Search } from "lucide-react";
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

function readPromoIdFromActivity(value: unknown) {
  if (!value || typeof value !== "object" || !("promoId" in value)) return "";
  const promoId = (value as { promoId?: unknown }).promoId;
  return typeof promoId === "string" ? promoId : "";
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
  const where = {
    ...(q
      ? {
          OR: [
            { displayName: { contains: q, mode: "insensitive" as const } },
            { slug: { contains: q, mode: "insensitive" as const } },
            { promoCodes: { some: { code: { contains: q.toUpperCase(), mode: "insensitive" as const } } } },
            { promoCodes: { some: { referralSlug: { contains: q, mode: "insensitive" as const } } } },
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
      take: 120,
      include: {
        promoCodes: { where: { deletedAt: null }, orderBy: { createdAt: "desc" }, take: 1 },
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
      take: 300,
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

  const partnerCards = await Promise.all(
    partners.map(async (partner) => {
      const promo = partner.promoCodes[0];
      const shortPath = promo ? buildShortReferralPath(promo.referralSlug) : "";
      const shortUrl = promo ? buildShortReferralUrl(siteUrl, promo.referralSlug) : "";
      const qrCodeUrl = promo ? promo.qrCodeUrl || (await QRCode.toDataURL(shortUrl).catch(() => "")) : "";
      const visits = promo ? visitsByPromoId.get(promo.id) || visitsByPartnerId.get(partner.id) || 0 : visitsByPartnerId.get(partner.id) || 0;
      return { partner, promo, shortPath, shortUrl, qrCodeUrl, visits, latestActivity: latestByPartnerId.get(partner.id) };
    }),
  );

  return (
    <section className="admin-command-center partner-admin-page partner-directory-page">
      <div className="dashboard-head">
        <div>
          <span className="eyebrow">مركز الشركاء</span>
          <h1>الشركاء</h1>
          <p>كل شريك في بطاقة واضحة: الصورة، الكود، الحالة، النتائج، وآخر نشاط. الإجراءات الثانوية داخل قائمة منظمة.</p>
        </div>
      </div>

      <AdminPartnerCenterNav />

      <form className="admin-table-toolbar partner-directory-toolbar" action="/admin/partners/directory" method="get">
        <label>
          <Search size={16} />
          <input name="q" defaultValue={q} placeholder="بحث بالاسم، الكود، أو رابط الإحالة" />
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

      {partnerCards.length === 0 ? (
        <div className="admin-empty-state compact panel">
          <Handshake size={24} />
          <strong>لا توجد شركاء مطابقة</strong>
          <p>غيّر البحث أو أنشئ شريكاً جديداً من صفحة إنشاء شريك.</p>
        </div>
      ) : (
        <div className="partner-card-grid">
          {partnerCards.map(({ partner, promo, shortPath, shortUrl, qrCodeUrl, visits, latestActivity }) => (
            <article className="partner-card" key={partner.id}>
              <div className="partner-card-top">
                <span className="partner-avatar" style={partner.logoUrl ? { backgroundImage: `url(${partner.logoUrl})` } : undefined}>
                  {partner.logoUrl ? "" : partner.displayName.slice(0, 2)}
                </span>
                <div>
                  <strong>{partner.displayName}</strong>
                  <small>{partnerTypeLabels[partner.partnerType] || partner.partnerType}</small>
                </div>
                <PartnerCardActions
                  partnerId={partner.id}
                  partnerStatus={partner.status}
                  promoCode={promo?.code}
                  shortUrl={shortUrl}
                  shortPath={shortPath}
                  qrCodeUrl={qrCodeUrl}
                />
              </div>

              <div className="partner-card-code">
                <span>الكود</span>
                <strong dir="ltr">{promo?.code || "لا يوجد"}</strong>
                {shortPath ? <small dir="ltr">{shortPath}</small> : null}
              </div>

              <div className="partner-card-metrics">
                <span><strong>{partner._count.orders}</strong>دعوات</span>
                <span><strong>{partner._count.usageLogs}</strong>استخدام</span>
                <span><strong>{visits}</strong>زيارات</span>
                <span><strong>{conversionRate(partner._count.orders, visits)}</strong>تحويل</span>
              </div>

              <div className="partner-card-foot">
                <span className={statusClass(partner.status)}>{statusLabels[partner.status]}</span>
                <small>{latestActivity ? `آخر نشاط: ${latestActivity.createdAt.toLocaleDateString("ar-EG")}` : "لا يوجد نشاط بعد"}</small>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
