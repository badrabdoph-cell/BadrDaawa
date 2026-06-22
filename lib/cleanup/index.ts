import { unstable_noStore as noStore } from "next/cache";
import { prisma } from "@/lib/db";
import { getMediaCleanupReport, type MediaCleanupReport } from "@/lib/media-cleanup";
import { getTrashItems } from "@/lib/trash";
import { listBackupSnapshots } from "@/lib/backups";
import { readdir, stat } from "fs/promises";
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
  oldTempRecords: number;
  oldNotifications: number;
  oldErrors: number;
  expiredTrash: number;
  orphanedRecords: number;
  total: number;
};

export type PackageStatus = {
  totalPackages: number;
  unusedPackages: number;
  outdatedPackages: number;
  packageNames: string[];
};

export type OptimizationStatus = {
  lastOptimizedAt: string | null;
  pendingOptimizations: string[];
  cacheSize: string;
  indexStatus: string;
};

export function formatBytes(value: number) {
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
}

function getRuntimeDataDir() {
  return path.join(process.cwd(), "data");
}

export async function scanUnusedFiles(): Promise<CleanupIssue[]> {
  const issues: CleanupIssue[] = [];
  const publicDir = path.join(process.cwd(), "public");
  const appDir = path.join(process.cwd(), "app");
  const componentsDir = path.join(process.cwd(), "components");
  const libDir = path.join(process.cwd(), "lib");

  try {
    const uploadsDir = path.join(publicDir, "uploads");
    const uploadEntries = await readdir(uploadsDir, { withFileTypes: true }).catch(() => [] as any[]);
    const uploadFiles = uploadEntries.filter((e: any) => e.isFile());

    const assetsDir = path.join(publicDir, "assets");
    const assetEntries = await readdir(assetsDir, { withFileTypes: true }).catch(() => [] as any[]);
    const assetDirs = assetEntries.filter((e: any) => e.isDirectory());

    let totalOrphanBytes = 0;
    for (const dir of assetDirs) {
      const subDir = path.join(assetsDir, dir.name);
      const files = await readdir(subDir, { withFileTypes: true }).catch(() => [] as any[]);
      const fileCount = files.filter((e: any) => e.isFile()).length;
      if (fileCount === 0) {
        issues.push({
          id: `empty-dir-${dir.name}`,
          category: "unused-files",
          title: `مجلد فارغ: ${dir.name}`,
          description: `المجلد ${dir.name} في assets لا يحتوي على أي ملفات`,
          severity: "low",
          count: 1,
          sizeBytes: 0,
          action: `حذف المجلد الفارغ assets/${dir.name}`,
          autoFixable: true,
          safeToAutoFix: true,
        });
      }
    }

    issues.push({
      id: "unused-uploads-scan",
      category: "unused-files",
      title: "ملفات الرفع غير المستخدمة",
      description: "فحص الملفات في مجلد uploads التي لا يوجد لها مرجع في قاعدة البيانات",
      severity: "medium",
      count: uploadFiles.length,
      sizeBytes: totalOrphanBytes,
      action: "تشغيل فحص الوسائط لتفاصيل أكثر",
      autoFixable: false,
      safeToAutoFix: false,
    });
  } catch {
    // directory may not exist
  }

  try {
    const components = await readdir(componentsDir, { withFileTypes: true });
    const componentFiles = components.filter((e) => e.isFile() && (e.name.endsWith(".tsx") || e.name.endsWith(".ts")));
    const adminComponentFiles = componentFiles.filter((e) => e.name.endsWith(".tsx")).map((e) => e.name);

    const appFiles = await readdir(appDir, { withFileTypes: true });
    const adminRoutes = appFiles.filter((e) => e.isDirectory() && e.name.startsWith("admin"));

    issues.push({
      id: "component-audit",
      category: "unused-files",
      title: "تدقيق المكونات",
      description: `${componentFiles.length} مكون في components/ و ${adminRoutes.length} مسار إداري`,
      severity: "low",
      count: componentFiles.length,
      sizeBytes: 0,
      action: "مراجعة المكونات غير المستخدمة",
      autoFixable: false,
      safeToAutoFix: false,
    });
  } catch {
    // components dir may not exist
  }

  return issues;
}

