import type { Metadata } from "next";
import { AlertTriangle, BarChart3, CheckCircle2, CopyCheck, DatabaseBackup, FileAudio, FileImage, Filter, HardDrive, ImageOff, Music2, RotateCw, Search, ShieldCheck, Trash2 } from "lucide-react";

export const metadata: Metadata = { title: "الوسائط - لوحة الإدارة" };
import { getMediaCleanupReport, type MediaCleanupReport, type MediaFileReportItem, type MediaKind, type StorageCleanupAction } from "@/lib/media-cleanup";
import { formatArabicNumber } from "@/lib/utils";
import { MediaBrowser } from "./media-browser";

export const dynamic = "force-dynamic";

type MediaPageParams = {
  q?: string;
  type?: "all" | MediaKind;
  usage?: "all" | "used" | "unused";
  deleted?: string;
  skipped?: string;
  size?: string;
  backup?: string;
  mediaSaved?: string;
  mediaError?: string;
  cleanupAction?: StorageCleanupAction;
  deletedRecords?: string;
};

function formatBytes(value: number) {
  if (!value) return "0 KB";
  if (value < 1024 * 1024) return `${formatArabicNumber(Math.max(1, Math.round(value / 1024)))} KB`;
  return `${formatArabicNumber(Number((value / (1024 * 1024)).toFixed(1)))} MB`;
}

function errorMessage(value?: string) {
  if (!value) return "";
  if (value === "used") return "لا يمكن حذف ملف مستخدم داخل النظام.";
  if (value === "extension") return "يجب أن يكون الملف البديل بنفس الامتداد حتى لا تنكسر الروابط الحالية.";
  if (value === "file") return "اختار ملفاً صالحاً للاستبدال.";
  if (value === "missing") return "لم يتم العثور على الملف.";
  if (value === "confirm") return "اكتب كلمة تنظيف في خانة التأكيد قبل تنفيذ أي حذف.";
  return "تعذر تنفيذ العملية.";
}

const cleanupActions: Array<{ action: StorageCleanupAction; title: string; description: string; icon: typeof ImageOff; getCount: (report: MediaCleanupReport) => number; getSize: (report: MediaCleanupReport) => number }> = [
  {
    action: "orphans",
    title: "تنظيف الملفات اليتيمة",
    description: "ملفات داخل uploads لا تشير إليها الدعوات أو الطلبات أو القوالب أو الإعدادات أو مكتبة الموسيقى.",
    icon: ImageOff,
    getCount: (report) => report.orphanFiles.length,
    getSize: (report) => report.orphanFiles.reduce((sum, file) => sum + file.sizeBytes, 0),
  },
  {
    action: "duplicates",
    title: "تنظيف الملفات المكررة",
    description: "نسخ لها نفس المحتوى بالهاش، مع حذف النسخ غير المستخدمة فقط.",
    icon: CopyCheck,
    getCount: (report) => report.duplicateFiles.length,
    getSize: (report) => report.duplicateSizeBytes,
  },
  {
    action: "original-images",
    title: "تنظيف الصور الأصلية غير المستخدمة",
    description: "صور كبيرة بصيغ أصلية لم يعد لها أي مرجع فعلي داخل النظام.",
    icon: FileImage,
    getCount: (report) => report.unusedOriginalImages.length,
    getSize: (report) => report.unusedOriginalImages.reduce((sum, file) => sum + file.sizeBytes, 0),
  },
  {
    action: "music-unused",
    title: "تنظيف الموسيقى غير المستخدمة",
    description: "ملفات صوت غير مرتبطة بأي دعوة أو طلب أو مكتبة موسيقى أو إعداد.",
    icon: Music2,
    getCount: (report) => report.unusedMusicFiles.length,
    getSize: (report) => report.unusedMusicFiles.reduce((sum, file) => sum + file.sizeBytes, 0),
  },
  {
    action: "database-orphans",
    title: "تنظيف سجلات قاعدة البيانات اليتيمة",
    description: "رسائل تهنئة، RSVP غير مباشر، Check-ins، Live Mode، رسائل عملاء، وملاحظات داخلية لا تشير إلى دعوة أو طلب أو عميل موجود.",
    icon: DatabaseBackup,
    getCount: (report) => report.databaseOrphanRecords,
    getSize: () => 0,
  },
  {
    action: "old-backups",
    title: "تنظيف النسخ الاحتياطية القديمة",
    description: "نسخ أقدم من سياسة الاحتفاظ أو مكررة، مع الحفاظ على أحدث نسخ لكل نوع.",
    icon: DatabaseBackup,
    getCount: (report) => report.oldBackupFiles.length,
    getSize: (report) => report.oldBackupFiles.reduce((sum, file) => sum + file.sizeBytes, 0),
  },
  {
    action: "all",
    title: "تنظيف شامل",
    description: "تنظيف كل الملفات والنسخ والسجلات اليتيمة القابلة للحذف بعد إنشاء Backup وإعادة الفحص.",
    icon: RotateCw,
    getCount: (report) => report.orphanFiles.length + report.oldBackupFiles.length + report.databaseOrphanRecords,
    getSize: (report) => report.recoverableSizeBytes,
  },
];

