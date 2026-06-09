"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { Activity, Archive, BarChart3, Bell, Bug, CalendarClock, ClipboardList, Crown, DatabaseBackup, FileImage, FilePenLine, FileText, Github, History, Home, LayoutDashboard, LogOut, MapPinCheckInside, Menu, MessageCircleHeart, MessageSquareText, MonitorPlay, Music2, Palette, PlusCircle, RadioTower, Search, ScrollText, Settings, ShieldCheck, Trash2, UsersRound, X } from "lucide-react";

const adminLinks = [
  { href: "/admin", label: "الرئيسية", icon: LayoutDashboard },
  { href: "/admin/search", label: "البحث العام", icon: Search },
  { href: "/admin/notifications", label: "التنبيهات", icon: Bell, badgeKey: "notifications" },
  { href: "/admin/settings", label: "إعدادات الموقع", icon: Settings },
  { href: "/admin/new-invitation", label: "دعوة جديدة", icon: PlusCircle },
  { href: "/admin/invitations", label: "الدعوات", icon: Archive },
  { href: "/admin/attendance", label: "الحضور", icon: ClipboardList },
  { href: "/admin/check-ins", label: "الوصول الفعلي", icon: MapPinCheckInside },
  { href: "/admin/guest-book", label: "سجل التهاني", icon: MessageCircleHeart },
  { href: "/admin/orders", label: "طلبات الدعوات", icon: FileText, badgeKey: "orders" },
  { href: "/admin/messages", label: "الرسائل", icon: MessageSquareText, badgeKey: "messages" },
  { href: "/admin/message-templates", label: "قوالب الرسائل", icon: MessageSquareText },
  { href: "/admin/content-presets", label: "النصوص الجاهزة", icon: FilePenLine },
  { href: "/admin/templates", label: "القوالب", icon: Palette },
  { href: "/admin/live-mode", label: "وضع الحفل", icon: RadioTower },
  { href: "/admin/music", label: "الموسيقى", icon: Music2 },
  { href: "/admin/media", label: "الوسائط", icon: FileImage },
  { href: "/admin/broadcast", label: "شاشة بث الموقع", icon: RadioTower },
  { href: "/admin/recent-edits", label: "التعديلات الأخيرة", icon: History },
  { href: "/admin/preview", label: "المعاينة", icon: MonitorPlay },
  { href: "/admin/customers", label: "العملاء", icon: UsersRound },
  { href: "/admin/analytics", label: "التحليلات", icon: BarChart3 },
  { href: "/admin/system-health", label: "صحة النظام", icon: Activity },
  { href: "/admin/tasks", label: "المهام المجدولة", icon: CalendarClock },
  { href: "/admin/errors", label: "الأخطاء", icon: Bug },
  { href: "/admin/pages", label: "الصفحات", icon: FilePenLine },
  { href: "/admin/legal", label: "الصفحات القانونية", icon: FileText },
  { href: "/admin/audit-log", label: "سجل التدقيق", icon: ScrollText },
  { href: "/admin/trash", label: "سلة المهملات", icon: Trash2 },
  { href: "/admin/backups", label: "النسخ الاحتياطي", icon: DatabaseBackup },
  { href: "/admin/sync-history", label: "سجل المزامنة", icon: Github },
  { href: "/admin/sync-settings", label: "إعدادات المزامنة", icon: Github },
];

const mobilePrimaryHrefs = new Set(["/admin", "/admin/new-invitation", "/admin/invitations", "/admin/orders", "/admin/notifications"]);
const mobilePrimaryLinks = adminLinks.filter((link) => mobilePrimaryHrefs.has(link.href));
const mobileMoreLinks = adminLinks.filter((link) => !mobilePrimaryHrefs.has(link.href));

