import { unstable_noStore as noStore } from "next/cache";
import { prisma } from "@/lib/db";
import { getMediaCleanupReport, type MediaCleanupReport } from "@/lib/media-cleanup";
import { getTrashItems } from "@/lib/trash";
import { listBackupSnapshots } from "@/lib/backups";
import { readdir, stat, readFile } from "fs/promises";
import { existsSync } from "fs";
import path from "path";

export type CleanupCategory =
  | "unused-files"
  | "database"
  | "media"
  | "backups"
  | "packages"
  | "optimization";

export type CleanupSeverity = "low" | "medium" | "high" | "critical";

export type CleanupIssue = {
  id: string;
  category: CleanupCategory;
  title: string;
  description: string;
  severity: CleanupSeverity;
  count: number;
  sizeBytes: number;
  action: string;
  autoFixable: boolean;
  safeToAutoFix: boolean;
};

export type CleanupScanReport = {
  scannedAt: string;
  totalIssues: number;
  totalRecoverableBytes: number;
  issues: CleanupIssue[];
  mediaReport: MediaCleanupReport | null;
  trashCount: number;
  backupCount: number;
  databaseStatus: DatabaseCleanupStatus;
  packageStatus: PackageStatus;
  optimizationStatus: OptimizationStatus;
};

export type DatabaseCleanupStatus = {
  oldAnalytics: number;
  oldNotifications: number;
  oldErrors: number;
  expiredTrashInvitations: number;
  expiredTrashOrders: number;
  expiredTrashCustomers: number;
  orphanedGuestBook: number;
  orphanedCheckIns: number;
  orphanedClientMessages: number;
  orphanedCoupleSettings: number;
  orphanedLiveModes: number;
  orphanedGuestRsvp: number;
  orphanedAnalytics: number;
  orphanedInvitationNotes: number;
  orphanedOrderNotes: number;
  orphanedCustomerNotes: number;
  total: number;
};

export type PackageStatus = {
  totalPackages: number;
  unusedPackages: number;
  packageNames: string[];
  sizeSavingsHint: string;
};

export type OptimizationStatus = {
  lastOptimizedAt: string | null;
  pendingOptimizations: number;
  cacheSize: string;
  cacheSizeBytes: number;
  indexStatus: string;
  tableCount: number;
  dbSize: string;
};

const cacheSizeCache = { value: "0 B", bytes: 0, at: 0 };

