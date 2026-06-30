import Link from "next/link";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { Archive, ArrowLeft, ExternalLink, Pause, Pencil, Play, QrCode, RotateCcw, Send, TicketPercent } from "lucide-react";
import { CopyButton } from "@/components/CopyButton";
import { StatsGrid } from "@/components/StatsGrid";
import { prisma } from "@/lib/db";
import { buildShortReferralPath, buildShortReferralUrl } from "@/lib/partner-promo";
import { getPublicSiteUrl } from "@/lib/utils";
import { updatePartnerStatusAction } from "../actions";

export const dynamic = "force-dynamic";

type PartnerDetailsParams = {
  created?: string;
  status?: string;
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
  if (type === "FREE_INVITATION") return "الدعوة مجانية";
  return "بدون خصم";
}

function activityLabel(action: string) {
  if (action === "promo.short_link_visit") return "زيارة رابط البروموكود";
  if (action === "promo.applied_to_order") return "استخدام البروموكود في طلب";
  if (action === "partner.created") return "إنشاء الشريك";
  if (action === "partner.updated") return "تعديل بيانات الشريك";
  if (action === "partner.active") return "تفعيل الشريك";
  if (action === "partner.paused") return "إيقاف الشريك";
  if (action === "partner.archived") return "أرشفة الشريك";
  return action;
}

