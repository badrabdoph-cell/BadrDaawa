import Link from "next/link";
import { Activity, BellRing, Copy, Database, ExternalLink, Plus, Send, Settings2, Sparkles } from "lucide-react";
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
  const totalGuests = guests.reduce((total, guest) => total + guest.attendees, 0);
  const latestInvitation = invitations[0];
  const notificationStatus = getNotificationStatus(params?.notify);

  return (
    <>
      <section className="admin-hero-panel">
        <div>
          <span className="eyebrow">Super Admin</span>
          <h1>لوحة التحكم الرئيسية</h1>
          <p>إدارة كاملة للموقع، الدعوات، العملاء، الطلبات، وروابط لوحات العملاء.</p>
        </div>
        <div className="admin-hero-actions">
          <Link className="btn btn-gold btn-glow" href="/admin/invitations">
            <Plus size={18} />
            إنشاء دعوة
          </Link>
          <Link className="btn btn-soft btn-glass" href="/admin/templates">
            <Sparkles size={18} />
            تعديل القالب
          </Link>
        </div>
      </section>
      <StatsGrid
        stats={[
          { label: "إجمالي الدعوات", value: formatArabicNumber(invitations.length), hint: "كل الدعوات المسجلة" },
          { label: "دعوات نشطة", value: formatArabicNumber(invitations.filter((invitation) => invitation.isActive).length), hint: "جاهزة للعرض" },
          { label: "إجمالي الضيوف", value: formatArabicNumber(totalGuests), hint: "حسب RSVP" },
          { label: "طلبات جديدة", value: formatArabicNumber(orders.filter((order) => order.status === "new").length), hint: "في انتظار القرار" },
        ]}
      />
      <section className="section compact">
        <div className="admin-command-grid">
          <article className="panel">
            <Activity size={24} />
            <h2>نظرة سريعة</h2>
            <p>كل دعوة لها رابط عام، QR، ولوحة عميل منفصلة تنتهي بـ /ad_3399.</p>
          </article>
          <article className="panel">
            <Copy size={24} />
            <h2>آخر دعوة</h2>
            <p>{latestInvitation ? getInvitationUrl(latestInvitation.code) : "أنشئ أول دعوة من صفحة الدعوات."}</p>
            <Link className="btn btn-soft" href={latestInvitation ? `/${latestInvitation.code}` : "/admin/invitations"}>
              فتح الدعوة
            </Link>
          </article>
          <article className="panel">
            <Settings2 size={24} />
            <h2>لوحة العميل</h2>
            <p>{latestInvitation ? getCustomerAdminPath(latestInvitation.code) : "تظهر تلقائيًا بعد إنشاء الدعوة."}</p>
            <Link className="btn btn-soft" href={latestInvitation ? getCustomerAdminPath(latestInvitation.code) : "/admin/invitations"}>
              <ExternalLink size={17} />
              فتح لوحة العميل
            </Link>
          </article>
          <article className="panel">
            <Database size={24} />
            <h2>حالة البيانات</h2>
            <p>{process.env.DATABASE_URL ? "قاعدة البيانات متصلة من المتغير DATABASE_URL." : "يعمل الآن بوضع الديمو حتى تضيف DATABASE_URL."}</p>
          </article>
        </div>
      </section>
      <section className="section compact">
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