export function DashboardShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const activeLink = adminLinks.find((link) => (link.href === "/admin" ? pathname === link.href : pathname.startsWith(link.href))) || adminLinks[0];
  const [ordersBadge, setOrdersBadge] = useState(0);
  const [messagesBadge, setMessagesBadge] = useState(0);
  const [notificationsBadge, setNotificationsBadge] = useState(0);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!mobileMenuOpen) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setMobileMenuOpen(false);
    }
    document.body.classList.add("admin-mobile-menu-open");
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.classList.remove("admin-mobile-menu-open");
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [mobileMenuOpen]);

  function badgeFor(link: (typeof adminLinks)[number]) {
    if (!("badgeKey" in link)) return null;
    if (link.badgeKey === "orders" && ordersBadge > 0) return ordersBadge;
    if (link.badgeKey === "messages" && messagesBadge > 0) return messagesBadge;
    if (link.badgeKey === "notifications" && notificationsBadge > 0) return notificationsBadge;
    return null;
  }

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

  useEffect(() => {
    let alive = true;
    async function loadCount() {
      const response = await fetch("/api/admin/notification-center", { cache: "no-store" }).catch(() => null);
      if (!alive || !response?.ok) return;
      const data = (await response.json().catch(() => null)) as { unreadCount?: number } | null;
      setNotificationsBadge(Math.max(0, Number(data?.unreadCount || 0)));
    }
    loadCount();
    window.addEventListener("admin-notifications-refresh", loadCount);
    const timer = window.setInterval(loadCount, 30000);
    return () => {
      alive = false;
      window.removeEventListener("admin-notifications-refresh", loadCount);
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
                  {badgeFor(link) ? <strong className="dashboard-nav-badge">{badgeFor(link)}</strong> : null}
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
            <Link className="admin-icon-button" href="/admin/notifications" title="التنبيهات">
              <Bell size={18} />
              {notificationsBadge > 0 ? <strong className="dashboard-nav-badge topbar-badge">{notificationsBadge}</strong> : null}
            </Link>
          </div>
        </header>
        <div className="dashboard-content">{children}</div>
      </main>
      <div className="admin-mobile-nav-shell" aria-label="تنقل لوحة الإدارة للهاتف">
        <nav className="admin-mobile-bottom-nav">
          {mobilePrimaryLinks.map((link) => {
            const Icon = link.icon;
            const isActive = activeLink.href === link.href;
            const badge = badgeFor(link);
            return (
              <Link className={isActive ? "active" : ""} href={link.href} key={link.href} aria-current={isActive ? "page" : undefined}>
                <span className="admin-mobile-nav-icon">
                  <Icon size={19} />
                  {badge ? <strong>{badge}</strong> : null}
                </span>
                <small>{link.label}</small>
              </Link>
            );
          })}
          <button className={mobileMenuOpen ? "active" : ""} type="button" onClick={() => setMobileMenuOpen((open) => !open)} aria-expanded={mobileMenuOpen} aria-controls="admin-mobile-menu">
            <span className="admin-mobile-nav-icon">
              <Menu size={20} />
            </span>
            <small>المزيد</small>
          </button>
        </nav>
      </div>
      <div className={mobileMenuOpen ? "admin-mobile-menu-backdrop open" : "admin-mobile-menu-backdrop"} onClick={() => setMobileMenuOpen(false)} />
      <aside id="admin-mobile-menu" className={mobileMenuOpen ? "admin-mobile-menu open" : "admin-mobile-menu"} aria-hidden={!mobileMenuOpen}>
        <div className="admin-mobile-menu-head">
          <div>
            <span className="eyebrow">Admin Sections</span>
            <h2>كل أقسام الإدارة</h2>
          </div>
          <button className="admin-icon-button" type="button" onClick={() => setMobileMenuOpen(false)} aria-label="إغلاق القائمة">
            <X size={19} />
          </button>
        </div>
        <form className="admin-mobile-search" action="/admin/search" method="get">
          <Search size={17} />
          <input name="q" placeholder="بحث عام..." defaultValue={pathname === "/admin/search" ? searchParams.get("q") || "" : ""} />
          <button type="submit">بحث</button>
        </form>
        <nav className="admin-mobile-menu-grid" aria-label="كل أقسام لوحة الإدارة">
          {mobileMoreLinks.map((link) => {
            const Icon = link.icon;
            const isActive = activeLink.href === link.href;
            const badge = badgeFor(link);
            return (
              <Link className={isActive ? "active" : ""} href={link.href} key={link.href} aria-current={isActive ? "page" : undefined}>
                <Icon size={18} />
                <span>{link.label}</span>
                {badge ? <strong className="dashboard-nav-badge">{badge}</strong> : null}
              </Link>
            );
          })}
        </nav>
        <div className="admin-mobile-menu-actions">
          <Link className="btn btn-soft" href="/">
            <Home size={17} />
            فتح الموقع
          </Link>
          <form action="/api/auth/admin/logout" method="post">
            <button className="btn btn-soft" type="submit">
              <LogOut size={17} />
              تسجيل خروج
            </button>
          </form>
        </div>
      </aside>
    </div>
  );
}