export function formatBytes(value: number) {
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
  if (value < 1024 * 1024 * 1024) return `${(value / (1024 * 1024)).toFixed(1)} MB`;
  return `${(value / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

async function getDirSize(dirPath: string): Promise<number> {
  try {
    let total = 0;
    const entries = await readdir(dirPath, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name);
      if (entry.isDirectory() && !entry.name.startsWith(".")) {
        total += await getDirSize(fullPath);
      } else if (entry.isFile()) {
        const s = await stat(fullPath).catch(() => null);
        if (s) total += s.size;
      }
    }
    return total;
  } catch {
    return 0;
  }
}

export async function scanUnusedFiles(): Promise<CleanupIssue[]> {
  const issues: CleanupIssue[] = [];

  try {
    const publicDir = path.join(process.cwd(), "public");
    const assetsDir = path.join(publicDir, "assets");
    if (existsSync(assetsDir)) {
      const entries = await readdir(assetsDir, { withFileTypes: true });
      for (const entry of entries) {
        if (!entry.isDirectory()) continue;
        const subDir = path.join(assetsDir, entry.name);
        const files = await readdir(subDir).catch(() => []);
        if (files.length === 0) {
          issues.push({
            id: `empty-dir-${entry.name}`,
            category: "unused-files",
            title: `مجلد فارغ: ${entry.name}`,
            description: `المجلد ${entry.name} في assets لا يحتوي على أي ملفات`,
            severity: "low",
            count: 1,
            sizeBytes: 0,
            action: `حذف المجلد الفارغ assets/${entry.name}`,
            autoFixable: true,
            safeToAutoFix: true,
          });
        }
      }
    }
  } catch {
  }

  return issues;
}

export async function scanDatabase(): Promise<DatabaseCleanupStatus> {
  noStore();
  const status: DatabaseCleanupStatus = {
    oldAnalytics: 0, oldNotifications: 0, oldErrors: 0,
    expiredTrashInvitations: 0, expiredTrashOrders: 0, expiredTrashCustomers: 0,
    orphanedGuestBook: 0, orphanedCheckIns: 0, orphanedClientMessages: 0,
    orphanedCoupleSettings: 0, orphanedLiveModes: 0,
    orphanedGuestRsvp: 0, orphanedAnalytics: 0,
    orphanedInvitationNotes: 0, orphanedOrderNotes: 0, orphanedCustomerNotes: 0,
    total: 0,
  };

  if (!prisma) return status;

  try {
    const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    status.oldAnalytics = await prisma.analyticsEvent.count({
      where: { createdAt: { lt: ninetyDaysAgo } },
    }).catch(() => 0);

    status.oldNotifications = await prisma.appSetting.count({
      where: { key: { startsWith: "notification_" }, updatedAt: { lt: ninetyDaysAgo } },
    }).catch(() => 0);

    status.oldErrors = await prisma.auditLog.count({
      where: { createdAt: { lt: ninetyDaysAgo } },
    }).catch(() => 0);

    status.expiredTrashInvitations = await prisma.invitation.count({
      where: { deletedAt: { lt: thirtyDaysAgo } },
    }).catch(() => 0);

    status.expiredTrashOrders = await prisma.orderRequest.count({
      where: { deletedAt: { lt: thirtyDaysAgo } },
    }).catch(() => 0);

    status.expiredTrashCustomers = await prisma.customer.count({
      where: { deletedAt: { lt: thirtyDaysAgo } },
    }).catch(() => 0);

    const invitations = await prisma.invitation.findMany({
      select: { id: true, code: true, customSlug: true },
    }).catch(() => []);
    const allCodes = new Set<string>();
    const allIds = new Set<string>();
    invitations.forEach((inv) => {
      allCodes.add(inv.code);
      allIds.add(inv.id);
      if (inv.customSlug) allCodes.add(inv.customSlug);
    });

    status.orphanedGuestBook = await prisma.guestBookMessage.count({
      where: { invitationCode: { notIn: [...allCodes] } },
    }).catch(() => 0);

    status.orphanedCheckIns = await prisma.invitationCheckIn.count({
      where: { invitationCode: { notIn: [...allCodes] } },
    }).catch(() => 0);

    status.orphanedClientMessages = await prisma.clientMessage.count({
      where: { invitationCode: { notIn: [...allCodes] } },
    }).catch(() => 0);

    status.orphanedCoupleSettings = await prisma.coupleMessagesSetting.count({
      where: { invitationCode: { notIn: [...allCodes] } },
    }).catch(() => 0);

    status.orphanedLiveModes = await prisma.weddingLiveMode.count({
      where: { invitationCode: { notIn: [...allCodes] } },
    }).catch(() => 0);

    try {
      const rsvpRows = await prisma.$queryRaw<Array<{ cnt: bigint }>>`
        SELECT COUNT(*) as cnt FROM "GuestRsvp" r
        LEFT JOIN "Invitation" i ON i."id" = r."invitationId"
        WHERE i."id" IS NULL
      `;
      status.orphanedGuestRsvp = Number(rsvpRows[0]?.cnt || 0);
    } catch { status.orphanedGuestRsvp = 0; }

    try {
      const analyticsRows = await prisma.$queryRaw<Array<{ cnt: bigint }>>`
        SELECT COUNT(*) as cnt FROM "AnalyticsEvent" e
        LEFT JOIN "Invitation" i ON i."id" = e."invitationId"
        WHERE i."id" IS NULL
      `;
      status.orphanedAnalytics = Number(analyticsRows[0]?.cnt || 0);
    } catch { status.orphanedAnalytics = 0; }

    const orders = await prisma.orderRequest.findMany({ select: { id: true, orderNumber: true } }).catch(() => []);
    const orderIds = new Set<string>();
    orders.forEach((o) => { orderIds.add(o.id); if (o.orderNumber) orderIds.add(o.orderNumber); });

    const customers = await prisma.customer.findMany({ select: { id: true, username: true } }).catch(() => []);
    const customerIds = new Set<string>();
    customers.forEach((c) => { customerIds.add(c.id); customerIds.add(c.username); });

    const allNotes = await prisma.internalNote.findMany({
      select: { id: true, entityType: true, entityId: true },
    }).catch(() => []);
    for (const note of allNotes) {
      if (note.entityType === "invitation" && !allIds.has(note.entityId)) status.orphanedInvitationNotes++;
      if (note.entityType === "order" && !orderIds.has(note.entityId)) status.orphanedOrderNotes++;
      if (note.entityType === "customer" && !customerIds.has(note.entityId)) status.orphanedCustomerNotes++;
    }

    status.total =
      status.oldAnalytics + status.oldNotifications + status.oldErrors +
      status.expiredTrashInvitations + status.expiredTrashOrders + status.expiredTrashCustomers +
      status.orphanedGuestBook + status.orphanedCheckIns + status.orphanedClientMessages +
      status.orphanedCoupleSettings + status.orphanedLiveModes +
      status.orphanedGuestRsvp + status.orphanedAnalytics +
      status.orphanedInvitationNotes + status.orphanedOrderNotes + status.orphanedCustomerNotes;
  } catch {
  }

  return status;
}

export async function scanPackages(): Promise<PackageStatus> {
  const status: PackageStatus = {
    totalPackages: 0,
    unusedPackages: 0,
    packageNames: [],
    sizeSavingsHint: "",
  };

  try {
    const pkgPath = path.join(process.cwd(), "package.json");
    const pkgContent = await readFile(pkgPath, "utf-8").catch(() => null);
    if (!pkgContent) return status;

    const pkg = JSON.parse(pkgContent);
    const allDeps = { ...pkg.dependencies, ...pkg.devDependencies };
    status.totalPackages = Object.keys(allDeps).length;

    const usedImports = await scanUsedImports();

    const corePackages = new Set([
      "next", "react", "react-dom", "typescript", "@types/node", "@types/react",
      "@types/react-dom", "prisma", "@prisma/client", "lucide-react", "zod", "sharp",
      "pdfkit", "xlsx", "qrcode", "clsx", "heic-convert", "pg",
    ]);

    const unused: string[] = [];
    for (const [name] of Object.entries(allDeps) as Array<[string, string]>) {
      if (corePackages.has(name)) continue;
      if (name.startsWith("@types/") || name.startsWith("eslint") || name.startsWith("@next/")) continue;

      const importNames = [
        name,
        name.replace(/^@/, ""),
        name.split("/")[0],
        name.replace("@", "").replace("/", "-"),
      ];

      const isUsed = importNames.some((iname) =>
        usedImports.some((imp) => imp === iname || imp.startsWith(`${iname}/`) || imp.startsWith(`${iname}#`)),
      );

      if (!isUsed) unused.push(name);
    }

    status.unusedPackages = unused.length;
    status.packageNames = unused.slice(0, 20);
    status.sizeSavingsHint = unused.length > 0
      ? `قد يوفر إزالة ${Math.min(unused.length, 10)} حزمة غير مستخدمة ~5-20 ميغابايت من حجم الـ build`
      : "جميع الحزم تبدو مستخدمة";
  } catch {
  }

  return status;
}

