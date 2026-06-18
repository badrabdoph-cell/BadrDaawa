"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, Bell, BellRing, Check, CheckCircle2, Eye, EyeOff, Inbox, Loader2, RotateCcw, ShieldAlert } from "lucide-react";
import type { AdminNotification, AdminNotificationAction, AdminNotificationSummary } from "@/lib/admin-notifications";
import { formatArabicNumber } from "@/lib/utils";

type Props = {
  initialSummary: AdminNotificationSummary;
};

function formatDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("ar-EG-u-nu-latn", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Africa/Cairo",
  }).format(date);
}

function severityLabel(value: AdminNotification["severity"]) {
  if (value === "error") return "خطير";
  if (value === "warning") return "تحذير";
  return "معلومة";
}

function typeLabel(value: AdminNotification["type"]) {
  const labels: Record<AdminNotification["type"], string> = {
    orders: "الطلبات",
    invitations: "الدعوات",
    backup: "Backup",
    "github-sync": "GitHub Sync",
    storage: "التخزين",
    errors: "الأخطاء",
  };
  return labels[value];
}

function isActive(notification: AdminNotification) {
  return !notification.hiddenAt && !notification.completedAt;
}

function getDateGroup(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const weekAgo = new Date(today);
  weekAgo.setDate(weekAgo.getDate() - 7);

  if (date >= today) return "اليوم";
  if (date >= yesterday) return "أمس";
  if (date >= weekAgo) return "هذا الأسبوع";
  return "سابقاً";
}

function playCriticalSound() {
  try {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = 880;
    osc.type = "square";
    gain.gain.value = 0.15;
    osc.start();
    osc.stop(ctx.currentTime + 0.3);
  } catch {
  }
}

type FilterKey = "active" | "all" | "completed" | "unread" | "read";

const FILTER_OPTIONS: { key: FilterKey; label: string }[] = [
  { key: "active", label: "النشطة" },
  { key: "unread", label: "غير مقروء" },
  { key: "all", label: "الكل" },
  { key: "read", label: "مقروء" },
  { key: "completed", label: "المكتملة" },
];

