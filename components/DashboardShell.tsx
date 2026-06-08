"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { Activity, Archive, BarChart3, Bell, Bug, ClipboardList, Crown, DatabaseBackup, FileImage, FilePenLine, FileText, Github, History, Home, LayoutDashboard, LogOut, MessageSquareText, MonitorPlay, Music2, Palette, PlusCircle, RadioTower, Search, ScrollText, ShieldCheck, Trash2, UsersRound } from "lucide-react";

const adminLinks = [
  { href: "/admin", label: "الرئيسية", icon: LayoutDashboard },
  { href: "/admin/search", label: "البحث العام", icon: Search },
  { href: "/admin/new-invitation", label: "دعوة جديدة", icon: PlusCircle },
  { href: "/admin/invitations", label: "الدعوات", icon: Archive },
  { href: "/admin/attendance", label: "الحضور", icon: ClipboardList },
  { href: "/admin/orders", label: "طلبات الدعوات", icon: FileText, badgeKey: "orders" },
  { href: "/admin/messages", label: "الرسائل", icon: MessageSquareText, badgeKey: "messages" },
  { href: "/admin/content-presets", label: "النصوص الجاهزة", icon: FilePenLine },
  { href: "/admin/templates", label: "القوالب", icon: Palette },
  { href: "/admin/music", label: "الموسيقى", icon: Music2 },
  { href: "/admin/media", label: "الوسائط", icon: FileImage },
  { href: "/admin/broadcast", label: "شاشة بث الموقع", icon: RadioTower },
  { href: "/admin/recent-edits", label: "التعديلات الأخيرة", icon: History },
  { href: "/admin/preview", label: "المعاينة", icon: MonitorPlay },
  { href: "/admin/customers", label: "العملاء", icon: UsersRound },
  { href: "/admin/analytics", label: "التحليلات", icon: BarChart3 },
  { href: "/admin/system-health", label: "صحة النظام", icon: Activity },
  { href: "/admin/errors", label: "الأخطاء", icon: Bug },
  { href: "/admin/audit-log", label: "سجل التدقيق", icon: ScrollText },
  { href: "/admin/trash", label: "سلة المهملات", icon: Trash2 },
  { href: "/admin/backups", label: "النسخ الاحتياطي", icon: DatabaseBackup },
  { href: "/admin/sync-history", label: "سجل المزامنة", icon: Github },
  { href: "/admin/sync-settings", label: "إعدادات المزامنة", icon: Github },
];

export function DashboardShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const activeLink = adminLinks.find((link) => (link.href === "/admin" ? pathname === link.href : pathname.startsWith(link.href))) || adminLinks[0];
  const [ordersBadge, setOrdersBadge] = useState(0);
  const [messagesBadge, setMessagesBadge] = useState(0);

  useEffect(() => {
    let alive = true;
    async function loadCount() {
      const response = await fetch("/api/admin/orders/count", { cache: "no-store" }).catch(() => null);
      if (!alive || !response?.ok) return;
      const data = (await response.json().catch(() => null)) as { count?: number } | null;
      setOrdersBadge(Math.max(0, Number(data?.count || 0)));
    }
    loadCount();
    window.addEventListener("admin-orders-count-refresh", loadCount);
    const timer = window.setInterval(loadCount, 30000);
    return () => {
      alive = false;
      window.removeEventListener("admin-orders-count-refresh", loadCount);
      window.clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    let alive = true;
    async function loadCount() {
      const response = await fetch("/api/admin/client-messages/unread-count", { cache: "no-store" }).catch(() => null);
      if (!alive || !response?.ok) return;
      const data = (await response.json().catch(() => null)) as { count?: number } | null;
      setMessagesBadge(Math.max(0, Number(data?.count || 0)));
    }
    loadCount();
    const timer = window.setInterval(loadCount, 30000);
    return () => {
      alive = false;
      window.clearInterval(timer);
    };
  }, []);

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
                  {"badgeKey" in link && link.badgeKey === "orders" && ordersBadge > 0 ? <strong className="dashboard-nav-badge">{ordersBadge}</strong> : null}
                  {"badgeKey" in link && link.badgeKey === "messages" && messagesBadge > 0 ? <strong className="dashboard-nav-badge">{messagesBadge}</strong> : null}
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
          <form className="dashboard-global-search" action="/admin/search" method="get">
            <Search size={17} />
            <input name="q" placeholder="بحث عام..." defaultValue={pathname === "/admin/search" ? searchParams.get("q") || "" : ""} />
            <button type="submit">بحث</button>
          </form>
          <div className="dashboard-topbar-actions">
            <Link className="admin-icon-button" href="/admin/templates" title="القوالب">
              <Palette size={18} />
            </Link>
            <Link className="admin-icon-button" href="/admin/messages" title="الرسائل">
              <Bell size={18} />
              {messagesBadge > 0 ? <strong className="dashboard-nav-badge topbar-badge">{messagesBadge}</strong> : null}
            </Link>
          </div>
        </header>
        <div className="dashboard-content">{children}</div>
      </main>
    </div>
  );
}
