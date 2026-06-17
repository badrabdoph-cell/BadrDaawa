import {
  Archive,
  Clock,
  CloudDownload,
  Database,
  DatabaseBackup,
  FileArchive,
  FileJson,
  Github,
  HardDrive,
  History,
  ShieldCheck,
  ShieldAlert,
  TriangleAlert,
} from "lucide-react";
import { getBackupRuntimeStatus, listBackupSnapshots } from "@/lib/backups";
import { VerifyBackupButton } from "./VerifyBackupButton";
import { RestoreBackupButton } from "./RestoreBackupButton";

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

function healthLevel(
  pg: { status: string },
  uploads: { status: string },
  github: { status: string },
): "ok" | "warning" | "error" {
  if (pg.status === "unknown" || uploads.status === "missing" || github.status === "failed") return "error";
  if (uploads.status === "unknown" || github.status === "not_configured") return "warning";
  return "ok";
}

export default async function BackupsPage({
  searchParams,
}: {
  searchParams: Promise<{ created?: string; error?: string }>;
}) {
  const [params, backups, runtimeStatus] = await Promise.all([
    searchParams,
    listBackupSnapshots(),
    getBackupRuntimeStatus(),
  ]);
  const latest = backups[0];
  const totalSize = backups.reduce((sum, backup) => sum + backup.sizeBytes, 0);
  const overall = healthLevel(
    runtimeStatus.postgresDump,
    runtimeStatus.uploadsBackup,
    runtimeStatus.githubBackup,
  );

  return (
    <>
      {/* ── Page Head ── */}
      <div className="dashboard-head">
        <div>
          <span className="eyebrow">Backup & Disaster Recovery</span>
          <h1>النسخ الاحتياطي</h1>
          <p>لوحة تحكم النسخ الاحتياطي والتعافي من الكوارث — Runtime Data, PostgreSQL, Uploads, GitHub.</p>
        </div>
        <span
          className={`admin-health-pill ${overall === "ok" ? "good" : overall === "error" ? "danger" : "pending"}`}
        >
          {overall === "ok" ? (
            <ShieldCheck size={16} />
          ) : (
            <ShieldAlert size={16} />
          )}
          {overall === "ok"
            ? "كل الأنظمة سليمة"
            : overall === "warning"
              ? "توجد تحذيرات"
              : "توجد أخطاء"}
        </span>
      </div>

      {/* ── URL Param Notifications ── */}
      {params.created ? (
        <div className="notice success">
          <ShieldCheck size={18} />
          تم إنشاء النسخة: <strong>{params.created}</strong>
        </div>
      ) : null}
      {params.error === "create" ? (
        <div className="notice danger">
          فشل إنشاء النسخة. راجع سجلات BackupJob وتأكد من توفر DATABASE_URL
          وإمكانية الوصول إلى Storage.
        </div>
      ) : null}

      {/* ── Section 1: Subsystem Health ── */}
      <div className="backup-health-grid">
        {/* PostgreSQL Dump */}
        <article
          className={`panel backup-health-card backup-health-card--${
            runtimeStatus.postgresDump.status === "unknown" ? "error" : "ok"
          }`}
        >
          <div className="backup-health-header">
            <Database size={22} />
            <span
              className={`admin-health-pill ${
                runtimeStatus.postgresDump.status === "unknown"
                  ? "danger"
                  : "good"
              }`}
            >
              {runtimeStatus.postgresDump.status === "unknown"
                ? "خطأ"
                : "سليم"}
            </span>
          </div>
          <h2>PostgreSQL Dump</h2>
          <strong>{runtimeStatus.postgresDump.status}</strong>
          <p>{runtimeStatus.postgresDump.detail}</p>
        </article>

        {/* Uploads Backup */}
        <article
          className={`panel backup-health-card backup-health-card--${
            runtimeStatus.uploadsBackup.status === "ok"
              ? "ok"
              : runtimeStatus.uploadsBackup.status === "missing"
                ? "error"
                : "warning"
          }`}
        >
          <div className="backup-health-header">
            <HardDrive size={22} />
            <span
              className={`admin-health-pill ${
                runtimeStatus.uploadsBackup.status === "ok"
                  ? "good"
                  : runtimeStatus.uploadsBackup.status === "missing"
                    ? "danger"
                    : "pending"
              }`}
            >
              {runtimeStatus.uploadsBackup.status === "ok"
                ? "سليم"
                : runtimeStatus.uploadsBackup.status === "missing"
                  ? "مفقود"
                  : "تحذير"}
            </span>
          </div>
          <h2>Uploads Backup</h2>
          <strong>
            {runtimeStatus.uploadsBackup.files !== null
              ? `${runtimeStatus.uploadsBackup.files} ملف`
              : runtimeStatus.uploadsBackup.status}
          </strong>
          <p>{runtimeStatus.uploadsBackup.detail}</p>
        </article>

        {/* GitHub Sync */}
        <article
          className={`panel backup-health-card backup-health-card--${
            runtimeStatus.githubBackup.status === "ok"
              ? "ok"
              : runtimeStatus.githubBackup.status === "failed"
                ? "error"
                : "warning"
          }`}
        >
          <div className="backup-health-header">
            <Github size={22} />
            <span
              className={`admin-health-pill ${
                runtimeStatus.githubBackup.status === "ok"
                  ? "good"
                  : runtimeStatus.githubBackup.status === "failed"
                    ? "danger"
                    : "pending"
              }`}
            >
              {runtimeStatus.githubBackup.status === "ok"
                ? "سليم"
                : runtimeStatus.githubBackup.status === "failed"
                  ? "فشل"
                  : "غير مهيأ"}
            </span>
          </div>
          <h2>GitHub Backup</h2>
          <strong>{runtimeStatus.githubBackup.status}</strong>
          <p>{runtimeStatus.githubBackup.detail}</p>
          {runtimeStatus.githubBackup.commitSha ? (
            <p style={{ fontSize: "0.8rem", direction: "ltr", textAlign: "left" }}>
              SHA: {runtimeStatus.githubBackup.commitSha}
            </p>
          ) : null}
        </article>
      </div>

      {/* ── Section 2: Latest Backup Stats + Details ── */}
      <div className="backup-latest-section">
        <div className="backup-latest-grid">
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
          <article className="panel backup-status-card">
            <Clock size={24} />
            <span>النسخة القادمة</span>
            <strong>
              {runtimeStatus.nextScheduledAt
                ? formatBackupDate(runtimeStatus.nextScheduledAt)
                : "غير مجدول"}
            </strong>
          </article>
        </div>

        {/* Latest backup detailed info */}
        {runtimeStatus.latestSuccessful ? (
          <div className="panel">
            <div className="admin-card-head">
              <FileArchive size={22} />
              <div>
                <span className="eyebrow">Latest Backup</span>
                <h2>آخر نسخة ناجحة</h2>
              </div>
            </div>
            <div className="backup-detail-grid">
              <div className="backup-detail-row">
                <span className="backup-detail-label">الملف</span>
                <span className="backup-detail-value">
                  {runtimeStatus.latestSuccessful.fileName}
                </span>
              </div>
              <div className="backup-detail-row">
                <span className="backup-detail-label">النوع</span>
                <span className="backup-detail-value">
                  {runtimeStatus.latestSuccessful.type}
                </span>
              </div>
              <div className="backup-detail-row">
                <span className="backup-detail-label">تاريخ الإنشاء</span>
                <span className="backup-detail-value">
                  {formatBackupDate(runtimeStatus.latestSuccessful.createdAt)}
                </span>
              </div>
              <div className="backup-detail-row">
                <span className="backup-detail-label">الحجم</span>
                <span className="backup-detail-value">
                  {formatBytes(runtimeStatus.latestSuccessful.sizeBytes)}
                </span>
              </div>
              <div className="backup-detail-row">
                <span className="backup-detail-label">المدة</span>
                <span className="backup-detail-value">
                  {formatDuration(runtimeStatus.latestSuccessful.durationMs)}
                </span>
              </div>
              <div className="backup-detail-row">
                <span className="backup-detail-label">الملف المحلي</span>
                <span className="backup-detail-value">
                  {runtimeStatus.latestSuccessful.localFileExists
                    ? "موجود"
                    : "غير موجود"}
                </span>
              </div>
              {runtimeStatus.latestSuccessful.commitSha ? (
                <div className="backup-detail-row">
                  <span className="backup-detail-label">Commit SHA</span>
                  <span className="backup-detail-value">
                    {runtimeStatus.latestSuccessful.commitSha}
                  </span>
                </div>
              ) : null}
              {runtimeStatus.latestSuccessful.githubFileUrl ? (
                <div className="backup-detail-row">
                  <span className="backup-detail-label">GitHub URL</span>
                  <span className="backup-detail-value">
                    <a
                      href={runtimeStatus.latestSuccessful.githubFileUrl}
                      target="_blank"
                      rel="noreferrer"
                    >
                      {runtimeStatus.latestSuccessful.githubFileUrl}
                    </a>
                  </span>
                </div>
              ) : null}
            </div>
          </div>
        ) : null}
      </div>

      {/* ── Section 3: Quick Actions Bar ── */}
      <div className="backup-action-bar">
        <form action="/api/admin/backups" method="post">
          <button className="btn btn-gold btn-glow" type="submit">
            <DatabaseBackup size={18} />
            إنشاء نسخة يدوية
          </button>
        </form>
        <VerifyBackupButton />
        <a className="btn btn-soft" href="/admin/diagnostics">
          Diagnostics
        </a>
        <a className="btn btn-soft" href="/admin/sync-settings">
          الإعدادات
        </a>
        <span className="backup-action-meta">
          {backups.length} نسخة · {formatBytes(totalSize)}
        </span>
      </div>

      {/* ── Section 4: Last Error ── */}
      {runtimeStatus.lastError ? (
        <div className="system-health-inline-error">
          <TriangleAlert size={16} />
          <span>
            آخر خطأ: {runtimeStatus.lastError.message} (
            {runtimeStatus.lastError.type || "unknown"}) —
            {runtimeStatus.lastError.createdAt
              ? formatBackupDate(runtimeStatus.lastError.createdAt)
              : "وقت غير متاح"}
          </span>
        </div>
      ) : null}

      {/* ── Section 5: Backup History ── */}
      <div className="panel" style={{ padding: 0, overflow: "hidden", marginBottom: 18 }}>
        <div className="backup-history-header">
          <h3>سجل النسخ</h3>
          <span className="backup-history-count">
            إجمالي {backups.length} نسخة
          </span>
        </div>
        <div className="table-shell">
          <table className="data-table">
            <thead>
              <tr>
                <th>الملف</th>
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
                    <td>
                      <span
                        className={`status ${backup.status === "SUCCESS" ? "success" : "danger"}`}
                      >
                        {backup.status}
                      </span>
                    </td>
                    <td>{formatBytes(backup.sizeBytes)}</td>
                    <td>{formatBackupDate(backup.createdAt)}</td>
                    <td>
                      <div className="button-row">
                        <a
                          className="btn btn-soft btn-icon"
                          href={`/api/admin/backups/${backup.fileName}`}
                          title="تحميل"
                        >
                          <CloudDownload size={17} />
                        </a>
                        <RestoreBackupButton fileName={backup.fileName} />
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5}>
                    <div className="admin-empty-state">
                      <strong>لا توجد نسخ احتياطية حتى الآن</strong>
                      <p>اضغط "إنشاء نسخة يدوية" وسيظهر الملف هنا مباشرة.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Section 6: Restore Center ── */}
      <div className="panel backup-restore-panel">
        <div className="admin-card-head">
          <History size={22} />
          <div>
            <span className="eyebrow">Restore Center</span>
            <h2>مركز الاستعادة</h2>
          </div>
        </div>
        <div className="backup-sync-note">
          <ShieldAlert size={18} />
          <span>
            اختر نسخة من الجدول أعلاه واضغط على زر الاستعادة. سيتم حذف جميع
            البيانات الحالية واستبدالها ببيانات النسخة.
          </span>
        </div>
        {process.env.ALLOW_DESTRUCTIVE_RESTORE ? (
          <span className="backup-restore-env set">
            <ShieldCheck size={15} />
            متغير البيئة ALLOW_DESTRUCTIVE_RESTORE مُهيأ — الاستعادة مفعلة
          </span>
        ) : (
          <span className="backup-restore-env unset">
            <ShieldAlert size={15} />
            متغير البيئة ALLOW_DESTRUCTIVE_RESTORE غير مُهيأ — الاستعادة غير
            مفعلة
          </span>
        )}
        <p style={{ margin: 0, color: "rgba(245, 234, 214, 0.66)", fontWeight: 850, lineHeight: 1.65, fontSize: "0.85rem" }}>
          لتفعيل الاستعادة، يجب تعيين المتغير البيئي{" "}
          <code
            style={{
              direction: "ltr",
              display: "inline-block",
              background: "rgba(245, 234, 214, 0.08)",
              padding: "2px 8px",
              borderRadius: 6,
            }}
          >
            ALLOW_DESTRUCTIVE_RESTORE=I_UNDERSTAND_THIS_OVERWRITES_POSTGRESQL
          </code>
        </p>
      </div>
    </>
  );
}
