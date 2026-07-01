import Link from "next/link";
import QRCode from "qrcode";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { ArrowLeft, BarChart3, ExternalLink, History, MessageSquareText, Pause, Pencil, Play, QrCode, Send, TicketPercent } from "lucide-react";
import { AdminPartnerCenterNav } from "@/components/AdminPartnerCenterNav";
import { CopyButton } from "@/components/CopyButton";
import { StatsGrid } from "@/components/StatsGrid";
import { prisma } from "@/lib/db";
import { buildShortReferralPath, buildShortReferralUrl } from "@/lib/partner-promo";
import { getShareableSiteUrl } from "@/lib/utils";
import { createPartnerMessageAction, updatePartnerStatusAction } from "../actions";

export const dynamic = "force-dynamic";

type PartnerDetailsParams = {
  created?: string;
  status?: string;
  tab?: string;
  message?: string;
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
  PAUSED: "معطل",
  EXPIRED: "منتهي",
  ARCHIVED: "مؤرشف",
};

const tabs = [
  { id: "overview", label: "نظرة عامة" },
  { id: "invitations", label: "الدعوات" },
  { id: "orders", label: "الطلبات" },
  { id: "messages", label: "الرسائل" },
  { id: "stats", label: "الإحصائيات" },
  { id: "activity", label: "سجل النشاط" },
  { id: "settings", label: "الإعدادات" },
];

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
  if (action === "partner.message.sent") return "إرسال رسالة";
  return action;
}

