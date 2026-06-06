import Link from "next/link";
import { Activity, Copy, ExternalLink, Plus, Settings2 } from "lucide-react";
import { StatsGrid } from "@/components/StatsGrid";
import { getAdminGuests, getAdminInvitations, getAdminOrders } from "@/lib/admin-data";
import { formatArabicNumber, getInvitationUrl } from "@/lib/utils";
import { getCustomerAdminPath } from "@/lib/slug";

export default async function AdminDashboardPage() {
  const [invitations, guests, orders] = await Promise.all([getAdminInvitations(), getAdminGuests(), getAdminOrders()]);
  const totalGuests = guests.reduce((total, guest) => total + guest.attendees, 0);
  const latestInvitation = invitations[0];

  return (
    <>
      <div className="dashboard-head">
        <div>
          <span className="eyebrow">Super Admin</span>
          <h1>لوحة التحكم الرئيسية</h1>
          <p>إدارة كاملة للموقع، الدعوات، العملاء، الطلبات، وروابط لوحات العملاء.</p>
        </div>
        <Link className="btn btn-gold" href="/admin/invitations">
          <Plus size={18} />
          إنشاء دعوة
        </Link>
      </div>
      <StatsGrid
        stats={[
          { label: "إجمالي الدعوات", value: formatArabicNumber(invitations.length), hint: "كل الدعوات المسجلة" },
          { label: "دعوات نشطة", value: formatArabicNumber(invitations.filter((invitation) => invitation.isActive).length), hint: "جاهزة للعرض" },
          { label: "إجمالي الضيوف", value: formatArabicNumber(totalGuests), hint: "حسب RSVP" },
          { label: "طلبات جديدة", value: formatArabicNumber(orders.filter((order) => order.status === "new").length), hint: "في انتظار القرار" },
        ]}
      />
      <section className="section compact">
        <div className="grid-3">
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
        </div>
      </section>
    </>
  );
}
