import Link from "next/link";
import QRCode from "qrcode";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { ArrowLeft, Archive, ExternalLink, Pause, Play, RotateCcw, TicketPercent, Trash2 } from "lucide-react";
import { AdminPromoCopyPanel } from "@/components/AdminPromoCopyPanel";
import { AdminPromoSectionNav } from "@/components/AdminPromoSectionNav";
import { CopyButton } from "@/components/CopyButton";
import { StatsGrid } from "@/components/StatsGrid";
import { prisma } from "@/lib/db";
import { buildShortReferralPath, buildShortReferralUrl } from "@/lib/partner-promo";
import { getShareableSiteUrl } from "@/lib/utils";
import { restorePartnerPromoAction, softDeletePartnerPromoAction, updatePartnerPromoStatusAction } from "../actions";

export const dynamic = "force-dynamic";

const statusLabels: Record<string, string> = {
  DRAFT: "بانتظار البداية",
  ACTIVE: "نشط",
  PAUSED: "معلق مؤقتًا",
  EXPIRED: "منتهي",
  ARCHIVED: "مؤرشف",
};

function timelineLabel(action: string) {
  if (action === "partner.created" || action === "promo.create") return "إنشاء الكود";
  if (action === "partner.updated") return "تعديل البيانات";
  if (action === "promo.discount_updated") return "تغيير الخصم";
  if (action === "promo.paused" || action === "promo.PAUSED") return "تعطيل";
  if (action === "promo.active" || action === "promo.ACTIVE" || action === "promo.restored") return "إعادة تشغيل";
  if (action === "promo.paused_until") return "إيقاف مؤقت";
  if (action === "promo.deleted") return "حذف";
  if (action === "promo.restored") return "استعادة";
  if (action === "promo.short_link_visit") return "زيارة الرابط";
  if (action === "promo.applied_to_order") return "استخدام البروموكود";
  if (action === "order.created") return "إنشاء دعوة";
  if (action === "partner.message.sent") return "إرسال رسالة";
  return action;
}

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

function readPromoIdFromActivity(value: unknown) {
  if (!value || typeof value !== "object" || !("promoId" in value)) return "";
  const promoId = (value as { promoId?: unknown }).promoId;
  return typeof promoId === "string" ? promoId : "";
}

function readOrderIdFromActivity(value: unknown) {
  if (!value || typeof value !== "object" || !("orderId" in value)) return "";
  const orderId = (value as { orderId?: unknown }).orderId;
  return typeof orderId === "string" ? orderId : "";
}

function conversionRate(orders: number, visits: number) {
  if (!visits) return "0%";
  return `${Math.round((orders / visits) * 100)}%`;
}

