import Link from "next/link";
import { Activity, CalendarClock, Database, FileJson, KeyRound, ShieldCheck, XCircle } from "lucide-react";
import { getBackupDiagnostics } from "@/lib/backups";

export const dynamic = "force-dynamic";

function formatDate(value: string | null | undefined) {
  if (!value) return "غير متاح";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("ar-EG-u-nu-latn", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function statusLabel(value: boolean) {
  return value ? "نعم" : "لا";
}

export default async function DiagnosticsPage() {
  const diagnostics = await getBackupDiagnostics();

  return (
    <section className="admin-command-center">
      <div className="dashboard-head">
        <div>
          <span className="eyebrow">Diagnostics</span>
          <h1>تشخيص النسخ الاحتياطي</h1>
          <p>حالة Runtime الفعلية للاتصال والكرون والنسخ الموجودة.</p>
        </div>
        <Link className="btn btn-soft" href="/admin/backups">
          العودة للنسخ
        </Link>
      </div>

      <div className="backup-status-grid">
        <article className="panel backup-status-card">
          <Database size={24} />
          <span>DATABASE_URL موجود</span>
          <strong>{statusLabel(diagnostics.databaseUrlPresent)}</strong>
        </article>
        <article className="panel backup-status-card">
          <Activity size={24} />
          <span>PostgreSQL متصل</span>
          <strong>{statusLabel(diagnostics.postgresqlConnected)}</strong>
        </article>
        <article className="panel backup-status-card">
          <KeyRound size={24} />
          <span>Cron Secret موجود</span>
          <strong>{statusLabel(diagnostics.cronSecretPresent)}</strong>
        </article>
        <article className="panel backup-status-card">
          <FileJson size={24} />
          <span>عدد النسخ الحالية</span>
          <strong>{diagnostics.backupsCount}</strong>
        </article>
      </div>

      {diagnostics.postgresqlError ? (
        <div className="notice danger" style={{ marginTop: 16 }}>
          <XCircle size={18} />
          PostgreSQL: {diagnostics.postgresqlError}
        </div>
      ) : (
        <div className="notice success" style={{ marginTop: 16 }}>
          <ShieldCheck size={18} />
          PostgreSQL connection check passed.
        </div>
      )}

      <section className="panel" style={{ marginTop: 16 }}>
        <div className="admin-card-head">
          <CalendarClock size={22} />
          <div>
            <span className="eyebrow">Cron Evidence</span>
            <h2>آخر استدعاء لـ /api/cron/backup</h2>
          </div>
        </div>
        <div className="table-shell" style={{ marginTop: 16 }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>البند</th>
                <th>القيمة</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>آخر استدعاء Scheduled</td>
                <td>{diagnostics.lastCronInvocation ? formatDate(diagnostics.lastCronInvocation.createdAt) : "لا يوجد سجل في BackupJob"}</td>
              </tr>
              <tr>
                <td>حالة آخر استدعاء</td>
                <td>{diagnostics.lastCronInvocation?.status || "غير متاح"}</td>
              </tr>
              <tr>
                <td>ملف آخر استدعاء</td>
                <td>{diagnostics.lastCronInvocation?.fileName || "غير متاح"}</td>
              </tr>
              <tr>
                <td>خطأ آخر استدعاء</td>
                <td>{diagnostics.lastCronInvocation?.error || "لا يوجد"}</td>
              </tr>
              <tr>
                <td>آخر Scheduled Backup ناجح</td>
                <td>{diagnostics.lastScheduledSuccess ? formatDate(diagnostics.lastScheduledSuccess.createdAt) : "لا يوجد"}</td>
              </tr>
              <tr>
                <td>ملف آخر Scheduled ناجح</td>
                <td>{diagnostics.lastScheduledSuccess?.fileName || "غير متاح"}</td>
              </tr>
              <tr>
                <td>حجم آخر Scheduled ناجح</td>
                <td>{diagnostics.lastScheduledSuccess?.sizeBytes || "غير متاح"}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </section>
  );
}
