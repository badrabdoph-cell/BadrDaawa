import { Archive, CloudDownload, DatabaseBackup, FileJson, ShieldCheck } from "lucide-react";
import { getBackupRuntimeStatus, listBackupSnapshots } from "@/lib/backups";
import { VerifyBackupButton } from "./VerifyBackupButton";

export const dynamic = "force-dynamic";

function formatBytes(value: number) {
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
}

function formatBackupDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("ar-EG-u-nu-latn", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function formatDuration(value: number | null) {
  if (value === null) return "غير متاح";
  if (value < 1000) return `${value}ms`;
  return `${(value / 1000).toFixed(1)}s`;
}

export default async function BackupsPage({
  searchParams,
}: {
  searchParams: Promise<{ created?: string; error?: string }>;
}) {
  const [params, backups, runtimeStatus] = await Promise.all([searchParams, listBackupSnapshots(), getBackupRuntimeStatus()]);
  const latest = backups[0];
  const totalSize = backups.reduce((sum, backup) => sum + backup.sizeBytes, 0);

  return (
    <>
      <div className="dashboard-head">
        <div>
          <span className="eyebrow">Backups</span>
          <h1>النسخ الاحتياطي</h1>
          <p>نسخ Runtime Data وملفات العملاء تُحفظ محلياً ثم تُرفع إلى GitHub داخل `backups/YYYY/MM/` بعد التحقق من وجودها.</p>
        </div>
        <form action="/api/admin/backups" method="post">
          <button className="btn btn-gold btn-glow" type="submit">
            <DatabaseBackup size={18} />
            إنشاء نسخة يدوية
          </button>
        </form>
      </div>

      {params.created ? (
        <div className="notice success">
          <ShieldCheck size={18} />
          تم إنشاء النسخة: <strong>{params.created}</strong>
        </div>
      ) : null}
      {params.error === "manual-restore-only" ? (
        <div className="notice danger">الاستعادة داخل التطبيق متوقفة. الاستعادة تتم يدوياً فقط عبر PostgreSQL بعد اختيار ملف backup مقصود.</div>
      ) : params.error === "create" ? (
        <div className="notice danger">فشل إنشاء النسخة. راجع سجلات BackupJob وتأكد من توفر DATABASE_URL وإمكانية الوصول إلى Storage.</div>
      ) : null}

      <nav className="admin-page-tabs" aria-label="أقسام النسخ الاحتياطي">
        <a href="#backup-create">النسخ</a>
        <a href="#backup-restore">سياسة الاستعادة</a>
        <a href="#backup-log">السجل</a>
        <a href="/admin/diagnostics">Diagnostics</a>
        <a href="/admin/sync-settings">الإعدادات</a>
      </nav>

      <section id="backup-create" className="admin-tab-section" aria-label="ملخص النسخ">
      <div className="panel" style={{ marginBottom: 16 }}>
        <div className="admin-card-head">
          <DatabaseBackup size={22} />
          <div>
            <span className="eyebrow">Backup Status</span>
            <h2>حالة النسخ الحالية</h2>
          </div>
        </div>
        <div className="backup-status-grid" style={{ marginTop: 16 }}>
          <article className="panel backup-status-card">
            <span>آخر Backup ناجح</span>
            <strong>{runtimeStatus.latestSuccessful ? runtimeStatus.latestSuccessful.fileName : "لا يوجد"}</strong>
          </article>
          <article className="panel backup-status-card">
            <span>النوع</span>
            <strong>{runtimeStatus.latestSuccessful?.type || "غير متاح"}</strong>
          </article>
          <article className="panel backup-status-card">
            <span>وقت الإنشاء</span>
            <strong>{runtimeStatus.latestSuccessful ? formatBackupDate(runtimeStatus.latestSuccessful.createdAt) : "غير متاح"}</strong>
          </article>
          <article className="panel backup-status-card">
            <span>حجم الملف</span>
            <strong>{runtimeStatus.latestSuccessful ? formatBytes(runtimeStatus.latestSuccessful.sizeBytes) : "غير متاح"}</strong>
          </article>
          <article className="panel backup-status-card">
            <span>مدة التنفيذ</span>
            <strong>{formatDuration(runtimeStatus.latestSuccessful?.durationMs ?? null)}</strong>
          </article>
          <article className="panel backup-status-card">
            <span>PostgreSQL Dump</span>
            <strong>{runtimeStatus.postgresDump.status}</strong>
          </article>
          <article className="panel backup-status-card">
            <span>Uploads Backup</span>
            <strong>{runtimeStatus.uploadsBackup.status}</strong>
          </article>
          <article className="panel backup-status-card">
            <span>GitHub Backup</span>
            <strong>{runtimeStatus.githubBackup.status}</strong>
          </article>
          <article className="panel backup-status-card">
            <span>الملف المحلي موجود</span>
            <strong>{runtimeStatus.latestSuccessful?.localFileExists ? "نعم" : "لا"}</strong>
          </article>
          <article className="panel backup-status-card">
            <span>GitHub Upload Success</span>
            <strong>{runtimeStatus.latestSuccessful?.githubUploadSuccess ? "نعم" : "لا"}</strong>
          </article>
          <article className="panel backup-status-card">
            <span>Commit SHA</span>
            <strong>{runtimeStatus.latestSuccessful?.commitSha || "غير متاح"}</strong>
          </article>
          <article className="panel backup-status-card">
            <span>النسخة القادمة</span>
            <strong>{runtimeStatus.nextScheduledAt ? formatBackupDate(runtimeStatus.nextScheduledAt) : "غير متاح"}</strong>
          </article>
        </div>
        <div className="backup-sync-note" style={{ marginTop: 14 }}>
          <ShieldCheck size={18} />
          <span>
            Uploads: {runtimeStatus.uploadsBackup.detail}
            {" | "}
            PostgreSQL Dump: {runtimeStatus.postgresDump.detail}
            {" | "}
            GitHub: {runtimeStatus.githubBackup.detail}
          </span>
        </div>
        {runtimeStatus.latestSuccessful?.githubFileUrl ? (
          <div className="backup-sync-note" style={{ marginTop: 10 }}>
            <FileJson size={18} />
            <a href={runtimeStatus.latestSuccessful.githubFileUrl} target="_blank" rel="noreferrer">
              {runtimeStatus.latestSuccessful.githubFileUrl}
            </a>
          </div>
        ) : null}
        {runtimeStatus.lastError ? (
          <div className="notice danger" style={{ marginTop: 12 }}>
            آخر خطأ: {runtimeStatus.lastError.message} ({runtimeStatus.lastError.type || "unknown"} - {runtimeStatus.lastError.createdAt ? formatBackupDate(runtimeStatus.lastError.createdAt) : "وقت غير متاح"})
          </div>
        ) : null}
      </div>

      <VerifyBackupButton />

      <div className="backup-status-grid">
        <article className="panel backup-status-card">
          <Archive size={24} />
          <span>عدد النسخ</span>
          <strong>{backups.length}</strong>
        </article>
        <article className="panel backup-status-card">
          <FileJson size={24} />
          <span>إجمالي الحجم</span>
          <strong>{formatBytes(totalSize)}</strong>
        </article>
        <article className="panel backup-status-card">
          <DatabaseBackup size={24} />
          <span>آخر نسخة</span>
          <strong>{latest ? formatBackupDate(latest.createdAt) : "لا توجد"}</strong>
        </article>
      </div>

      <div className="backup-sync-note">
        <ShieldCheck size={18} />
        <span>PostgreSQL هو مصدر الحقيقة للتشغيل. النسخة تحتوي Runtime Data وملفات العملاء فقط، ثم تُرفع كملف backup منفصل إلى GitHub بدون تغيير مسار Project Content Sync.</span>
      </div>
      </section>

      <section id="backup-restore" className="admin-tab-section" aria-label="استعادة النسخ الاحتياطية">
        <div className="backup-sync-note">
          <ShieldCheck size={18} />
          <span>Backups للRecovery فقط. لا توجد استعادة تلقائية أو استعادة من GitHub داخل التطبيق. الاستعادة اليدوية تتم خارج التطبيق باستخدام `scripts/restore-postgres-backup.mjs` على قاعدة PostgreSQL المقصودة.</span>
        </div>
      </section>

      <section id="backup-log" className="admin-tab-section" aria-label="سجل النسخ والاستعادة">
      <div className="table-shell">
        <table className="data-table">
          <thead>
            <tr>
              <th>الملف</th>
              <th>المصدر</th>
              <th>العناصر</th>
              <th>الحالة</th>
              <th>الحجم</th>
              <th>تاريخ الإنشاء</th>
              <th>إجراءات</th>
            </tr>
          </thead>
          <tbody>
            {backups.length ? (
              backups.map((backup) => (
                <tr key={backup.fileName}>
                  <td>
                    <span className="backup-file-name">{backup.fileName}</span>
                  </td>
                  <td>PostgreSQL</td>
                  <td>{backup.items}</td>
                  <td>
                    <span className={`status ${backup.status === "SUCCESS" ? "success" : "danger"}`}>{backup.status}</span>
                  </td>
                  <td>{formatBytes(backup.sizeBytes)}</td>
                  <td>{formatBackupDate(backup.createdAt)}</td>
                  <td>
                    <div className="button-row">
                      <a className="btn btn-soft btn-icon" href={`/api/admin/backups/${backup.fileName}`} title="تحميل">
                        <CloudDownload size={17} />
                      </a>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={7}>
                  <div className="admin-empty-state">
                    <strong>لا توجد نسخ احتياطية حتى الآن</strong>
                    <p>اضغط “إنشاء نسخة يدوية” وسيظهر الملف هنا مباشرة.</p>
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
