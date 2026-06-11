"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { Activity, Archive, BarChart3, Bell, Bug, CalendarClock, ClipboardList, Crown, DatabaseBackup, FileImage, FilePenLine, FileText, Github, History, Home, LayoutDashboard, LogOut, MapPinCheckInside, Menu, MessageCircleHeart, MessageSquareText, MonitorPlay, Music2, Palette, PlusCircle, RadioTower, Search, ScrollText, Settings, ShieldCheck, Star, Trash2, UsersRound, X } from "lucide-react";

const adminNavGroups = [
  {
    title: "إدارة الدعوات",
    links: [
      { href: "/admin", label: "الرئيسية", icon: LayoutDashboard },
      { href: "/admin/invitations", label: "الدعوات", icon: Archive },
      { href: "/admin/new-invitation", label: "دعوة جديدة", icon: PlusCircle },
      { href: "/admin/orders", label: "طلبات الدعوات", icon: FileText, badgeKey: "orders" },
    ],
  },
  {
    title: "إدارة العملاء",
    links: [
      { href: "/admin/customers", label: "العملاء", icon: UsersRound },
      { href: "/admin/messages", label: "رسائل العرسان", icon: MessageSquareText, badgeKey: "messages" },
      { href: "/admin/guest-book", label: "رسائل للعروسين", icon: MessageCircleHeart },
      { href: "/admin/favorites", label: "المفضلة", icon: Star },
    ],
  },
  {
    title: "إدارة الحدث",
    links: [
      { href: "/admin/attendance", label: "الحضور", icon: ClipboardList },
      { href: "/admin/check-ins", label: "الوصول للفعاليات", icon: MapPinCheckInside },
      { href: "/admin/live-mode", label: "البث المباشر", icon: RadioTower },
      { href: "/admin/broadcast", label: "شاشة بث الموقع", icon: RadioTower },
      { href: "/admin/analytics", label: "التحليلات", icon: BarChart3 },
    ],
  },
  {
    title: "إدارة المحتوى",
    links: [
      { href: "/admin/music", label: "الموسيقى", icon: Music2 },
      { href: "/admin/templates", label: "القوالب", icon: Palette },
      { href: "/admin/pages", label: "الصفحات", icon: FilePenLine },
      { href: "/admin/media", label: "الوسائط", icon: FileImage },
      { href: "/admin/preview", label: "المعاينة", icon: MonitorPlay },
      { href: "/admin/message-templates", label: "قوالب الرسائل", icon: MessageSquareText },
      { href: "/admin/content-presets", label: "النصوص الجاهزة", icon: FilePenLine },
      { href: "/admin/legal", label: "الصفحات القانونية", icon: FileText },
    ],
  },
  {
    title: "النظام",
    links: [
      { href: "/admin/settings", label: "الإعدادات", icon: Settings },
      { href: "/admin/notifications", label: "الإشعارات", icon: Bell, badgeKey: "notifications" },
      { href: "/admin/audit-log", label: "السجل", icon: ScrollText },
      { href: "/admin/search", label: "البحث العام", icon: Search },
      { href: "/admin/recent-edits", label: "التعديلات الأخيرة", icon: History },
      { href: "/admin/system-health", label: "صحة النظام", icon: Activity },
      { href: "/admin/tasks", label: "المهام المجدولة", icon: CalendarClock },
      { href: "/admin/errors", label: "الأخطاء", icon: Bug },
      { href: "/admin/trash", label: "سلة المهملات", icon: Trash2 },
      { href: "/admin/backups", label: "النسخ الاحتياطي", icon: DatabaseBackup },
      { href: "/admin/sync-history", label: "سجل المزامنة", icon: Github },
      { href: "/admin/sync-settings", label: "إعدادات المزامنة", icon: Github },
    ],
  },
];

const adminLinks = adminNavGroups.flatMap((group) => group.links);
const mobilePrimaryHrefs = new Set(["/admin", "/admin/new-invitation", "/admin/invitations", "/admin/orders", "/admin/notifications"]);
const mobilePrimaryLinks = adminLinks.filter((link) => mobilePrimaryHrefs.has(link.href));
const mobileMoreLinks = adminLinks.filter((link) => !mobilePrimaryHrefs.has(link.href));
const pendingAdminActionKey = "badr-admin-pending-action";

