import { Activity, CalendarClock, CheckCircle2, Clock3, DatabaseBackup, History, Play, ShieldCheck, ToggleLeft, ToggleRight, TriangleAlert } from "lucide-react";
import { getTaskExecutionLog, listScheduledTasks, startInternalTaskScheduler, type ScheduledTaskRun, type ScheduledTaskStatus, type ScheduledTaskView } from "@/lib/task-scheduler";
import { formatArabicNumber } from "@/lib/utils";

export const dynamic = "force-dynamic";

type TasksPageParams = {
  task?: string;
  result?: "success" | "failed";
  automatic?: "enabled" | "disabled";
  error?: string;
};

const statusLabel: Record<ScheduledTaskStatus, string> = {
  idle: "لم تعمل بعد",
  running: "قيد التشغيل",
  success: "نجحت",
  failed: "فشلت",
};

function formatDateTime(value?: string) {
  if (!value) return "لم يتم التشغيل";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("ar-EG-u-nu-latn", {
    dateStyle: "medium",
    timeStyle: "short",
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

function taskById(tasks: ScheduledTaskView[], id?: string) {
  return tasks.find((task) => task.id === id);
}

function StatusPill({ status }: { status?: ScheduledTaskStatus | ScheduledTaskRun["status"] }) {
  const cleanStatus = status || "idle";
  const className = cleanStatus === "success" ? "good" : cleanStatus === "failed" ? "danger" : cleanStatus === "running" ? "pending" : "";
  return <span className={`admin-health-pill ${className}`}>{statusLabel[cleanStatus as ScheduledTaskStatus] || cleanStatus}</span>;
}

function TaskCard({ task }: { task: ScheduledTaskView }) {
  const lastRun = task.lastRun;
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
          التالي: {task.automaticEnabled ? formatDateTime(task.nextRunAt) : "متوقف"}
        </span>
        <span>
          <History size={16} />
          آخر تشغيل: {formatDateTime(lastRun?.finishedAt)}
        </span>
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
        <form action="/api/admin/tasks" method="post">
          <input name="action" type="hidden" value="toggle" />
          <input name="taskId" type="hidden" value={task.id} />
          <input name="enabled" type="hidden" value={task.automaticEnabled ? "0" : "1"} />
          <button className="btn btn-soft" type="submit">
            {task.automaticEnabled ? <ToggleRight size={18} /> : <ToggleLeft size={18} />}
            {task.automaticEnabled ? "إيقاف التلقائي" : "تفعيل التلقائي"}
          </button>
        </form>
      </div>
    </article>
  );
}

function RunRow({ run, tasks }: { run: ScheduledTaskRun; tasks: ScheduledTaskView[] }) {
  const task = taskById(tasks, run.taskId);
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

export default async function AdminTasksPage({ searchParams }: { searchParams: Promise<TasksPageParams> }) {
  startInternalTaskScheduler();
  const [params, tasks, runs] = await Promise.all([searchParams, listScheduledTasks({ runDue: true }), getTaskExecutionLog(80)]);
  const selectedTask = taskById(tasks, params.task);
  const automaticEnabled = tasks.filter((task) => task.automaticEnabled).length;
  const successfulRuns = runs.filter((run) => run.status === "success").length;
  const failedRuns = runs.filter((run) => run.status === "failed").length;
  const latestRun = runs[0];

  return (
    <>
      <div className="dashboard-head">
        <div>
          <span className="eyebrow">Task Scheduler</span>
          <h1>المهام المجدولة</h1>
          <p>مركز داخلي لتشغيل مهام الصيانة يدوياً أو تلقائياً، مع سجل واضح لكل نتيجة تنفيذ.</p>
        </div>
      </div>

      {params.result ? (
        <div className={params.result === "success" ? "notice success" : "notice danger"}>
          {params.result === "success" ? <CheckCircle2 size={18} /> : <TriangleAlert size={18} />}
          {selectedTask ? `نتيجة تشغيل ${selectedTask.title}: ${params.result === "success" ? "نجحت" : "فشلت"}.` : "تم تنفيذ المهمة."}
        </div>
      ) : null}
      {params.automatic ? (
        <div className="notice success">
          <ShieldCheck size={18} />
          {selectedTask ? `${selectedTask.title}: ` : ""}تم {params.automatic === "enabled" ? "تفعيل" : "إيقاف"} التشغيل التلقائي.
        </div>
      ) : null}
      {params.error ? (
        <div className="notice danger">
          <TriangleAlert size={18} />
          تعذر تنفيذ الإجراء: {decodeURIComponent(params.error)}
        </div>
      ) : null}

      <section className="task-stats-grid">
        <article className="admin-list-stat">
          <Activity size={19} />
          <span>عدد المهام</span>
          <strong>{formatArabicNumber(tasks.length)}</strong>
        </article>
        <article className="admin-list-stat good">
          <CalendarClock size={19} />
          <span>تلقائي مفعل</span>
          <strong>{formatArabicNumber(automaticEnabled)}</strong>
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
          <strong>{latestRun ? formatDateTime(latestRun.finishedAt) : "لا يوجد"}</strong>
        </article>
      </section>

      <section className="tasks-grid">
        {tasks.map((task) => (
          <TaskCard task={task} key={task.id} />
        ))}
      </section>

      <section className="panel task-log-panel">
        <div className="admin-card-head">
          <History size={22} />
          <div>
            <span className="eyebrow">Execution Log</span>
            <h2>سجل التنفيذ</h2>
          </div>
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
                      <p>شغّل أي مهمة يدوياً أو فعّل التشغيل التلقائي وسيظهر السجل هنا.</p>
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
