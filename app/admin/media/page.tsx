import { AlertTriangle, CheckCircle2, DatabaseBackup, FileAudio, FileImage, Filter, HardDrive, ImageOff, Search, ShieldCheck, Trash2, UploadCloud } from "lucide-react";
import { CopyButton } from "@/components/CopyButton";
import { getMediaCleanupReport, type MediaFileReportItem, type MediaKind } from "@/lib/media-cleanup";
import { formatArabicNumber } from "@/lib/utils";

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
};

function formatBytes(value: number) {
  if (!value) return "0 KB";
  if (value < 1024 * 1024) return `${formatArabicNumber(Math.max(1, Math.round(value / 1024)))} KB`;
  return `${formatArabicNumber(Number((value / (1024 * 1024)).toFixed(1)))} MB`;
}

function sourceLabel(source: string) {
  if (source === "Invitation") return "دعوة";
  if (source === "Order") return "طلب";
  if (source === "Template") return "قالب";
  return "إعدادات";
}

function errorMessage(value?: string) {
  if (!value) return "";
  if (value === "used") return "لا يمكن حذف ملف مستخدم داخل النظام.";
  if (value === "extension") return "يجب أن يكون الملف البديل بنفس الامتداد حتى لا تنكسر الروابط الحالية.";
  if (value === "file") return "اختار ملفاً صالحاً للاستبدال.";
  if (value === "missing") return "لم يتم العثور على الملف.";
  return "تعذر تنفيذ العملية.";
}

function filterFiles(files: MediaFileReportItem[], params: MediaPageParams) {
  const query = (params.q || "").trim().toLowerCase();
  const type = params.type || "all";
  const usage = params.usage || "all";
  return files.filter((file) => {
    const haystack = [file.url, file.relativePath, file.extension, ...file.sources, ...file.usageDetails.map((item) => item.label)].join(" ").toLowerCase();
    return (!query || haystack.includes(query)) && (type === "all" || file.kind === type) && (usage === "all" || (usage === "used" ? file.sources.length > 0 : file.sources.length === 0));
  });
}

function MediaPreview({ file }: { file: MediaFileReportItem }) {
  if (file.kind === "audio") {
    return (
      <div className="media-library-audio-preview">
        <FileAudio size={24} />
        <audio controls preload="none" src={file.url} />
      </div>
    );
  }
  return <img src={file.url} alt="" loading="lazy" />;
}

function MediaRows({ files }: { files: MediaFileReportItem[] }) {
  if (!files.length) {
    return (
      <div className="admin-empty-state compact">
        <ImageOff size={22} />
        <strong>لا توجد ملفات مطابقة.</strong>
      </div>
    );
  }

  return (
    <div className="media-library-grid">
      {files.map((file) => (
        <article className="media-library-card" key={file.url}>
          <div className={file.kind === "audio" ? "media-library-preview audio" : "media-library-preview"}>
            <MediaPreview file={file} />
          </div>
          <div className="media-library-card-body">
            <div>
              <strong>{file.relativePath}</strong>
              <span>{file.kind === "image" ? "صورة" : "صوت"} · {file.extension.toUpperCase()} · {formatBytes(file.sizeBytes)}</span>
            </div>
            <div className="media-source-badges">
              {file.sources.length ? file.sources.map((source) => <em key={source}>{sourceLabel(source)}</em>) : <em className="unused">غير مستخدم</em>}
            </div>
            {file.usageDetails.length ? (
              <div className="media-usage-list">
                {file.usageDetails.slice(0, 5).map((usage, index) => (
                  <small key={`${usage.source}-${usage.label}-${index}`}>{sourceLabel(usage.source)}: {usage.label}</small>
                ))}
                {file.usageDetails.length > 5 ? <small>+ {formatArabicNumber(file.usageDetails.length - 5)} استخدام آخر</small> : null}
              </div>
            ) : null}
            <div className="media-library-actions">
              <CopyButton value={file.url} label="نسخ الرابط" className="btn btn-soft" />
              <form action="/api/admin/media/file" method="post" encType="multipart/form-data" className="media-replace-form">
                <input type="hidden" name="action" value="replace" />
                <input type="hidden" name="url" value={file.url} />
                <label className="btn btn-soft">
                  <UploadCloud size={16} />
                  استبدال
                  <input name="file" type="file" accept={file.kind === "image" ? `image/*,.${file.extension}` : `audio/*,.${file.extension}`} />
                </label>
                <button className="btn btn-soft" type="submit">حفظ</button>
              </form>
              <form action="/api/admin/media/file" method="post">
                <input type="hidden" name="action" value="delete" />
                <input type="hidden" name="url" value={file.url} />
                <button className="btn btn-soft danger-button" type="submit" disabled={file.sources.length > 0} title={file.sources.length ? "لا يمكن حذف ملف مستخدم" : "حذف الملف"}>
                  <Trash2 size={16} />
                  حذف
                </button>
              </form>
            </div>
          </div>
        </article>
      ))}
    </div>
  );
}