export function DashboardShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const activeLink = adminLinks.find((link) => (link.href === "/admin" ? pathname === link.href : pathname.startsWith(link.href))) || adminLinks[0];
  const [ordersBadge, setOrdersBadge] = useState(0);
  const [messagesBadge, setMessagesBadge] = useState(0);
  const [notificationsBadge, setNotificationsBadge] = useState(0);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [routeBusy, setRouteBusy] = useState(false);
  const routeBusyTimerRef = useRef<number | null>(null);

  useEffect(() => {
    setMobileMenuOpen(false);
    setRouteBusy(false);
    if (routeBusyTimerRef.current) {
      window.clearTimeout(routeBusyTimerRef.current);
      routeBusyTimerRef.current = null;
    }
  }, [pathname]);

  useEffect(() => {
    setRouteBusy(false);
  }, [searchParams]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const raw = window.sessionStorage.getItem(pendingAdminActionKey);
      if (!raw) return;
      window.sessionStorage.removeItem(pendingAdminActionKey);

      const params = new URLSearchParams(window.location.search);
      const hasExplicitOutcome = ["error", "status", "saved", "created", "sync"].some((key) => params.has(key));
      if (hasExplicitOutcome) return;

      try {
        const action = JSON.parse(raw) as { kind?: string; label?: string; time?: number };
        if (!action.time || Date.now() - action.time > 15000) return;
        const isSubmit = action.kind === "submit";
        window.badrNotify?.({
          type: "success",
          title: isSubmit ? "تم تحميل النتائج" : "تم فتح القسم",
          message: isSubmit ? `${action.label || "الإجراء"} اكتمل.` : `تم فتح ${action.label || "القسم"} بنجاح.`,
          duration: 2600,
        });
      } catch {
        window.badrNotify?.({
          type: "success",
          title: "تم تحميل الصفحة",
          message: "اكتمل الانتقال داخل لوحة الإدارة.",
          duration: 2400,
        });
      }
    }, 160);

    return () => window.clearTimeout(timer);
  }, [pathname, searchParams]);

  useEffect(() => {
    function markBusy() {
      setRouteBusy(true);
      if (routeBusyTimerRef.current) window.clearTimeout(routeBusyTimerRef.current);
      routeBusyTimerRef.current = window.setTimeout(() => {
        setRouteBusy(false);
        document.querySelectorAll(".admin-action-pending").forEach((item) => item.classList.remove("admin-action-pending"));
        document.querySelectorAll("[data-admin-working='true']").forEach((item) => item.removeAttribute("data-admin-working"));
      }, 12000);
    }

    function notify(type: "info" | "success" | "warning" | "error", title: string, message: string, duration = 2600) {
      window.badrNotify?.({ type, title, message, duration });
    }

    function rememberAction(kind: "link" | "submit", label: string) {
      window.sessionStorage.setItem(
        pendingAdminActionKey,
        JSON.stringify({
          kind,
          label,
          time: Date.now(),
        }),
      );
    }

    function onSubmit(event: Event) {
      const form = event.target instanceof HTMLFormElement ? event.target : null;
      if (!form?.closest(".admin-dark-shell")) return;
      if (form.dataset.noAdminFeedback === "true") return;

      const method = (form.method || "get").toUpperCase();
      const submitter = (event as SubmitEvent).submitter;
      const submitterElement = submitter instanceof HTMLElement ? submitter : null;
      const submitterText = submitterElement?.textContent?.trim().replace(/\s+/g, " ").slice(0, 60);

      form.classList.add("admin-action-pending");
      form.setAttribute("aria-busy", "true");
      submitterElement?.setAttribute("data-admin-working", "true");
      markBusy();
      rememberAction("submit", submitterText || (method === "GET" ? "تحميل النتائج" : "تنفيذ الأمر"));

      notify(
        "info",
        method === "GET" ? "جاري تحميل النتائج" : "جاري تنفيذ الأمر",
        submitterText ? `${submitterText} قيد التنفيذ...` : method === "GET" ? "يتم تطبيق البحث أو الفلتر الآن..." : "يتم إرسال الطلب للسيرفر الآن...",
        2200,
      );
    }

    function onClick(event: MouseEvent) {
      const target = event.target instanceof Element ? event.target : null;
      if (!target) return;
      const link = target.closest("a[href]") as HTMLAnchorElement | null;
      if (!link?.closest(".admin-dark-shell")) return;
      if (link.target && link.target !== "_self") return;
      if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return;

      let url: URL;
      try {
        url = new URL(link.href, window.location.origin);
      } catch {
        return;
      }

      if (url.origin !== window.location.origin || !url.pathname.startsWith("/admin")) return;
      if (url.pathname === window.location.pathname && url.search === window.location.search && url.hash) return;

      markBusy();
      const label = link.textContent?.trim().replace(/\s+/g, " ").slice(0, 60) || "القسم";
      rememberAction("link", label);
      notify("info", "جاري فتح القسم", `يتم فتح ${label}...`, 1800);
    }

    function onPageShow() {
      setRouteBusy(false);
    }

    document.addEventListener("submit", onSubmit, true);
    document.addEventListener("click", onClick, true);
    window.addEventListener("pageshow", onPageShow);

    return () => {
      document.removeEventListener("submit", onSubmit, true);
      document.removeEventListener("click", onClick, true);
      window.removeEventListener("pageshow", onPageShow);
      if (routeBusyTimerRef.current) window.clearTimeout(routeBusyTimerRef.current);
    };
  }, []);

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
      if (document.visibilityState === "hidden") return;
      const response = await fetch("/api/admin/orders/count", { cache: "no-store" }).catch(() => null);
      if (!alive || !response?.ok) return;
      const data = (await response.json().catch(() => null)) as { count?: number } | null;
      setOrdersBadge(Math.max(0, Number(data?.count || 0)));
    }
    loadCount();
    window.addEventListener("admin-orders-count-refresh", loadCount);
    const timer = window.setInterval(loadCount, 45000);
    return () => {
      alive = false;
      window.removeEventListener("admin-orders-count-refresh", loadCount);
      window.clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    let alive = true;
    async function loadCount() {
      if (document.visibilityState === "hidden") return;
      const response = await fetch("/api/admin/client-messages/unread-count", { cache: "no-store" }).catch(() => null);
      if (!alive || !response?.ok) return;
      const data = (await response.json().catch(() => null)) as { count?: number } | null;
      setMessagesBadge(Math.max(0, Number(data?.count || 0)));
    }
    loadCount();
    const timer = window.setInterval(loadCount, 45000);
    return () => {
      alive = false;
      window.clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    let alive = true;
    async function loadCount() {
      if (document.visibilityState === "hidden") return;
      const response = await fetch("/api/admin/notification-center?summary=1", { cache: "no-store" }).catch(() => null);
      if (!alive || !response?.ok) return;
      const data = (await response.json().catch(() => null)) as { unreadCount?: number } | null;
      setNotificationsBadge(Math.max(0, Number(data?.unreadCount || 0)));
    }
    loadCount();
    window.addEventListener("admin-notifications-refresh", loadCount);
    const timer = window.setInterval(loadCount, 60000);
    return () => {
      alive = false;
      window.removeEventListener("admin-notifications-refresh", loadCount);
      window.clearInterval(timer);
    };
  }, []);

  return (
    <div className="dashboard-layout">
      {routeBusy ? <div className="admin-route-progress" role="status" aria-label="جاري تحميل لوحة الإدارة" /> : null}
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

          <nav className="dashboard-nav grouped" aria-label="لوحة الإدارة">
            {adminNavGroups.map((group) => (
              <section className="dashboard-nav-group" key={group.title} aria-label={group.title}>
                <h2 className="dashboard-nav-heading">{group.title}</h2>
                <div className="dashboard-nav-group-links">
                  {group.links.map((link) => {
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
                </div>
              </section>
            ))}
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
            <Link className="admin-icon-button" href="/admin/favorites" title="المفضلة">
              <Star size={18} />
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
