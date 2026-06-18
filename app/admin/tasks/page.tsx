"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Activity, CalendarClock, CheckCircle2, Clock3, DatabaseBackup, History, Loader2, Play, RefreshCw, TriangleAlert, XCircle } from "lucide-react";
import type { ScheduledTaskRun, ScheduledTaskStatus, ScheduledTaskView } from "@/lib/task-scheduler";
import { formatArabicNumber } from "@/lib/utils";

const statusLabel: Record<string, string> = {
  idle: "لم تعمل بعد",
  running: "قيد التشغيل",
  success: "نجحت",
  failed: "فشلت",
  completed: "مكتمل",
};

const statusFilters = [
  { value: "", label: "الكل" },
  { value: "running", label: "قيد التشغيل" },
  { value: "success", label: "ناجحة" },
  { value: "failed", label: "فاشلة" },
  { value: "idle", label: "لم تعمل" },
];

function formatDateTime(value?: string) {
  if (!value) return "لم يتم التشغيل";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("ar-EG-u-nu-latn", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Africa/Cairo",
  }).format(date);
}

function formatInterval(value: number) {
  const hours = Math.round(value / (60 * 60 * 1000));
  if (hours < 24) return `كل ${formatArabicNumber(hours)} ساعات`;
  const days = Math.round(hours / 24);
  return days === 1 ? "يومياً" : `كل ${formatArabicNumber(days)} أيام`;
}

function formatDuration(value: number) {
  if (value < 1000) return `${formatArabicNumber(value)}ms`;
  if (value < 60_000) return `${formatArabicNumber(Number((value / 1000).toFixed(1)))}s`;
  return `${formatArabicNumber(Number((value / 60_000).toFixed(1)))}m`;
}

function StatusPill({ status }: { status?: string }) {
  const cleanStatus = status || "idle";
  const className = cleanStatus === "success" || cleanStatus === "completed" ? "good" : cleanStatus === "failed" ? "danger" : cleanStatus === "running" ? "pending" : "";
  return <span className={`admin-health-pill ${className}`}>{statusLabel[cleanStatus] || cleanStatus}</span>;
}

function TaskCard({ task, onRetry }: { task: ScheduledTaskView; onRetry: (id: string) => void }) {
  const lastRun = task.lastRun;
  const failed = task.status === "failed";

  return (
    <article className={`panel task-card task-card--${task.status || "idle"}`}>
      <div className="task-card-head">
        <div>
          <span className="eyebrow">{task.category}</span>
          <h2>{task.title}</h2>
        </div>
        <StatusPill status={task.status} />
      </div>

      <p>{task.description}</p>

      <div className="task-meta-grid">
        <span>
          <Clock3 size={16} />
          {formatInterval(task.intervalMs)}
        </span>
        <span>
          <CalendarClock size={16} />
          التالي: {task.id === "backup" ? "Railway Cron" : "يدوي فقط"}
        </span>
        <span>
          <History size={16} />
          آخر تشغيل: {formatDateTime(lastRun?.finishedAt)}
        </span>
        {lastRun ? (
          <span>
            <Activity size={16} />
            المدة: {formatDuration(lastRun.durationMs)}
          </span>
        ) : null}
      </div>

      {lastRun ? (
        <div className={`task-last-result ${lastRun.status}`}>
          {lastRun.status === "success" ? <CheckCircle2 size={17} /> : <TriangleAlert size={17} />}
          <span>{lastRun.message}</span>
        </div>
      ) : null}

      <div className="task-actions">
        <form action="/api/admin/tasks" method="post">
          <input name="action" type="hidden" value="run" />
          <input name="taskId" type="hidden" value={task.id} />
          <button className="btn btn-gold" type="submit" disabled={task.status === "running"}>
            <Play size={17} />
            تشغيل الآن
          </button>
        </form>
        {failed ? (
          <button className="btn btn-soft" type="button" onClick={() => onRetry(task.id)}>
            <RefreshCw size={17} />
            إعادة المحاولة
          </button>
        ) : null}
      </div>
    </article>
  );
}

function RunRow({ run, tasks }: { run: ScheduledTaskRun; tasks: ScheduledTaskView[] }) {
  const task = tasks.find((t) => t.id === run.taskId);
  return (
    <tr>
      <td>{task?.title || run.taskId}</td>
      <td>{run.trigger === "automatic" ? "تلقائي" : "يدوي"}</td>
      <td><StatusPill status={run.status} /></td>
      <td>{formatDateTime(run.finishedAt)}</td>
      <td>{formatDuration(run.durationMs)}</td>
      <td className="admin-long-link">{run.message}</td>
    </tr>
  );
}