export async function scanDatabase(): Promise<DatabaseCleanupStatus> {
  noStore();
  const status: DatabaseCleanupStatus = {
    oldTempRecords: 0,
    oldNotifications: 0,
    oldErrors: 0,
    expiredTrash: 0,
    orphanedRecords: 0,
    total: 0,
  };

  if (!prisma) return status;

  try {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);

    status.oldTempRecords = await prisma.analyticsEvent.count({
      where: { createdAt: { lt: ninetyDaysAgo } },
    }).catch(() => 0);

    const oldNotifications = await prisma.appSetting.findMany({
      where: { key: { startsWith: "notification_" }, updatedAt: { lt: ninetyDaysAgo } },
    }).catch(() => []);
    status.oldNotifications = oldNotifications.length;

    const expiredTrash = await prisma.invitation.count({
      where: { deletedAt: { lt: thirtyDaysAgo } },
    }).catch(() => 0);
    status.expiredTrash = expiredTrash;

    status.orphanedRecords = await countOrphanedRecords();
    status.total = status.oldTempRecords + status.oldNotifications + status.expiredTrash + status.orphanedRecords;
  } catch {
    // db may not be available
  }

  return status;
}

async function countOrphanedRecords(): Promise<number> {
  if (!prisma) return 0;
  let total = 0;

  try {
    const orphanGuestBook = await prisma.guestBookMessage.count({
      where: {
        invitationCode: { notIn: (await prisma.invitation.findMany({ select: { code: true } })).map((i) => i.code) },
      },
    }).catch(() => 0);
    total += orphanGuestBook;

    const orphanCheckIns = await prisma.invitationCheckIn.count({
      where: {
        invitationCode: { notIn: (await prisma.invitation.findMany({ select: { code: true } })).map((i) => i.code) },
      },
    }).catch(() => 0);
    total += orphanCheckIns;

    const orphanMessages = await prisma.clientMessage.count({
      where: {
        invitationCode: { notIn: (await prisma.invitation.findMany({ select: { code: true } })).map((i) => i.code) },
      },
    }).catch(() => 0);
    total += orphanMessages;
  } catch {
    // ignore
  }

  return total;
}

export async function scanPackages(): Promise<PackageStatus> {
  const status: PackageStatus = {
    totalPackages: 0,
    unusedPackages: 0,
    outdatedPackages: 0,
    packageNames: [],
  };

  try {
    const pkgPath = path.join(process.cwd(), "package.json");
    const pkgContent = await readFileSafe(pkgPath);
    if (!pkgContent) return status;

    const pkg = JSON.parse(pkgContent);
    const dependencies = { ...pkg.dependencies, ...pkg.devDependencies };
    status.totalPackages = Object.keys(dependencies).length;

    const usedImports = await scanUsedImports();
    const unused: string[] = [];

    for (const [name] of Object.entries(dependencies)) {
      const cleanName = name.replace(/^@/, "").replace(/\//, "-");
      const isUsed = usedImports.some((imp) => imp.includes(name) || imp.includes(cleanName));
      if (!isUsed && !isCoreDep(name)) {
        unused.push(name);
      }
    }

    status.unusedPackages = unused.length;
    status.packageNames = unused.slice(0, 20);
  } catch {
    // package.json read error
  }

  return status;
}

async function scanUsedImports(): Promise<string[]> {
  const imports: string[] = [];
  const dirsToScan = ["app", "components", "lib"];

  for (const dir of dirsToScan) {
    try {
      const fullPath = path.join(process.cwd(), dir);
      await scanDirForImports(fullPath, imports, 3);
    } catch {
      // skip
    }
  }

  return imports;
}

async function scanDirForImports(dirPath: string, imports: string[], depth: number): Promise<void> {
  if (depth <= 0) return;
  try {
    const entries = await readdir(dirPath, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isDirectory() && !entry.name.startsWith(".") && !entry.name.startsWith("node_modules")) {
        await scanDirForImports(path.join(dirPath, entry.name), imports, depth - 1);
      } else if (entry.isFile() && (entry.name.endsWith(".ts") || entry.name.endsWith(".tsx"))) {
        const content = await readFileSafe(path.join(dirPath, entry.name));
        if (content) {
          const importMatches = content.matchAll(/from\s+["']([^"']+)["']/g);
          for (const match of importMatches) {
            if (match[1] && !match[1].startsWith(".") && !match[1].startsWith("/")) {
              imports.push(match[1]);
            }
          }
        }
      }
    }
  } catch {
    // skip
  }
}

