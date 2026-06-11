import { randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { unstable_noStore as noStore } from "next/cache";
import { createBackupSnapshot } from "./backups";
import { syncAdminStateToGitHub } from "./github-sync";
import { getSystemHealthSnapshot } from "./system-health";
import { getMediaCleanupReport } from "./media-cleanup";
import { ensureRuntimeDirectories, runtimeDataDir } from "./runtime-paths";

export type ScheduledTaskId = "backup" | "media-cleanup" | "logs-cleanup" | "data-health";
export type ScheduledTaskStatus = "idle" | "running" | "success" | "failed";
export type ScheduledTaskTrigger = "manual" | "automatic";

export type ScheduledTaskDefinition = {
  id: ScheduledTaskId;
  title: string;
  description: string;
  category: string;
  intervalMs: number;
  defaultAutomaticEnabled: boolean;
};

export type ScheduledTaskRun = {
  id: string;
  taskId: ScheduledTaskId;
  trigger: ScheduledTaskTrigger;
  status: Exclude<ScheduledTaskStatus, "idle" | "running">;
  startedAt: string;
  finishedAt: string;
  durationMs: number;
  message: string;
  metadata?: Record<string, string | number | boolean | null>;
};

export type ScheduledTaskState = {
  id: ScheduledTaskId;
  automaticEnabled: boolean;
  intervalMs: number;
  nextRunAt?: string;
  lastRun?: ScheduledTaskRun;
  status?: ScheduledTaskStatus;
  updatedAt?: string;
};

export type ScheduledTaskView = ScheduledTaskDefinition &
  ScheduledTaskState & {
    isDue: boolean;
    runs: ScheduledTaskRun[];
  };

type SchedulerStore = {
  version: 1;
  updatedAt: string;
  tasks: Record<string, ScheduledTaskState>;
  runs: ScheduledTaskRun[];
};

type TaskExecutionResult = {
  message: string;
  metadata?: Record<string, string | number | boolean | null>;
};

const storePath = path.join(runtimeDataDir, "task-scheduler.json");
const maxRuns = 250;
const schedulerIntervalMs = 15 * 60 * 1000;
const runningTasks = new Set<ScheduledTaskId>();
let writeChain = Promise.resolve();

const taskDefinitions: ScheduledTaskDefinition[] = [
  {
    id: "backup",
    title: "إنشاء Backup",
    description: "إنشاء نسخة احتياطية حقيقية من PostgreSQL ورفعها إلى GitHub.",
    category: "الحماية",
    intervalMs: 6 * 60 * 60 * 1000,
    defaultAutomaticEnabled: true,
  },
  {
    id: "media-cleanup",
    title: "فحص صيانة التخزين",
    description: "فحص الوسائط والنسخ الاحتياطية واكتشاف الملفات اليتيمة والمكررة بدون حذف تلقائي.",
    category: "التخزين",
    intervalMs: 7 * 24 * 60 * 60 * 1000,
    defaultAutomaticEnabled: false,
  },
  {
    id: "logs-cleanup",
    title: "تنظيف السجلات القديمة",
    description: "تقليل حجم سجلات التدقيق والأخطاء والتنبيهات مع الحفاظ على آخر الأحداث المهمة.",
    category: "الصيانة",
    intervalMs: 7 * 24 * 60 * 60 * 1000,
    defaultAutomaticEnabled: true,
  },
  {
    id: "data-health",
    title: "فحص سلامة البيانات",
    description: "فحص قاعدة البيانات والتخزين والنسخ الاحتياطية والمزامنة والتنبيهات التشغيلية.",
    category: "المراقبة",
    intervalMs: 6 * 60 * 60 * 1000,
    defaultAutomaticEnabled: true,
  },
];

const definitionById = new Map(taskDefinitions.map((task) => [task.id, task]));
const allowedBackupIntervalsHours = [1, 3, 6, 12, 24, 48] as const;

const globalScheduler = globalThis as typeof globalThis & {
  __badrDaawaTaskSchedulerTimer?: NodeJS.Timeout;
};

function nowIso() {
  return new Date().toISOString();
}

function toErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error || "Unknown error");
}

function nextRunFrom(intervalMs: number, base = Date.now()) {
  return new Date(base + intervalMs).toISOString();
}

