import Link from "next/link";
import { Archive, ArrowUpLeft, BarChart3, FileText, MonitorPlay, Palette, Plus, Sparkles, UsersRound } from "lucide-react";
import { getAdminInvitations, getAdminOrders } from "@/lib/admin-data";
import { hasDatabaseConfig } from "@/lib/database-url";
import { formatArabicNumber } from "@/lib/utils";

function formatOrderDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("ar-EG-u-nu-latn", { day: "numeric", month: "short", year: "numeric" }).format(date);
}

function statusLabel(status: string) {
  if (status === "new") return "جديد";
  if (status === "accepted") return "مقبول";
  if (status === "converted") return "تم تحويله";
  if (status === "rejected") return "مرفوض";
  return status;
}

export default async function AdminDashboardPage() {
  const [invitations, orders] = await Promise.all([getAdminInvitations(), getAdminOrders()]);
  const newOrders = orders.filter((order) => order.status === "new");
  const recentOrders = orders.slice(0, 4);
  const hasDatabase = hasDatabaseConfig();

  return (
    <>
      <section className="admin-hero-panel admin-home-hero">
        <div>
          <span className="eyebrow">الرئيسية</span>
          <h1>ابدأ من هنا</h1>
          <p>أهم أزرار التشغيل في مكان واحد. الأرقام والتحليلات التفصيلية موجودة في صفحة التحليلات.</p>
        </div>
        <div className="admin-hero-actions">
          <Link className="btn btn-gold btn-glow" href="/admin/orders">
            <FileText size={18} />
            الطلبات الجديدة
          </Link>
          <Link className="btn btn-soft btn-glass" href="/admin/client-invitations">
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

      <section className="admin-start-grid" aria-label="اختصارات التشغيل">
        <Link className="admin-start-card primary" href="/admin/orders">
          <FileText size={22} />
          <span>
            <strong>راجع الطلبات</strong>
            <small>{formatArabicNumber(newOrders.length)} طلب جديد محتاج متابعة</small>
          </span>
          <ArrowUpLeft size={18} />
        </Link>
        <Link className="admin-start-card" href="/admin/client-invitations">
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
            <Link href="/admin/analytics">
              <BarChart3 size={16} />
              التحليلات والأرقام
            </Link>
          </div>
        </aside>
      </section>
    </>
  );
}