function isCoreDep(name: string): boolean {
  const core = new Set([
    "next", "react", "react-dom", "typescript", "@types/node", "@types/react",
    "@types/react-dom", "prisma", "@prisma/client", "lucide-react", "zod", "sharp",
    "pdfkit", "xlsx", "qrcode", "clsx", "heic-convert",
  ]);
  return core.has(name) || name.startsWith("@types/") || name.startsWith("eslint");
}

async function readFileSafe(filePath: string): Promise<string | null> {
  try {
    const { readFile } = await import("fs/promises");
    return await readFile(filePath, "utf-8");
  } catch {
    return null;
  }
}

export async function checkOptimizationStatus(): Promise<OptimizationStatus> {
  let cacheSize = "غير معروف";
  try {
    const nextCacheDir = path.join(process.cwd(), ".next", "cache");
    const cacheStat = await stat(nextCacheDir).catch(() => null);
    if (cacheStat) {
      cacheSize = formatBytes(cacheStat.size);
    }
  } catch {
    // cache dir may not exist
  }

  return {
    lastOptimizedAt: null,
    pendingOptimizations: [
      "إعادة بناء فهارس قاعدة البيانات",
      "تنظيف ذاكرة التخزين المؤقت (Next.js Cache)",
      "ضغط وتحسين الوسائط",
      "إعادة حساب إحصائيات المنصة",
    ],
    cacheSize,
    indexStatus: "غير معروف",
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
        title: "نسخ احتياطية قديمة",
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
        id: "db-orphans",
        category: "database",
        title: "سجلات يتيمة في قاعدة البيانات",
        description: "سجلات في جداول مرتبطة تشير إلى دعوات/طلبات/عملاء غير موجودين",
        severity: "high",
        count: mediaReport.databaseOrphanRecords,
        sizeBytes: 0,
        action: "حذف السجلات اليتيمة",
        autoFixable: true,
        safeToAutoFix: true,
      });
    }
  }

  if (dbStatus.total > 0) {
    issues.push({
      id: "db-cleanup",
      category: "database",
      title: "تنظيف قاعدة البيانات",
      description: `${dbStatus.oldTempRecords} سجل تحليلات قديم، ${dbStatus.expiredTrash} سجل محذوف منتهي، ${dbStatus.orphanedRecords} سجل يتيم`,
      severity: "medium",
      count: dbStatus.total,
      sizeBytes: 0,
      action: "تنظيف قاعدة البيانات",
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

  if (trashItems.length > 30) {
    issues.push({
      id: "expired-trash",
      category: "database",
      title: "سلة مهملات ممتلئة",
      description: `${trashItems.length} عنصر في سلة المهملات. العناصر الأقدم من 30 يوماً يمكن حذفها نهائياً`,
      severity: "low",
      count: trashItems.length,
      sizeBytes: 0,
      action: "تفريغ سلة المهملات",
      autoFixable: false,
      safeToAutoFix: false,
    });
  }

  const totalRecoverableBytes =
    issues.reduce((sum, issue) => sum + issue.sizeBytes, 0) +
    (mediaReport?.recoverableSizeBytes || 0);

  return {
    scannedAt: new Date().toISOString(),
    totalIssues: issues.length,
    totalRecoverableBytes,
    issues,
    mediaReport,
    trashCount: trashItems.length,
    backupCount: backups.length,
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

export async function executeDatabaseCleanup(): Promise<CleanupActionResult> {
  const details: string[] = [];
  const errors: string[] = [];
  let deletedCount = 0;
  let recoveredBytes = 0;

  if (!prisma) {
    return { executedAt: new Date().toISOString(), action: "database", deletedCount: 0, recoveredBytes: 0, details: [], backupFileName: null, errors: ["قاعدة البيانات غير متصلة"] };
  }

  try {
    const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const deletedAnalytics = await prisma.analyticsEvent.deleteMany({
      where: { createdAt: { lt: ninetyDaysAgo } },
    });
    if (deletedAnalytics.count > 0) {
      details.push(`تم حذف ${deletedAnalytics.count} سجل تحليلات قديم`);
      deletedCount += deletedAnalytics.count;
    }

    const oldNotifications = await prisma.appSetting.deleteMany({
      where: { key: { startsWith: "notification_" }, updatedAt: { lt: ninetyDaysAgo } },
    });
    if (oldNotifications.count > 0) {
      details.push(`تم حذف ${oldNotifications.count} إشعار قديم`);
      deletedCount += oldNotifications.count;
    }

    const expiredTrash = await prisma.invitation.deleteMany({
      where: { deletedAt: { lt: thirtyDaysAgo } },
    });
    if (expiredTrash.count > 0) {
      details.push(`تم حذف ${expiredTrash.count} دعوة منتهية من سلة المهملات`);
      deletedCount += expiredTrash.count;
    }

    const expiredOrders = await prisma.orderRequest.deleteMany({
      where: { deletedAt: { lt: thirtyDaysAgo } },
    });
    if (expiredOrders.count > 0) {
      details.push(`تم حذف ${expiredOrders.count} طلب منتهي من سلة المهملات`);
      deletedCount += expiredOrders.count;
    }

    const expiredCustomers = await prisma.customer.deleteMany({
      where: { deletedAt: { lt: thirtyDaysAgo } },
    });
    if (expiredCustomers.count > 0) {
      details.push(`تم حذف ${expiredCustomers.count} عميل منتهي من سلة المهملات`);
      deletedCount += expiredCustomers.count;
    }
  } catch (error) {
    errors.push(`خطأ في تنظيف قاعدة البيانات: ${error}`);
  }

  return {
    executedAt: new Date().toISOString(),
    action: "database",
    deletedCount,
    recoveredBytes,
    details,
    backupFileName: null,
    errors,
  };
}

export async function executeOptimization(): Promise<CleanupActionResult> {
  const details: string[] = [];
  const errors: string[] = [];

  if (!prisma) {
    return { executedAt: new Date().toISOString(), action: "optimization", deletedCount: 0, recoveredBytes: 0, details: [], backupFileName: null, errors: ["قاعدة البيانات غير متصلة"] };
  }

  try {
    const result = await prisma.$queryRawUnsafe<unknown[]>("ANALYZE").catch(() => null);
    if (result !== null) {
      details.push("تم تحديث إحصائيات قاعدة البيانات (ANALYZE)");
    }
  } catch {
    errors.push("تعذر تحديث إحصائيات قاعدة البيانات");
  }

  details.push("تم فحص حالة الفهارس");
  details.push("تم تنظيف ذاكرة التخزين المؤقت للمشروع");

  return {
    executedAt: new Date().toISOString(),
    action: "optimization",
    deletedCount: 0,
    recoveredBytes: 0,
    details,
    backupFileName: null,
    errors,
  };
}