function conversionRate(orders: number, visits: number) {
  if (!visits) return "0%";
  return `${Math.round((orders / visits) * 100)}%`;
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

  const activeTab = tabs.some((tab) => tab.id === query.tab) ? query.tab || "overview" : "overview";
  const siteUrl = getShareableSiteUrl(requestHeaders).replace(/\/$/, "");
  const [partner, visitCount] = await Promise.all([
    prisma.partner.findUnique({
      where: { id },
      include: {
        promoCodes: { where: { deletedAt: null }, orderBy: { createdAt: "desc" } },
        subscriptions: { orderBy: { createdAt: "desc" }, take: 3 },
        messages: { where: { deletedAt: null }, orderBy: { createdAt: "desc" }, take: 20 },
        orders: {
          orderBy: { createdAt: "desc" },
          take: 120,
          select: {
            id: true,
            orderNumber: true,
            groomName: true,
            brideName: true,
            phone: true,
            status: true,
            createdAt: true,
            publishedInvitationCode: true,
            customerId: true,
          },
        },
        usageLogs: { orderBy: { createdAt: "desc" }, take: 80 },
        activityLogs: { orderBy: { createdAt: "desc" }, take: 80 },
        _count: { select: { promoCodes: true, orders: true, usageLogs: true, messages: true } },
      },
    }),
    prisma.partnerActivityLog.count({ where: { partnerId: id, action: "promo.short_link_visit" } }),
  ]);

  if (!partner) notFound();

  const primaryPromo = partner.promoCodes[0];
  const shortPath = primaryPromo ? buildShortReferralPath(primaryPromo.referralSlug) : "";
  const shortUrl = primaryPromo ? buildShortReferralUrl(siteUrl, primaryPromo.referralSlug) : "";
  const displayQrCodeUrl = primaryPromo ? await QRCode.toDataURL(shortUrl).catch(() => primaryPromo.qrCodeUrl || "") : "";
  const publishedOrders = partner.orders.filter((order) => order.status === "PUBLISHED" || order.status === "CONVERTED").length;
  const pendingOrders = partner.orders.filter((order) => order.status === "NEW" || order.status === "REVIEWING" || order.status === "EDITED").length;
  const chartMax = Math.max(visitCount, partner._count.usageLogs, partner._count.orders, 1);

  return (
    <section className="admin-command-center partner-admin-page partner-detail-workspace">
      <div className="dashboard-head">
        <div>
          <span className="eyebrow">مركز الشركاء</span>
          <h1>{partner.displayName}</h1>
          <p>{partnerTypeLabels[partner.partnerType] || partner.partnerType} · {partner.tier} · <span className={statusClass(partner.status)}>{statusLabels[partner.status]}</span></p>
        </div>
        <div className="dashboard-actions">
          <Link className="btn btn-soft" href="/admin/partners/directory">
            <ArrowLeft size={17} />
            الشركاء
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

      <AdminPartnerCenterNav />

      {query.created ? <div className="notice success">تم إنشاء الشريك والبروموكود الافتراضي بنجاح.</div> : null}
      {query.status ? <div className="notice success">تم تحديث حالة الشريك.</div> : null}
      {query.message ? <div className="notice success">تم إرسال الرسالة للدعوات المرتبطة بالشريك.</div> : null}
      {query.error ? <div className="notice danger">تعذر تنفيذ العملية. راجع البيانات وحاول مرة أخرى.</div> : null}

      <section className="panel partner-summary-strip">
        <div className="partner-summary-identity">
          {partner.logoUrl ? <span className="partner-avatar" style={{ backgroundImage: `url(${partner.logoUrl})` }} aria-label={partner.displayName} /> : <span className="partner-avatar">{partner.displayName.slice(0, 2)}</span>}
          <div>
            <strong>{partner.displayName}</strong>
            <small>{partnerTypeLabels[partner.partnerType] || partner.partnerType} · <span className={statusClass(partner.status)}>{statusLabels[partner.status]}</span></small>
          </div>
        </div>
        <div>
          <span>البروموكود</span>
          <strong dir="ltr">{primaryPromo?.code || "لا يوجد"}</strong>
        </div>
        <div>
          <span>نسبة الخصم</span>
          <strong>{discountLabel(primaryPromo?.discountType || "NONE", primaryPromo?.discountValue)}</strong>
        </div>
        <div>
          <span>عدد الدعوات</span>
          <strong>{publishedOrders}</strong>
        </div>
        <div>
          <span>عدد الطلبات</span>
          <strong>{partner._count.orders}</strong>
        </div>
        <div>
          <span>عدد الزيارات</span>
          <strong>{visitCount}</strong>
        </div>
        <div>
          <span>معدل التحويل</span>
          <strong>{conversionRate(partner._count.orders, visitCount)}</strong>
        </div>
      </section>

      <nav className="partner-detail-tabs" aria-label="تبويبات الشريك">
        {tabs.map((tab) => (
          <Link key={tab.id} className={activeTab === tab.id ? "active" : ""} href={`/admin/partners/${partner.id}?tab=${tab.id}`}>
            {tab.label}
          </Link>
        ))}
      </nav>

      {activeTab === "overview" ? (
        <>
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
            {displayQrCodeUrl ? <div className="partner-detail-qr" style={{ backgroundImage: `url(${displayQrCodeUrl})` }} aria-label="QR" /> : <div className="partner-detail-qr empty"><QrCode size={28} /></div>}
          </div>

          <StatsGrid
            stats={[
              { label: "عدد الدعوات", value: partner._count.orders, hint: "كل الدعوات المرتبطة" },
              { label: "عدد الاستخدام", value: partner._count.usageLogs, hint: `${partner._count.promoCodes} بروموكود` },
              { label: "عدد الزيارات", value: visitCount, hint: "زيارات الرابط المختصر" },
              { label: "معدل التحويل", value: conversionRate(partner._count.orders, visitCount), hint: `${partner._count.orders} دعوة من ${visitCount} زيارة` },
              { label: "آخر نشاط", value: partner.activityLogs[0] ? partner.activityLogs[0].createdAt.toLocaleDateString("ar-EG") : "لا يوجد", hint: "آخر حركة مسجلة" },
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
                <input type="hidden" name="returnTo" value={`/admin/partners/${partner.id}`} />
                <input type="hidden" name="status" value={partner.status === "ACTIVE" ? "PAUSED" : "ACTIVE"} />
                <button className="btn btn-soft" type="submit">
                  {partner.status === "ACTIVE" ? <Pause size={17} /> : <Play size={17} />}
                  {partner.status === "ACTIVE" ? "تعطيل" : "تفعيل"}
                </button>
              </form>
              {primaryPromo ? (
                <>
                  <CopyButton value={primaryPromo.code} label="نسخ الكود" className="btn btn-soft" />
                  <CopyButton value={shortUrl} label="نسخ الرابط" className="btn btn-soft" />
                  <Link className="btn btn-soft" href={shortPath} target="_blank"><ExternalLink size={17} />فتح الرابط</Link>
                  {displayQrCodeUrl ? <Link className="btn btn-soft" href={displayQrCodeUrl} target="_blank"><QrCode size={17} />تنزيل QR</Link> : null}
                </>
              ) : null}
            </div>
          </section>
        </>
      ) : null}

      {activeTab === "invitations" ? (
        <section className="panel">
          <div className="admin-card-head">
            <TicketPercent size={22} />
            <div>
              <span className="eyebrow">الدعوات</span>
              <h2>الدعوات المنشورة للشريك</h2>
            </div>
          </div>
          <div className="table-shell">
            <table className="data-table promo-data-table">
              <thead>
                <tr>
                  <th>الدعوة</th>
                  <th>العروسين</th>
                  <th>الحالة</th>
                  <th>التاريخ</th>
                  <th>إجراءات</th>
                </tr>
              </thead>
              <tbody>
                {partner.orders.filter((order) => order.publishedInvitationCode).map((order) => {
                  const invitationUrl = order.publishedInvitationCode ? `${siteUrl}/${order.publishedInvitationCode}` : "";
                  return (
                    <tr key={order.id}>
                      <td>
                        <strong>{order.orderNumber || order.id.slice(0, 8)}</strong>
                        <small dir="ltr">{order.publishedInvitationCode || "لم تنشر بعد"}</small>
                      </td>
                      <td>{order.groomName} / {order.brideName}</td>
                      <td>{order.status}</td>
                      <td>{order.createdAt.toLocaleDateString("ar-EG")}</td>
                      <td>
                        <div className="button-row">
                          {invitationUrl ? <Link className="btn btn-soft" href={invitationUrl} target="_blank">فتح الدعوة</Link> : null}
                          {invitationUrl ? <CopyButton value={invitationUrl} label="نسخ الرابط" className="btn btn-soft" /> : null}
                          <Link className="btn btn-soft" href="/admin/orders">فتح الطلب</Link>
                          {order.publishedInvitationCode ? <Link className="btn btn-soft" href={`/admin/invitations-customers/${order.publishedInvitationCode}`}>فتح العميل</Link> : null}
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {partner.orders.filter((order) => order.publishedInvitationCode).length === 0 ? (
                  <tr>
                    <td colSpan={5}>لا توجد دعوات منشورة لهذا الشريك بعد.</td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      {activeTab === "orders" ? (
        <section className="panel">
          <div className="admin-card-head">
            <TicketPercent size={22} />
            <div>
              <span className="eyebrow">الطلبات</span>
              <h2>كل الطلبات المرتبطة بالشريك</h2>
            </div>
          </div>
          <div className="table-shell">
            <table className="data-table promo-data-table">
              <thead>
                <tr>
                  <th>الطلب</th>
                  <th>العروسين</th>
                  <th>الحالة</th>
                  <th>التاريخ</th>
                  <th>الإجراءات</th>
                </tr>
              </thead>
              <tbody>
                {partner.orders.map((order) => (
                  <tr key={order.id}>
                    <td>
                      <strong>{order.orderNumber || order.id.slice(0, 8)}</strong>
                      <small dir="ltr">{order.publishedInvitationCode || "لم تنشر بعد"}</small>
                    </td>
                    <td>{order.groomName} / {order.brideName}</td>
                    <td>{order.status}</td>
                    <td>{order.createdAt.toLocaleDateString("ar-EG")}</td>
                    <td>
                      <div className="button-row">
                        <Link className="btn btn-soft" href="/admin/orders">فتح الطلب</Link>
                        {order.publishedInvitationCode ? <Link className="btn btn-soft" href={`/admin/invitations-customers/${order.publishedInvitationCode}`}>فتح العميل</Link> : null}
                      </div>
                    </td>
                  </tr>
                ))}
                {partner.orders.length === 0 ? (
                  <tr>
                    <td colSpan={5}>لا توجد طلبات مرتبطة بهذا الشريك بعد.</td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      {activeTab === "stats" ? (
        <section className="panel">
          <div className="admin-card-head">
            <BarChart3 size={22} />
            <div>
              <span className="eyebrow">الإحصائيات</span>
              <h2>زيارات، استخدام، وتحويل</h2>
            </div>
          </div>
          <div className="partner-chart-bars">
            {[
              ["زيارات", visitCount],
              ["استخدام", partner._count.usageLogs],
              ["تحويل", partner._count.orders],
            ].map(([label, value]) => (
              <div key={label}>
                <span>{label}</span>
                <strong>{value}</strong>
                <i style={{ inlineSize: `${Math.max(8, (Number(value) / chartMax) * 100)}%` }} />
              </div>
            ))}
          </div>
          <p className="admin-note">أفضل فترة تظهر عند توفر بيانات زمنية أكبر؛ حالياً يتم عرض المقارنة الإجمالية للشريك.</p>
        </section>
      ) : null}

      {activeTab === "messages" ? (
        <div className="partner-admin-grid">
          <section className="panel">
            <div className="admin-card-head">
              <MessageSquareText size={22} />
              <div>
                <span className="eyebrow">الرسائل</span>
                <h2>إرسال رسالة لدعوات الشريك</h2>
              </div>
            </div>
            <form className="partner-message-form" action={createPartnerMessageAction}>
              <input type="hidden" name="partnerId" value={partner.id} />
              <input type="hidden" name="returnTo" value={`/admin/partners/${partner.id}?tab=messages`} />
              <label className="field">
                <span>العنوان</span>
                <input name="title" defaultValue="رسالة من الإدارة" maxLength={120} />
              </label>
              <label className="field">
                <span>نص الرسالة</span>
                <textarea name="body" rows={5} required placeholder="اكتب الرسالة التي ستظهر داخل لوحة العميل..." />
              </label>
              <div className="dynamic-page-form-grid">
                <label className="field">
                  <span>المدة</span>
                  <select name="duration" defaultValue="always">
                    <option value="always">دائم</option>
                    <option value="24h">24 ساعة</option>
                    <option value="3d">3 أيام</option>
                    <option value="7d">أسبوع</option>
                    <option value="30d">شهر</option>
                  </select>
                </label>
                <label className="field">
                  <span>النطاق</span>
                  <select name="target" defaultValue="all">
                    <option value="all">كل الدعوات</option>
                    <option value="published">الدعوات المنشورة</option>
                    <option value="pending">الدعوات غير المنشورة</option>
                    <option value="selected">دعوات محددة بالأسفل</option>
                  </select>
                </label>
              </div>
              <div className="partner-message-targets">
                {partner.orders.filter((order) => order.publishedInvitationCode).map((order) => (
                  <label key={order.id}>
                    <input type="checkbox" name="invitationCodes" value={order.publishedInvitationCode || ""} />
                    <span>{order.groomName} / {order.brideName} · {order.publishedInvitationCode}</span>
                  </label>
                ))}
              </div>
              <button className="btn btn-gold" type="submit"><Send size={17} />إرسال الرسالة</button>
            </form>
          </section>

          <aside className="partner-side-stack">
            <section className="panel">
              <div className="admin-card-head">
                <MessageSquareText size={22} />
                <div>
                  <span className="eyebrow">آخر الرسائل</span>
                  <h2>رسائل الشريك</h2>
                </div>
              </div>
              <div className="partner-mini-list">
                {partner.messages.map((message) => (
                  <div key={message.id}>
                    <strong>{message.title}</strong>
                    <span>{message.createdAt.toLocaleDateString("ar-EG")}{message.expiryDate ? ` · حتى ${message.expiryDate.toLocaleDateString("ar-EG")}` : " · دائم"}</span>
                  </div>
                ))}
                {partner.messages.length === 0 ? <p className="admin-note">لا توجد رسائل بعد.</p> : null}
              </div>
            </section>
          </aside>
        </div>
      ) : null}

      {activeTab === "activity" ? (
        <section className="panel">
          <div className="admin-card-head">
            <History size={22} />
            <div>
              <span className="eyebrow">سجل النشاط</span>
              <h2>Timeline كامل</h2>
            </div>
          </div>
          <div className="partner-timeline">
            {partner.activityLogs.map((activity) => (
              <article key={activity.id}>
                <span />
                <div>
                  <strong>{activityLabel(activity.action)}</strong>
                  <small>{activity.createdAt.toLocaleString("ar-EG")}</small>
                </div>
              </article>
            ))}
            {partner.activityLogs.length === 0 ? <p className="admin-note">لا يوجد نشاط بعد.</p> : null}
          </div>
        </section>
      ) : null}

      {activeTab === "settings" ? (
        <div className="partner-admin-grid">
          <section className="panel">
            <div className="admin-card-head">
              <Pencil size={22} />
              <div>
                <span className="eyebrow">الإعدادات</span>
                <h2>هوية الشريك والاشتراك</h2>
              </div>
            </div>
            <div className="promo-status-summary">
              <span>UUID الداخلي</span>
              <strong dir="ltr">{partner.id}</strong>
              <small>هذا هو المعرف الثابت للعلاقات الداخلية، ولا يتأثر بتغيير البروموكود.</small>
            </div>
            <div className="promo-status-summary">
              <span>الاشتراك</span>
              <strong>{partner.subscriptionStatus}</strong>
              <small>{partner.subscriptionExpiry ? `ينتهي في ${partner.subscriptionExpiry.toLocaleDateString("ar-EG")}` : "بدون تاريخ انتهاء مسجل"}</small>
            </div>
            <div className="promo-status-summary">
              <span>إظهار بطاقة الشريك داخل الدعوة</span>
              <strong>{partner.showPartnerCard ? "مفعل" : "مغلق"}</strong>
              <small>يمكن تعديلها من صفحة تعديل الشريك عند الحاجة.</small>
            </div>
            <div className="button-row">
              <Link className="btn btn-gold" href={`/admin/partners/${partner.id}/edit`}>
                <Pencil size={17} />
                تعديل الإعدادات
              </Link>
            </div>
          </section>
          <section className="panel">
            <div className="admin-card-head">
              <MessageSquareText size={22} />
              <div>
                <span className="eyebrow">ملاحظات داخلية</span>
                <h2>الملاحظات والروابط</h2>
              </div>
            </div>
            <div className="partner-mini-list">
              <div>
                <strong>ملاحظات داخلية</strong>
                <span>{partner.internalNotes || "لا توجد ملاحظات داخلية."}</span>
              </div>
              <div>
                <strong>Facebook</strong>
                <span dir="ltr">{partner.facebookUrl || "غير مسجل"}</span>
              </div>
              <div>
                <strong>Instagram</strong>
                <span dir="ltr">{partner.instagramUrl || "غير مسجل"}</span>
              </div>
              <div>
                <strong>آخر اشتراكات</strong>
                <span>{partner.subscriptions.length ? `${partner.subscriptions.length} سجل اشتراك محفوظ` : "لا توجد سجلات اشتراك"}</span>
              </div>
            </div>
          </section>
        </div>
      ) : null}
    </section>
  );
}
