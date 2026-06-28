import Link from "next/link";
import { Activity, ArrowUpLeft, Bug, History, RotateCcw, ScrollText, ShieldAlert, Trash2 } from "lucide-react";

const monitoringSections = [
  {
    title: "صحة النظام",
    links: [
      { href: "/admin/system-health", label: "صحة النظام", icon: Activity },
      { href: "/admin/notifications", label: "الإشعارات", icon: ShieldAlert },
    ],
  },
  {
    title: "السجلات",
    links: [
      { href: "/admin/audit-log", label: "سجل الأحداث", icon: ScrollText },
      { href: "/admin/errors", label: "الأخطاء", icon: Bug },
      { href: "/admin/recent-edits", label: "التعديلات الأخيرة", icon: History },
    ],
  },
  {
    title: "الصيانة",
    links: [
      { href: "/admin/trash", label: "سلة المهملات", icon: Trash2 },
      { href: "/admin/recent-edits", label: "مساحة التخزين", icon: RotateCcw },
    ],
  },
];

export default function MonitoringHubPage() {
  return (
    <div className="admin-page">
      <div className="dashboard-head">
        <div>
          <span className="eyebrow">System Monitoring</span>
          <h1>مركز مراقبة النظام</h1>
          <p>جميع أدوات المراقبة والصيانة في مكان واحد</p>
        </div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
        {monitoringSections.map((section) => (
          <div key={section.title} className="panel">
            <div className="admin-card-head">
              <h2>{section.title}</h2>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {section.links.map((link) => {
                const Icon = link.icon;
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="admin-nav-link"
                    style={{ padding: "12px 16px", borderRadius: 8 }}
                  >
                    <Icon size={18} />
                    {link.label}
                    <ArrowUpLeft size={14} style={{ marginRight: "auto", opacity: 0.4 }} />
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </div>
      <div className="backup-sync-note" style={{ marginTop: 24 }}>
        <ArrowUpLeft size={16} />
        <span>هذه الصفحة ستُحول قريباً إلى لوحة النظام الموحدة. يمكنك الوصول للأقسام الفردية من القائمة الجانبية.</span>
      </div>
    </div>
  );
}