export default async function AdminMediaPage({ searchParams }: { searchParams: Promise<MediaPageParams> }) {
  const [params, report] = await Promise.all([searchParams, getMediaCleanupReport()]);
  const deletedCount = Number(params.deleted || 0);
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
        <div className="notice success"><CheckCircle2 size={18} /> تم حذف {formatArabicNumber(deletedCount)} ملف غير مستخدم بحجم {formatBytes(Number(params.size || 0))}. Backup: {params.backup}</div>
      ) : null}
      {params.mediaSaved ? (
        <div className="notice success"><CheckCircle2 size={18} /> {params.mediaSaved === "replaced" ? "تم استبدال الملف مع الحفاظ على الرابط." : "تم حذف الملف."} {params.backup ? `Backup: ${params.backup}` : ""}</div>
      ) : null}
      {error ? <div className="notice danger"><AlertTriangle size={18} /> {error}</div> : null}
      {skippedCount ? <div className="notice danger"><AlertTriangle size={18} /> تم تخطي {formatArabicNumber(skippedCount)} ملف أثناء التنظيف.</div> : null}

      <section className="media-stats-grid">
        <article className="admin-list-stat"><FileImage size={19} /><span>كل الملفات</span><strong>{formatArabicNumber(report.totalFiles)}</strong></article>
        <article className="admin-list-stat"><HardDrive size={19} /><span>الحجم الكلي</span><strong>{formatBytes(report.totalSizeBytes)}</strong></article>
        <article className="admin-list-stat good"><FileImage size={19} /><span>الصور</span><strong>{formatArabicNumber(report.imageFiles)}</strong></article>
        <article className="admin-list-stat good"><FileAudio size={19} /><span>الصوت</span><strong>{formatArabicNumber(report.audioFiles)}</strong></article>
        <article className="admin-list-stat danger"><ImageOff size={19} /><span>غير مستخدم</span><strong>{formatArabicNumber(report.unusedFiles.length)} · {formatBytes(report.unusedSizeBytes)}</strong></article>
      </section>

      <section className="panel media-library-toolbar">
        <form action="/admin/media" method="get">
          <label className="media-search-field"><Search size={17} /><input name="q" defaultValue={params.q || ""} placeholder="ابحث باسم الملف أو مكان الاستخدام" /></label>
          <label><Filter size={16} /><select name="type" defaultValue={params.type || "all"}><option value="all">كل الأنواع</option><option value="image">صور</option><option value="audio">صوت</option></select></label>
          <label><ShieldCheck size={16} /><select name="usage" defaultValue={params.usage || "all"}><option value="all">كل الاستخدامات</option><option value="used">مستخدم</option><option value="unused">غير مستخدم</option></select></label>
          <button className="btn btn-soft" type="submit">تطبيق</button>
        </form>
        <form action="/api/admin/media/cleanup" method="post">
          <button className="btn btn-soft danger-button" type="submit" disabled={!report.unusedFiles.length}>
            <DatabaseBackup size={17} />
            تنظيف غير المستخدم
          </button>
        </form>
      </section>

      <section className="panel media-cleanup-panel">
        <div className="admin-card-head">
          <FileImage size={22} />
          <div>
            <span className="eyebrow">Files</span>
            <h2>كل الوسائط</h2>
          </div>
        </div>
        <MediaRows files={filteredFiles} />
      </section>
    </>
  );
}
