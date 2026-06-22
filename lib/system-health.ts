import { unstable_noStore as noStore } from "next/cache";
import { getAdminInvitations, getAdminOrders } from "./admin-data";
import { listBackupSnapshots, getScheduledBackupInfo } from "./backups";
import { prisma } from "./db";
import { getGitHubSyncReadiness, getSyncHistory } from "./github-sync";
import { getSyncQueueStatus } from "./github-sync-queue";
import { getPushSubscriptionCount } from "./push-notifications";
import { getUploadStorageProvider, listUploadFiles } from "./storage-provider";

export type SystemHealthLevel = "ok" | "warning" | "error";

export type SystemHealthCheck = {
  key: string;
  label: string;
  level: SystemHealthLevel;
  status: string;
  detail: string;
  error?: string;
};

export type SystemHealthSnapshot = {
  checks: SystemHealthCheck[];
  metrics: {
    filesCount: number;
    filesSizeBytes: number;
    invitationsCount: number;
    ordersCount: number;
    latestBackup?: {
      fileName: string;
      createdAt: string;
      sizeBytes: number;
      source: string;
    };
    pushSubscriptionsCount: number;
  };
};

function toErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error || "Unknown error");
}

function formatProviderLabel(value: string) {
  if (value === "railway-volume") return "Railway Volumes";
  if (value === "s3") return "AWS S3";
  if (value === "r2") return "Cloudflare R2";
  return "Local Storage";
}

async function checkDatabase(): Promise<SystemHealthCheck> {
  if (!prisma) {
    return {
      key: "database",
      label: "قاعدة البيانات",
      level: "warning",
      status: "غير مفعلة",
      detail: "DATABASE_URL غير مضبوط، وسيتم استخدام تخزين الملفات الاحتياطي عند الحاجة.",
    };
  }

  try {
    await prisma.$queryRaw`SELECT 1`;
    return {
      key: "database",
      label: "قاعدة البيانات",
      level: "ok",
      status: "متصلة",
      detail: "تم تنفيذ فحص اتصال سريع بنجاح.",
    };
  } catch (error) {
    return {
      key: "database",
      label: "قاعدة البيانات",
      level: "error",
      status: "خطأ اتصال",
      detail: "تعذر تنفيذ استعلام الفحص.",
      error: toErrorMessage(error),
    };
  }
}

async function checkStorage() {
  const provider = getUploadStorageProvider();
  try {
    const files = await listUploadFiles();
    return {
      check: {
        key: "storage",
        label: "التخزين",
        level: "ok" as const,
        status: "يعمل",
        detail: `${formatProviderLabel(provider.kind)} جاهز، وتمت قراءة قائمة الملفات.`,
      },
      files,
    };
  } catch (error) {
    return {
      check: {
        key: "storage",
        label: "التخزين",
        level: "error" as const,
        status: "متعطل",
        detail: `${formatProviderLabel(provider.kind)} غير قابل للقراءة حالياً.`,
        error: toErrorMessage(error),
      },
      files: [],
    };
  }
}

async function checkGitHubSync(): Promise<SystemHealthCheck> {
  const readiness = getGitHubSyncReadiness();
  const queue = getSyncQueueStatus();
  const history = await getSyncHistory({ limit: 1 });
  const latest = history.logs[0];

  if (!readiness.configured) {
    return {
      key: "github-sync",
      label: "GitHub Sync",
      level: "warning",
      status: readiness.label,
      detail: readiness.detail,
    };
  }

  if (queue.isSyncing || queue.queueLength > 0) {
    return {
      key: "github-sync",
      label: "GitHub Sync",
      level: "warning",
      status: "قيد المعالجة",
      detail: `جاهز: ${readiness.detail}. في الطابور ${queue.queueLength} عملية.`,
    };
  }

  if (latest?.status === "failed") {
    return {
      key: "github-sync",
      label: "GitHub Sync",
      level: "error",
      status: "آخر مزامنة فشلت",
      detail: latest.reason,
      error: latest.errorMessage || "راجع سجل المزامنة لمعرفة التفاصيل.",
    };
  }

  return {
    key: "github-sync",
    label: "GitHub Sync",
    level: "ok",
    status: latest ? "جاهز" : "جاهز بدون سجل",
    detail: latest ? `آخر عملية: ${latest.status} - ${latest.reason}` : readiness.detail,
  };
}

async function checkBackups() {
  try {
    const backups = await listBackupSnapshots();
    const latest = backups[0];
    return {
      check: {
        key: "backup",
        label: "آخر Backup",
        level: latest ? ("ok" as const) : ("warning" as const),
        status: latest ? "موجود" : "لا توجد نسخة",
        detail: latest ? `${latest.fileName}` : "لم يتم إنشاء أي نسخة احتياطية بعد.",
      },
      latest,
    };
  } catch (error) {
    return {
      check: {
        key: "backup",
        label: "آخر Backup",
        level: "error" as const,
        status: "تعذر القراءة",
        detail: "فشل فحص مجلد النسخ الاحتياطي.",
        error: toErrorMessage(error),
      },
      latest: undefined,
    };
  }
}

