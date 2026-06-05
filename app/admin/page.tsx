import Link from "next/link";
import { Activity, Copy, ExternalLink, Plus } from "lucide-react";
import { StatsGrid } from "@/components/StatsGrid";
import { demoGuests, demoInvitations, demoOrders } from "@/lib/demo-data";
import { formatArabicNumber } from "@/lib/utils";

export default function AdminDashboardPage() {
  const totalGuests = demoGuests.reduce((total, guest) => total + guest.attendees, 0);

  return (
    <>
      <div className="dashboard-head">
        <div>
          <span className="eyebrow">Super Admin</span>
          <h1>لوحة التحكم الرئيسية</h1>
        </div>
        <Link className="btn btn-gold" href="/admin/invitations">
          <Plus size={18} />
          إنشاء دعوة
        </Link>
      </div>
      <StatsGrid
        stats={[
          { label: "إجمالي الدعوات", value: formatArabicNumber(demoInvitations.length), hint: "كل الدعوات المسجلة" },
          { label: "دعوات نشطة", value: formatArabicNumber(demoInvitations.filter((invitation) => invitation.isActive).length), hint: "جاهزة للعرض" },
          { label: "إجمالي الضيوف", value: formatArabicNumber(totalGuests), hint: "حسب RSVP" },
          { label: "طلبات جديدة", value: formatArabicNumber(demoOrders.filter((order) => order.status === "new").length), hint: "في انتظار القرار" },
        ]}
      />
      <section className="section compact">
        <div className="grid-3">
          <article className="panel">
            <Activity size={24} />
            <h2>نشاط حديث</h2>
            <p>تم تسجيل ٤ ردود حضور اليوم، ودعوتان نشطتان تحققان معدل تحويل مرتفع.</p>
          </article>
          <article className="panel">
            <Copy size={24} />
            <h2>رابط تجريبي</h2>
            <p>استخدم A7X92K لمعاينة دعوة كاملة متصلة بلوحة العميل.</p>
            <Link className="btn btn-soft" href="/A7X92K">
              فتح الدعوة
            </Link>
          </article>
          <article className="panel">
            <ExternalLink size={24} />
            <h2>لوحة عميل</h2>
            <p>نموذج للوحة العروسين لمتابعة الردود والتصدير.</p>
            <Link className="btn btn-soft" href="/client/A7X92K">
              فتح اللوحة
            </Link>
          </article>
        </div>
      </section>
    </>
  );
}
