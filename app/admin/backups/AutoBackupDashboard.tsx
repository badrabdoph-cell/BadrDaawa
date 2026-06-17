"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Activity,
  CalendarClock,
  Clock,
  ShieldCheck,
  Timer,
  TriangleAlert,
} from "lucide-react";

type ScheduledJob = {
  createdAt: string;
  status: string;
  fileName: string | null;
};

type Props = {
  lastScheduledAt: string | null;
  lastScheduledSuccessAt: string | null;
  nextScheduledAt: string | null;
  recentScheduled: ScheduledJob[];
};

function formatArabicDate(iso: string) {
  const d = new Date(iso);
  return new Intl.DateTimeFormat("ar-EG-u-nu-latn", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Africa/Cairo",
  }).format(d);
}

function formatRelative(ms: number): string {
  const abs = Math.abs(ms);
  const totalMinutes = Math.floor(abs / 60000);
  if (totalMinutes < 1) return "أقل من دقيقة";
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours === 0) return `منذ ${minutes} دقيقة`;
  if (hours < 24) {
    return hours === 1
      ? `منذ ساعة و${minutes} دقيقة`
      : `منذ ${hours} ساعة و${minutes} دقيقة`;
  }
  const days = Math.floor(hours / 24);
  return `منذ ${days} يوم`;
}

function formatUntil(ms: number): string {
  if (ms <= 0) return "الآن";
  const totalMinutes = Math.floor(ms / 60000);
  if (totalMinutes < 1) return "بعد أقل من دقيقة";
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours === 0) return `بعد ${minutes} دقيقة`;
  if (hours < 24) {
    return hours === 1
      ? `بعد ساعة و${minutes} دقيقة`
      : `بعد ${hours} ساعة و${minutes} دقيقة`;
  }
  const days = Math.floor(hours / 24);
  return `بعد ${days} يوم`;
}