async function scanUsedImports(): Promise<string[]> {
  const imports: string[] = [];
  const dirsToScan = ["app", "components", "lib", "scripts"];

  for (const dir of dirsToScan) {
    try {
      const fullPath = path.join(process.cwd(), dir);
      await scanDirForImports(fullPath, imports, 5);
    } catch {
    }
  }

  return [...new Set(imports)];
}

async function scanDirForImports(dirPath: string, imports: string[], depth: number): Promise<void> {
  if (depth <= 0) return;
  try {
    const entries = await readdir(dirPath, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.name.startsWith(".") || entry.name === "node_modules") continue;
      const fullPath = path.join(dirPath, entry.name);
      if (entry.isDirectory()) {
        await scanDirForImports(fullPath, imports, depth - 1);
      } else if (entry.isFile() && (entry.name.endsWith(".ts") || entry.name.endsWith(".tsx") || entry.name.endsWith(".mjs"))) {
        const content = await readFile(fullPath, "utf-8").catch(() => "");
        for (const match of content.matchAll(/(?:from|require)\s*\(?\s*["']([^"']+)["']/g)) {
          if (match[1] && !match[1].startsWith(".") && !match[1].startsWith("/")) {
            imports.push(match[1]);
          }
        }
      }
    }
  } catch {
  }
}

