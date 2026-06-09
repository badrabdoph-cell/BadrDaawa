import Link from "next/link";
import {
  Activity,
  AlertTriangle,
  Archive,
  ArrowUpLeft,
  BarChart3,
  CalendarClock,
  CheckCircle2,
  Clock3,
  Database,
  DatabaseBackup,
  Eye,
  FileText,
  MapPinCheckInside,
  MonitorPlay,
  Music2,
  Palette,
  Plus,
  Sparkles,
  TrendingUp,
  UserCheck,
  UsersRound,
} from "lucide-react";
import { getAdminGuests, getAdminInvitations, getAdminOrders } from "@/lib/admin-data";
import { listBackupSnapshots } from "@/lib/backups";
import { getCheckInDashboard } from "@/lib/check-ins";
import { hasDatabaseConfig } from "@/lib/database-url";
import { getMusicLibrary } from "@/lib/music-library";
import { formatArabicNumber } from "@/lib/utils";
import { SyncStatus } from "@/app/admin/components/sync-status";

function formatOrderDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("ar-EG-u-nu-latn", { day: "numeric", month: "short", year: "numeric" }).format(date);
}

function formatAdminNumber(value: number) {
  return formatArabicNumber(Math.max(0, Math.round(value)));
}

function formatShortDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("ar-EG-u-nu-latn", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }).format(date);
}

function statusLabel(status: string) {
  if (status === "new") return "جديد";
  if (status === "reviewing") return "قيد المراجعة";
  if (status === "edited") return "تم التعديل";
  if (status === "published" || status === "converted" || status === "accepted") return "تم النشر";
  if (status === "rejected") return "مرفوض";
  return status;
}

function isExpiredInvitation(weddingDate: string) {
  const date = new Date(weddingDate);
  if (Number.isNaN(date.getTime())) return false;
  return date.getTime() < Date.now();
}

function formatBackupSize(bytes?: number) {
  if (!bytes) return "0 KB";
  if (bytes < 1024 * 1024) return `${formatAdminNumber(bytes / 1024)} KB`;
  return `${formatAdminNumber(bytes / (1024 * 1024))} MB`;
}

