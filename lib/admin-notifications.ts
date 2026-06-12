import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { unstable_noStore as noStore } from "next/cache";
import { readAppSettingOrSeed, writeAppSetting } from "./app-settings";
import { getAdminInvitations, getAdminOrders } from "./admin-data";
import { listBackupSnapshots } from "./backups";
import { prisma } from "./db";
import { getErrorEvents } from "./error-tracking";
import { getSyncHistory } from "./github-sync";
import { getInvitationCompleteness } from "./invitation-completeness";
import { listUploadFiles } from "./storage-provider";

export type AdminNotificationType = "orders" | "invitations" | "backup" | "github-sync" | "storage" | "errors";
export type AdminNotificationSeverity = "info" | "warning" | "error";
export type AdminNotificationAction = "read" | "hide" | "complete" | "read-all";

export type AdminNotification = {
  id: string;
  signature: string;
  type: AdminNotificationType;
  severity: AdminNotificationSeverity;
  title: string;
  message: string;
  href?: string;
  createdAt: string;
  updatedAt: string;
  readAt?: string;
  hiddenAt?: string;
  completedAt?: string;
  meta?: Record<string, string | number | boolean | null | undefined>;
};

export type AdminNotificationSummary = {
  notifications: AdminNotification[];
  unreadCount: number;
  activeCount: number;
  hiddenCount: number;
  completedCount: number;
};

type NotificationStore = {
  notifications: AdminNotification[];
};

const storePath = path.join(process.cwd(), "data", "admin-notifications.json");
const storeKey = "admin-notifications";
const recentErrorWindowMs = 24 * 60 * 60 * 1000;
const defaultStorageLimitBytes = 1024 * 1024 * 1024;

function toErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error || "Unknown error");
}

function hashSignature(signature: string) {
  return createHash("sha256").update(signature).digest("hex").slice(0, 16);
}

function notificationId(signature: string) {
  return `admin-note-${hashSignature(signature)}`;
}

function makeNotification(input: Omit<AdminNotification, "id" | "createdAt" | "updatedAt">): AdminNotification {
  const now = new Date().toISOString();
  return {
    ...input,
    id: notificationId(input.signature),
    createdAt: now,
    updatedAt: now,
  };
}

function parseStorageLimit() {
  const raw = Number(process.env.STORAGE_WARNING_BYTES || process.env.ADMIN_STORAGE_WARNING_BYTES || defaultStorageLimitBytes);
  return Number.isFinite(raw) && raw > 0 ? raw : defaultStorageLimitBytes;
}

async function readStore(): Promise<NotificationStore> {
  noStore();
  return readAppSettingOrSeed(storeKey, async () => {
    try {
    const raw = await readFile(storePath, "utf8");
    const parsed = JSON.parse(raw) as Partial<NotificationStore>;
    return { notifications: Array.isArray(parsed.notifications) ? parsed.notifications : [] };
    } catch {
    return { notifications: [] };
    }
  });
}

async function writeStore(store: NotificationStore) {
  await writeAppSetting(storeKey, store);
}

function mergeNotifications(current: AdminNotification[], previous: AdminNotification[]) {
  const previousBySignature = new Map(previous.map((item) => [item.signature, item]));
  const currentSignatures = new Set(current.map((item) => item.signature));
  const merged = current.map((item) => {
    const old = previousBySignature.get(item.signature);
    if (!old) return item;
    return {
      ...item,
      id: old.id || item.id,
      createdAt: old.createdAt || item.createdAt,
      readAt: old.readAt,
      hiddenAt: old.hiddenAt,
      completedAt: old.completedAt,
    };
  });

  const archived = previous.filter((item) => !currentSignatures.has(item.signature) && (item.hiddenAt || item.completedAt)).slice(0, 150);
  return [...merged, ...archived];
}

function notificationWeight(item: AdminNotification) {
  const severity = item.severity === "error" ? 0 : item.severity === "warning" ? 1 : 2;
  const state = item.completedAt || item.hiddenAt ? 2 : item.readAt ? 1 : 0;
  return severity * 10 + state;
}