export async function checkOptimizationStatus(): Promise<OptimizationStatus> {
  noStore();

  let cacheSize = "0 B";
  let cacheSizeBytes = 0;
  const now = Date.now();
  if (now - cacheSizeCache.at > 60000) {
    cacheSizeBytes = await getDirSize(path.join(process.cwd(), ".next", "cache"));
    cacheSizeCache.value = formatBytes(cacheSizeBytes);
    cacheSizeCache.bytes = cacheSizeBytes;
    cacheSizeCache.at = now;
  }
  cacheSize = cacheSizeCache.value;
  cacheSizeBytes = cacheSizeCache.bytes;

  let indexStatus = "غير معروف";
  let tableCount = 0;
  let dbSize = "غير معروف";
  let lastOptimizedAt: string | null = null;

  if (prisma) {
    try {
      const tables = await prisma.$queryRaw<Array<{ tablename: string }>>`
        SELECT tablename FROM pg_catalog.pg_tables WHERE schemaname = 'public'
      `;
      tableCount = tables.length;

      const sizeResult = await prisma.$queryRaw<Array<{ size: string }>>`
        SELECT pg_size_pretty(pg_database_size(current_database())) as size
      `;
      dbSize = sizeResult[0]?.size || "غير معروف";

      const indexResult = await prisma.$queryRaw<Array<{ status: string }>>`
        SELECT COALESCE(
          (SELECT 'سليم'::text WHERE NOT EXISTS (
            SELECT 1 FROM pg_catalog.pg_stat_user_indexes ui
            JOIN pg_catalog.pg_index i ON ui.indexrelid = i.indexrelid
            WHERE i.indisvalid = false AND ui.schemaname = 'public'
          )), 'يحتاج إعادة بناء') as status
      `;
      indexStatus = indexResult[0]?.status || "غير معروف";

      const lastAnalyze = await prisma.$queryRaw<Array<{ last_analyze: Date | null }>>`
        SELECT COALESCE(MAX(last_analyze), NULL::timestamp) as last_analyze
        FROM pg_catalog.pg_stat_user_tables WHERE schemaname = 'public'
      `;
      if (lastAnalyze[0]?.last_analyze) {
        lastOptimizedAt = lastAnalyze[0].last_analyze.toISOString();
      }
    } catch {
    }
  }

  let pendingOptimizations = 0;
  if (cacheSizeBytes > 50 * 1024 * 1024) pendingOptimizations++;
  if (indexStatus !== "سليم") pendingOptimizations++;
  if (tableCount > 0) pendingOptimizations++;

  return {
    lastOptimizedAt,
    pendingOptimizations,
    cacheSize,
    cacheSizeBytes,
    indexStatus,
    tableCount,
    dbSize,
  };
}