export default async function AdminDashboardPage({ searchParams }: { searchParams?: Promise<{ sync?: string; syncMessage?: string }> }) {
  const params = await searchParams;
  const [invitations, orders, guests, backups, musicLibrary, checkInDashboard] = await Promise.all([getAdminInvitations(), getAdminOrders(), getAdminGuests(), listBackupSnapshots(), getMusicLibrary(), getCheckInDashboard()]);
  const newOrders = orders.filter((order) => order.status === "new");
  const openOrders = orders.filter((order) => !["published", "converted", "rejected"].includes(order.status));
  const recentOrders = orders.slice(0, 4);
  const recentInvitations = invitations.slice(0, 5);
  const hasDatabase = hasDatabaseConfig();
  const activeMusicSlots = musicLibrary.slots.filter((slot) => slot.enabled && slot.url).length;
  const latestBackup = backups[0];
  const activeInvitations = invitations.filter((invitation) => invitation.isActive).length;
  const expiredInvitations = invitations.filter((invitation) => isExpiredInvitation(invitation.weddingDate)).length;
  const totalViews = invitations.reduce((sum, invitation) => sum + invitation.views, 0);
  const confirmedGuests = guests.filter((guest) => guest.status === "confirmed");
  const declinedGuests = guests.filter((guest) => guest.status === "declined");
  const expectedAttendees = confirmedGuests.reduce((sum, guest) => sum + Math.max(1, guest.attendees || 1), 0);
  const responseRate = guests.length ? Math.round((confirmedGuests.length / guests.length) * 100) : 0;
  const backupAgeMs = latestBackup ? Date.now() - new Date(latestBackup.createdAt).getTime() : Number.POSITIVE_INFINITY;
  const backupNeedsAttention = !latestBackup || backupAgeMs > 24 * 60 * 60 * 1000;
  const topInvitation = [...invitations].sort((a, b) => b.views - a.views)[0];
  const alerts = [
    !hasDatabase ? "قاعدة البيانات غير متصلة، البيانات الحالية قد تكون من الملفات المحلية." : "",
    newOrders.length ? `${formatAdminNumber(newOrders.length)} طلب جديد يحتاج متابعة.` : "",
    backupNeedsAttention ? (latestBackup ? "آخر نسخة احتياطية أقدم من 24 ساعة." : "لا توجد نسخة احتياطية محفوظة بعد.") : "",
    activeMusicSlots === 0 ? "لا توجد مقاطع موسيقى مفعلة للقوالب." : "",
  ].filter(Boolean);

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

      <section className="panel admin-command-center" aria-label="ملخص الإدارة اليومي">
        <div className="admin-command-head">
          <div className="admin-card-head">
            <Activity size={22} />
            <div>
              <span className="eyebrow">Command Center</span>
              <h2>ملخص اليوم التشغيلي</h2>
            </div>
          </div>
          <Link className="btn btn-soft btn-glass" href="/admin/analytics">
            <BarChart3 size={17} />
            التحليلات التفصيلية
          </Link>
        </div>

        <div className="admin-metrics-grid">
          <Link className="admin-metric-card" href="/admin/invitations">
            <Archive size={20} />
            <span>إجمالي الدعوات</span>
            <strong>{formatAdminNumber(invitations.length)}</strong>
            <small>{formatAdminNumber(activeInvitations)} نشطة / {formatAdminNumber(expiredInvitations)} منتهية</small>
          </Link>
          <Link className="admin-metric-card" href="/admin/invitations">
            <Eye size={20} />
            <span>زيارات الدعوات</span>
            <strong>{formatAdminNumber(totalViews)}</strong>
            <small>{topInvitation ? `الأعلى: ${topInvitation.groomName} و ${topInvitation.brideName}` : "لا توجد زيارات بعد"}</small>
          </Link>
          <Link className="admin-metric-card" href="/admin/orders">
            <Clock3 size={20} />
            <span>طلبات مفتوحة</span>
            <strong>{formatAdminNumber(openOrders.length)}</strong>
            <small>{formatAdminNumber(newOrders.length)} طلب جديد ينتظر قرار</small>
          </Link>
          <Link className="admin-metric-card" href="/admin/analytics">
            <UserCheck size={20} />
            <span>ردود الحضور</span>
            <strong>{formatAdminNumber(guests.length)}</strong>
            <small>{formatAdminNumber(expectedAttendees)} ضيف متوقع / {formatAdminNumber(responseRate)}% موافقة</small>
          </Link>
          <Link className="admin-metric-card" href="/admin/check-ins">
            <MapPinCheckInside size={20} />
            <span>الوصول الفعلي</span>
            <strong>{formatAdminNumber(checkInDashboard.totals.checkIns)}</strong>
            <small>{formatAdminNumber(checkInDashboard.totals.today)} اليوم / منفصل عن RSVP</small>
          </Link>
        </div>

        <div className="admin-ops-grid">
          <article className="admin-ops-panel">
            <div className="admin-ops-head">
              <CheckCircle2 size={19} />
              <h3>أحدث الدعوات</h3>
            </div>
            {recentInvitations.length ? (
              <div className="admin-compact-list">
                {recentInvitations.map((invitation) => (
                  <Link className="admin-compact-row" href={`/${invitation.customSlug || invitation.code}`} key={invitation.id}>
                    <span>
                      <strong>{invitation.groomName} و {invitation.brideName}</strong>
                      <small>{invitation.code} · {formatOrderDate(invitation.weddingDate)}</small>
                    </span>
                    <em className={invitation.isActive && !isExpiredInvitation(invitation.weddingDate) ? "status success" : "status danger"}>
                      {invitation.isActive ? (isExpiredInvitation(invitation.weddingDate) ? "منتهية" : "نشطة") : "متوقفة"}
                    </em>
                    <b>{formatAdminNumber(invitation.views)} زيارة</b>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="admin-empty-state">
                <strong>لا توجد دعوات بعد</strong>
                <p>ابدأ بإنشاء أول دعوة عميل من قسم دعوة جديدة.</p>
              </div>
            )}
          </article>

          <article className="admin-ops-panel">
            <div className="admin-ops-head">
              <AlertTriangle size={19} />
              <h3>تنبيهات تحتاج قرار</h3>
            </div>
            {alerts.length ? (
              <div className="admin-alert-list">
                {alerts.map((alert) => (
                  <div className="admin-alert-item" key={alert}>
                    <AlertTriangle size={17} />
                    <span>{alert}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="admin-clear-state">
                <CheckCircle2 size={18} />
                كل الأنظمة الأساسية مستقرة الآن.
              </div>
            )}
            <div className="admin-backup-chip">
              <DatabaseBackup size={17} />
              <span>{latestBackup ? `آخر نسخة ${formatShortDateTime(latestBackup.createdAt)} · ${formatBackupSize(latestBackup.sizeBytes)}` : "لا توجد نسخة احتياطية"}</span>
            </div>
          </article>
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
        <Link className="admin-start-card" href="/admin/templates">
          <Palette size={22} />
          <span>
            <strong>القوالب</strong>
            <small>إضافة قالب أو تعديل معاينة وموسيقى</small>
          </span>
          <ArrowUpLeft size={18} />
        </Link>
        <Link className="admin-start-card" href="/admin/preview">
          <MonitorPlay size={22} />
          <span>
            <strong>معاينة الرئيسية</strong>
            <small>اختار اللي يظهر في واجهة الموقع</small>
          </span>
          <ArrowUpLeft size={18} />
        </Link>
      </section>

      <section className="panel admin-health-overview" aria-label="حالة التشغيل">
        <div className="admin-card-head">
          <Database size={22} />
          <div>
            <span className="eyebrow">System Health</span>
            <h2>حالة التشغيل</h2>
          </div>
        </div>
        <div className="admin-health-grid">
          <div className="admin-health-card">
            <Database size={19} />
            <span className={hasDatabase ? "admin-health-pill good" : "admin-health-pill danger"}>{hasDatabase ? "متصلة" : "ملفات محلية"}</span>
            <strong>قاعدة البيانات</strong>
            <small>{hasDatabase ? "الطلبات والدعوات تقرأ من قاعدة البيانات." : "اربط DATABASE_URL للبيانات الحقيقية على الإنتاج."}</small>
          </div>
          <SyncStatus />
          <div className="admin-health-card">
            <DatabaseBackup size={19} />
            <span className={backups.length ? "admin-health-pill good" : "admin-health-pill danger"}>{formatArabicNumber(backups.length)}</span>
            <strong>النسخ الاحتياطي</strong>
            <small>{latestBackup ? `آخر نسخة: ${formatOrderDate(latestBackup.createdAt)} · ${formatBackupSize(latestBackup.sizeBytes)}` : "لا توجد نسخة محفوظة بعد."}</small>
          </div>
          <div className="admin-health-card">
            <Music2 size={19} />
            <span className={activeMusicSlots ? "admin-health-pill good" : "admin-health-pill danger"}>{formatArabicNumber(activeMusicSlots)}/5</span>
            <strong>الموسيقى</strong>
            <small>{activeMusicSlots ? "فيه مقاطع مفعلة على القوالب." : "لا توجد مقاطع مفعلة حاليا."}</small>
          </div>
        </div>
      </section>

      <section className="admin-home-grid admin-home-grid-simple">
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

        <aside className="panel admin-work-card admin-side-shortcuts">
          <div className="admin-card-head">
            <UsersRound size={22} />
            <div>
              <span className="eyebrow">اختصارات</span>
              <h2>إدارة سريعة</h2>
            </div>
          </div>
          <div className="admin-mini-links">
            <Link href="/admin/customers">حسابات العملاء</Link>
            <Link href="/admin/backups">النسخ الاحتياطي</Link>
            <Link href="/admin/sync-history">سجل المزامنة</Link>
            <Link href="/admin/recent-edits">
              <CalendarClock size={16} />
              آخر التعديلات
            </Link>
            <Link href="/admin/analytics">
              <TrendingUp size={16} />
              التحليلات والأرقام
            </Link>
          </div>
        </aside>
      </section>
    </>
  );
}
