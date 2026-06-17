import { Activity, Archive, BellRing, CheckCircle2, Database, FileArchive, Github, HardDrive, ShieldAlert, TriangleAlert } from "lucide-react";
import { getSystemHealthSnapshot, type SystemHealthCheck, type SystemHealthLevel } from "@/lib/system-health";
import { formatArabicNumber } from "@/lib/utils";

export const dynamic = "force-dynamic";

const checkIcons: Record<string, typeof Activity> = {
  database: Database,
  "github-sync": Github,
  storage: HardDrive,
  backup: FileArchive,
  "push-notifications": BellRing,
};

const levelLabel: Record<SystemHealthLevel, string> = {
  ok: "سليم",
  warning: "تحذير",
  error: "خطأ",
};

function formatBytes(value: number) {
  if (value < 1024) return `${formatArabicNumber(value)} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
  if (value < 1024 * 1024 * 1024) return `${(value / (1024 * 1024)).toFixed(1)} MB`;
  return `${(value / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

function formatDateTime(value?: string) {
  if (!value) return "لا يوجد";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("ar-EG-u-nu-latn", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Africa/Cairo",
  }).format(date);
}

function HealthCard({ check }: { check: SystemHealthCheck }) {
  const Icon = checkIcons[check.key] || Activity;
  return (
    <article className={`panel system-health-card system-health-card--${check.level}`}>
      <div className="system-health-card-head">
        <Icon size={22} />
        <span className={`admin-health-pill ${check.level === "ok" ? "good" : check.level === "error" ? "danger" : "pending"}`}>{levelLabel[check.level]}</span>
      </div>
      <div>
        <h2>{check.label}</h2>
        <strong>{check.status}</strong>
        <p>{check.detail}</p>
      </div>
      {check.error ? (
        <div className="system-health-inline-error">
          <TriangleAlert size={16} />
          <span>{check.error}</span>
        </div>
      ) : null}
    </article>
  );
}

export default async function SystemHealthPage() {
  const snapshot = await getSystemHealthSnapshot();
  const errors = snapshot.checks.filter((check) => check.level === "error" || check.error);
  const warnings = snapshot.checks.filter((check) => check.level === "warning");
  const overallLevel: SystemHealthLevel = errors.length ? "error" : warnings.length ? "warning" : "ok";

  return (
    <>
      <div className="dashboard-head">
        <div>
          <span className="eyebrow">System Health</span>
          <h1>صحة النظام</h1>
          <p>نظرة تشغيلية مباشرة على قاعدة البيانات، التخزين، المزامنة، النسخ الاحتياطي، والتنبيهات.</p>
        </div>
        <span className={`admin-health-pill ${overallLevel === "ok" ? "good" : overallLevel === "error" ? "danger" : "pending"}`}>
          {overallLevel === "ok" ? <CheckCircle2 size={16} /> : <ShieldAlert size={16} />}
          {overallLevel === "ok" ? "كل الأنظمة سليمة" : overallLevel === "warning" ? "توجد تحذيرات" : "توجد أخطاء"}
        </span>
      </div>

      <div className="system-health-metrics">
        <article className="panel backup-status-card">
          <Archive size={24} />
          <span>عدد الملفات</span>
          <strong>{formatArabicNumber(snapshot.metrics.filesCount)}</strong>
          <small>{formatBytes(snapshot.metrics.filesSizeBytes)}</small>
        </article>
        <article className="panel backup-status-card">
          <Activity size={24} />
          <span>عدد الدعوات</span>
          <strong>{formatArabicNumber(snapshot.metrics.invitationsCount)}</strong>
        </article>
        <article className="panel backup-status-card">
          <FileArchive size={24} />
          <span>عدد الطلبات</span>
          <strong>{formatArabicNumber(snapshot.metrics.ordersCount)}</strong>
        </article>
        <article className="panel backup-status-card">
          <BellRing size={24} />
          <span>Push Subscriptions</span>
          <strong>{formatArabicNumber(snapshot.metrics.pushSubscriptionsCount)}</strong>
        </article>
      </div>

      <div className="system-health-grid">
        {snapshot.checks.map((check) => (
          <HealthCard check={check} key={check.key} />
        ))}
      </div>

      <div className="panel system-health-backup">
        <div>
          <span className="eyebrow">Latest Backup</span>
          <h2>آخر نسخة احتياطية</h2>
        </div>
        {snapshot.metrics.latestBackup ? (
          <div className="system-health-backup-details">
            <strong>{snapshot.metrics.latestBackup.fileName}</strong>
            <span>{formatDateTime(snapshot.metrics.latestBackup.createdAt)}</span>
            <span>{formatBytes(snapshot.metrics.latestBackup.sizeBytes)}</span>
            <span>{snapshot.metrics.latestBackup.source === "database" ? "قاعدة البيانات + الملفات" : "ملفات التشغيل"}</span>
          </div>
        ) : (
          <p>لا توجد نسخة احتياطية محفوظة بعد.</p>
        )}
      </div>

      <div className="panel system-health-errors">
        <div className="system-health-errors-head">
          <div>
            <span className="eyebrow">Operational Errors</span>
            <h2>الأخطاء التشغيلية</h2>
          </div>
          <span className={`admin-health-pill ${errors.length ? "danger" : "good"}`}>{errors.length ? `${formatArabicNumber(errors.length)} خطأ` : "لا توجد أخطاء"}</span>
        </div>

        {errors.length ? (
          <div className="table-shell">
            <table className="data-table">
              <thead>
                <tr>
                  <th>النظام</th>
                  <th>الحالة</th>
                  <th>التفاصيل</th>
                  <th>الخطأ</th>
                </tr>
              </thead>
              <tbody>
                {errors.map((check) => (
                  <tr key={check.key}>
                    <td>{check.label}</td>
                    <td><span className="admin-health-pill danger">{check.status}</span></td>
                    <td>{check.detail}</td>
                    <td className="admin-long-link">{check.error || "غير محدد"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="admin-empty-state compact">
            <strong>النظام لا يعرض أخطاء حالياً</strong>
            <p>أي خطأ في قاعدة البيانات أو التخزين أو المزامنة سيظهر هنا بوضوح.</p>
          </div>
        )}
      </div>
    </>
  );
}