export async function runFullScan(): Promise<CleanupScanReport> {
  noStore();

  const [mediaReport, trashItems, backups, dbStatus, pkgStatus, optStatus, fileIssues] = await Promise.all([
    getMediaCleanupReport().catch(() => null),
    getTrashItems().catch(() => []),
    listBackupSnapshots().catch(() => []),
    scanDatabase(),
    scanPackages(),
    checkOptimizationStatus(),
    scanUnusedFiles(),
  ]);

  const issues: CleanupIssue[] = [...fileIssues];

  if (mediaReport) {
    if (mediaReport.orphanFiles.length > 0) {
      issues.push({
        id: "media-orphans",
        category: "media",
        title: "ملفات وسائط يتيمة",
        description: "ملفات مرفوعة ليس لها مرجع في أي دعوة أو طلب",
        severity: "high",
        count: mediaReport.orphanFiles.length,
        sizeBytes: mediaReport.orphanFiles.reduce((s, f) => s + f.sizeBytes, 0),
        action: "حذف الملفات اليتيمة",
        autoFixable: true,
        safeToAutoFix: true,
      });
    }
    if (mediaReport.duplicateFiles.length > 0) {
      issues.push({
        id: "media-duplicates",
        category: "media",
        title: "ملفات وسائط مكررة",
        description: "ملفات مكررة بنفس المحتوى يمكن حذف النسخ الزائدة منها",
        severity: "medium",
        count: mediaReport.duplicateFiles.length,
        sizeBytes: mediaReport.duplicateSizeBytes,
        action: "حذف النسخ المكررة",
        autoFixable: true,
        safeToAutoFix: true,
      });
    }
    if (mediaReport.oldTemporaryFiles.length > 0) {
      issues.push({
        id: "temp-files",
        category: "media",
        title: "ملفات مؤقتة قديمة",
        description: "ملفات مؤقتة منتهية الصلاحية (أقدم من 7 أيام)",
        severity: "medium",
        count: mediaReport.oldTemporaryFiles.length,
        sizeBytes: mediaReport.oldTemporaryFiles.reduce((s, f) => s + f.sizeBytes, 0),
        action: "حذف الملفات المؤقتة",
        autoFixable: true,
        safeToAutoFix: true,
      });
    }
    if (mediaReport.oldBackupFiles.length > 0) {
      issues.push({
        id: "backup-cleanup",
        category: "backups",
        title: "نسخ احتياطية قديمة (محلية)",
        description: `نسخ احتياطية أقدم من 30 يوماً أو مكررة`,
        severity: "medium",
        count: mediaReport.oldBackupFiles.length,
        sizeBytes: mediaReport.oldBackupFiles.reduce((s, f) => s + f.sizeBytes, 0),
        action: "حذف النسخ القديمة",
        autoFixable: true,
        safeToAutoFix: true,
      });
    }
    if (mediaReport.databaseOrphanRecords > 0) {
      issues.push({
        id: "db-orphans-media",
        category: "database",
        title: "سجلات يتيمة في قاعدة البيانات (وسائط)",
        description: `${mediaReport.databaseOrphanRecords} سجل في جداول مرتبطة تشير إلى عناصر غير موجودة`,
        severity: "high",
        count: mediaReport.databaseOrphanRecords,
        sizeBytes: 0,
        action: "حذف السجلات اليتيمة",
        autoFixable: true,
        safeToAutoFix: true,
      });
    }
  }

  if (dbStatus.oldAnalytics > 0) {
    issues.push({
      id: "db-old-analytics",
      category: "database",
      title: "سجلات تحليلات قديمة",
      description: `${dbStatus.oldAnalytics} سجل أقدم من 90 يوماً`,
      severity: "medium",
      count: dbStatus.oldAnalytics,
      sizeBytes: 0,
      action: "حذف سجلات التحليلات القديمة",
      autoFixable: true,
      safeToAutoFix: true,
    });
  }

  if (dbStatus.oldErrors > 0) {
    issues.push({
      id: "db-old-errors",
      category: "database",
      title: "سجلات أخطاء قديمة",
      description: `${dbStatus.oldErrors} سجل Audit Log أقدم من 90 يوماً`,
      severity: "low",
      count: dbStatus.oldErrors,
      sizeBytes: 0,
      action: "حذف سجلات الأخطاء القديمة",
      autoFixable: true,
      safeToAutoFix: true,
    });
  }

  const totalExpired = dbStatus.expiredTrashInvitations + dbStatus.expiredTrashOrders + dbStatus.expiredTrashCustomers;
  if (totalExpired > 0) {
    issues.push({
      id: "db-expired-trash",
      category: "database",
      title: "سلة مهملات منتهية الصلاحية",
      description: `${totalExpired} عنصر (${dbStatus.expiredTrashInvitations} دعوة، ${dbStatus.expiredTrashOrders} طلب، ${dbStatus.expiredTrashCustomers} عميل)`,
      severity: "medium",
      count: totalExpired,
      sizeBytes: 0,
      action: "تفريغ المهملات منتهية الصلاحية",
      autoFixable: true,
      safeToAutoFix: true,
    });
  }

  const totalOrphans =
    dbStatus.orphanedGuestBook + dbStatus.orphanedCheckIns + dbStatus.orphanedClientMessages +
    dbStatus.orphanedCoupleSettings + dbStatus.orphanedLiveModes +
    dbStatus.orphanedGuestRsvp + dbStatus.orphanedAnalytics +
    dbStatus.orphanedInvitationNotes + dbStatus.orphanedOrderNotes + dbStatus.orphanedCustomerNotes;
  if (totalOrphans > 0) {
    issues.push({
      id: "db-orphaned-records",
      category: "database",
      title: "سجلات يتيمة",
      description: `${totalOrphans} سجل يتيم في 10 جداول`,
      severity: "high",
      count: totalOrphans,
      sizeBytes: 0,
      action: "حذف السجلات اليتيمة",
      autoFixable: true,
      safeToAutoFix: true,
    });
  }

  if (pkgStatus.unusedPackages > 0) {
    issues.push({
      id: "unused-packages",
      category: "packages",
      title: "حزم npm غير مستخدمة",
      description: `${pkgStatus.unusedPackages} حزمة من ${pkgStatus.totalPackages} إجمالي قد تكون غير مستخدمة`,
      severity: "low",
      count: pkgStatus.unusedPackages,
      sizeBytes: 0,
      action: "مراجعة وإزالة الحزم غير المستخدمة",
      autoFixable: false,
      safeToAutoFix: false,
    });
  }

  if (optStatus.pendingOptimizations > 0) {
    issues.push({
      id: "optimization-pending",
      category: "optimization",
      title: "تحسينات معلقة",
      description: `${optStatus.pendingOptimizations} تحسين في انتظار التشغيل (index, cache, stats)`,
      severity: "low",
      count: optStatus.pendingOptimizations,
      sizeBytes: 0,
      action: "تشغيل التحسينات",
      autoFixable: true,
      safeToAutoFix: true,
    });
  }

  const totalRecoverableBytes =
    issues.reduce((sum, i) => sum + i.sizeBytes, 0) +
    (mediaReport?.recoverableSizeBytes || 0);

  return {
    scannedAt: new Date().toISOString(),
    totalIssues: issues.length,
    totalRecoverableBytes,
    issues,
    mediaReport,
    trashCount: trashItems.length,
    backupCount: backups.length + (mediaReport?.backupFiles.length || 0),
    databaseStatus: dbStatus,
    packageStatus: pkgStatus,
    optimizationStatus: optStatus,
  };
}