export function AdminNotificationCenter({ initialSummary }: Props) {
  const [summary, setSummary] = useState(initialSummary);
  const [filter, setFilter] = useState<FilterKey>("active");
  const [workingId, setWorkingId] = useState<string>("");
  const [error, setError] = useState("");
  const [toastMessage, setToastMessage] = useState<{ text: string; severity: string } | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevCountRef = useRef(initialSummary.activeCount);
  const pollTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  const filteredNotifications = useMemo(() => {
    if (filter === "completed") return summary.notifications.filter((notification) => notification.completedAt);
    if (filter === "active") return summary.notifications.filter(isActive);
    if (filter === "unread") return summary.notifications.filter((notification) => !notification.readAt && !notification.completedAt && !notification.hiddenAt);
    if (filter === "read") return summary.notifications.filter((notification) => notification.readAt && !notification.completedAt && !notification.hiddenAt);
    return summary.notifications;
  }, [filter, summary.notifications]);

  const groupedNotifications = useMemo(() => {
    const groups = new Map<string, AdminNotification[]>();
    for (const notification of filteredNotifications) {
      const group = getDateGroup(notification.updatedAt);
      const current = groups.get(group) || [];
      current.push(notification);
      groups.set(group, current);
    }
    const order = ["اليوم", "أمس", "هذا الأسبوع", "سابقاً"];
    return Array.from(groups.entries()).sort((a, b) => order.indexOf(a[0]) - order.indexOf(b[0]));
  }, [filteredNotifications]);

  async function runAction(action: AdminNotificationAction, id?: string) {
    setWorkingId(id || action);
    setError("");
    const response = await fetch("/api/admin/notification-center", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, id }),
    }).catch(() => null);
    if (!response?.ok) {
      setError("تعذر تحديث حالة التنبيه. حاول مرة أخرى.");
      setWorkingId("");
      return;
    }
    const nextSummary = (await response.json()) as AdminNotificationSummary;
    setSummary(nextSummary);
    window.dispatchEvent(new Event("admin-notifications-refresh"));
    setWorkingId("");
  }

  const showToast = useCallback((text: string, severity: string) => {
    setToastMessage({ text, severity });
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToastMessage(null), 5000);
  }, []);

  useEffect(() => {
    pollTimer.current = setInterval(async () => {
      try {
        const res = await fetch("/api/admin/notification-center?summary=1");
        if (!res.ok) return;
        const next = (await res.json()) as AdminNotificationSummary;
        if (next.activeCount > prevCountRef.current) {
          showToast("تنبيه جديد وارد", "info");
          const newCritical = next.notifications.some((n) => n.severity === "error" && isActive(n) && !summary.notifications.some((o) => o.id === n.id));
          if (newCritical) playCriticalSound();
        }
        if (JSON.stringify(summary) !== JSON.stringify(next)) {
          setSummary(next);
        }
        prevCountRef.current = next.activeCount;
      } catch {
      }
    }, 15000);
    return () => {
      if (pollTimer.current) clearInterval(pollTimer.current);
    };
  }, [summary, showToast]);

  function dismissToast() {
    setToastMessage(null);
    if (toastTimer.current) clearTimeout(toastTimer.current);
  }

  return (
    <section className="notification-center-shell" aria-label="مركز التنبيهات">
      {toastMessage ? (
        <div className={`notification-toast ${toastMessage.severity}`} role="alert">
          <Bell size={18} />
          <span>{toastMessage.text}</span>
          <button className="notification-toast-close" type="button" onClick={dismissToast} aria-label="إغلاق">
            <Check size={16} />
          </button>
        </div>
      ) : null}

      <div className="notification-center-toolbar">
        <div className="notification-center-tabs" role="tablist" aria-label="فلترة التنبيهات">
          {FILTER_OPTIONS.map((opt) => (
            <button
              key={opt.key}
              className={filter === opt.key ? "active" : ""}
              type="button"
              onClick={() => setFilter(opt.key)}
            >
              {opt.label}
            </button>
          ))}
        </div>
        <button className="btn btn-soft" type="button" onClick={() => runAction("read-all")} disabled={workingId === "read-all" || summary.unreadCount === 0}>
          {workingId === "read-all" ? <Loader2 size={16} className="spin-icon" /> : <Eye size={16} />}
          تحديد الكل كمقروء
        </button>
      </div>

      {error ? (
        <div className="admin-alert-item">
          <AlertTriangle size={18} />
          {error}
        </div>
      ) : null}

      <div className="notification-center-list">
        {groupedNotifications.map(([group, notifications]) => (
          <div className="notification-date-group" key={group}>
            <div className="notification-group-header">
              <span>{group}</span>
              <small>{formatArabicNumber(notifications.length)}</small>
            </div>
            {notifications.map((notification) => {
              const pending = workingId === notification.id;
              const unread = !notification.readAt && !notification.completedAt && !notification.hiddenAt;
              return (
                <article className={`notification-card ${notification.severity} ${unread ? "unread" : ""}`} key={notification.id}>
                  <div className="notification-card-icon">
                    {notification.severity === "error" ? <ShieldAlert size={20} /> : notification.severity === "warning" ? <AlertTriangle size={20} /> : <Inbox size={20} />}
                  </div>
                  <div className="notification-card-body">
                    <div className="notification-card-head">
                      <div>
                        <span className="notification-card-kicker">{typeLabel(notification.type)} · {severityLabel(notification.severity)}</span>
                        <h2>{notification.title}</h2>
                      </div>
                      <time>{formatDateTime(notification.updatedAt)}</time>
                    </div>
                    <p>{notification.message}</p>
                    <div className="notification-card-meta">
                      {unread ? <span className="status warning">غير مقروء</span> : <span className="status">مقروء</span>}
                      {notification.completedAt ? <span className="status success">مكتمل</span> : null}
                      {notification.hiddenAt ? <span className="status">مخفي</span> : null}
                    </div>
                    <div className="notification-card-actions">
                      {notification.href ? <Link className="btn btn-soft" href={notification.href}>فتح المصدر</Link> : null}
                      {!notification.readAt ? (
                        <button className="btn btn-soft" type="button" onClick={() => runAction("read", notification.id)} disabled={pending}>
                          {pending ? <Loader2 size={16} className="spin-icon" /> : <Eye size={16} />}
                          قراءة
                        </button>
                      ) : null}
                      {!notification.completedAt ? (
                        <button className="btn btn-soft" type="button" onClick={() => runAction("complete", notification.id)} disabled={pending}>
                          {pending ? <Loader2 size={16} className="spin-icon" /> : <CheckCircle2 size={16} />}
                          مكتمل
                        </button>
                      ) : null}
                      {!notification.hiddenAt ? (
                        <button className="btn btn-soft" type="button" onClick={() => runAction("hide", notification.id)} disabled={pending}>
                          {pending ? <Loader2 size={16} className="spin-icon" /> : <EyeOff size={16} />}
                          إخفاء
                        </button>
                      ) : null}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        ))}
      </div>

      {!filteredNotifications.length ? (
        <div className="admin-empty-state notification-empty-state">
          <CheckCircle2 size={26} />
          <strong>لا توجد تنبيهات في هذا القسم</strong>
          <p>سيظهر هنا أي طلب جديد أو مشكلة تشغيلية تحتاج متابعة من الأدمن.</p>
        </div>
      ) : null}

      <div className="notification-center-refresh">
        <button className="btn btn-soft" type="button" onClick={() => window.location.reload()}>
          <RotateCcw size={16} />
          تحديث التنبيهات
        </button>
        <span>
          {summary.unreadCount > 0 ? (
            <>غير المقروءة: {formatArabicNumber(summary.unreadCount)}</>
          ) : (
            <>قرئت الكل</>
          )}
        </span>
      </div>
    </section>
  );
}