export default async function PromoCodeDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const [{ id }, requestHeaders] = await Promise.all([params, headers()]);
  if (!prisma) return <div className="notice danger">قاعدة البيانات غير متاحة حالياً.</div>;

  const siteUrl = getShareableSiteUrl(requestHeaders).replace(/\/$/, "");
  const [promo, activity] = await Promise.all([
    prisma.partnerPromoCode.findUnique({
      where: { id },
      include: {
        partner: true,
        usageLogs: { orderBy: { createdAt: "desc" }, take: 60 },
        orders: {
          orderBy: { createdAt: "desc" },
          take: 80,
          select: {
            id: true,
            orderNumber: true,
            groomName: true,
            brideName: true,
            phone: true,
            status: true,
            publishedInvitationCode: true,
            createdAt: true,
          },
        },
        _count: { select: { usageLogs: true, orders: true } },
      },
    }),
    prisma.partnerActivityLog.findMany({
      where: { action: { startsWith: "promo." } },
      orderBy: { createdAt: "desc" },
      take: 500,
      include: { partner: { select: { displayName: true } } },
    }),
  ]);

  if (!promo) notFound();

  const shortPath = buildShortReferralPath(promo.referralSlug);
  const shortUrl = buildShortReferralUrl(siteUrl, promo.referralSlug);
  const qrCodeUrl = await QRCode.toDataURL(shortUrl).catch(() => promo.qrCodeUrl || "");
  const promoActivity = activity.filter((item) => readPromoIdFromActivity(item.newValue) === promo.id || item.partnerId === promo.partnerId);
  const visits = promoActivity.filter((item) => item.action === "promo.short_link_visit" && readPromoIdFromActivity(item.newValue) === promo.id).length;
  const applied = promoActivity.filter((item) => item.action === "promo.applied_to_order" && readPromoIdFromActivity(item.newValue) === promo.id).length;
  const returnTo = `/admin/promo-codes/${promo.id}`;
  const visibleStatus = promo.deletedAt ? "ARCHIVED" : promo.status;

  return (
    <section className="admin-command-center promo-admin-page">
      <div className="dashboard-head">
        <div>
          <span className="eyebrow">إدارة البروموكود</span>
          <h1>إدارة البروموكود {promo.code}</h1>
          <p>{promo.partner.displayName} · <span className={statusClass(visibleStatus)}>{promo.deletedAt ? "محذوف آمن" : statusLabels[promo.status]}</span></p>
        </div>
        <div className="dashboard-actions">
          <Link className="btn btn-soft" href="/admin/promo-codes/partners">
            <ArrowLeft size={17} />
            رجوع للقائمة
          </Link>
          <Link className="btn btn-gold" href={shortPath} target="_blank">
            <ExternalLink size={17} />
            اختبار الرابط
          </Link>
        </div>
      </div>

      <AdminPromoSectionNav />

      <div className="promo-detail-grid">
        <AdminPromoCopyPanel
          code={promo.code}
          shortUrl={shortUrl}
          qrCodeUrl={qrCodeUrl}
          partnerName={promo.partner.displayName}
          discountLabel={discountLabel(promo.discountType, promo.discountValue)}
        />

        <section className="panel promo-management-panel">
          <div className="admin-card-head">
            <TicketPercent size={22} />
            <div>
              <span className="eyebrow">التحكم</span>
              <h2>إجراءات الكود</h2>
            </div>
          </div>
          <div className="promo-status-summary">
            <span>الحالة الحالية</span>
            <strong className={statusClass(visibleStatus)}>{promo.deletedAt ? "محذوف آمن" : statusLabels[promo.status]}</strong>
            <small dir="ltr">{shortPath}</small>
          </div>
          <div className="button-row">
            {!promo.deletedAt ? (
              <>
                <form action={updatePartnerPromoStatusAction}>
                  <input type="hidden" name="id" value={promo.id} />
                  <input type="hidden" name="returnTo" value={returnTo} />
                  <input type="hidden" name="status" value={promo.status === "ACTIVE" ? "PAUSED" : "ACTIVE"} />
                  <button className="btn btn-soft" type="submit">
                    {promo.status === "ACTIVE" ? <Pause size={17} /> : <Play size={17} />}
                    {promo.status === "ACTIVE" ? "إيقاف الكود" : "تفعيل الكود"}
                  </button>
                </form>
                <form action={updatePartnerPromoStatusAction}>
                  <input type="hidden" name="id" value={promo.id} />
                  <input type="hidden" name="returnTo" value={returnTo} />
                  <input type="hidden" name="status" value="ARCHIVED" />
                  <button className="btn btn-soft" type="submit">
                    <Archive size={17} />
                    أرشفة
                  </button>
                </form>
                <form action={softDeletePartnerPromoAction}>
                  <input type="hidden" name="id" value={promo.id} />
                  <input type="hidden" name="returnTo" value={returnTo} />
                  <button className="btn btn-soft danger-button" type="submit">
                    <Trash2 size={17} />
                    حذف آمن
                  </button>
                </form>
              </>
            ) : (
              <form action={restorePartnerPromoAction}>
                <input type="hidden" name="id" value={promo.id} />
                <input type="hidden" name="returnTo" value={returnTo} />
                <button className="btn btn-gold" type="submit">
                  <RotateCcw size={17} />
                  استعادة وتفعيل
                </button>
              </form>
            )}
          </div>
        </section>
      </div>

      <StatsGrid
        stats={[
          { label: "زيارات الرابط", value: visits, hint: "فتح الرابط المختصر" },
          { label: "استخدامات مؤكدة", value: promo._count.usageLogs, hint: `${applied} حركة تطبيق مسجلة` },
          { label: "الدعوات والطلبات", value: promo._count.orders, hint: "طلبات مرتبطة بهذا الكود" },
          { label: "معدل التحويل", value: conversionRate(promo._count.orders, visits), hint: `${promo._count.orders} طلب من ${visits} زيارة` },
          { label: "الاستخدام الحالي", value: promo.currentUsage, hint: promo.usageLimit ? `من أصل ${promo.usageLimit}` : "بدون حد استخدام" },
        ]}
      />

      <section className="panel">
        <div className="admin-card-head">
          <TicketPercent size={22} />
          <div>
            <span className="eyebrow">الدعوات والطلبات</span>
            <h2>الدعوات والطلبات المسجلة بهذا البروموكود</h2>
          </div>
        </div>
        {promo.orders.length === 0 ? (
          <div className="admin-empty-state compact">
            <TicketPercent size={22} />
            <strong>لا توجد طلبات بعد</strong>
            <p>عند تسجيل دعوة بهذا البروموكود ستظهر هنا مع رابط الدخول والإدارة.</p>
          </div>
        ) : (
          <div className="table-shell">
            <table className="data-table promo-data-table">
              <thead>
                <tr>
                  <th>الطلب</th>
                  <th>العروسين</th>
                  <th>الهاتف</th>
                  <th>الحالة</th>
                  <th>الدعوة المنشورة</th>
                  <th>إجراءات</th>
                </tr>
              </thead>
              <tbody>
                {promo.orders.map((order) => (
                  <tr key={order.id}>
                    <td>
                      <strong>{order.orderNumber || order.id.slice(0, 8)}</strong>
                      <small>{order.createdAt.toLocaleString("ar-EG")}</small>
                    </td>
                    <td>{order.groomName} / {order.brideName}</td>
                    <td dir="ltr">{order.phone || "-"}</td>
                    <td>{order.status}</td>
                    <td>{order.publishedInvitationCode ? <strong dir="ltr">{order.publishedInvitationCode}</strong> : "لم تنشر بعد"}</td>
                    <td>
                      <div className="button-row">
                        <Link className="btn btn-soft" href="/admin/orders">إدارة الطلبات</Link>
                        {order.publishedInvitationCode ? (
                          <>
                            <Link className="btn btn-soft" href={`/${order.publishedInvitationCode}`} target="_blank">فتح الدعوة</Link>
                            <CopyButton value={`${siteUrl}/${order.publishedInvitationCode}`} label="نسخ الدعوة" className="btn btn-soft" />
                          </>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="panel">
        <div className="admin-card-head">
          <TicketPercent size={22} />
          <div>
            <span className="eyebrow">السجل</span>
            <h2>آخر حركات هذا الكود</h2>
          </div>
        </div>
        <div className="promo-timeline-legend" aria-label="أنواع أحداث السجل">
          {["إنشاء الكود", "تعديل البيانات", "تغيير الخصم", "تعطيل", "إعادة تشغيل", "إيقاف مؤقت", "حذف", "استعادة", "زيارة الرابط", "استخدام البروموكود", "إنشاء دعوة", "إرسال رسالة"].map((event) => (
            <span key={event}>{event}</span>
          ))}
        </div>
        <div className="promo-history-list">
          {promoActivity.slice(0, 18).map((item) => (
            <article key={item.id}>
              <TicketPercent size={17} />
              <div>
                <strong>{timelineLabel(item.action)}</strong>
                <span>{item.partner?.displayName || promo.partner.displayName}</span>
                <small>{item.createdAt.toLocaleString("ar-EG")}{readOrderIdFromActivity(item.newValue) ? ` · طلب ${readOrderIdFromActivity(item.newValue).slice(0, 8)}` : ""}</small>
              </div>
            </article>
          ))}
          {promoActivity.length === 0 ? <p className="admin-note">لا يوجد نشاط مسجل بعد.</p> : null}
        </div>
      </section>
    </section>
  );
}
