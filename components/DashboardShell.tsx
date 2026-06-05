import Link from "next/link";
import type { ReactNode } from "react";
import { Archive, BarChart3, Crown, DatabaseBackup, FileText, LayoutDashboard, Palette, UsersRound } from "lucide-react";

const adminLinks = [
  { href: "/admin", label: "الرئيسية", icon: LayoutDashboard },
  { href: "/admin/orders", label: "الطلبات", icon: FileText },
  { href: "/admin/invitations", label: "الدعوات", icon: Archive },
  { href: "/admin/templates", label: "القوالب", icon: Palette },
  { href: "/admin/customers", label: "العملاء", icon: UsersRound },
  { href: "/admin/backups", label: "النسخ الاحتياطي", icon: DatabaseBackup },
  { href: "/admin/analytics", label: "التحليلات", icon: BarChart3 },
];

export function DashboardShell({ children }: { children: ReactNode }) {
  return (
    <div className="dashboard-layout">
      <aside className="dashboard-sidebar">
        <Link href="/" className="brand">
          <span className="brand-mark">
            <Crown size={20} />
          </span>
          <span>BadrDaawa</span>
        </Link>
        <nav className="dashboard-nav" aria-label="لوحة الإدارة">
          {adminLinks.map((link) => {
            const Icon = link.icon;
            return (
              <Link href={link.href} key={link.href}>
                <Icon size={18} />
                {link.label}
              </Link>
            );
          })}
        </nav>
      </aside>
      <main className="dashboard-main">{children}</main>
    </div>
  );
}