function filterFiles(files: MediaFileReportItem[], params: MediaPageParams) {
  const query = (params.q || "").trim().toLowerCase();
  const type = params.type || "all";
  const usage = params.usage || "all";
  return files.filter((file) => {
    const haystack = [file.url, file.relativePath, file.extension, ...file.sources, ...file.usageDetails.map((item) => item.label)].join(" ").toLowerCase();
    return (!query || haystack.includes(query)) && (type === "all" || file.kind === type) && (usage === "all" || (usage === "used" ? file.sources.length > 0 : file.sources.length === 0));
  });
}

function CleanupActionCard({ report, actionConfig }: { report: MediaCleanupReport; actionConfig: (typeof cleanupActions)[number] }) {
  const Icon = actionConfig.icon;
  const count = actionConfig.getCount(report);
  const size = actionConfig.getSize(report);
  return (
    <article className="media-cleanup-action-card">
      <div>
        <Icon size={20} />
        <div>
          <strong>{actionConfig.title}</strong>
          <small>{actionConfig.description}</small>
        </div>
      </div>
      <span>{formatArabicNumber(count)} عنصر · {formatBytes(size)}</span>
      <form action="/api/admin/media/cleanup" method="post">
        <input type="hidden" name="cleanupAction" value={actionConfig.action} />
        <input name="confirmText" placeholder="اكتب تنظيف" aria-label={`تأكيد ${actionConfig.title}`} />
        <button className="btn btn-soft danger-button" type="submit" disabled={!count}>
          <Trash2 size={16} />
          تنفيذ
        </button>
      </form>
    </article>
  );
}