function countdownStr(ms: number): string {
  if (ms <= 0) return "00:00:00";
  const totalSeconds = Math.floor(ms / 1000);
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function getStatusInfo(
  lastSuccessAt: string | null,
): { level: "ok" | "warning" | "error"; label: string } {
  if (!lastSuccessAt) return { level: "error", label: "لا توجد نسخة تلقائية بعد" };
  const elapsed = Date.now() - new Date(lastSuccessAt).getTime();
  const hours = elapsed / 3_600_000;
  if (hours < 4) return { level: "ok", label: "يعمل بشكل طبيعي" };
  if (hours < 8) return { level: "warning", label: "متأخر عن الموعد" };
  return { level: "error", label: "متوقف أو يوجد خلل" };
}

function needsCronAlert(lastSuccessAt: string | null): boolean {
  if (!lastSuccessAt) return true;
  const elapsed = Date.now() - new Date(lastSuccessAt).getTime();
  return elapsed > 3.5 * 3_600_000;
}

function formatAlertDuration(ms: number): string {
  const totalHours = Math.floor(ms / 3_600_000);
  const totalMinutes = Math.floor((ms % 3_600_000) / 60000);
  return `${totalHours} ساعة و${totalMinutes} دقيقة`;
}

export default function AutoBackupDashboard({
  lastScheduledAt,
  lastScheduledSuccessAt,
  nextScheduledAt,
  recentScheduled,
}: Props) {
  const [now, setNow] = useState(Date.now());

  const tick = useCallback(() => setNow(Date.now()), []);

  useEffect(() => {
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [tick]);

  const status = getStatusInfo(lastScheduledSuccessAt);
  const showAlert = needsCronAlert(lastScheduledSuccessAt);
  const nextMs = nextScheduledAt
    ? new Date(nextScheduledAt).getTime() - now
    : 0;
  const lastMs = lastScheduledSuccessAt
    ? now - new Date(lastScheduledSuccessAt).getTime()
    : 0;

  return (
    <>
      {showAlert ? (
        <div className="notice danger">
          <TriangleAlert size={18} />
          <div>
            {lastScheduledSuccessAt ? (
              <>
                <strong>
                  النسخ التلقائي لم يعمل منذ أكثر من{" "}
                  {formatAlertDuration(now - new Date(lastScheduledSuccessAt).getTime())}
                </strong>
                <br />
                آخر نسخة ناجحة: {formatArabicDate(lastScheduledSuccessAt)}
              </>
            ) : lastScheduledAt ? (
              <strong>
                لا توجد نسخة تلقائية ناجحة — آخر نسخة تلقائية:{" "}
                {formatArabicDate(lastScheduledAt)}
              </strong>
            ) : (
              <strong>لم يتم إنشاء أي نسخة تلقائية بعد</strong>
            )}
            <br />
            تحقق من:
            <ul style={{ margin: "4px 0 0", paddingInlineStart: 20 }}>
              <li>Railway Cron</li>
              <li>BACKUP_CRON_SECRET</li>
              <li>/api/cron/backup</li>
            </ul>
          </div>
        </div>
      ) : null}

      <div className="panel" style={{ marginBottom: 18 }}>
        <div className="admin-card-head">
          <Activity size={20} />
          <div>
            <span className="eyebrow">Automatic Backup</span>
            <h2>النسخ التلقائي</h2>
          </div>
        </div>

        <div className="auto-backup-grid">
          <div className={`auto-backup-card auto-backup-card--${status.level}`}>
            <ShieldCheck size={22} />
            <span className="auto-backup-card-label">حالة النسخ التلقائي</span>
            <strong className="auto-backup-card-value">{status.label}</strong>
            <span className="auto-backup-card-meta">
              {lastScheduledSuccessAt
                ? `آخر نسخة: ${formatArabicDate(lastScheduledSuccessAt)}`
                : "لا توجد نسخ تلقائية بعد"}
            </span>
          </div>

          <div className="auto-backup-card">
            <Clock size={22} />
            <span className="auto-backup-card-label">آخر نسخة تلقائية</span>
            <strong className="auto-backup-card-value">
              {lastScheduledSuccessAt
                ? formatArabicDate(lastScheduledSuccessAt)
                : "لا توجد"}
            </strong>
            {lastScheduledSuccessAt ? (
              <span className="auto-backup-card-meta">
                {formatRelative(lastMs)}
              </span>
            ) : null}
          </div>

          <div className="auto-backup-card">
            <CalendarClock size={22} />
            <span className="auto-backup-card-label">النسخة القادمة</span>
            <strong className="auto-backup-card-value">
              {nextScheduledAt && nextMs > 0
                ? formatArabicDate(nextScheduledAt)
                : "غير مجدول"}
            </strong>
            {nextScheduledAt && nextMs > 0 ? (
              <span className="auto-backup-card-meta">
                {formatUntil(nextMs)}
              </span>
            ) : null}
          </div>

          <div className="auto-backup-card auto-backup-card--countdown">
            <Timer size={22} />
            <span className="auto-backup-card-label">
              الوقت المتبقي للنسخة القادمة
            </span>
            <strong className="auto-backup-card-countdown">
              {nextScheduledAt && nextMs > 0
                ? countdownStr(nextMs)
                : "--:--:--"}
            </strong>
          </div>
        </div>

        {recentScheduled.length > 0 ? (
          <div className="backup-scheduled-log">
            <div className="backup-scheduled-log-header">
              <h4>آخر {recentScheduled.length} نسخ تلقائية</h4>
            </div>
            <table className="backup-scheduled-table">
              <thead>
                <tr>
                  <th>التاريخ</th>
                  <th>النوع</th>
                  <th>الحالة</th>
                </tr>
              </thead>
              <tbody>
                {recentScheduled.map((job, i) => (
                  <tr key={job.createdAt + String(i)}>
                    <td>{formatArabicDate(job.createdAt)}</td>
                    <td>Scheduled</td>
                    <td>
                      <span
                        className={`status ${job.status === "SUCCESS" ? "success" : job.status === "FAILED" ? "danger" : "info"}`}
                      >
                        {job.status === "SUCCESS"
                          ? "Success"
                          : job.status === "FAILED"
                            ? "Failed"
                            : job.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </div>
    </>
  );
}
