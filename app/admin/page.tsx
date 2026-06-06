import Link from "next/link";
import { Activity, Archive, BellRing, Copy, Database, ExternalLink, FileText, Palette, Plus, Send, Settings2, Sparkles, UsersRound } from "lucide-react";
import { StatsGrid } from "@/components/StatsGrid";
import { getAdminGuests, getAdminInvitations, getAdminOrders } from "@/lib/admin-data";
import { getPushSubscriptionCount } from "@/lib/push-notifications";
import { formatArabicNumber, getInvitationUrl } from "@/lib/utils";
import { getCustomerAdminPath } from "@/lib/slug";

function getNotificationStatus(value?: string) {
  if (!value) return "";
  if (value === "empty") return "اكتب نص الإشعار الأول.";
  if (value === "error") return "حصلت مشكلة أثناء إرسال الإشعار.";
  if (value === "demo") return "قاعدة البيانات غير متصلة، لذلك لم يتم إرسال الإشعار.";
  if (value.startsWith("sent-")) {
    const [, success, failed] = value.split("-");
    return `تم إرسال الإشعار إلى ${success || "0"} جهاز، وفشل ${failed || "0"}.`;
  }
  return "";
}

export default async function AdminDashboardPage({ searchParams }: { searchParams?: Promise<{ notify?: string }> }) {
  const params = await searchParams;
  const [invitations, guests, orders, pushSubscribers] = await Promise.all([
    getAdminInvitations(),
    getAdminGuests(),
    getAdminOrders(),
    getPushSubscriptionCount(),
  ]);
  const latestInvitation = invitations[0];
  const notificationStatus = getNotificationStatus(params?.notify);
  const hasDatabase = Boolean(process.env.DATABASE_URL);

  return (
    <>
      <section className="admin-hero-panel">
        <div>
          <span className="eyebrow">Control Center</span>
          <h1>إدارة الموقع من مكان واحد</h1>
          <p>متابعة الدعوات، الطلبات، القوالب، العملاء، والإشعارات بأرقام حقيقية من قاعدة البيانات فقط.</p>
        </div>
        <div className="admin-hero-actions">
          <Link className="btn btn-gold btn-glow" href="/admin/invitations">
            <Plus size={18} />
            إنشاء دعوة
          </Link>
          <Link className="btn btn-soft btn-glass" href="/admin/templates">
            <Palette size={18} />
            إدارة القوالب
          </Link>
        </div>
      </section>
      {!hasDatabase ? (
        <div className="notice danger">
          قاعدة البيانات غير متصلة. الأرقام المعروضة الآن حقيقية وليست ديمو، لذلك ستظهر صفر حتى تضيف DATABASE_URL صحيح.
        </div>
      ) : null}
      <StatsGrid
        stats={[
          { label: "إجمالي الدعوات", value: formatArabicNumber(invitations.length), hint: "كل الدعوات المسجلة" },
          { label: "دعوات نشطة", value: formatArabicNumber(invitations.filter((invitation) => invitation.isActive).length), hint: "جاهزة للعرض" },
          { label: "ردود الحضور", value: formatArabicNumber(guests.length), hint: "عدد نماذج RSVP المسجلة" },
          { label: "طلبات جديدة", value: formatArabicNumber(orders.filter((order) => order.status === "new").length), hint: "في انتظار القرار" },
        ]}
      />

      <section className="admin-home-grid">
        <article className="panel admin-work-card admin-work-card-wide">
          <div className="admin-card-head">
            <Activity size={22} />
            <div>
              <span className="eyebrow">Workflow</span>
              <h2>الإجراءات السريعة</h2>
            </div>
          </div>
          <div className="admin-action-grid">
            <Link href="/admin/orders">
              <FileText size={20} />
              <span>
                <strong>مراجعة الطلبات</strong>
                <small>{formatArabicNumber(orders.filter((order) => order.status === "new").length)} طلب جديد</small>
              </span>
            </Link>
            <Link href="/admin/invitations">
              <Archive size={20} />
              <span>
                <strong>إنشاء أو تعديل دعوة</strong>
                <small>{formatArabicNumber(invitations.length)} دعوة مسجلة</small>
              </span>
            </Link>
            <Link href="/admin/templates">
              <Sparkles size={20} />
              <span>
                <strong>القوالب والمعاينات</strong>
                <small>إضافة كود قالب وتعديل الموسيقى</small>
              </span>
            </Link>
            <Link href="/admin/customers">
              <UsersRound size={20} />
              <span>
                <strong>حسابات العملاء</strong>
                <small>بيانات الدخول ولوحات العملاء</small>
              </span>
            </Link>
          </div>
        </article>

        <article className="panel admin-work-card">
          <div className="admin-card-head">
            <Copy size={22} />
            <div>
              <span className="eyebrow">Latest</span>
              <h2>آخر دعوة</h2>
            </div>
          </div>
          <p className="admin-long-link">{latestInvitation ? getInvitationUrl(latestInvitation.code) : "لسه مفيش دعوات حقيقية مسجلة."}</p>
          <div className="button-row">
            <Link className="btn btn-soft" href={latestInvitation ? `/${latestInvitation.code}` : "/admin/invitations"}>
              <ExternalLink size={17} />
              فتح الدعوة
            </Link>
            <Link className="btn btn-soft" href={latestInvitation ? getCustomerAdminPath(latestInvitation.code) : "/admin/invitations"}>
              <Settings2 size={17} />
              لوحة العميل
            </Link>
          </div>
        </article>

        <article className="panel admin-work-card">
          <div className="admin-card-head">
            <Database size={22} />
            <div>
              <span className="eyebrow">Database</span>
              <h2>حالة البيانات</h2>
            </div>
          </div>
          <p>{hasDatabase ? "قاعدة البيانات متصلة، وكل أرقام الأدمن مبنية على البيانات الحقيقية." : "قاعدة البيانات غير متصلة، لذلك لن تظهر أرقام وهمية داخل الأدمن."}</p>
          <span className={hasDatabase ? "admin-health-pill good" : "admin-health-pill danger"}>{hasDatabase ? "متصل" : "غير متصل"}</span>
        </article>
      </section>

      <section className="admin-notification-section">
        <article className="panel admin-notification-panel">
          <div>
            <span className="eyebrow">Push Notifications</span>
            <h2>
              <BellRing size={22} />
              إرسال إشعار للمعازيم
            </h2>
            <p>الأجهزة المسجلة حاليًا: {formatArabicNumber(pushSubscribers)} جهاز. اكتب رسالة قصيرة وستصل للأجهزة التي وافقت على الإشعارات.</p>
          </div>
          <form className="admin-notification-form" action="/api/admin/notifications/send" method="post">
            <input name="title" defaultValue="BadrDaawa" aria-label="عنوان الإشعار" />
            <textarea name="body" placeholder="اكتب نص الإشعار هنا..." rows={3} required />
            <input name="url" defaultValue={latestInvitation ? `/${latestInvitation.code}` : "/"} aria-label="رابط فتح الإشعار" />
            <button className="btn btn-gold btn-glow" type="submit">
              <Send size={18} />
              إرسال الإشعار
            </button>
          </form>
          {notificationStatus ? <p className="status success">{notificationStatus}</p> : null}
        </article>
      </section>
    </>
  );
}
