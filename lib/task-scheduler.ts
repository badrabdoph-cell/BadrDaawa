import { randomUUID } from "node:crypto";
import { unstable_noStore as noStore } from "next/cache";
import { createBackupSnapshot } from "./backups";
import { prisma } from "./db";
import { getMediaCleanupReport } from "./media-cleanup";
import { getSystemHealthSnapshot } from "./system-health";

export type ScheduledTaskId = "backup" | "media-cleanup" | "data-health";
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

type TaskExecutionResult = {
  message: string;
  metadata?: Record<string, string | number | boolean | null>;
};

const sixHoursMs = 6 * 60 * 60 * 1000;
const runningTasks = new Set<ScheduledTaskId>();

const taskDefinitions: ScheduledTaskDefinition[] = [
  {
    id: "backup",
    title: "PostgreSQL Backup",
    description: "ينفذ Railway Cron نسخة Runtime Data كل 6 ساعات عبر /api/cron/backup مع رفع ملف النسخة إلى GitHub والتحقق منه.",
    category: "Railway Cron",
    intervalMs: sixHoursMs,
    defaultAutomaticEnabled: false,
  },
  {
    id: "media-cleanup",
    title: "فحص التخزين",
    description: "فحص يدوي فقط للوسائط والنسخ القديمة بدون جدولة داخلية.",
    category: "Manual",
    intervalMs: 0,
    defaultAutomaticEnabled: false,
  },
  {
    id: "data-health",
    title: "فحص سلامة البيانات",
    description: "فحص يدوي فقط لحالة PostgreSQL والتخزين والنسخ الاحتياطية.",
    category: "Manual",
    intervalMs: 0,
    defaultAutomaticEnabled: false,
  },
];

const definitionById = new Map(taskDefinitions.map((task) => [task.id, task]));

function toErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error || "Unknown error");
}

function assertTaskId(value: string): ScheduledTaskId {
  if (definitionById.has(value as ScheduledTaskId)) return value as ScheduledTaskId;
  throw new Error("Unknown scheduled task");
}

async function runBackupTask(): Promise<TaskExecutionResult> {
  const backup = await createBackupSnapshot("scheduled");
  return {
    message: `تم إنشاء Backup: ${backup.fileName}`,
    metadata: {
      fileName: backup.fileName,
      sizeBytes: backup.sizeBytes,
      items: backup.items,
      source: backup.source,
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
  return runDataHealthTask();
}

function backupJobToRun(job: {
  id: string;
  type: string;
  status: string;
  startedAt: Date | null;
  finishedAt: Date | null;
  createdAt: Date;
  fileName: string | null;
  sizeBytes: bigint | null;
  githubSha: string | null;
  error: string | null;
}): ScheduledTaskRun {
  const startedAt = job.startedAt || job.createdAt;
  const finishedAt = job.finishedAt || job.createdAt;
  return {
    id: job.id,
    taskId: "backup",
    trigger: job.type === "manual" ? "manual" : "automatic",
    status: job.status === "SUCCESS" ? "success" : "failed",
    startedAt: startedAt.toISOString(),
    finishedAt: finishedAt.toISOString(),
    durationMs: Math.max(0, finishedAt.getTime() - startedAt.getTime()),
    message: job.status === "SUCCESS" ? `Backup created: ${job.fileName || "unknown"}` : job.error || "Backup failed",
    metadata: {
      fileName: job.fileName,
      sizeBytes: job.sizeBytes ? Number(job.sizeBytes) : null,
    },
  };
}

export function getScheduledTaskDefinitions() {
  return taskDefinitions;
}

export async function getTaskExecutionLog(limit = 50) {
  noStore();
  if (!prisma) return [];
  const jobs = await prisma.backupJob.findMany({
    where: { status: { in: ["SUCCESS", "FAILED"] } },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
  return jobs.map(backupJobToRun);
}

export async function listScheduledTasks() {
  noStore();
  const runs = await getTaskExecutionLog(80);
  return taskDefinitions.map((definition): ScheduledTaskView => {
    const taskRuns = runs.filter((run) => run.taskId === definition.id).slice(0, 8);
    const lastRun = taskRuns[0];
    const nextRunAt =
      definition.id === "backup" && lastRun
        ? new Date(Date.parse(lastRun.finishedAt) + sixHoursMs).toISOString()
        : definition.id === "backup"
          ? "Managed by Railway Cron"
          : undefined;
    return {
      ...definition,
      automaticEnabled: false,
      intervalMs: definition.intervalMs,
      nextRunAt,
      lastRun,
      status: runningTasks.has(definition.id) ? "running" : lastRun?.status || "idle",
      updatedAt: lastRun?.finishedAt,
      isDue: false,
      runs: taskRuns,
    };
  });
}

export async function runScheduledTask(taskIdInput: string, trigger: ScheduledTaskTrigger = "manual") {
  const taskId = assertTaskId(taskIdInput);
  if (runningTasks.has(taskId)) throw new Error("Task is already running");

  runningTasks.add(taskId);
  const startedAt = new Date();
  try {
    const result = await executeTask(taskId);
    const finishedAt = new Date();
    return {
      id: `task-run-${randomUUID()}`,
      taskId,
      trigger,
      status: "success" as const,
      startedAt: startedAt.toISOString(),
      finishedAt: finishedAt.toISOString(),
      durationMs: finishedAt.getTime() - startedAt.getTime(),
      message: result.message,
      metadata: result.metadata,
    };
  } catch (error) {
    const finishedAt = new Date();
    return {
      id: `task-run-${randomUUID()}`,
      taskId,
      trigger,
      status: "failed" as const,
      startedAt: startedAt.toISOString(),
      finishedAt: finishedAt.toISOString(),
      durationMs: finishedAt.getTime() - startedAt.getTime(),
      message: toErrorMessage(error),
    };
  } finally {
    runningTasks.delete(taskId);
  }
}
