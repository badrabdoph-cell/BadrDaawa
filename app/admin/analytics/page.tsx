import { BarChart3, MousePointerClick, TrendingUp, UsersRound } from "lucide-react";
import { StatsGrid } from "@/components/StatsGrid";
import { demoGuests, demoInvitations } from "@/lib/demo-data";
import { invitationTemplates } from "@/lib/templates";

export default function AnalyticsPage() {
  const confirmed = demoGuests.filter((guest) => guest.status === "confirmed").length;
  const conversion = Math.round((confirmed / demoGuests.length) * 100);

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
          { label: "إجمالي المشاهدات", value: demoInvitations.reduce((sum, item) => sum + item.views, 0) },
          { label: "RSVP Conversion", value: `${conversion}%` },
          { label: "أكثر قالب طلبًا", value: invitationTemplates[0].arabicName },
          { label: "متوسط الضيوف", value: "٢.٣" },
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
            <p>قياس عدد الردود مقارنة بالمشاهدات يساعد على تحسين القوالب.</p>
          </article>
          <article className="panel">
            <TrendingUp size={24} />
            <h2>القوالب الأعلى أداءً</h2>
            <p>تحديد القوالب الأكثر بيعًا واستخدامًا في السوق.</p>
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