function summarize(notifications: AdminNotification[], includeHidden = false): AdminNotificationSummary {
  const visible = includeHidden ? notifications : notifications.filter((item) => !item.hiddenAt);
  const sorted = [...visible].sort((a, b) => notificationWeight(a) - notificationWeight(b) || new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  return {
    notifications: sorted,
    unreadCount: notifications.filter((item) => !item.hiddenAt && !item.completedAt && !item.readAt).length,
    activeCount: notifications.filter((item) => !item.hiddenAt && !item.completedAt).length,
    hiddenCount: notifications.filter((item) => Boolean(item.hiddenAt)).length,
    completedCount: notifications.filter((item) => Boolean(item.completedAt)).length,
  };
}

async function orderNotifications(): Promise<AdminNotification[]> {
  const orders = await getAdminOrders();
  const actionable = orders.filter((order) => !["published", "converted", "rejected"].includes(order.status));
  if (!actionable.length) return [];
  const latest = actionable[0];
  return [
    makeNotification({
      signature: `orders:actionable:${actionable.length}:${latest.id}:${latest.status}`,
      type: "orders",
      severity: "info",
      title: "وصل طلب جديد أو طلب يحتاج مراجعة",
      message: `يوجد ${actionable.length} طلب دعوة بانتظار المتابعة داخل لوحة الطلبات.`,
      href: "/admin/orders",
      meta: { count: actionable.length, latestOrderId: latest.id, latestStatus: latest.status },
    }),
  ];
}

async function invitationNotifications(): Promise<AdminNotification[]> {
  const invitations = await getAdminInvitations();
  const incomplete = invitations
    .map((invitation) => ({ invitation, completeness: getInvitationCompleteness(invitation) }))
    .filter((entry) => !entry.completeness.isComplete);
  if (!incomplete.length) return [];

  const mostIncomplete = [...incomplete].sort((a, b) => a.completeness.percentage - b.completeness.percentage)[0];
  const sample = incomplete.slice(0, 3).map((entry) => entry.invitation.code).join(", ");
  return [
    makeNotification({
      signature: `invitations:incomplete:${incomplete.length}:${incomplete.map((entry) => entry.invitation.code).sort().join("|")}`,
      type: "invitations",
      severity: "warning",
      title: "دعوات غير مكتملة",
      message: `يوجد ${incomplete.length} دعوة تحتاج مراجعة. أقل نسبة جاهزية: ${mostIncomplete.completeness.percentage}% (${mostIncomplete.invitation.code}).`,
      href: "/admin/invitations?filter=incomplete",
      meta: { count: incomplete.length, lowestCode: mostIncomplete.invitation.code, lowestPercentage: mostIncomplete.completeness.percentage, sample },
    }),
  ];
}

async function backupNotifications(): Promise<AdminNotification[]> {
  try {
    if (prisma) {
      const [failed, success] = await Promise.all([
        prisma.backupJob.findFirst({ where: { status: "FAILED" }, orderBy: { createdAt: "desc" } }),
        prisma.backupJob.findFirst({ where: { status: "SUCCESS" }, orderBy: { createdAt: "desc" } }),
      ]);
      if (failed && (!success || failed.createdAt > success.createdAt)) {
        return [
          makeNotification({
            signature: `backup:job-failed:${failed.id}`,
            type: "backup",
            severity: "error",
            title: "فشل Backup",
            message: failed.error || "آخر عملية Backup مسجلة فشلت وتحتاج مراجعة.",
            href: "/admin/backups",
            meta: { backupJobId: failed.id, type: failed.type },
          }),
        ];
      }
    }

    const backups = await listBackupSnapshots();
    if (backups.length) return [];
    return [
      makeNotification({
        signature: "backup:none",
        type: "backup",
        severity: "warning",
        title: "لا توجد نسخة Backup",
        message: "لم يتم العثور على أي نسخة احتياطية محفوظة حتى الآن.",
        href: "/admin/backups",
      }),
    ];
  } catch (error) {
    return [
      makeNotification({
        signature: `backup:failed:${hashSignature(toErrorMessage(error))}`,
        type: "backup",
        severity: "error",
        title: "فشل فحص Backup",
        message: `تعذر قراءة حالة النسخ الاحتياطي: ${toErrorMessage(error)}`,
        href: "/admin/backups",
      }),
    ];
  }
}

async function githubNotifications(): Promise<AdminNotification[]> {
  const history = await getSyncHistory({ limit: 1 });
  const latest = history.logs[0];
  if (latest?.status !== "failed") return [];
  return [
    makeNotification({
      signature: `github-sync:failed:${latest.id}:${latest.updatedAt?.toISOString?.() || latest.createdAt?.toISOString?.() || latest.timestamp?.toISOString?.() || ""}`,
      type: "github-sync",
      severity: "error",
      title: "فشل GitHub Sync",
      message: latest.errorMessage || latest.reason || "آخر عملية مزامنة مع GitHub فشلت وتحتاج مراجعة.",
      href: "/admin/sync-history?status=failed",
      meta: { syncId: latest.id, reason: latest.reason, retryCount: latest.retryCount },
    }),
  ];
}

async function storageNotifications(): Promise<AdminNotification[]> {
  try {
    const files = await listUploadFiles();
    const totalSize = files.reduce((sum, file) => sum + file.size, 0);
    const limit = parseStorageLimit();
    const ratio = totalSize / limit;
    if (ratio < 0.8) return [];
    return [
      makeNotification({
        signature: `storage:${ratio >= 1 ? "full" : "near-full"}:${Math.floor(totalSize / (10 * 1024 * 1024))}`,
        type: "storage",
        severity: ratio >= 1 ? "error" : "warning",
        title: ratio >= 1 ? "مساحة التخزين ممتلئة" : "مساحة التخزين قاربت الامتلاء",
        message: `حجم ملفات الرفع الحالي ${Math.round(totalSize / (1024 * 1024))}MB من حد التنبيه ${Math.round(limit / (1024 * 1024))}MB.`,
        href: "/admin/media",
        meta: { filesCount: files.length, totalSize, limit, percentage: Math.round(ratio * 100) },
      }),
    ];
  } catch (error) {
    return [
      makeNotification({
        signature: `storage:error:${hashSignature(toErrorMessage(error))}`,
        type: "storage",
        severity: "error",
        title: "تعذر فحص التخزين",
        message: `حدث خطأ أثناء قراءة ملفات الرفع: ${toErrorMessage(error)}`,
        href: "/admin/system-health",
      }),
    ];
  }
}

async function errorNotifications(): Promise<AdminNotification[]> {
  const events = await getErrorEvents();
  const cutoff = Date.now() - recentErrorWindowMs;
  const recent = events.filter((event) => {
    const created = new Date(event.createdAt).getTime();
    return Number.isFinite(created) && created >= cutoff;
  });
  if (!recent.length) return [];
  const latest = recent[0];
  return [
    makeNotification({
      signature: `errors:recent:${recent.length}:${latest.id}`,
      type: "errors",
      severity: "error",
      title: "أخطاء تشغيلية جديدة",
      message: `تم تسجيل ${recent.length} خطأ خلال آخر 24 ساعة. آخر خطأ: ${latest.message}`,
      href: "/admin/errors",
      meta: { count: recent.length, latestErrorId: latest.id, latestRoute: latest.route },
    }),
  ];
}

export async function getAdminNotifications(options: { includeHidden?: boolean } = {}) {
  noStore();
  const previous = await readStore();
  const results = await Promise.allSettled([
    orderNotifications(),
    invitationNotifications(),
    backupNotifications(),
    githubNotifications(),
    storageNotifications(),
    errorNotifications(),
  ]);

  const generated = results.flatMap((result, index) => {
    if (result.status === "fulfilled") return result.value;
    const types: AdminNotificationType[] = ["orders", "invitations", "backup", "github-sync", "storage", "errors"];
    return [
      makeNotification({
        signature: `notification-source:${types[index]}:${hashSignature(toErrorMessage(result.reason))}`,
        type: types[index],
        severity: "error",
        title: "تعذر إنشاء تنبيه داخلي",
        message: `فشل فحص مصدر التنبيه: ${toErrorMessage(result.reason)}`,
        href: "/admin/system-health",
      }),
    ];
  });

  const merged = mergeNotifications(generated, previous.notifications);
  await writeStore({ notifications: merged });
  return summarize(merged, options.includeHidden);
}

export async function getAdminNotificationSnapshot(options: { includeHidden?: boolean } = {}) {
  noStore();
  const current = await readStore();
  return summarize(current.notifications, options.includeHidden);
}

export async function updateAdminNotificationState(action: AdminNotificationAction, id?: string) {
  const current = await getAdminNotifications({ includeHidden: true });
  const now = new Date().toISOString();
  const notifications = current.notifications.map((item) => {
    if (action === "read-all" && !item.hiddenAt && !item.completedAt) return { ...item, readAt: item.readAt || now };
    if (!id || item.id !== id) return item;
    if (action === "read") return { ...item, readAt: item.readAt || now };
    if (action === "hide") return { ...item, readAt: item.readAt || now, hiddenAt: now };
    if (action === "complete") return { ...item, readAt: item.readAt || now, completedAt: now };
    return item;
  });
  await writeStore({ notifications });
  return summarize(notifications);
}
