"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { Activity, Archive, BarChart3, Bell, Bug, CalendarClock, Camera, ClipboardList, Crown, DatabaseBackup, FileImage, FilePenLine, FileText, Github, History, Home, LayoutDashboard, LogOut, MapPinCheckInside, Menu, MessageCircleHeart, MessageSquareText, MonitorPlay, Music2, Palette, PlusCircle, RadioTower, Search, ScrollText, Settings, ShieldCheck, Star, Trash2, TriangleAlert, UsersRound, X } from "lucide-react";

const adminSections = [
  {
    id: "overview",
    title: "الدعوات",
    description: "إنشاء ومتابعة الدعوات والطلبات",
    accent: "gold",
    icon: Archive,
    links: [
      { href: "/admin", label: "الرئيسية", icon: LayoutDashboard },
      { href: "/admin/invitations", label: "الدعوات المنشورة", icon: Archive },
      { href: "/admin/orders", label: "الدعوات المعلقة", icon: FileText, badgeKey: "orders" },
      { href: "/admin/new-invitation", label: "إنشاء دعوة", icon: PlusCircle },
    ],
  },
  {
    id: "customers",
    title: "العملاء",
    description: "حسابات العملاء والتواصل والملاحظات",
    accent: "teal",
    icon: UsersRound,
    links: [
      { href: "/admin/customers", label: "العملاء", icon: UsersRound },
      { href: "/admin/messages", label: "الرسائل", icon: MessageSquareText, badgeKey: "messages" },
      { href: "/admin/guest-book", label: "التهاني", icon: MessageCircleHeart },
      { href: "/admin/message-templates", label: "قوالب الرسائل", icon: MessageSquareText },
    ],
  },
  {
    id: "events",
    title: "الفعاليات",
    description: "الحضور والتحليلات وتشغيل يوم الفرح",
    accent: "blue",
    icon: ClipboardList,
    links: [
      { href: "/admin/attendance", label: "الحضور", icon: ClipboardList },
      { href: "/admin/check-ins", label: "تسجيل الوصول", icon: MapPinCheckInside },
      { href: "/admin/live-mode", label: "البث المباشر", icon: RadioTower },
      { href: "/admin/analytics", label: "التحليلات", icon: BarChart3 },
    ],
  },
  {
    id: "content",
    title: "المحتوى",
    description: "القوالب والوسائط والصفحات العامة",
    accent: "rose",
    icon: Palette,
    links: [
      { href: "/admin/templates", label: "القوالب", icon: Palette },
      { href: "/admin/music", label: "الموسيقى", icon: Music2 },
      { href: "/admin/media", label: "الوسائط", icon: FileImage },
      { href: "/admin/pages", label: "الصفحات", icon: FilePenLine },
      { href: "/admin/preview", label: "المعاينة", icon: MonitorPlay },
      { href: "/admin/content-presets", label: "النصوص الجاهزة", icon: FilePenLine },
      { href: "/admin/legal", label: "الصفحات القانونية", icon: FileText },
      { href: "/admin/broadcast", label: "شاشة البث", icon: RadioTower },
    ],
  },
  {
    id: "sync",
    title: "النسخ والمزامنة",
    description: "النسخ الاحتياطي وGitHub والمهام",
    accent: "violet",
    icon: DatabaseBackup,
    links: [
      { href: "/admin/sync", label: "مركز النسخ والمزامنة", icon: DatabaseBackup },
      { href: "/admin/backups", label: "النسخ الاحتياطي", icon: DatabaseBackup },
      { href: "/admin/backups/emergency", label: "طوارئ", icon: TriangleAlert },
      { href: "/admin/sync-history", label: "سجل GitHub", icon: History },
      { href: "/admin/sync-settings", label: "GitHub", icon: Github },
      { href: "/admin/tasks", label: "المهام المجدولة", icon: CalendarClock },
    ],
  },
  {
    id: "system",
    title: "الإعدادات والنظام",
    description: "الإشعارات والمراقبة والسجلات",
    accent: "slate",
    icon: Settings,
    links: [
      { href: "/admin/settings", label: "إعدادات الموقع", icon: Settings },
      { href: "/admin/photographer-logo", label: "شعار المصور", icon: Camera },
      { href: "/admin/notifications", label: "الإشعارات", icon: Bell, badgeKey: "notifications" },
      { href: "/admin/monitoring", label: "مركز مراقبة النظام", icon: Activity },
      { href: "/admin/system-health", label: "صحة النظام", icon: Activity },
      { href: "/admin/errors", label: "الأخطاء", icon: Bug },
      { href: "/admin/audit-log", label: "السجل", icon: ScrollText },
      { href: "/admin/recent-edits", label: "التعديلات الأخيرة", icon: History },
      { href: "/admin/trash", label: "سلة المهملات", icon: Trash2 },
    ],
  },
  {
    id: "workspace",
    title: "مساحة العمل",
    description: "بحث ومفضلة وروابط يومية",
    accent: "green",
    icon: Search,
    links: [
      { href: "/admin/search", label: "البحث العام", icon: Search },
      { href: "/admin/favorites", label: "المفضلة", icon: Star },
    ],
  },
];