export default async function PartnerDetailsPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<PartnerDetailsParams>;
}) {
  const [{ id }, query, requestHeaders] = await Promise.all([params, searchParams, headers()]);
  if (!prisma) return <div className="notice danger">قاعدة البيانات غير متاحة حالياً.</div>;

  const siteUrl = getPublicSiteUrl(requestHeaders).replace(/\/$/, "");
  const [partner, visitCount] = await Promise.all([
    prisma.partner.findUnique({
      where: { id },
      include: {
        promoCodes: { where: { deletedAt: null }, orderBy: { createdAt: "desc" } },
        subscriptions: { orderBy: { createdAt: "desc" }, take: 3 },
        orders: { orderBy: { createdAt: "desc" }, take: 20, select: { id: true, orderNumber: true, groomName: true, brideName: true, status: true, createdAt: true, publishedInvitationCode: true } },
        usageLogs: { orderBy: { createdAt: "desc" }, take: 20 },
        activityLogs: { orderBy: { createdAt: "desc" }, take: 20 },
        _count: { select: { promoCodes: true, orders: true, usageLogs: true, messages: true } },
      },
    }),
    prisma.partnerActivityLog.count({ where: { partnerId: id, action: "promo.short_link_visit" } }),
  ]);

  if (!partner) notFound();
  const primaryPromo = partner.promoCodes[0];
  const shortPath = primaryPromo ? buildShortReferralPath(primaryPromo.referralSlug) : "";
  const shortUrl = primaryPromo ? buildShortReferralUrl(siteUrl, primaryPromo.referralSlug) : "";
  const publishedOrders = partner.orders.filter((order) => order.status === "PUBLISHED" || order.status === "CONVERTED").length;
  const pendingOrders = partner.orders.filter((order) => order.status === "NEW" || order.status === "REVIEWING" || order.status === "EDITED").length;

  return (
    <section className="admin-command-center partner-admin-page">
      <div className="dashboard-head">
        <div>
          <span className="eyebrow">لوحة الشريك</span>
          <h1>{partner.displayName}</h1>
          <p>{partnerTypeLabels[partner.partnerType] || partner.partnerType} · {partner.tier} · <span className={statusClass(partner.status)}>{statusLabels[partner.status]}</span></p>
        </div>
        <div className="dashboard-actions">
          <Link className="btn btn-soft" href="/admin/partners">
            <ArrowLeft size={17} />
            رجوع
          </Link>
          <Link className="btn btn-soft" href={`/admin/partners/${partner.id}/edit`}>
            <Pencil size={17} />
            تعديل
          </Link>
          {primaryPromo ? (
            <Link className="btn btn-gold" href={shortPath} target="_blank">
              <TicketPercent size={17} />
              اختبار البروموكود
            </Link>
          ) : null}
        </div>
      </div>

      {query.created ? <div className="notice success">تم إنشاء الشريك والبروموكود الافتراضي بنجاح.</div> : null}
      {query.status ? <div className="notice success">تم تحديث حالة الشريك.</div> : null}

      <div className="partner-detail-hero panel">
        <div className="partner-detail-brand">
          {partner.logoUrl ? <span style={{ backgroundImage: `url(${partner.logoUrl})` }} aria-label={partner.displayName} /> : <span>{partner.displayName.slice(0, 2)}</span>}
          <div>
            <strong>{partner.displayName}</strong>
            <small dir="ltr">{partner.slug}</small>
          </div>
        </div>
        {primaryPromo ? (
          <div className="partner-detail-promo">
            <span>البروموكود</span>
            <strong>{primaryPromo.code}</strong>
            <small dir="ltr">{shortUrl}</small>
            <small>{discountLabel(primaryPromo.discountType, primaryPromo.discountValue)}</small>
          </div>
        ) : null}
        {primaryPromo?.qrCodeUrl ? (
          <div className="partner-detail-qr" style={{ backgroundImage: `url(${primaryPromo.qrCodeUrl})` }} aria-label="QR" />
        ) : (
          <div className="partner-detail-qr empty"><QrCode size={28} /></div>
        )}
      </div>

      <StatsGrid
        stats={[
          { label: "الطلبات", value: partner._count.orders, hint: "جميع الطلبات المرتبطة" },
          { label: "المنشور", value: publishedOrders, hint: "من آخر 20 طلباً" },
          { label: "قيد المراجعة", value: pendingOrders, hint: "طلبات لم تنشر بعد" },
          { label: "زيارات الرابط", value: visitCount, hint: "زيارات الرابط المختصر" },
          { label: "الاستخدام", value: partner._count.usageLogs, hint: `${partner._count.promoCodes} برومو / ${partner._count.messages} رسالة` },
        ]}
      />

      <section className="panel">
        <div className="admin-card-head">
          <Send size={22} />
          <div>
              <span className="eyebrow">إجراءات سريعة</span>
            <h2>إجراءات سريعة</h2>
          </div>
        </div>
        <div className="button-row">
          <form action={updatePartnerStatusAction}>
            <input type="hidden" name="id" value={partner.id} />
            <input type="hidden" name="status" value={partner.status === "ACTIVE" ? "PAUSED" : "ACTIVE"} />
            <button className="btn btn-soft" type="submit">
              {partner.status === "ACTIVE" ? <Pause size={17} /> : <Play size={17} />}
              {partner.status === "ACTIVE" ? "إيقاف" : "إعادة تفعيل"}
            </button>
          </form>
          <form action={updatePartnerStatusAction}>
            <input type="hidden" name="id" value={partner.id} />
            <input type="hidden" name="status" value="ARCHIVED" />
            <button className="btn btn-soft danger-button" type="submit">
              <Archive size={17} />
              أرشفة
            </button>
          </form>
          {primaryPromo ? (
            <>
              <CopyButton value={primaryPromo.code} label="نسخ الكود" className="btn btn-soft" />
              <CopyButton value={shortUrl} label="نسخ الرابط" className="btn btn-soft" />
              <Link className="btn btn-soft" href={shortPath} target="_blank">
                <ExternalLink size={17} />
                فتح الرابط
              </Link>
              {primaryPromo.qrCodeUrl ? (
                <Link className="btn btn-soft" href={primaryPromo.qrCodeUrl} target="_blank">
                  <QrCode size={17} />
                  تحميل QR
                </Link>
              ) : null}
            </>
          ) : null}
          <button className="btn btn-soft" type="button" disabled>
            <RotateCcw size={17} />
            توليد برومو جديد
          </button>
        </div>
      </section>

      <div className="partner-admin-grid">
        <section className="panel">
          <div className="admin-card-head">
            <TicketPercent size={22} />
            <div>
              <span className="eyebrow">أكواد البرومو</span>
              <h2>بروموكودات الشريك</h2>
            </div>
          </div>
          <div className="table-shell">
            <table className="data-table">
              <thead>
                <tr>
                  <th>الكود</th>
                  <th>الحالة</th>
                  <th>الخصم</th>
                  <th>الاستخدام</th>
                  <th>آخر استخدام</th>
                </tr>
              </thead>
              <tbody>
                {partner.promoCodes.map((promo) => (
                  <tr key={promo.id}>
                    <td>
                      <strong dir="ltr">{promo.code}</strong>
                      <small dir="ltr">{buildShortReferralPath(promo.referralSlug)}</small>
                    </td>
                    <td><span className={statusClass(promo.status)}>{statusLabels[promo.status]}</span></td>
                    <td>{discountLabel(promo.discountType, promo.discountValue)}</td>
                    <td>{promo.currentUsage}{promo.usageLimit ? ` / ${promo.usageLimit}` : ""}</td>
                    <td>{promo.lastUsedAt ? promo.lastUsedAt.toLocaleString("ar-EG") : "لم يستخدم"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <aside className="partner-side-stack">
          <section className="panel">
            <div className="admin-card-head">
              <TicketPercent size={22} />
              <div>
                <span className="eyebrow">الطلبات</span>
                <h2>آخر الطلبات</h2>
              </div>
            </div>
            <div className="partner-mini-list">
              {partner.orders.map((order) => (
                <Link href="/admin/orders" key={order.id}>
                  <strong>{order.orderNumber || `${order.groomName} / ${order.brideName}`}</strong>
                  <span>{order.status} · {order.createdAt.toLocaleDateString("ar-EG")}</span>
                </Link>
              ))}
              {partner.orders.length === 0 ? <p className="admin-note">لا توجد طلبات مرتبطة بعد.</p> : null}
            </div>
          </section>

          <section className="panel">
            <div className="admin-card-head">
              <Send size={22} />
              <div>
                <span className="eyebrow">السجل الزمني</span>
                <h2>النشاط</h2>
              </div>
            </div>
            <div className="partner-activity-list">
              {partner.activityLogs.map((activity) => (
                <div key={activity.id}>
                  <Send size={16} />
                  <span>
                    <strong>{activityLabel(activity.action)}</strong>
                    <small>{activity.createdAt.toLocaleString("ar-EG")}</small>
                  </span>
                </div>
              ))}
              {partner.activityLogs.length === 0 ? <p className="admin-note">لا يوجد نشاط بعد.</p> : null}
            </div>
          </section>
        </aside>
      </div>
    </section>
  );
}