export default async function AdminMediaPage({ searchParams }: { searchParams: Promise<MediaPageParams> }) {
  const [params, report] = await Promise.all([searchParams, getMediaCleanupReport()]);
  const deletedCount = Number(params.deleted || 0);
  const deletedRecords = Number(params.deletedRecords || 0);
  const skippedCount = Number(params.skipped || 0);
  const allFiles = report.usedFiles.concat(report.unusedFiles);
  const filteredFiles = filterFiles(allFiles, params);
  const error = errorMessage(params.mediaError);

  return (
    <>
      <div className="dashboard-head">
        <div>
          <span className="eyebrow">Media Library</span>
          <h1>مكتبة الوسائط</h1>
          <p>مركز واحد لكل الصور وملفات الصوت المرفوعة، مع البحث، التصفية، معرفة أماكن الاستخدام، النسخ، الاستبدال، والحذف الآمن.</p>
        </div>
      </div>

      {params.backup && params.deleted ? (
        <div className="notice success"><CheckCircle2 size={18} /> تم حذف {formatArabicNumber(deletedCount)} ملف/نسخة و {formatArabicNumber(deletedRecords)} سجل قاعدة بيانات بحجم {formatBytes(Number(params.size || 0))}. Backup: {params.backup}</div>
      ) : null}
      {params.mediaSaved ? (
        <div className="notice success"><CheckCircle2 size={18} /> {params.mediaSaved === "replaced" ? "تم استبدال الملف مع الحفاظ على الرابط." : "تم حذف الملف."} {params.backup ? `Backup: ${params.backup}` : ""}</div>
      ) : null}
      {error ? <div className="notice danger"><AlertTriangle size={18} /> {error}</div> : null}
      {skippedCount ? <div className="notice danger"><AlertTriangle size={18} /> تم تخطي {formatArabicNumber(skippedCount)} ملف أثناء التنظيف.</div> : null}

      <section className="media-stats-grid">
        <article className="admin-list-stat"><BarChart3 size={19} /><span>كل الملفات</span><strong>{formatArabicNumber(report.totalFiles)}</strong></article>
        <article className="admin-list-stat"><HardDrive size={19} /><span>الحجم الكلي</span><strong>{formatBytes(report.totalSizeBytes)}</strong></article>
        <article className="admin-list-stat good"><ShieldCheck size={19} /><span>مستخدم</span><strong>{formatArabicNumber(report.usedFiles.length)} · {formatBytes(report.usedSizeBytes)}</strong></article>
        <article className="admin-list-stat danger"><ImageOff size={19} /><span>يتيم</span><strong>{formatArabicNumber(report.orphanFiles.length)} · {formatBytes(report.unusedSizeBytes)}</strong></article>
        <article className="admin-list-stat danger"><HardDrive size={19} /><span>قابل للاسترداد</span><strong>{formatBytes(report.recoverableSizeBytes)}</strong></article>
        <article className="admin-list-stat danger"><DatabaseBackup size={19} /><span>سجلات يتيمة</span><strong>{formatArabicNumber(report.databaseOrphanRecords)}</strong></article>
      </section>

      <section className="media-stats-grid">
        <article className="admin-list-stat good"><FileImage size={19} /><span>الصور</span><strong>{formatArabicNumber(report.imageFiles)}</strong></article>
        <article className="admin-list-stat good"><FileAudio size={19} /><span>الصوت</span><strong>{formatArabicNumber(report.audioFiles)}</strong></article>
        <article className="admin-list-stat good"><FileAudio size={19} /><span>الفيديو</span><strong>{formatArabicNumber(report.videoFiles)}</strong></article>
        <article className="admin-list-stat good"><FileImage size={19} /><span>صور مقابل أخرى</span><strong>{formatArabicNumber(report.imageFiles)} / {formatArabicNumber(report.audioFiles + report.videoFiles)}</strong></article>
        <article className="admin-list-stat"><CopyCheck size={19} /><span>مكرر</span><strong>{formatArabicNumber(report.duplicateFiles.length)} · {formatBytes(report.duplicateSizeBytes)}</strong></article>
        <article className="admin-list-stat"><Music2 size={19} /><span>موسيقى غير مستخدمة</span><strong>{formatArabicNumber(report.unusedMusicFiles.length)}</strong></article>
      </section>

      <section className="panel media-library-toolbar">
        <form action="/admin/media" method="get">
          <label className="media-search-field"><Search size={17} /><input name="q" defaultValue={params.q || ""} placeholder="ابحث باسم الملف أو مكان الاستخدام" /></label>
          <label><Filter size={16} /><select name="type" defaultValue={params.type || "all"}><option value="all">كل الأنواع</option><option value="image">صور</option><option value="audio">صوت</option><option value="video">فيديو</option></select></label>
          <label><ShieldCheck size={16} /><select name="usage" defaultValue={params.usage || "all"}><option value="all">كل الاستخدامات</option><option value="used">مستخدم</option><option value="unused">غير مستخدم</option></select></label>
          <button className="btn btn-soft" type="submit">تطبيق</button>
        </form>
        <a className="btn btn-soft" href="/admin/media?scan=1">
          <Search size={17} />
          فحص فقط
        </a>
      </section>

      <section className="panel media-cleanup-panel">
        <div className="admin-card-head">
          <DatabaseBackup size={22} />
          <div>
            <span className="eyebrow">Storage Maintenance</span>
            <h2>تقرير الصيانة والتنظيف</h2>
          </div>
        </div>
        <div className="media-cleanup-summary">
          <span>آخر فحص: {new Date(report.generatedAt).toLocaleString("ar-EG-u-nu-latn")}</span>
          <span>المكرر: {formatArabicNumber(report.duplicateGroups.length)} مجموعة</span>
          <span>المؤقت القديم: {formatArabicNumber(report.oldTemporaryFiles.length)} ملف</span>
          <span>النسخ الاحتياطية: {formatArabicNumber(report.backupFiles.length)} نسخة</span>
          <span>سجلات PostgreSQL اليتيمة: {formatArabicNumber(report.databaseOrphanRecords)} سجل</span>
        </div>
        {report.databaseOrphans.length ? (
          <div className="media-cleanup-summary database-orphans">
            {report.databaseOrphans.map((group) => (
              <span key={group.kind}>{group.label}: {formatArabicNumber(group.count)}</span>
            ))}
          </div>
        ) : null}
        <p className="media-cleanup-warning">
          قبل أي حذف يتم إنشاء Backup تلقائي ثم إعادة الفحص. اكتب كلمة <strong>تنظيف</strong> داخل الإجراء المطلوب لتأكيد التنفيذ.
        </p>
        <div className="media-cleanup-actions-grid">
          {cleanupActions.map((actionConfig) => (
            <CleanupActionCard report={report} actionConfig={actionConfig} key={actionConfig.action} />
          ))}
        </div>
      </section>

      <section className="panel media-cleanup-panel">
        <div className="admin-card-head">
          <FileImage size={22} />
          <div>
            <span className="eyebrow">Files</span>
            <h2>كل الوسائط</h2>
          </div>
        </div>
        <MediaBrowser files={filteredFiles} />
      </section>
    </>
  );
}
