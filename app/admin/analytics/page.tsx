import { BarChart3, MousePointerClick, TrendingUp, UsersRound } from "lucide-react";
import { StatsGrid } from "@/components/StatsGrid";
import { getAdminGuests, getAdminInvitations } from "@/lib/admin-data";
import { getTemplatesWithSettings } from "@/lib/template-settings";

export default async function AnalyticsPage() {
  const [guests, invitations, templates] = await Promise.all([getAdminGuests(), getAdminInvitations(), getTemplatesWithSettings()]);
  const confirmed = guests.filter((guest) => guest.status === "confirmed").length;
  const conversion = guests.length ? Math.round((confirmed / guests.length) * 100) : 0;
  const averageGuests = guests.length ? (guests.reduce((sum, guest) => sum + guest.attendees, 0) / guests.length).toFixed(1) : "0";

  return (
    <>
      <div className="dashboard-head">
        <div>
          <span className="eyebrow">Analytics</span>
          <h1>تحليلات المنصة</h1>
        </div>
      </div>
      <StatsGrid
        stats={[
          { label: "إجمالي المشاهدات", value: invitations.reduce((sum, item) => sum + item.views, 0) },
          { label: "RSVP Conversion", value: `${conversion}%` },
          { label: "القوالب المتاحة", value: templates.length },
          { label: "متوسط الضيوف", value: averageGuests },
        ]}
      />
      <section className="section compact">
        <div className="grid-3">
          <article className="panel">
            <BarChart3 size={24} />
            <h2>مشاهدات الدعوات</h2>
            <p>تتبع views لكل دعوة من AnalyticsEvent مع تجميع يومي.</p>
          </article>
          <article className="panel">
            <MousePointerClick size={24} />
            <h2>نسبة التأكيد</h2>
            <p>قياس عدد الردود مقارنة بالمشاهدات يساعد على تحسين تجربة الدعوة.</p>
          </article>
          <article className="panel">
            <TrendingUp size={24} />
            <h2>أداء القوالب</h2>
            <p>قارن بين القوالب المتاحة حسب المشاهدات وردود الحضور.</p>
          </article>
          <article className="panel">
            <UsersRound size={24} />
            <h2>سلوك الضيوف</h2>
            <p>تحليل أوقات التسجيل وعدد الأفراد المتوقع.</p>
          </article>
        </div>
      </section>
    </>
  );
}
