"use client";

import Link from "next/link";
import { ArrowUpLeft, CalendarClock, CheckCircle2, DatabaseBackup, Github, History, Loader2, RefreshCw, ShieldCheck } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

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

type SyncStatus = {
  readiness: { configured: boolean; label: string; detail: string };
  queue: { queueLength: number; isSyncing: boolean; items: Array<{ id: string; reason: string; status: string; age: number }> };
  lastSync: { createdAt: string; status: string; reason: string } | null;
  recentLogs: Array<{ id: string; status: string; reason: string; createdAt: string }>;
};

function formatRelativeTime(dateStr: string) {
  const date = new Date(dateStr);
  const now = Date.now();
  const diffMs = now - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  if (diffSec < 60) return "منذ لحظات";
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `منذ ${diffMin} دقيقة`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `منذ ${diffHours} ساعة`;
  const diffDays = Math.floor(diffHours / 24);
  return `منذ ${diffDays} يوم`;
}

function formatDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("ar-EG-u-nu-latn", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Africa/Cairo",
  }).format(date);
}

export default function AdminSyncHubPage() {
  const [status, setStatus] = useState<SyncStatus | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [branch, setBranch] = useState("main");
  const [loading, setLoading] = useState(true);

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/sync/status");
      if (res.ok) {
        const data = await res.json();
        setStatus(data);
      }
    } catch {
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 15000);
    return () => clearInterval(interval);
  }, [fetchStatus]);

  const handleSyncNow = async () => {
    setSyncing(true);
    try {
      const res = await fetch("/api/admin/sync-status", {
        method: "POST",
        headers: { Accept: "application/json" },
      });
      if (res.ok) await fetchStatus();
    } catch {
    } finally {
      setSyncing(false);
    }
  };

  const queue = status?.queue;
  const lastSync = status?.lastSync;

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

      <section className="panel" style={{ marginBottom: "16px" }}>
        <div className="admin-card-head">
          <ShieldCheck size={22} />
          <div>
            <span className="eyebrow">Sync Status</span>
            <h2>حالة المزامنة</h2>
          </div>
        </div>

        {loading ? (
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginTop: "14px", opacity: 0.6 }}>
            <Loader2 size={18} className="spin" />
            جاري تحميل الحالة...
          </div>
        ) : (
          <div style={{ marginTop: "14px", display: "grid", gap: "14px" }}>
            <div className="backup-status-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "10px" }}>
              <article className="panel backup-status-card" style={{ margin: 0, padding: "14px" }}>
                <RefreshCw size={20} />
                <span>آخر مزامنة</span>
                <strong style={{ fontSize: "1rem" }}>
                  {lastSync ? formatRelativeTime(lastSync.createdAt) : "لم تتم بعد"}
                </strong>
                {lastSync ? <small style={{ opacity: 0.6, fontSize: "0.8rem" }}>{formatDateTime(lastSync.createdAt)}</small> : null}
              </article>
              <article className="panel backup-status-card" style={{ margin: 0, padding: "14px" }}>
                <History size={20} />
                <span>حالة الطابور</span>
                <strong style={{ fontSize: "1rem" }}>
                  {queue?.isSyncing ? "جاري المزامنة" : queue && queue.queueLength > 0 ? `${queue.queueLength} في الانتظار` : "فارغ"}
                </strong>
                {queue && queue.items.length > 0 ? (
                  <small style={{ opacity: 0.6, fontSize: "0.8rem" }}>
                    {queue.items.filter((i) => i.status === "pending").length} معلقة
                  </small>
                ) : null}
              </article>
              <article className="panel backup-status-card" style={{ margin: 0, padding: "14px" }}>
                <Github size={20} />
                <span>الفرع</span>
                <div style={{ display: "flex", gap: "6px", alignItems: "center", marginTop: "4px" }}>
                  <select
                    value={branch}
                    onChange={(e) => setBranch(e.target.value)}
                    style={{
                      background: "rgba(245,234,214,0.08)",
                      border: "1px solid rgba(245,234,214,0.15)",
                      borderRadius: "6px",
                      color: "#fff7e8",
                      padding: "4px 8px",
                      fontSize: "0.85rem",
                      fontWeight: 800,
                    }}
                  >
                    <option value="main">main</option>
                    <option value="staging">staging</option>
                  </select>
                </div>
              </article>
              <article className={`panel backup-status-card`} style={{ margin: 0, padding: "14px" }}>
                <CheckCircle2 size={20} />
                <span>جاهزية الاتصال</span>
                <span className={`admin-health-pill ${status?.readiness.configured ? "good" : "danger"}`} style={{ marginTop: "4px", fontSize: "0.78rem", minHeight: "26px", padding: "4px 10px" }}>
                  {status?.readiness.configured ? "مُهيأ" : "غير مهيأ"}
                </span>
              </article>
            </div>

            <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
              <button className="btn btn-gold btn-glow" type="button" onClick={handleSyncNow} disabled={syncing || queue?.isSyncing}>
                {syncing ? <Loader2 size={17} className="spin" /> : <RefreshCw size={17} />}
                {syncing ? "جاري المزامنة..." : "مزامنة الآن"}
              </button>
              <Link href="/admin/sync-settings" className="btn btn-soft btn-glass">
                <Github size={16} />
                إعدادات المزامنة
              </Link>
            </div>
          </div>
        )}
      </section>

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
