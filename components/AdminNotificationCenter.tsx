"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, Eye, EyeOff, Inbox, Loader2, RotateCcw, ShieldAlert } from "lucide-react";
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

export function AdminNotificationCenter({ initialSummary }: Props) {
  const [summary, setSummary] = useState(initialSummary);
  const [filter, setFilter] = useState<"active" | "all" | "completed">("active");
  const [workingId, setWorkingId] = useState<string>("");
  const [error, setError] = useState("");

  const filteredNotifications = useMemo(() => {
    if (filter === "completed") return summary.notifications.filter((notification) => notification.completedAt);
    if (filter === "active") return summary.notifications.filter(isActive);
    return summary.notifications;
  }, [filter, summary.notifications]);

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

  return (
    <section className="notification-center-shell" aria-label="مركز التنبيهات">
      <div className="notification-center-toolbar">
        <div className="notification-center-tabs" role="tablist" aria-label="فلترة التنبيهات">
          <button className={filter === "active" ? "active" : ""} type="button" onClick={() => setFilter("active")}>
            النشطة
          </button>
          <button className={filter === "all" ? "active" : ""} type="button" onClick={() => setFilter("all")}>
            الكل
          </button>
          <button className={filter === "completed" ? "active" : ""} type="button" onClick={() => setFilter("completed")}>
            المكتملة
          </button>
        </div>
        <button className="btn btn-soft" type="button" onClick={() => runAction("read-all")} disabled={workingId === "read-all" || summary.unreadCount === 0}>
          {workingId === "read-all" ? <Loader2 size={16} className="spin-icon" /> : <Eye size={16} />}
          قراءة الكل
        </button>
      </div>

      {error ? (
        <div className="admin-alert-item">
          <AlertTriangle size={18} />
          {error}
        </div>
      ) : null}

      <div className="notification-center-list">
        {filteredNotifications.map((notification) => {
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
        <span>غير المقروءة: {formatArabicNumber(summary.unreadCount)}</span>
      </div>
    </section>
  );
}