function initialTaskState(task: ScheduledTaskDefinition): ScheduledTaskState {
  return {
    id: task.id,
    automaticEnabled: task.defaultAutomaticEnabled,
    intervalMs: task.intervalMs,
    nextRunAt: task.defaultAutomaticEnabled ? nextRunFrom(task.intervalMs) : undefined,
    status: "idle",
    updatedAt: nowIso(),
  };
}

function normalizeIntervalMs(definition: ScheduledTaskDefinition, value: unknown) {
  if (definition.id !== "backup") return definition.intervalMs;
  const hours = Math.round(Number(value) / (60 * 60 * 1000));
  return allowedBackupIntervalsHours.includes(hours as (typeof allowedBackupIntervalsHours)[number]) ? hours * 60 * 60 * 1000 : definition.intervalMs;
}

async function readJsonFile(filePath: string) {
  try {
    return JSON.parse(await readFile(filePath, "utf8")) as unknown;
  } catch {
    return null;
  }
}

async function writeJsonFile(filePath: string, value: unknown) {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function normalizeStore(input: unknown): SchedulerStore {
  const raw = input && typeof input === "object" ? (input as Partial<SchedulerStore>) : {};
  const tasks: Record<string, ScheduledTaskState> = {};

  for (const definition of taskDefinitions) {
    const saved = raw.tasks?.[definition.id];
    tasks[definition.id] = {
      ...initialTaskState(definition),
      ...(saved && typeof saved === "object" ? saved : {}),
      id: definition.id,
      intervalMs: normalizeIntervalMs(definition, saved?.intervalMs),
    };
  }

  const runs = Array.isArray(raw.runs) ? raw.runs.filter(isRun).slice(0, maxRuns) : [];
  for (const task of Object.values(tasks)) {
    const latest = runs.find((run) => run.taskId === task.id);
    if (!task.lastRun && latest) task.lastRun = latest;
    if (task.status === "running" && !runningTasks.has(task.id)) task.status = task.lastRun?.status || "idle";
  }

  return {
    version: 1,
    updatedAt: typeof raw.updatedAt === "string" ? raw.updatedAt : nowIso(),
    tasks,
    runs,
  };
}

function isRun(value: unknown): value is ScheduledTaskRun {
  if (!value || typeof value !== "object") return false;
  const run = value as Partial<ScheduledTaskRun>;
  return Boolean(run.id && run.taskId && run.status && run.startedAt && run.finishedAt && run.message);
}

async function readStore() {
  noStore();
  ensureRuntimeDirectories();
  return normalizeStore(await readJsonFile(storePath));
}

async function writeStore(store: SchedulerStore) {
  store.updatedAt = nowIso();
  await writeJsonFile(storePath, {
    ...store,
    runs: store.runs.slice(0, maxRuns),
  });
}

async function updateStore(mutator: (store: SchedulerStore) => void | Promise<void>) {
  let output: SchedulerStore | undefined;
  writeChain = writeChain
    .catch(() => undefined)
    .then(async () => {
      const store = await readStore();
      await mutator(store);
      await writeStore(store);
      output = store;
    });
  await writeChain;
  return output || readStore();
}

function isDue(task: ScheduledTaskState) {
  return Boolean(task.automaticEnabled && task.nextRunAt && Date.parse(task.nextRunAt) <= Date.now());
}

async function runBackupTask(): Promise<TaskExecutionResult> {
  const backup = await createBackupSnapshot("scheduled");
  const sync = await syncAdminStateToGitHub(`Scheduled backup upload: ${backup.fileName}`);
  return {
    message: `تم إنشاء Backup: ${backup.fileName} (${sync.status})`,
    metadata: {
      fileName: backup.fileName,
      sizeBytes: backup.sizeBytes,
      items: backup.items,
      source: backup.source,
      githubStatus: sync.status,
      githubCommitSha: sync.commitSha || null,
    },
  };
}

async function runMediaCleanupTask(): Promise<TaskExecutionResult> {
  const report = await getMediaCleanupReport();
  return {
    message: report.recoverableSizeBytes
      ? `الفحص اكتشف ${report.orphanFiles.length} ملف يتيم و ${report.duplicateFiles.length} ملف مكرر.`
      : "فحص التخزين لم يجد عناصر تحتاج تنظيف.",
    metadata: {
      totalFiles: report.totalFiles,
      orphanFiles: report.orphanFiles.length,
      duplicateFiles: report.duplicateFiles.length,
      unusedMusicFiles: report.unusedMusicFiles.length,
      oldBackupFiles: report.oldBackupFiles.length,
      recoverableSizeBytes: report.recoverableSizeBytes,
    },
  };
}

function cutoffDate(days: number) {
  return Date.now() - days * 24 * 60 * 60 * 1000;
}

function createdAtOf(value: unknown) {
  if (!value || typeof value !== "object") return 0;
  const createdAt = (value as { createdAt?: unknown }).createdAt;
  const time = Date.parse(String(createdAt || ""));
  return Number.isFinite(time) ? time : 0;
}

async function trimArrayFile(fileName: string, maxItems: number, maxAgeDays: number) {
  const filePath = path.join(runtimeDataDir, fileName);
  const parsed = await readJsonFile(filePath);
  if (!Array.isArray(parsed)) return { before: 0, after: 0 };

  const cutoff = cutoffDate(maxAgeDays);
  const kept = parsed.filter((item, index) => index < maxItems || createdAtOf(item) >= cutoff);
  await writeJsonFile(filePath, kept);
  return { before: parsed.length, after: kept.length };
}

async function trimObjectArrayFile(fileName: string, key: string, maxItems: number, maxAgeDays: number) {
  const filePath = path.join(runtimeDataDir, fileName);
  const parsed = await readJsonFile(filePath);
  if (!parsed || typeof parsed !== "object" || !Array.isArray((parsed as Record<string, unknown>)[key])) return { before: 0, after: 0 };

  const store = parsed as Record<string, unknown>;
  const items = store[key] as unknown[];
  const cutoff = cutoffDate(maxAgeDays);
  store[key] = items.filter((item, index) => index < maxItems || createdAtOf(item) >= cutoff);
  await writeJsonFile(filePath, store);
  return { before: items.length, after: (store[key] as unknown[]).length };
}

async function runLogsCleanupTask(): Promise<TaskExecutionResult> {
  const [audit, errors, notifications] = await Promise.all([
    trimArrayFile("audit-log.json", 1200, 90),
    trimObjectArrayFile("error-events.json", "events", 800, 60),
    trimObjectArrayFile("admin-notifications.json", "notifications", 250, 60),
  ]);

  const removed = audit.before - audit.after + (errors.before - errors.after) + (notifications.before - notifications.after);
  return {
    message: removed ? `تم حذف ${removed} سجل قديم.` : "لا توجد سجلات قديمة تحتاج تنظيف.",
    metadata: {
      removed,
      auditBefore: audit.before,
      auditAfter: audit.after,
      errorsBefore: errors.before,
      errorsAfter: errors.after,
      notificationsBefore: notifications.before,
      notificationsAfter: notifications.after,
    },
  };
}

async function runDataHealthTask(): Promise<TaskExecutionResult> {
  const snapshot = await getSystemHealthSnapshot();
  const errors = snapshot.checks.filter((check) => check.level === "error").length;
  const warnings = snapshot.checks.filter((check) => check.level === "warning").length;
  return {
    message: errors ? `فحص الصحة اكتشف ${errors} خطأ و ${warnings} تحذير.` : warnings ? `فحص الصحة اكتشف ${warnings} تحذير.` : "فحص الصحة سليم.",
    metadata: {
      errors,
      warnings,
      filesCount: snapshot.metrics.filesCount,
      invitationsCount: snapshot.metrics.invitationsCount,
      ordersCount: snapshot.metrics.ordersCount,
    },
  };
}

async function executeTask(taskId: ScheduledTaskId): Promise<TaskExecutionResult> {
  if (taskId === "backup") return runBackupTask();
  if (taskId === "media-cleanup") return runMediaCleanupTask();
  if (taskId === "logs-cleanup") return runLogsCleanupTask();
  return runDataHealthTask();
}

function assertTaskId(value: string): ScheduledTaskId {
  if (definitionById.has(value as ScheduledTaskId)) return value as ScheduledTaskId;
  throw new Error("Unknown scheduled task");
}

export function getScheduledTaskDefinitions() {
  return taskDefinitions;
}

export async function listScheduledTasks(options: { runDue?: boolean } = {}) {
  if (options.runDue) await runDueScheduledTasks();
  const store = await readStore();
  return taskDefinitions.map((definition): ScheduledTaskView => {
    const state = store.tasks[definition.id] || initialTaskState(definition);
    return {
      ...definition,
      ...state,
      isDue: isDue(state),
      runs: store.runs.filter((run) => run.taskId === definition.id).slice(0, 8),
    };
  });
}

export async function getTaskExecutionLog(limit = 50) {
  const store = await readStore();
  return store.runs.slice(0, limit);
}

export async function setScheduledTaskAutomatic(taskIdInput: string, enabled: boolean) {
  const taskId = assertTaskId(taskIdInput);
  const definition = definitionById.get(taskId)!;
  await updateStore((store) => {
    const task = store.tasks[taskId] || initialTaskState(definition);
    task.automaticEnabled = enabled;
    task.nextRunAt = enabled ? task.nextRunAt || nextRunFrom(task.intervalMs) : undefined;
    task.status = task.status === "running" ? task.status : task.lastRun?.status || "idle";
    task.updatedAt = nowIso();
    store.tasks[taskId] = task;
  });
}

export async function setScheduledTaskInterval(taskIdInput: string, intervalHoursInput: number) {
  const taskId = assertTaskId(taskIdInput);
  if (taskId !== "backup") throw new Error("Only backup interval can be changed");
  if (!allowedBackupIntervalsHours.includes(intervalHoursInput as (typeof allowedBackupIntervalsHours)[number])) {
    throw new Error("Invalid backup interval");
  }
  const definition = definitionById.get(taskId)!;
  const intervalMs = intervalHoursInput * 60 * 60 * 1000;
  await updateStore((store) => {
    const task = store.tasks[taskId] || initialTaskState(definition);
    task.intervalMs = intervalMs;
    task.nextRunAt = task.automaticEnabled ? nextRunFrom(intervalMs) : undefined;
    task.status = task.status === "running" ? task.status : task.lastRun?.status || "idle";
    task.updatedAt = nowIso();
    store.tasks[taskId] = task;
  });
}

export async function runScheduledTask(taskIdInput: string, trigger: ScheduledTaskTrigger = "manual") {
  const taskId = assertTaskId(taskIdInput);
  const definition = definitionById.get(taskId)!;

  if (runningTasks.has(taskId)) {
    throw new Error("Task is already running");
  }

  runningTasks.add(taskId);
  const startedAt = new Date();
  await updateStore((store) => {
    const task = store.tasks[taskId] || initialTaskState(definition);
    task.status = "running";
    task.updatedAt = nowIso();
    store.tasks[taskId] = task;
  });

  let run: ScheduledTaskRun;
  try {
    const result = await executeTask(taskId);
    const finishedAt = new Date();
    run = {
      id: `task-run-${randomUUID()}`,
      taskId,
      trigger,
      status: "success",
      startedAt: startedAt.toISOString(),
      finishedAt: finishedAt.toISOString(),
      durationMs: finishedAt.getTime() - startedAt.getTime(),
      message: result.message,
      metadata: result.metadata,
    };
  } catch (error) {
    const finishedAt = new Date();
    run = {
      id: `task-run-${randomUUID()}`,
      taskId,
      trigger,
      status: "failed",
      startedAt: startedAt.toISOString(),
      finishedAt: finishedAt.toISOString(),
      durationMs: finishedAt.getTime() - startedAt.getTime(),
      message: toErrorMessage(error),
    };
  }

  await updateStore((store) => {
    const task = store.tasks[taskId] || initialTaskState(definition);
    task.status = run.status;
    task.lastRun = run;
    task.nextRunAt = task.automaticEnabled ? nextRunFrom(task.intervalMs) : undefined;
    task.updatedAt = nowIso();
    store.tasks[taskId] = task;
    store.runs = [run, ...store.runs].slice(0, maxRuns);
  });

  runningTasks.delete(taskId);
  return run;
}

export async function runDueScheduledTasks() {
  const store = await readStore();
  const dueTasks = taskDefinitions
    .map((definition) => store.tasks[definition.id] || initialTaskState(definition))
    .filter((task) => isDue(task) && !runningTasks.has(task.id));

  const runs: ScheduledTaskRun[] = [];
  for (const task of dueTasks) {
    runs.push(await runScheduledTask(task.id, "automatic"));
  }
  return runs;
}

export function startInternalTaskScheduler() {
  if (globalScheduler.__badrDaawaTaskSchedulerTimer) return;
  runDueScheduledTasks().catch((error) => console.error("[Task Scheduler] Initial automatic run failed", error));
  const timer = setInterval(() => {
    runDueScheduledTasks().catch((error) => console.error("[Task Scheduler] Automatic run failed", error));
  }, schedulerIntervalMs);
  timer.unref?.();
  globalScheduler.__badrDaawaTaskSchedulerTimer = timer;
}
