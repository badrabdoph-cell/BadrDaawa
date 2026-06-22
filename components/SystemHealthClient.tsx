"use client";

import { useCallback, useEffect, useState } from "react";
import { Activity, Archive, BellRing, CheckCircle2, Database, FileArchive, Github, HardDrive, Loader2, RefreshCw, ShieldAlert, Timer, TriangleAlert } from "lucide-react";
import type { SystemHealthCheck, SystemHealthLevel, SystemHealthSnapshot } from "@/lib/system-health";
import { formatArabicNumber } from "@/lib/utils";

type Props = {
  initialSnapshot: SystemHealthSnapshot;
};

const checkIcons: Record<string, typeof Activity> = {
  database: Database,
  "github-sync": Github,
  storage: HardDrive,
  backup: FileArchive,
  "push-notifications": BellRing,
  publish: Activity,
  "auto-restore": Timer,
};

const levelLabel: Record<SystemHealthLevel, string> = {
  ok: "سليم",
  warning: "تحذير",
  error: "خطأ",
};

function formatBytes(value: number) {
  if (value < 1024) return `${formatArabicNumber(value)} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
  if (value < 1024 * 1024 * 1024) return `${(value / (1024 * 1024)).toFixed(1)} MB`;
  return `${(value / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

function formatDateTime(value?: string) {
  if (!value) return "لا يوجد";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("ar-EG-u-nu-latn", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Africa/Cairo",
  }).format(date);
}

function relativeTime(value: string): string {
  const diff = Date.now() - new Date(value).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "الآن";
  if (minutes < 60) return `منذ ${formatArabicNumber(minutes)} دقيقة`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `منذ ${formatArabicNumber(hours)} ${hours === 1 ? "ساعة" : "ساعات"}`;
  const days = Math.floor(hours / 24);
  return `منذ ${formatArabicNumber(days)} ${days === 1 ? "يوم" : "أيام"}`;
}

function levelClass(level: SystemHealthLevel): string {
  if (level === "ok") return "good";
  if (level === "error") return "danger";
  return "pending";
}

function statusDotClass(level: SystemHealthLevel): string {
  if (level === "ok") return "status-dot active";
  if (level === "warning") return "status-dot paused";
  return "status-dot disabled";
}

export function SystemHealthClient({ initialSnapshot }: Props) {
  const [snapshot, setSnapshot] = useState(initialSnapshot);
  const [countdown, setCountdown] = useState(30);
  const [lastChecked, setLastChecked] = useState(new Date().toISOString());
  const [refreshing, setRefreshing] = useState(false);
  const [expandedChecks, setExpandedChecks] = useState<Set<string>>(new Set());
  const [runningCheck, setRunningCheck] = useState(false);

  const errors = snapshot.checks.filter((check) => check.level === "error" || check.error);
  const warnings = snapshot.checks.filter((check) => check.level === "warning");
  const overallLevel: SystemHealthLevel = errors.length ? "error" : warnings.length ? "warning" : "ok";

  const doRefresh = useCallback(async (showLoading = true) => {
    if (showLoading) setRefreshing(true);
    try {
      const res = await fetch("/api/admin/system-health");
      if (res.ok) {
        const data = (await res.json()) as SystemHealthSnapshot;
        setSnapshot(data);
        setLastChecked(new Date().toISOString());
      }
    } catch {
    } finally {
      if (showLoading) setRefreshing(false);
      setCountdown(30);
    }
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) {
          doRefresh(false);
          return 30;
        }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [doRefresh]);

  const runFreshCheck = useCallback(async () => {
    setRunningCheck(true);
    try {
      const res = await fetch("/api/admin/system-health?force=1");
      if (res.ok) {
        const data = (await res.json()) as SystemHealthSnapshot;
        setSnapshot(data);
        setLastChecked(new Date().toISOString());
      }
    } catch {
    } finally {
      setRunningCheck(false);
      setCountdown(30);
    }
  }, []);

  const toggleExpand = (key: string) => {
    setExpandedChecks((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  return (
    <div className="system-health-client">
      <div className="system-health-toolbar">
        <div className="system-health-toolbar-info">
          <Timer size={16} />
          <span>تحديث تلقائي بعد {formatArabicNumber(countdown)} ثانية</span>
          <span className="system-health-toolbar-sep">·</span>
          <span>آخر فحص: {relativeTime(lastChecked)}</span>
        </div>
        <div className="system-health-toolbar-actions">
          <button className="btn btn-soft" type="button" onClick={runFreshCheck} disabled={runningCheck}>
            {runningCheck ? <Loader2 size={16} className="spin-icon" /> : <RefreshCw size={16} />}
            تشغيل فحص جديد
          </button>
          <button className="btn btn-soft" type="button" onClick={() => doRefresh(true)} disabled={refreshing}>
            {refreshing ? <Loader2 size={16} className="spin-icon" /> : <Activity size={16} />}
            {refreshing ? "جاري التحديث..." : "تحديث"}
          </button>
        </div>
      </div>

      <div className="dashboard-head">
        <div>
          <span className="eyebrow">System Health</span>
          <h1>صحة النظام</h1>
          <p>نظرة تشغيلية مباشرة على قاعدة البيانات، التخزين، المزامنة، النسخ الاحتياطي، والتنبيهات.</p>
        </div>
        <span className={`admin-health-pill ${overallLevel === "ok" ? "good" : overallLevel === "error" ? "danger" : "pending"}`}>
          {overallLevel === "ok" ? <CheckCircle2 size={16} /> : <ShieldAlert size={16} />}
          {overallLevel === "ok" ? "كل الأنظمة سليمة" : overallLevel === "warning" ? "توجد تحذيرات" : "توجد أخطاء"}
        </span>
      </div>

      <div className="system-health-metrics">
        <article className="panel backup-status-card">
          <Archive size={24} />
          <span>عدد الملفات</span>
          <strong>{formatArabicNumber(snapshot.metrics.filesCount)}</strong>
          <small>{formatBytes(snapshot.metrics.filesSizeBytes)}</small>
        </article>
        <article className="panel backup-status-card">
          <Activity size={24} />
          <span>عدد الدعوات</span>
          <strong>{formatArabicNumber(snapshot.metrics.invitationsCount)}</strong>
        </article>
        <article className="panel backup-status-card">
          <FileArchive size={24} />
          <span>عدد الطلبات</span>
          <strong>{formatArabicNumber(snapshot.metrics.ordersCount)}</strong>
        </article>
        <article className="panel backup-status-card">
          <BellRing size={24} />
          <span>Push Subscriptions</span>
          <strong>{formatArabicNumber(snapshot.metrics.pushSubscriptionsCount)}</strong>
        </article>
      </div>

      <div className="system-health-grid">
        {snapshot.checks.map((check) => {
          const Icon = checkIcons[check.key] || Activity;
          const expanded = expandedChecks.has(check.key);
          return (
            <article className={`panel system-health-card system-health-card--${check.level}`} key={check.key}>
              <div className="system-health-card-head">
                <Icon size={22} />
                <span className={`admin-health-pill ${levelClass(check.level)}`}>
                  <span className={statusDotClass(check.level)} />
                  {levelLabel[check.level]}
                </span>
              </div>
              <div>
                <h2>{check.label}</h2>
                <strong>{check.status}</strong>
                <p>{check.detail}</p>
              </div>
              {check.error ? (
                <div className="system-health-inline-error">
                  <TriangleAlert size={16} />
                  <span>{check.error}</span>
                </div>
              ) : null}
              <button
                className="system-health-expand-btn btn btn-soft"
                type="button"
                onClick={() => toggleExpand(check.key)}
              >
                {expanded ? "إخفاء التفاصيل" : "عرض التفاصيل"}
              </button>
              {expanded ? (
                <div className="system-health-expand-detail">
                  <div className="system-health-expand-row">
                    <span>المفتاح</span>
                    <strong>{check.key}</strong>
                  </div>
                  <div className="system-health-expand-row">
                    <span>المستوى</span>
                    <strong>{levelLabel[check.level]}</strong>
                  </div>
                  <div className="system-health-expand-row">
                    <span>الحالة</span>
                    <strong>{check.status}</strong>
                  </div>
                  <div className="system-health-expand-row">
                    <span>التفاصيل</span>
                    <strong>{check.detail}</strong>
                  </div>
                  {check.error ? (
                    <div className="system-health-expand-row">
                      <span>الخطأ</span>
                      <strong className="system-health-expand-error">{check.error}</strong>
                    </div>
                  ) : null}
                </div>
              ) : null}
            </article>
          );
        })}
      </div>

      <div className="panel system-health-backup">
        <div>
          <span className="eyebrow">Latest Backup</span>
          <h2>آخر نسخة احتياطية</h2>
        </div>
        {snapshot.metrics.latestBackup ? (
          <div className="system-health-backup-details">
            <strong>{snapshot.metrics.latestBackup.fileName}</strong>
            <span>{formatDateTime(snapshot.metrics.latestBackup.createdAt)}</span>
            <span>{formatBytes(snapshot.metrics.latestBackup.sizeBytes)}</span>
            <span>{snapshot.metrics.latestBackup.source === "database" ? "قاعدة البيانات + الملفات" : "ملفات التشغيل"}</span>
          </div>
        ) : (
          <p>لا توجد نسخة احتياطية محفوظة بعد.</p>
        )}
      </div>

      <div className="panel system-health-errors">
        <div className="system-health-errors-head">
          <div>
            <span className="eyebrow">Operational Errors</span>
            <h2>الأخطاء التشغيلية</h2>
          </div>
          <span className={`admin-health-pill ${errors.length ? "danger" : "good"}`}>{errors.length ? `${formatArabicNumber(errors.length)} خطأ` : "لا توجد أخطاء"}</span>
        </div>

        {errors.length ? (
          <div className="table-shell">
            <table className="data-table">
              <thead>
                <tr>
                  <th>النظام</th>
                  <th>الحالة</th>
                  <th>التفاصيل</th>
                  <th>الخطأ</th>
                </tr>
              </thead>
              <tbody>
                {errors.map((check) => (
                  <tr key={check.key}>
                    <td>{check.label}</td>
                    <td><span className="admin-health-pill danger"><span className="status-dot disabled" />{check.status}</span></td>
                    <td>{check.detail}</td>
                    <td className="admin-long-link">{check.error || "غير محدد"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="admin-empty-state compact">
            <strong>النظام لا يعرض أخطاء حالياً</strong>
            <p>أي خطأ في قاعدة البيانات أو التخزين أو المزامنة سيظهر هنا بوضوح.</p>
          </div>
        )}
      </div>
    </div>
  );
}
