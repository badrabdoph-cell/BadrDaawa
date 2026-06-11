import Link from "next/link";
import { Activity, ArrowUpLeft, Bug, History, RotateCcw, ScrollText, ShieldAlert, Trash2 } from "lucide-react";

const monitoringSections = [
  {
    href: "/admin/system-health",
    title: "صحة النظام",
    description: "حالة قاعدة البيانات والنسخ والمزامنة والخدمات.",
    icon: Activity,
    primary: true,
  },
  {
    href: "/admin/errors",
    title: "الأخطاء",
    description: "الأخطاء المسجلة من الواجهة والخادم.",
    icon: Bug,
  },
  {
    href: "/admin/audit-log",
    title: "السجل",
    description: "تتبع الإجراءات الإدارية والتغييرات المهمة.",
    icon: ScrollText,
  },
  {
    href: "/admin/recent-edits",
    title: "التعديلات الأخيرة",
    description: "مراجعة آخر تعديلات واسترجاع النسخ عند الحاجة.",
    icon: History,
  },
  {
    href: "/admin/trash",
    title: "سلة المهملات",
    description: "استرجاع العناصر المحذوفة أو مراجعتها.",
    icon: Trash2,
  },
];

export default function AdminMonitoringHubPage() {
  return (
    <section className="admin-command-center">
      <div className="dashboard-head">
        <div>
          <span className="eyebrow">Operations</span>
          <h1>مراقبة النظام</h1>
          <p>مركز موحد لصحة النظام، الأخطاء، السجلات، والاسترجاع.</p>
        </div>
        <Link className="btn btn-soft" href="/admin">
          العودة للرئيسية
        </Link>
      </div>

      <section className="admin-start-grid" aria-label="أقسام مراقبة النظام">
        {monitoringSections.map((section) => {
          const Icon = section.icon;
          return (
            <Link className={section.primary ? "admin-start-card primary" : "admin-start-card"} href={section.href} key={section.href}>
              <Icon size={22} />
              <span>
                <strong>{section.title}</strong>
                <small>{section.description}</small>
              </span>
              <ArrowUpLeft size={18} />
            </Link>
          );
        })}
      </section>

      <section className="panel admin-health-overview" aria-label="مسار المراقبة والاسترجاع">
        <div className="admin-card-head">
          <ShieldAlert size={22} />
          <div>
            <span className="eyebrow">Recovery Flow</span>
            <h2>التشخيص والاسترجاع</h2>
          </div>
        </div>
        <div className="admin-mini-links">
          <Link href="/admin/system-health">
            <Activity size={16} />
            صحة النظام
          </Link>
          <Link href="/admin/errors">
            <Bug size={16} />
            الأخطاء
          </Link>
          <Link href="/admin/recent-edits">
            <RotateCcw size={16} />
            التعديلات الأخيرة
          </Link>
          <Link href="/admin/trash">
            <Trash2 size={16} />
            سلة المهملات
          </Link>
        </div>
      </section>
    </section>
  );
}
