"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { Archive, BarChart3, Bell, Crown, DatabaseBackup, FileText, Home, LayoutDashboard, LogOut, MonitorPlay, Music2, Palette, RadioTower, ShieldCheck, UsersRound } from "lucide-react";

const adminLinks = [
  { href: "/admin", label: "الرئيسية", icon: LayoutDashboard },
  { href: "/admin/orders", label: "الطلبات", icon: FileText },
  { href: "/admin/client-invitations", label: "دعوات العملاء", icon: Archive },
  { href: "/admin/templates", label: "القوالب", icon: Palette },
  { href: "/admin/music", label: "الموسيقى", icon: Music2 },
  { href: "/admin/broadcast", label: "شاشة بث الموقع", icon: RadioTower },
  { href: "/admin/preview", label: "المعاينة", icon: MonitorPlay },
  { href: "/admin/customers", label: "العملاء", icon: UsersRound },
  { href: "/admin/analytics", label: "التحليلات", icon: BarChart3 },
  { href: "/admin/backups", label: "النسخ الاحتياطي", icon: DatabaseBackup },
];

export function DashboardShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const activeLink = adminLinks.find((link) => (link.href === "/admin" ? pathname === link.href : pathname.startsWith(link.href))) || adminLinks[0];

  return (
    <div className="dashboard-layout">
      <aside className="dashboard-sidebar">
        <div>
          <Link href="/admin" className="admin-brand">
            <span className="brand-mark">
              <Crown size={20} />
            </span>
            <span>
              <strong>BadrDaawa</strong>
              <small>Control Center</small>
            </span>
          </Link>

          <div className="admin-system-card">
            <ShieldCheck size={20} />
            <div>
              <strong>Super Admin</strong>
              <span>جلسة آمنة ومفعلة</span>
            </div>
          </div>

          <nav className="dashboard-nav" aria-label="لوحة الإدارة">
            {adminLinks.map((link) => {
              const Icon = link.icon;
              const isActive = activeLink.href === link.href;
              return (
                <Link className={isActive ? "active" : ""} href={link.href} key={link.href} aria-current={isActive ? "page" : undefined}>
                  <Icon size={18} />
                  <span>{link.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="dashboard-sidebar-footer">
          <Link className="dashboard-home-link" href="/">
            <Home size={17} />
            فتح الموقع
          </Link>
          <form action="/api/auth/admin/logout" method="post">
            <button className="dashboard-logout" type="submit">
              <LogOut size={17} />
              تسجيل خروج
            </button>
          </form>
        </div>
      </aside>
      <main className="dashboard-main">
        <header className="dashboard-topbar">
          <div>
            <span className="eyebrow">Admin Panel</span>
            <h1>{activeLink.label}</h1>
          </div>
          <div className="dashboard-topbar-actions">
            <Link className="admin-icon-button" href="/admin/templates" title="القوالب">
              <Palette size={18} />
            </Link>
            <Link className="admin-icon-button" href="/admin" title="الإشعارات">
              <Bell size={18} />
            </Link>
          </div>
        </header>
        <div className="dashboard-content">{children}</div>
      </main>
    </div>
  );
}
