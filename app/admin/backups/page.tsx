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
import { getBackupRuntimeStatus, getScheduledBackupInfo, listBackupSnapshots } from "@/lib/backups";
import { VerifyBackupButton } from "./VerifyBackupButton";
import { RestoreBackupButton } from "./RestoreBackupButton";
import AutoBackupDashboard from "./AutoBackupDashboard";

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
    timeZone: "Africa/Cairo",
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
  const [params, backups, runtimeStatus, scheduledInfo] = await Promise.all([
    searchParams,
    listBackupSnapshots(),
    getBackupRuntimeStatus(),
    getScheduledBackupInfo(),
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
      {/* ════════════════════════════════════════
          HEADER
      ════════════════════════════════════════ */}
      <div className="dashboard-head">
        <div>
          <span className="eyebrow">Backup & Recovery</span>
          <h1>النسخ الاحتياطي</h1>
          <p>مراقبة وإدارة النسخ الاحتياطية لقاعدة البيانات والملفات و GitHub</p>
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

      {/* ════════════════════════════════════════
          NOTIFICATIONS
      ════════════════════════════════════════ */}
      {params.created ? (
        <div className="notice success">
          <ShieldCheck size={18} />
          تم إنشاء النسخة: <strong>{params.created}</strong>
        </div>
      ) : null}
      {params.error === "create" ? (
        <div className="notice danger">
          <TriangleAlert size={18} />
          فشل إنشاء النسخة. راجع سجلات BackupJob وتأكد من توفر DATABASE_URL وإمكانية الوصول إلى Storage.
        </div>
      ) : null}

      {/* ════════════════════════════════════════
          AUTO BACKUP SCHEDULE
      ════════════════════════════════════════ */}
      <AutoBackupDashboard
        lastScheduledAt={scheduledInfo.lastScheduled?.createdAt ?? null}
        lastScheduledSuccessAt={scheduledInfo.lastScheduledSuccess?.createdAt ?? null}
        nextScheduledAt={scheduledInfo.nextScheduledAt}
        recentScheduled={scheduledInfo.recentScheduled}
      />

      <hr className="backup-section-divider" />

      {/* ════════════════════════════════════════
          SUBSYSTEM HEALTH
      ════════════════════════════════════════ */}
      <div className="backup-health-grid">
        <article
          className={`panel backup-health-card backup-health-card--${
            runtimeStatus.postgresDump.status === "unknown" ? "error" : "ok"
          }`}
        >
          <div className="backup-health-header">
            <Database size={22} />
            <span
              className={`admin-health-pill ${
                runtimeStatus.postgresDump.status === "unknown" ? "danger" : "good"
              }`}
            >
              {runtimeStatus.postgresDump.status === "unknown" ? "خطأ" : "سليم"}
            </span>
          </div>
          <h2>PostgreSQL Dump</h2>
          <strong>{runtimeStatus.postgresDump.status}</strong>
          <p>{runtimeStatus.postgresDump.detail}</p>
        </article>

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
            <p style={{ fontSize: "0.78rem", direction: "ltr", textAlign: "left", color: "rgba(245,234,214,0.5)", fontFamily: "var(--font-jetbrains-mono, ui-monospace, monospace)" }}>
              SHA: {runtimeStatus.githubBackup.commitSha}
            </p>
          ) : null}
          {runtimeStatus.githubBackup.githubFileUrl ? (
            <a
              href={runtimeStatus.githubBackup.githubFileUrl}
              target="_blank"
              rel="noreferrer"
              style={{ fontSize: "0.78rem", color: "#f3cf73", textDecoration: "underline", textUnderlineOffset: 2 }}
            >
              عرض على GitHub
            </a>
          ) : null}
        </article>
      </div>

      <hr className="backup-section-divider" />

      {/* ════════════════════════════════════════
          QUICK ACTIONS
      ════════════════════════════════════════ */}
      <div className="panel" style={{ marginBottom: 18 }}>
        <div className="admin-card-head">
          <DatabaseBackup size={20} />
          <div>
            <span className="eyebrow">Quick Actions</span>
            <h2>إجراءات سريعة</h2>
          </div>
        </div>
        <div className="backup-action-menu" style={{ marginTop: 14 }}>
          <form action="/api/admin/backups" method="post">
            <button className="btn btn-gold btn-glow" type="submit">
              <DatabaseBackup size={17} />
              إنشاء نسخة يدوية
            </button>
          </form>
          <span className="backup-action-divider" />
          <VerifyBackupButton />
          <span className="backup-action-divider" />
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
      </div>

      {/* ════════════════════════════════════════
          METRICS
      ════════════════════════════════════════ */}
      <div className="backup-metrics-grid">
        <div className="backup-metric-card">
          <Archive size={20} className="metric-icon" />
          <span className="metric-label">عدد النسخ</span>
          <span className="metric-value">{backups.length}</span>
        </div>
        <div className="backup-metric-card">
          <FileJson size={20} className="metric-icon" />
          <span className="metric-label">إجمالي الحجم</span>
          <span className="metric-value">{formatBytes(totalSize)}</span>
        </div>
        <div className="backup-metric-card">
          <DatabaseBackup size={20} className="metric-icon" />
          <span className="metric-label">آخر نسخة</span>
          <span className="metric-value" style={{ fontSize: "0.85rem" }}>
            {latest ? formatBackupDate(latest.createdAt) : "لا توجد"}
          </span>
        </div>
        <div className="backup-metric-card">
          <Clock size={20} className="metric-icon" />
          <span className="metric-label">النسخة القادمة</span>
          <span className="metric-value" style={{ fontSize: "0.85rem" }}>
            {runtimeStatus.nextScheduledAt
              ? formatBackupDate(runtimeStatus.nextScheduledAt)
              : "غير مجدول"}
          </span>
        </div>
      </div>

      {/* ════════════════════════════════════════
          LATEST BACKUP DETAIL
      ════════════════════════════════════════ */}
      {runtimeStatus.latestSuccessful ? (
        <div className="panel backup-detail-panel" style={{ marginBottom: 18 }}>
          <div className="admin-card-head">
            <FileArchive size={22} />
            <div>
              <span className="eyebrow">Latest Successful Backup</span>
              <h2>آخر نسخة ناجحة</h2>
            </div>
          </div>
          <div className="backup-detail-grid" style={{ marginTop: 14 }}>
            <div className="backup-detail-row">
              <span className="backup-detail-label">الملف</span>
              <span className="backup-detail-value">{runtimeStatus.latestSuccessful.fileName}</span>
            </div>
            <div className="backup-detail-row">
              <span className="backup-detail-label">النوع</span>
              <span className="backup-detail-value">{runtimeStatus.latestSuccessful.type}</span>
            </div>
            <div className="backup-detail-row">
              <span className="backup-detail-label">تاريخ الإنشاء</span>
              <span className="backup-detail-value">{formatBackupDate(runtimeStatus.latestSuccessful.createdAt)}</span>
            </div>
            <div className="backup-detail-row">
              <span className="backup-detail-label">الحجم</span>
              <span className="backup-detail-value">{formatBytes(runtimeStatus.latestSuccessful.sizeBytes)}</span>
            </div>
            <div className="backup-detail-row">
              <span className="backup-detail-label">المدة</span>
              <span className="backup-detail-value">{formatDuration(runtimeStatus.latestSuccessful.durationMs)}</span>
            </div>
            <div className="backup-detail-row">
              <span className="backup-detail-label">الملف المحلي</span>
              <span className="backup-detail-value">
                {runtimeStatus.latestSuccessful.localFileExists ? (
                  <span style={{ color: "#4caf87" }}>موجود</span>
                ) : (
                  <span style={{ color: "#d9534f" }}>غير موجود</span>
                )}
              </span>
            </div>
            {runtimeStatus.latestSuccessful.commitSha ? (
              <div className="backup-detail-row">
                <span className="backup-detail-label">Commit SHA</span>
                <span className="backup-detail-value" style={{ fontFamily: "var(--font-jetbrains-mono, ui-monospace, monospace)", fontSize: "0.78rem" }}>
                  {runtimeStatus.latestSuccessful.commitSha}
                </span>
              </div>
            ) : null}
            {runtimeStatus.latestSuccessful.githubFileUrl ? (
              <div className="backup-detail-row">
                <span className="backup-detail-label">GitHub URL</span>
                <span className="backup-detail-value">
                  <a href={runtimeStatus.latestSuccessful.githubFileUrl} target="_blank" rel="noreferrer">
                    {runtimeStatus.latestSuccessful.githubFileUrl}
                  </a>
                </span>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}

      {/* ════════════════════════════════════════
          LAST ERROR
      ════════════════════════════════════════ */}
      {runtimeStatus.lastError ? (
        <div className="backup-error-card">
          <TriangleAlert size={16} />
          <span className="error-text">
            {runtimeStatus.lastError.message}
            {runtimeStatus.lastError.type ? ` (${runtimeStatus.lastError.type})` : ""}
          </span>
          <span className="error-time">
            {runtimeStatus.lastError.createdAt
              ? formatBackupDate(runtimeStatus.lastError.createdAt)
              : ""}
          </span>
        </div>
      ) : null}

      {/* ════════════════════════════════════════
          BACKUP HISTORY
      ════════════════════════════════════════ */}
      <div className="backup-table-wrapper">
        <div className="backup-table-header">
          <h3>سجل النسخ</h3>
          <span className="table-count">إجمالي {backups.length} نسخة</span>
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
                      <span className={`status ${backup.status === "SUCCESS" ? "success" : "danger"}`}>
                        {backup.status === "SUCCESS" ? "ناجحة" : "فاشلة"}
                      </span>
                    </td>
                    <td style={{ direction: "ltr", textAlign: "right" }}>{formatBytes(backup.sizeBytes)}</td>
                    <td>{formatBackupDate(backup.createdAt)}</td>
                    <td>
                      <div className="button-row">
                        <a
                          className="btn btn-soft btn-icon"
                          href={`/api/admin/backups/${backup.fileName}`}
                          title="تحميل"
                          download
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

      {/* ════════════════════════════════════════
          RESTORE CENTER
      ════════════════════════════════════════ */}
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
            اختر نسخة من الجدول أعلاه واضغط على زر الاستعادة. سيتم حذف جميع البيانات الحالية واستبدالها ببيانات النسخة. هذا الإجراء لا يمكن التراجع عنه.
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
            متغير البيئة ALLOW_DESTRUCTIVE_RESTORE غير مُهيأ — الاستعادة غير مفعلة
          </span>
        )}
        <p style={{ margin: "10px 0 0", color: "rgba(245, 234, 214, 0.6)", fontWeight: 850, lineHeight: 1.65, fontSize: "0.82rem" }}>
          لتفعيل الاستعادة، يجب تعيين المتغير البيئي{" "}
          <code
            style={{
              direction: "ltr",
              display: "inline-block",
              background: "rgba(245, 234, 214, 0.08)",
              padding: "2px 8px",
              borderRadius: 6,
              fontSize: "0.75rem",
            }}
          >
            ALLOW_DESTRUCTIVE_RESTORE=I_UNDERSTAND_THIS_OVERWRITES_POSTGRESQL
          </code>
        </p>
      </div>
    </>
  );
}