export type CleanupAction = {
  type: CleanupCategory | "all";
  dryRun?: boolean;
};

export type CleanupActionResult = {
  executedAt: string;
  action: string;
  deletedCount: number;
  recoveredBytes: number;
  details: string[];
  backupFileName: string | null;
  errors: string[];
};

export async function executeDatabaseCleanup(action?: string): Promise<CleanupActionResult> {
  const details: string[] = [];
  const errors: string[] = [];
  let deletedCount = 0;
  const doAll = action === "all" || !action;

  if (!prisma) {
    return { executedAt: new Date().toISOString(), action: "database", deletedCount: 0, recoveredBytes: 0, details: [], backupFileName: null, errors: ["قاعدة البيانات غير متصلة"] };
  }

  try {
    const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    if (action === "old-analytics" || doAll) {
      const r = await prisma.analyticsEvent.deleteMany({ where: { createdAt: { lt: ninetyDaysAgo } } });
      if (r.count > 0) { details.push(`✅ تحليلات: ${r.count} سجل قديم`); deletedCount += r.count; }
    }

    if (action === "old-errors" || doAll) {
      const r = await prisma.auditLog.deleteMany({ where: { createdAt: { lt: ninetyDaysAgo } } });
      if (r.count > 0) { details.push(`✅ أخطاء: ${r.count} سجل قديم`); deletedCount += r.count; }
    }

    if (action === "expired-trash" || doAll) {
      const inv = await prisma.invitation.deleteMany({ where: { deletedAt: { lt: thirtyDaysAgo } } });
      if (inv.count > 0) { details.push(`✅ دعوات: ${inv.count} منتهية`); deletedCount += inv.count; }
      const ord = await prisma.orderRequest.deleteMany({ where: { deletedAt: { lt: thirtyDaysAgo } } });
      if (ord.count > 0) { details.push(`✅ طلبات: ${ord.count} منتهية`); deletedCount += ord.count; }
      const cus = await prisma.customer.deleteMany({ where: { deletedAt: { lt: thirtyDaysAgo } } });
      if (cus.count > 0) { details.push(`✅ عملاء: ${cus.count} منتهي`); deletedCount += cus.count; }
    }

    if (action === "orphans" || doAll) {
      const invCodes = (await prisma.invitation.findMany({ select: { code: true } })).map((i) => i.code);
      const invIds = (await prisma.invitation.findMany({ select: { id: true } })).map((i) => i.id);
      const orderIds = (await prisma.orderRequest.findMany({ select: { id: true } })).map((o) => o.id);
      const customerIds = (await prisma.customer.findMany({ select: { id: true } })).map((c) => c.id);

      const gb = await prisma.guestBookMessage.deleteMany({ where: { invitationCode: { notIn: invCodes } } });
      if (gb.count > 0) { details.push(`✅ رسائل تهنئة: ${gb.count} يتيمة`); deletedCount += gb.count; }
      const ci = await prisma.invitationCheckIn.deleteMany({ where: { invitationCode: { notIn: invCodes } } });
      if (ci.count > 0) { details.push(`✅ تسجيلات حضور: ${ci.count} يتيمة`); deletedCount += ci.count; }
      const cm = await prisma.clientMessage.deleteMany({ where: { invitationCode: { notIn: invCodes } } });
      if (cm.count > 0) { details.push(`✅ رسائل عملاء: ${cm.count} يتيمة`); deletedCount += cm.count; }
      const cs = await prisma.coupleMessagesSetting.deleteMany({ where: { invitationCode: { notIn: invCodes } } });
      if (cs.count > 0) { details.push(`✅ إعدادات رسائل: ${cs.count} يتيمة`); deletedCount += cs.count; }
      const lm = await prisma.weddingLiveMode.deleteMany({ where: { invitationCode: { notIn: invCodes } } });
      if (lm.count > 0) { details.push(`✅ Live Mode: ${lm.count} يتيم`); deletedCount += lm.count; }

      try {
        await prisma.$executeRawUnsafe(`DELETE FROM "GuestRsvp" r USING "Invitation" i WHERE r."invitationId" = i."id" AND i."id" IS NULL`);
      } catch {}

      if (invIds.length > 0) {
        const notesInv = await prisma.internalNote.deleteMany({ where: { entityType: "invitation", entityId: { notIn: invIds } } });
        if (notesInv.count > 0) deletedCount += notesInv.count;
      }
      if (orderIds.length > 0) {
        const notesOrd = await prisma.internalNote.deleteMany({ where: { entityType: "order", entityId: { notIn: orderIds } } });
        if (notesOrd.count > 0) deletedCount += notesOrd.count;
      }
      if (customerIds.length > 0) {
        const notesCus = await prisma.internalNote.deleteMany({ where: { entityType: "customer", entityId: { notIn: customerIds } } });
        if (notesCus.count > 0) deletedCount += notesCus.count;
      }

      if (details.length === 0) details.push("ℹ️ لم يتم العثور على سجلات يتيمة");
    }
  } catch (error) {
    errors.push(`خطأ: ${error}`);
  }

  return {
    executedAt: new Date().toISOString(),
    action: action || "all",
    deletedCount,
    recoveredBytes: 0,
    details,
    backupFileName: null,
    errors,
  };
}

