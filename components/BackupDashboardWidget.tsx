import Link from "next/link";
import { Database, CloudUpload, Archive, Github, HardDrive, RotateCcw, CheckCircle2, XCircle, AlertTriangle, Activity } from "lucide-react";
import { getBackupRuntimeStatus } from "@/lib/backups";
import { formatBytes, formatDate, formatDuration } from "@/lib/backup-display";

export const dynamic = "force-dynamic";

export default async function BackupDashboardWidget() {
  const status = await getBackupRuntimeStatus().catch(() => null);
  if (!status) return null;

  const latest = status.latestSuccessful;
  const hasError = status.lastError !== null;
  const healthOk = status.postgresDump.status !== "unknown" && status.uploadsBackup.status !== "missing" && status.githubBackup.status !== "failed";

  return (
    <Link href="/admin/backups" className="backup-widget-card">
      <div className="backup-widget-head">
        <Activity size={20} />
        <strong>النسخ الاحتياطي</strong>
        <span className={`backup-widget-pill ${healthOk ? "good" : hasError ? "danger" : "pending"}`}>
          {healthOk ? "سليم" : hasError ? "خطأ" : "تحذير"}
        </span>
      </div>

      <div className="backup-widget-body">
        <div className="backup-widget-row">
          <Database size={15} />
          <span>آخر نسخة DB</span>
          <em>{latest ? formatDate(latest.createdAt, { dateStyle: "short", timeStyle: "short" }) : "—"}</em>
        </div>
        <div className="backup-widget-row">
          <CloudUpload size={15} />
          <span>آخر نسخة ملفات</span>
          <em>{status.uploadsBackup.files ? `${status.uploadsBackup.files} ملف` : "—"}</em>
        </div>
        <div className="backup-widget-row">
          <Archive size={15} />
          <span>عدد النسخ</span>
          <em>{status.backupsCount}</em>
        </div>
        <div className="backup-widget-row">
          <Github size={15} />
          <span>GitHub</span>
          <em style={{ color: status.githubBackup.status === "ok" ? "#4caf87" : "#d9534f" }}>
            {status.githubBackup.status === "ok" ? "متصل" : status.githubBackup.status === "not_configured" ? "غير مهيأ" : "خطأ"}
          </em>
        </div>
        <div className="backup-widget-row">
          <RotateCcw size={15} />
          <span>Auto Restore</span>
          <em>غير متاح</em>
        </div>
      </div>

      <div className="backup-widget-footer">
        <small>إدارة النسخ الاحتياطي</small>
      </div>
    </Link>
  );
}
