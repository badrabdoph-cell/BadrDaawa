"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { Bell, Crown, Home, Keyboard, LogOut, Menu, Palette, Search, Star, X } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";
import {
  adminSections,
  allAdminLinks,
  findActiveAdminLink,
  findAdminSectionForHref,
  mobilePrimaryLinks,
  shortcutHrefByKey,
} from "@/lib/admin-navigation";

const shortcutLinks = allAdminLinks.filter((link) => link.shortcutKey);
const pendingAdminActionKey = "badr-admin-pending-action";

export function DashboardShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const activeLink = findActiveAdminLink(pathname);
  const activeSection = findAdminSectionForHref(activeLink.href);
  const [selectedSectionId, setSelectedSectionId] = useState(activeSection.id);
  const selectedSection = adminSections.find((section) => section.id === selectedSectionId) || activeSection;
  const [ordersBadge, setOrdersBadge] = useState(0);
  const [messagesBadge, setMessagesBadge] = useState(0);
  const [notificationsBadge, setNotificationsBadge] = useState(0);
  const [publishStatus, setPublishStatus] = useState<{ hasUnpublishedChanges: boolean; pendingChanges: number } | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [routeBusy, setRouteBusy] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const routeBusyTimerRef = useRef<number | null>(null);
  const secondaryPanelRef = useRef<HTMLElement>(null);
  const router = useRouter();

  useEffect(() => {
    secondaryPanelRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  }, [selectedSectionId]);
  const pendingKeys = useRef<string[]>([]);

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

  useEffect(() => {
    let alive = true;
    async function loadStatus() {
      if (document.visibilityState === "hidden") return;
      const response = await fetch("/api/admin/publish-status", { cache: "no-store" }).catch(() => null);
      if (!alive || !response?.ok) return;
      const data = (await response.json().catch(() => null)) as { hasUnpublishedChanges?: boolean; pendingChanges?: number } | null;
      if (data) setPublishStatus({ hasUnpublishedChanges: !!data.hasUnpublishedChanges, pendingChanges: data.pendingChanges ?? 0 });
    }
    loadStatus();
    const timer = window.setInterval(loadStatus, 30000);
    return () => { alive = false; window.clearInterval(timer); };
  }, []);

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement || event.target instanceof HTMLSelectElement) {
      pendingKeys.current = [];
      return;
    }

    if (event.key === "?" && !event.ctrlKey && !event.metaKey) {
      event.preventDefault();
      setShortcutsOpen((open) => !open);
      pendingKeys.current = [];
      return;
    }

    if (event.key === "Escape") {
      setShortcutsOpen(false);
      pendingKeys.current = [];
      return;
    }

    const eventKey = event.key.toUpperCase();
    if (eventKey === "G") {
      pendingKeys.current = ["G"];
      setTimeout(() => { pendingKeys.current = []; }, 1000);
      return;
    }

    if (pendingKeys.current.length === 1 && pendingKeys.current[0] === "G" && shortcutHrefByKey[eventKey]) {
      event.preventDefault();
      pendingKeys.current = [];
      const href = shortcutHrefByKey[eventKey];
      if (href && href !== window.location.pathname) {
        window.sessionStorage.setItem(
          pendingAdminActionKey,
          JSON.stringify({ kind: "link", label: href, time: Date.now() }),
        );
        router.push(href);
      }
      return;
    }

    pendingKeys.current = [];
  }, [router]);

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

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

          <Link href="/admin/search" className="sidebar-search-link">
            <Search size={16} />
            <span>بحث سريع...</span>
            <kbd>Ctrl+K</kbd>
          </Link>

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
                    onClick={() => {
                      setSelectedSectionId(section.id);
                      const firstHref = section.links[0].href;
                      if (firstHref !== window.location.pathname) router.push(firstHref);
                    }}
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
            <section ref={secondaryPanelRef} className="dashboard-secondary-panel" data-accent={selectedSection.accent} aria-label={selectedSection.title}>
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
                        <span className="dashboard-nav-link-copy">
                          <strong>{link.label}</strong>
                          <small>{link.helper}</small>
                        </span>
                        {badgeFor(link) ? <strong className="dashboard-nav-badge">{badgeFor(link)}</strong> : null}
                        {link.href === "/admin/publish" && publishStatus ? (
                          <strong className={`dashboard-nav-badge publish-badge${publishStatus.hasUnpublishedChanges ? "" : " clean"}`}>
                            {publishStatus.hasUnpublishedChanges ? "● مسودات" : "✓ منشور"}
                          </strong>
                        ) : null}
                      </Link>
                    );
                  })}
              </div>
            </section>
          </nav>
        </div>

        <div className="dashboard-sidebar-footer">
          <div className="sidebar-footer-row">
            <Link className="dashboard-home-link" href="/">
              <Home size={17} />
              فتح الموقع
            </Link>
            <ThemeToggle />
          </div>
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
            <p className="dashboard-topbar-helper">{activeLink.helper}</p>
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
                  {link.href === "/admin/publish" && publishStatus ? (
                    <strong className={`publish-mobile-dot${publishStatus.hasUnpublishedChanges ? "" : " clean"}`} />
                  ) : null}
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
                        <span>
                          <strong>{link.label}</strong>
                          <small>{link.helper}</small>
                        </span>
                        {badge ? <strong className="dashboard-nav-badge">{badge}</strong> : null}
                        {link.href === "/admin/publish" && publishStatus ? (
                          <strong className={`dashboard-nav-badge publish-badge${publishStatus.hasUnpublishedChanges ? "" : " clean"}`}>
                            {publishStatus.hasUnpublishedChanges ? "● مسودات" : "✓ منشور"}
                          </strong>
                        ) : null}
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

      {shortcutsOpen ? (
        <div
          className="shortcuts-backdrop"
          onClick={() => setShortcutsOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-label="اختصارات لوحة الإدارة"
          style={{
            position: "fixed", inset: 0, zIndex: 200,
            display: "grid", placeItems: "center",
            background: "rgba(0,0,0,0.6)", backdropFilter: "blur(6px)",
          }}
        >
          <div
            className="panel"
            onClick={(e) => e.stopPropagation()}
            style={{
              maxWidth: "480px", width: "calc(100% - 32px)",
              display: "grid", gap: "14px", padding: "24px",
            }}
          >
            <div className="admin-card-head">
              <Keyboard size={22} />
              <div>
                <span className="eyebrow">Keyboard Shortcuts</span>
                <h2>اختصارات لوحة الإدارة</h2>
              </div>
            </div>
            <div style={{ display: "grid", gap: "10px", maxHeight: "52vh", overflow: "auto", paddingInlineEnd: "4px" }}>
              {shortcutLinks.map((link) => (
                <div key={link.href} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "14px" }}>
                  <span><kbd style={kbdStyle}>G</kbd> ثم <kbd style={kbdStyle}>{link.shortcutKey}</kbd></span>
                  <span>{link.label}</span>
                </div>
              ))}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span><kbd style={kbdStyle}>?</kbd></span>
                <span>عرض الاختصارات</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span><kbd style={kbdStyle}>Esc</kbd></span>
                <span>إغلاق</span>
              </div>
            </div>
            <button
              className="btn btn-gold"
              type="button"
              onClick={() => setShortcutsOpen(false)}
              style={{ justifySelf: "center", marginTop: "4px" }}
            >
              إغلاق
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

const kbdStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  minWidth: "32px",
  height: "28px",
  padding: "0 8px",
  border: "1px solid rgba(245,234,214,0.2)",
  borderRadius: "6px",
  background: "rgba(245,234,214,0.08)",
  fontSize: "0.82rem",
  fontWeight: 900,
  fontFamily: "monospace",
};
