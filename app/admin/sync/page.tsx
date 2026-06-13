import Link from "next/link";
import { ArrowUpLeft, CalendarClock, DatabaseBackup, Github, History, ShieldCheck } from "lucide-react";

const syncSections = [
  {
    href: "/admin/backups",
    title: "النسخ الاحتياطي",
    description: "إنشاء ومراجعة نسخ Runtime Data وملفات العملاء.",
    icon: DatabaseBackup,
    primary: true,
  },
  {
    href: "/admin/sync-settings",
    title: "إعدادات GitHub",
    description: "إدارة مزامنة Project Content إلى GitHub.",
    icon: Github,
  },
  {
    href: "/admin/sync-history",
    title: "سجل GitHub",
    description: "متابعة عمليات الرفع والنتائج والأخطاء.",
    icon: History,
  },
  {
    href: "/admin/tasks",
    title: "المهام المجدولة",
    description: "مراجعة تشغيل النسخ التلقائي والمهام الخلفية.",
    icon: CalendarClock,
  },
];

export default function AdminSyncHubPage() {
  return (
    <section className="admin-command-center">
      <div className="dashboard-head">
        <div>
          <span className="eyebrow">System</span>
          <h1>النسخ والمزامنة</h1>
          <p>مركز موحد للنسخ الاحتياطي التشغيلي ومزامنة محتوى المشروع والمهام المجدولة.</p>
        </div>
        <Link className="btn btn-soft" href="/admin">
          العودة للرئيسية
        </Link>
      </div>

      <section className="admin-start-grid" aria-label="أقسام النسخ والمزامنة">
        {syncSections.map((section) => {
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

      <section className="panel admin-health-overview" aria-label="حالة النسخ والمزامنة">
        <div className="admin-card-head">
          <ShieldCheck size={22} />
          <div>
            <span className="eyebrow">Backup Flow</span>
            <h2>مسار الحماية</h2>
          </div>
        </div>
        <div className="admin-mini-links">
          <Link href="/admin/backups">Runtime Backup</Link>
          <Link href="/admin/sync-settings">Project GitHub Sync</Link>
          <Link href="/admin/sync-history">Project Sync Logs</Link>
          <Link href="/admin/tasks">Railway Cron Jobs</Link>
        </div>
      </section>
    </section>
  );
}
