import Link from "next/link";
import {
  Activity,
  Archive,
  ArrowUpLeft,
  Clock3,
  Eye,
  FileText,
  MessageCircleHeart,
  Plus,
  Sparkles,
  Upload,
  UserCheck,
  UsersRound,
} from "lucide-react";
import { getAdminCustomers, getAdminGuests, getAdminInvitations, getAdminOrders } from "@/lib/admin-data";
import { hasDatabaseConfig } from "@/lib/database-url";
import { getAllGuestBookMessages } from "@/lib/guest-book";
import { formatArabicNumber } from "@/lib/utils";
import { getPublishMeta } from "@/lib/project-content-store";

function formatOrderDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("ar-EG-u-nu-latn", { day: "numeric", month: "short", year: "numeric", timeZone: "Africa/Cairo" }).format(date);
}

function formatAdminNumber(value: number) {
  return formatArabicNumber(Math.max(0, Math.round(value)));
}

function statusLabel(status: string) {
  if (status === "new") return "جديد";
  if (status === "reviewing") return "قيد المراجعة";
  if (status === "edited") return "تم التعديل";
  if (status === "published" || status === "converted" || status === "accepted") return "تم النشر";
  if (status === "rejected") return "مرفوض";
  return status;
}

export default async function AdminDashboardPage({ searchParams }: { searchParams?: Promise<{ sync?: string; syncMessage?: string }> }) {
  const params = await searchParams;
  const [invitations, orders, guests, customers, guestBookMessages, publishMeta] = await Promise.all([getAdminInvitations().catch(() => []), getAdminOrders().catch(() => []), getAdminGuests().catch(() => []), getAdminCustomers().catch(() => []), getAllGuestBookMessages().catch(() => []), getPublishMeta()]);
  const newOrders = orders.filter((order) => order.status === "new");
  const openOrders = orders.filter((order) => !["published", "converted", "rejected"].includes(order.status));
  const recentOrders = orders.slice(0, 4);
  const recentInvitations = invitations.slice(0, 5);
  const hasDatabase = hasDatabaseConfig();
  const totalViews = invitations.reduce((sum, invitation) => sum + invitation.views, 0);
  const confirmedGuests = guests.filter((guest) => guest.status === "confirmed");
  const pendingGuestBookMessages = guestBookMessages.filter((message) => message.status === "pending");
  const expectedAttendees = confirmedGuests.reduce((sum, guest) => sum + Math.max(1, guest.attendees || 1), 0);
  const pendingChangesCount = Object.keys(publishMeta.pendingChanges || {}).length;
  const hasUnpublishedChanges = publishMeta.hasUnpublishedChanges;

  return (
    <>
      <section className="admin-hero-panel admin-home-hero">
        <div>
          <span className="eyebrow">الرئيسية</span>
          <h1>مركز إدارة المنصة</h1>
          <p>نظرة تشغيلية واحدة للطلبات والدعوات والحضور والنسخ الاحتياطي حتى تبدأ قرارك من الرقم الصحيح.</p>
        </div>
        <div className="admin-hero-actions">
          <Link className="btn btn-gold btn-glow" href="/admin/orders">
            <FileText size={18} />
            الطلبات الجديدة
          </Link>
          <Link className="btn btn-soft btn-glass" href="/admin/new-invitation">
            <Plus size={18} />
            إنشاء دعوة
          </Link>
        </div>
      </section>

      {!hasDatabase ? (
        <div className="notice danger">
          قاعدة البيانات غير متصلة. اربط DATABASE_URL عشان الطلبات والدعوات تظهر من قاعدة البيانات الحقيقية.
        </div>
      ) : null}

      {params?.sync && params.sync !== "failed" ? (
        <div className={params.sync === "failed" || params.sync === "skipped" ? "notice danger" : "notice success"}>
          {params.sync === "synced"
            ? "تمت مزامنة بيانات الأدمن مع GitHub."
            : params.sync === "unchanged"
              ? "GitHub محدث بالفعل ولا توجد تغييرات جديدة."
              : params.sync === "skipped"
                ? `لم تبدأ المزامنة: ${params.syncMessage || "إعدادات GitHub غير مكتملة."}`
                : `فشلت مزامنة GitHub: ${params.syncMessage || "راجع إعدادات GitHub."}`}
        </div>
      ) : null}

      <section className="panel admin-command-center admin-dashboard-summary" aria-label="ملخص الإدارة اليومي">
        <div className="admin-command-head">
          <div className="admin-card-head">
            <Activity size={22} />
            <div>
              <span className="eyebrow">Dashboard</span>
              <h2>نظرة مختصرة</h2>
            </div>
          </div>
          <Link className="btn btn-gold btn-glow" href="/admin/new-invitation">
            <Plus size={17} />
            إنشاء دعوة
          </Link>
        </div>

        <div className="admin-metrics-grid">
          <Link className="admin-metric-card" href="/admin/invitations">
            <Archive size={20} />
            <span>عدد الدعوات</span>
            <strong>{formatAdminNumber(invitations.length)}</strong>
            <small>{formatAdminNumber(invitations.filter((i) => i.disabledAt).length)} معطلة · {formatAdminNumber(invitations.filter((i) => !i.disabledAt && i.isActive).length)} نشطة</small>
          </Link>
          <Link className="admin-metric-card" href="/admin/customers">
            <UsersRound size={20} />
            <span>عدد العملاء</span>
            <strong>{formatAdminNumber(customers.length)}</strong>
            <small>حسابات العملاء المتاحة للإدارة</small>
          </Link>
          <Link className="admin-metric-card" href="/admin/analytics">
            <Eye size={20} />
            <span>عدد الزوار</span>
            <strong>{formatAdminNumber(totalViews)}</strong>
            <small>إجمالي مشاهدات الدعوات</small>
          </Link>
          <Link className="admin-metric-card" href="/admin/orders">
            <Clock3 size={20} />
            <span>عدد الطلبات</span>
            <strong>{formatAdminNumber(openOrders.length)}</strong>
            <small>{formatAdminNumber(newOrders.length)} طلب جديد ينتظر قرار</small>
          </Link>
          <Link className="admin-metric-card" href="/admin/attendance">
            <UserCheck size={20} />
            <span>ردود الحضور</span>
            <strong>{formatAdminNumber(guests.length)}</strong>
            <small>{formatAdminNumber(expectedAttendees)} ضيف متوقع</small>
          </Link>
          <Link className="admin-metric-card" href="/admin/guest-book">
            <MessageCircleHeart size={20} />
            <span>آخر الرسائل</span>
            <strong>{formatAdminNumber(guestBookMessages.length)}</strong>
            <small>{formatAdminNumber(pendingGuestBookMessages.length)} بانتظار المراجعة</small>
          </Link>
          <Link className={`admin-metric-card ${hasUnpublishedChanges ? "has-pending-changes" : ""}`} href="/admin/publish">
            <Upload size={20} />
            <span>النشر</span>
            <strong>{formatAdminNumber(pendingChangesCount)}</strong>
            <small>{hasUnpublishedChanges ? "تغييرات غير منشورة" : "لا توجد تغييرات"}</small>
          </Link>
        </div>
      </section>

      <section className="admin-start-grid" aria-label="اختصارات التشغيل">
        <Link className="admin-start-card primary" href="/admin/orders">
          <FileText size={22} />
          <span>
            <strong>راجع الطلبات</strong>
            <small>{formatArabicNumber(newOrders.length)} طلب جديد محتاج متابعة</small>
          </span>
          <ArrowUpLeft size={18} />
        </Link>
        <Link className="admin-start-card" href="/admin/invitations">
          <Archive size={22} />
          <span>
            <strong>دعوات العملاء</strong>
            <small>{formatArabicNumber(invitations.length)} دعوة مسجلة</small>
          </span>
          <ArrowUpLeft size={18} />
        </Link>
        <Link className="admin-start-card" href="/admin/customers">
          <UsersRound size={22} />
          <span>
            <strong>العملاء</strong>
            <small>{formatArabicNumber(customers.length)} حساب عميل</small>
          </span>
          <ArrowUpLeft size={18} />
        </Link>
        <Link className="admin-start-card" href="/admin/guest-book">
          <MessageCircleHeart size={22} />
          <span>
            <strong>الرسائل والتهاني</strong>
            <small>{formatArabicNumber(pendingGuestBookMessages.length)} رسالة معلقة</small>
          </span>
          <ArrowUpLeft size={18} />
        </Link>
      </section>

      <section className="admin-home-grid admin-home-grid-simple admin-activity-grid">
        <article className="panel admin-work-card admin-recent-panel">
          <div className="admin-card-head">
            <Sparkles size={22} />
            <div>
              <span className="eyebrow">متابعة سريعة</span>
              <h2>أحدث الطلبات</h2>
            </div>
          </div>
          {recentOrders.length ? (
            <div className="admin-order-list">
              {recentOrders.map((order) => (
                <Link className="admin-order-item" href="/admin/orders" key={order.id}>
                  <span>
                    <strong>
                      {order.groomName} &amp; {order.brideName}
                    </strong>
                    <small>{formatOrderDate(order.weddingDate)}</small>
                  </span>
                  <em className={order.status === "new" ? "status" : order.status === "rejected" ? "status danger" : "status success"}>{statusLabel(order.status)}</em>
                </Link>
              ))}
            </div>
          ) : (
            <div className="admin-empty-state">
              <strong>لا توجد طلبات حالية</strong>
              <p>أول طلب جديد هيظهر هنا مباشرة.</p>
            </div>
          )}
        </article>

        <article className="panel admin-work-card admin-recent-panel">
          <div className="admin-card-head">
            <Archive size={22} />
            <div>
              <span className="eyebrow">نشاط الدعوات</span>
              <h2>آخر الدعوات</h2>
            </div>
          </div>
          {recentInvitations.length ? (
            <div className="admin-order-list">
              {recentInvitations.map((invitation) => (
                <Link className="admin-order-item" href={`/admin/invitations/${encodeURIComponent(invitation.code)}`} key={invitation.id}>
                  <span>
                    <strong>{invitation.groomName} و {invitation.brideName}</strong>
                    <small>{formatOrderDate(invitation.weddingDate)}</small>
                  </span>
                  <em className={invitation.disabledAt ? "status danger" : invitation.isActive ? "status success" : "status danger"}><>{invitation.disabledAt ? <><span className="status-dot disabled" />معطلة</> : invitation.isActive ? <><span className="status-dot active" />نشطة</> : <><span className="status-dot paused" />متوقفة</>}</></em>
                </Link>
              ))}
            </div>
          ) : (
            <div className="admin-empty-state">
              <strong>لا توجد دعوات بعد</strong>
              <p>ابدأ بإنشاء أول دعوة عميل من قسم إنشاء دعوة.</p>
            </div>
          )}
        </article>
      </section>
    </>
  );
}