async function checkPushNotifications() {
  const hasPublicKey = Boolean(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY);
  const hasPrivateKey = Boolean(process.env.VAPID_PRIVATE_KEY);

  try {
    const count = await getPushSubscriptionCount();
    const missing = [!hasPublicKey ? "NEXT_PUBLIC_VAPID_PUBLIC_KEY" : "", !hasPrivateKey ? "VAPID_PRIVATE_KEY" : ""].filter(Boolean);
    return {
      check: {
        key: "push-notifications",
        label: "Push Notifications",
        level: missing.length ? ("warning" as const) : ("ok" as const),
        status: missing.length ? "إعدادات ناقصة" : "جاهزة",
        detail: missing.length ? `ناقص: ${missing.join(" / ")}. الاشتراكات الحالية: ${count}.` : `الاشتراكات الحالية: ${count}.`,
      },
      count,
    };
  } catch (error) {
    return {
      check: {
        key: "push-notifications",
        label: "Push Notifications",
        level: "error" as const,
        status: "متعطلة",
        detail: "تعذر قراءة حالة الاشتراكات.",
        error: toErrorMessage(error),
      },
      count: 0,
    };
  }
}

async function checkPublishSystem(): Promise<SystemHealthCheck> {
  if (!prisma) {
    return { key: "publish", label: "النشر", level: "warning", status: "غير متاح", detail: "قاعدة البيانات غير متصلة" };
  }
  try {
    const latestVersion = await prisma.contentVersion.findFirst({ orderBy: { version: "desc" } });
    const versionCount = await prisma.contentVersion.count();
    if (versionCount === 0) {
      return { key: "publish", label: "النشر", level: "warning", status: "لا توجد إصدارات", detail: "لم يتم نشر أي محتوى بعد" };
    }
    return {
      key: "publish",
      label: "النشر",
      level: "ok",
      status: `${versionCount} إصدار`,
      detail: `آخر إصدار: #${latestVersion!.version} في ${latestVersion!.publishedAt.toLocaleString("ar-EG")}`,
    };
  } catch (error) {
    return { key: "publish", label: "النشر", level: "error", status: "خطأ", detail: "فشل التحقق", error: toErrorMessage(error) };
  }
}

async function checkAutoRestoreReadiness(): Promise<SystemHealthCheck> {
  return { key: "auto-restore", label: "Auto Restore", level: "ok", status: "يدوي", detail: "الاستعادة يدوية من لوحة التحكم" };
}

async function checkBackupScheduler(): Promise<SystemHealthCheck> {
  const hasCronSecret = Boolean((process.env.BACKUP_CRON_SECRET || "").trim());
  try {
    const info = await getScheduledBackupInfo();
    const lastScheduled = info.lastScheduledSuccess || info.lastScheduled;
    if (!hasCronSecret && !lastScheduled) {
      return { key: "backup-scheduler", label: "جدولة النسخ", level: "warning", status: "غير مهيأ", detail: "BACKUP_CRON_SECRET غير مضبوط ولا توجد نسخ مجدولة سابقة" };
    }
    if (!hasCronSecret && lastScheduled) {
      return { key: "backup-scheduler", label: "جدولة النسخ", level: "warning", status: "BACKUP_CRON_SECRET غير مضبوط", detail: `آخر نسخة مجدولة: ${lastScheduled.createdAt}` };
    }
    if (hasCronSecret && lastScheduled) {
      return { key: "backup-scheduler", label: "جدولة النسخ", level: "ok", status: "يعمل", detail: `آخر نسخة مجدولة: ${lastScheduled.createdAt}` };
    }
    return { key: "backup-scheduler", label: "جدولة النسخ", level: "ok", status: "مهيأ", detail: "BACKUP_CRON_SECRET مضبوط، في انتظار أول تشغيل" };
  } catch {
    return { key: "backup-scheduler", label: "جدولة النسخ", level: "warning", status: "غير معروف", detail: "تعذر التحقق من جدولة النسخ" };
  }
}

export async function getSystemHealthSnapshot(): Promise<SystemHealthSnapshot> {
  noStore();

  const [database, storage, githubSync, backups, push, publish, autoRestore, scheduler, invitationsResult, ordersResult] = await Promise.all([
    checkDatabase(),
    checkStorage(),
    checkGitHubSync(),
    checkBackups(),
    checkPushNotifications(),
    checkPublishSystem(),
    checkAutoRestoreReadiness(),
    checkBackupScheduler(),
    getAdminInvitations()
      .then((items) => ({ count: items.length, error: "" }))
      .catch((error) => ({ count: 0, error: toErrorMessage(error) })),
    getAdminOrders()
      .then((items) => ({ count: items.length, error: "" }))
      .catch((error) => ({ count: 0, error: toErrorMessage(error) })),
  ]);

  const dataChecks: SystemHealthCheck[] = [];
  if (invitationsResult.error) {
    dataChecks.push({
      key: "invitations-count",
      label: "عدد الدعوات",
      level: "error",
      status: "تعذر العد",
      detail: "فشل تحميل الدعوات.",
      error: invitationsResult.error,
    });
  }
  if (ordersResult.error) {
    dataChecks.push({
      key: "orders-count",
      label: "عدد الطلبات",
      level: "error",
      status: "تعذر العد",
      detail: "فشل تحميل الطلبات.",
      error: ordersResult.error,
    });
  }

  return {
    checks: [database, githubSync, storage.check, backups.check, scheduler, push.check, publish, autoRestore, ...dataChecks],
    metrics: {
      filesCount: storage.files.length,
      filesSizeBytes: storage.files.reduce((sum, file) => sum + file.size, 0),
      invitationsCount: invitationsResult.count,
      ordersCount: ordersResult.count,
      latestBackup: backups.latest
        ? {
            fileName: backups.latest.fileName,
            createdAt: backups.latest.createdAt,
            sizeBytes: backups.latest.sizeBytes,
            source: backups.latest.source,
          }
        : undefined,
      pushSubscriptionsCount: push.count,
    },
  };
}