const allAdminLinks = adminSections.flatMap((group) => group.links);
const mobilePrimaryHrefs = new Set(["/admin", "/admin/new-invitation", "/admin/invitations", "/admin/orders", "/admin/notifications"]);
const mobilePrimaryLinks = allAdminLinks.filter((link) => mobilePrimaryHrefs.has(link.href));
const pendingAdminActionKey = "badr-admin-pending-action";

export function DashboardShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const activeLink =
    allAdminLinks
      .filter((link) => (link.href === "/admin" ? pathname === link.href : pathname.startsWith(link.href)))
      .sort((a, b) => b.href.length - a.href.length)[0] || allAdminLinks[0];
  const activeSection = adminSections.find((section) => section.links.some((link) => activeLink.href === link.href)) || adminSections[0];
  const [selectedSectionId, setSelectedSectionId] = useState(activeSection.id);
  const selectedSection = adminSections.find((section) => section.id === selectedSectionId) || activeSection;
  const [ordersBadge, setOrdersBadge] = useState(0);
  const [messagesBadge, setMessagesBadge] = useState(0);
  const [notificationsBadge, setNotificationsBadge] = useState(0);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [routeBusy, setRouteBusy] = useState(false);
  const routeBusyTimerRef = useRef<number | null>(null);

  useEffect(() => {
    setSelectedSectionId(activeSection.id);
    setMobileMenuOpen(false);
    setRouteBusy(false);
    if (routeBusyTimerRef.current) {
      window.clearTimeout(routeBusyTimerRef.current);
      routeBusyTimerRef.current = null;
    }
  }, [pathname, activeSection.id]);

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

  function badgeFor(link: (typeof allAdminLinks)[number]) {
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

          <nav className="dashboard-nav dashboard-section-nav" aria-label="لوحة الإدارة">
            <div className="dashboard-primary-sections" aria-label="الأقسام الرئيسية">
              {adminSections.map((section) => {
                const Icon = section.icon;
                const isActive = activeSection.id === section.id;
                const isSelected = selectedSection.id === section.id;
                return (
                  <button
                    className={`${isSelected ? "selected" : ""} ${isActive ? "active" : ""}`}
                    data-accent={section.accent}
                    type="button"
                    key={section.id}
                    onClick={() => setSelectedSectionId(section.id)}
                    aria-pressed={isSelected}
                  >
                    <span>
                      <Icon size={18} />
                    </span>
                    <strong>{section.title}</strong>
                    <small>{section.description}</small>
                  </button>
                );
              })}
            </div>
            <section className="dashboard-secondary-panel" data-accent={selectedSection.accent} aria-label={selectedSection.title}>
              <div className="dashboard-secondary-head">
                <span className="eyebrow">القسم الفرعي</span>
                <h2>{selectedSection.title}</h2>
                <p>{selectedSection.description}</p>
              </div>
              <div className="dashboard-nav-group-links">
                {selectedSection.links.map((link) => {
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
            <nav className="admin-breadcrumb" aria-label="مسار التنقل">
              <Link href="/admin">الرئيسية</Link>
              {activeLink.href === "/admin" ? null : (
                <>
                  <span>/</span>
                  <button type="button" onClick={() => setSelectedSectionId(activeSection.id)}>
                    {activeSection.title}
                  </button>
                  <span>/</span>
                  <Link href={activeLink.href}>{activeLink.label}</Link>
                </>
              )}
            </nav>
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
        <nav className="admin-mobile-section-list" aria-label="كل أقسام لوحة الإدارة">
          {adminSections.map((section) => {
            const Icon = section.icon;
            const isCurrentSection = activeSection.id === section.id;
            return (
              <details key={section.id} open={isCurrentSection}>
                <summary data-accent={section.accent}>
                  <span>
                    <Icon size={18} />
                  </span>
                  <strong>{section.title}</strong>
                  <small>{section.description}</small>
                </summary>
                <div>
                  {section.links.map((link) => {
                    const LinkIcon = link.icon;
                    const isActive = activeLink.href === link.href;
                    const badge = badgeFor(link);
                    return (
                      <Link className={isActive ? "active" : ""} href={link.href} key={link.href} aria-current={isActive ? "page" : undefined}>
                        <LinkIcon size={18} />
                        <span>{link.label}</span>
                        {badge ? <strong className="dashboard-nav-badge">{badge}</strong> : null}
                      </Link>
                    );
                  })}
                </div>
              </details>
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