export default function AdminTasksPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const statusFilter = searchParams.get("status") || "";

  const [tasks, setTasks] = useState<ScheduledTaskView[]>([]);
  const [runs, setRuns] = useState<ScheduledTaskRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [clearing, setClearing] = useState(false);

  const fetchData = useCallback(async (showLoader = false) => {
    if (showLoader) setLoading(true);
    else setRefreshing(true);
    try {
      const res = await fetch("/api/admin/tasks/data");
      if (res.ok) {
        const data = await res.json();
        setTasks(data.tasks || []);
        setRuns(data.runs || []);
      }
    } catch {
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData(true);
    const interval = setInterval(() => fetchData(false), 10000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const handleRetry = (taskId: string) => {
    const form = document.createElement("form");
    form.method = "post";
    form.action = "/api/admin/tasks";
    const actionInput = document.createElement("input");
    actionInput.type = "hidden";
    actionInput.name = "action";
    actionInput.value = "run";
    form.appendChild(actionInput);
    const idInput = document.createElement("input");
    idInput.type = "hidden";
    idInput.name = "taskId";
    idInput.value = taskId;
    form.appendChild(idInput);
    document.body.appendChild(form);
    form.submit();
  };

  const handleClearCompleted = async () => {
    setClearing(true);
    try {
      const res = await fetch("/api/admin/tasks/data", { method: "DELETE" });
      if (res.ok) await fetchData(false);
    } catch {
    } finally {
      setClearing(false);
    }
  };

  const setFilter = (value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set("status", value);
    else params.delete("status");
    router.push(`/admin/tasks?${params.toString()}`);
  };

  const filteredTasks = statusFilter ? tasks.filter((t) => t.status === statusFilter) : tasks;
  const successfulRuns = runs.filter((run) => run.status === "success").length;
  const failedRuns = runs.filter((run) => run.status === "failed").length;
  const latestRun = runs[0];

  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "300px", gap: "12px", opacity: 0.6 }}>
        <Loader2 size={24} className="spin" />
        جاري تحميل المهام...
      </div>
    );
  }

  return (
    <>
      <div className="dashboard-head">
        <div>
          <span className="eyebrow">Task Scheduler</span>
          <h1>المهام المجدولة</h1>
          <p>تشغيل يدوي للمهام وسجل Backup. التشغيل التلقائي للنسخ الاحتياطي يتم من Railway Cron فقط.</p>
        </div>
        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          {refreshing ? <Loader2 size={16} className="spin" /> : null}
          <button className="btn btn-soft" type="button" onClick={() => fetchData(false)} disabled={refreshing}>
            <RefreshCw size={16} />
            تحديث
          </button>
        </div>
      </div>

      <section className="task-stats-grid">
        <article className="admin-list-stat">
          <Activity size={19} />
          <span>عدد المهام</span>
          <strong>{formatArabicNumber(tasks.length)}</strong>
        </article>
        <article className="admin-list-stat good">
          <CalendarClock size={19} />
          <span>التشغيل التلقائي</span>
          <strong>Railway Cron</strong>
        </article>
        <article className="admin-list-stat good">
          <CheckCircle2 size={19} />
          <span>تشغيل ناجح</span>
          <strong>{formatArabicNumber(successfulRuns)}</strong>
        </article>
        <article className="admin-list-stat danger">
          <TriangleAlert size={19} />
          <span>تشغيل فاشل</span>
          <strong>{formatArabicNumber(failedRuns)}</strong>
        </article>
        <article className="admin-list-stat">
          <DatabaseBackup size={19} />
          <span>آخر تنفيذ</span>
          <strong style={{ fontSize: "0.95rem" }}>{latestRun ? formatDateTime(latestRun.finishedAt) : "لا يوجد"}</strong>
        </article>
      </section>

      <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", alignItems: "center" }}>
        {statusFilters.map((f) => (
          <button
            key={f.value}
            className={`btn btn-soft ${statusFilter === f.value ? "btn-gold" : ""}`}
            type="button"
            onClick={() => setFilter(f.value)}
            style={{ minHeight: "36px", padding: "6px 14px", fontSize: "0.85rem" }}
          >
            {f.label}
          </button>
        ))}
      </div>

      <section className="tasks-grid">
        {filteredTasks.map((task) => (
          <TaskCard task={task} key={task.id} onRetry={handleRetry} />
        ))}
        {filteredTasks.length === 0 ? (
          <div className="panel" style={{ textAlign: "center", padding: "32px" }}>
            <p style={{ opacity: 0.5 }}>لا توجد مهام بهذه الحالة</p>
          </div>
        ) : null}
      </section>

      <section className="panel task-log-panel">
        <div className="admin-card-head">
          <History size={22} />
          <div>
            <span className="eyebrow">Execution Log</span>
            <h2>سجل التنفيذ</h2>
          </div>
          <button
            className="btn btn-soft"
            type="button"
            onClick={handleClearCompleted}
            disabled={clearing || runs.length === 0}
            style={{ minHeight: "36px", padding: "6px 14px", fontSize: "0.85rem" }}
          >
            {clearing ? <Loader2 size={15} className="spin" /> : <XCircle size={15} />}
            مسح المكتملة
          </button>
        </div>

        <div className="table-shell">
          <table className="data-table task-log-table">
            <thead>
              <tr>
                <th>المهمة</th>
                <th>نوع التشغيل</th>
                <th>الحالة</th>
                <th>الوقت</th>
                <th>المدة</th>
                <th>آخر نتيجة</th>
              </tr>
            </thead>
            <tbody>
              {runs.length ? (
                runs.map((run) => <RunRow run={run} tasks={tasks} key={run.id} />)
              ) : (
                <tr>
                  <td colSpan={6}>
                    <div className="admin-empty-state compact">
                      <strong>لا يوجد سجل تنفيذ بعد</strong>
                      <p>شغّل Backup يدوياً أو انتظر Railway Cron وسيظهر السجل هنا.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