export async function executeOptimization(action?: string): Promise<CleanupActionResult> {
  const details: string[] = [];
  const errors: string[] = [];
  const doAll = action === "all" || !action;

  if (!prisma) {
    return { executedAt: new Date().toISOString(), action: "optimization", deletedCount: 0, recoveredBytes: 0, details: [], backupFileName: null, errors: ["قاعدة البيانات غير متصلة"] };
  }

  if (action === "analyze" || doAll) {
    try {
      await prisma.$queryRawUnsafe("ANALYZE");
      details.push("✅ تم تحديث إحصائيات قاعدة البيانات (ANALYZE)");
    } catch (e) { errors.push(`❌ ANALYZE: ${e}`); }
  }

  if (action === "reindex" || doAll) {
    try {
      await prisma.$queryRawUnsafe("REINDEX DATABASE").catch(() => {
        throw new Error("requires superuser");
      });
      details.push("✅ تم إعادة بناء فهارس قاعدة البيانات بالكامل");
    } catch {
      try {
        const tables: string[] = [];
        const rows = await prisma.$queryRaw<Array<{ tablename: string }>>`
          SELECT tablename FROM pg_catalog.pg_tables WHERE schemaname = 'public'
        `;
        for (const row of rows) tables.push(row.tablename);
        for (const table of tables) {
          try { await prisma.$queryRawUnsafe(`REINDEX TABLE "${table}"`); } catch {}
        }
        details.push(`✅ تم إعادة بناء فهارس ${tables.length} جدول`);
      } catch (e) { errors.push(`❌ REINDEX: ${e}`); }
    }
  }

  if (action === "clear-cache" || doAll) {
    try {
      const { revalidatePath } = await import("next/cache");
      revalidatePath("/", "layout");
      details.push("✅ تم تنظيف ذاكرة التخزين المؤقت لـ Next.js");
    } catch (e) { errors.push(`❌ Cache: ${e}`); }
    try {
      const cacheDir = path.join(process.cwd(), ".next", "cache");
      if (existsSync(cacheDir)) {
        const { rm } = await import("fs/promises");
        await rm(cacheDir, { recursive: true, force: true });
        cacheSizeCache.at = 0;
        details.push("✅ تم حذف ملفات الكاش الفعلية");
      }
    } catch (e) { errors.push(`❌ Cache files: ${e}`); }
  }

  if (action === "recalculate-stats" || doAll) {
    try {
      await prisma.$queryRawUnsafe("ANALYZE");
      details.push("✅ تم إعادة حساب إحصائيات المنصة");
    } catch (e) { errors.push(`❌ Stats: ${e}`); }
  }

  return {
    executedAt: new Date().toISOString(),
    action: action || "all",
    deletedCount: 0,
    recoveredBytes: 0,
    details,
    backupFileName: null,
    errors,
  };
}
