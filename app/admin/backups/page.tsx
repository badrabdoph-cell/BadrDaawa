import {
  Database,
  CloudUpload,
  Archive,
  RotateCcw,
  Download,
  HardDrive,
  Github,
  CheckCircle2,
  XCircle,
  Loader2,
} from "lucide-react";
import { findLatestBackupOnGitHubByType } from "@/lib/backups";
import { V2BackupActions } from "./v2/V2BackupActions";
import { V2BackupTable } from "./v2/V2BackupTable";

export const dynamic = "force-dynamic";

function formatDate(date: Date) {
  if (Number.isNaN(date.getTime())) return "غير متاح";
  return new Intl.DateTimeFormat("ar-EG-u-nu-latn", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Africa/Cairo",
  }).format(date);
}

export default async function V2BackupsPage() {
  const [db, uploads, full] = await Promise.all([
    findLatestBackupOnGitHubByType("database").catch(() => null),
    findLatestBackupOnGitHubByType("uploads").catch(() => null),
    findLatestBackupOnGitHubByType("full").catch(() => null),
  ]);

  const sections = [
    {
      type: "database" as const,
      title: "قاعدة البيانات",
      description: "نسخة احتياطية لقاعدة البيانات فقط (كل ساعة أو 3 ساعات)",
      icon: Database,
      accent: "blue",
      latest: db,
    },
    {
      type: "uploads" as const,
      title: "الملفات المرفوعة",
      description: "نسخة احتياطية للملفات فقط (كل 24-48 ساعة)",
      icon: CloudUpload,
      accent: "teal",
      latest: uploads,
    },
    {
      type: "full" as const,
      title: "نسخة كاملة",
      description: "نسخة احتياطية كاملة (قاعدة بيانات + ملفات) — يدوي فقط",
      icon: Archive,
      accent: "rose",
      latest: full,
    },
  ] as const;

  return (
    <div>
      <div className="dashboard-head">
        <div>
          <span className="eyebrow">Backup v2</span>
          <h1>النسخ الاحتياطي</h1>
          <p>أنواع منفصلة: قاعدة البيانات، الملفات، أو كامل</p>
        </div>
      </div>

      <div className="admin-card-grid">
        {sections.map((section) => (
          <div key={section.type} className={`admin-card admin-accent-${section.accent}`}>
            <div className="admin-card-header">
              <section.icon size={24} />
              <div>
                <h3>{section.title}</h3>
                <p>{section.description}</p>
              </div>
            </div>

            <div className="admin-card-body">
              {section.latest ? (
                <div className="backup-info">
                  <Github size={14} />
                  <span>{section.latest.fileName}</span>
                  <br />
                  <small>{formatDate(section.latest.createdAt)}</small>
                </div>
              ) : (
                <div className="backup-info muted">
                  <HardDrive size={14} />
                  <span>لا توجد نسخة سابقة</span>
                </div>
              )}
            </div>

            <div className="admin-card-footer">
              <V2BackupActions type={section.type} />
            </div>
          </div>
        ))}
      </div>

      <div className="dashboard-section" style={{ marginTop: "2rem" }}>
        <h2>الاستعادة</h2>
        <p>اختر نوع الاستعادة المناسب لحالتك:</p>

        <div className="admin-card-grid">
          <div className="admin-card admin-accent-blue">
            <div className="admin-card-header">
              <RotateCcw size={24} />
              <div>
                <h3>استعادة قاعدة البيانات</h3>
                <p>استعادة جداول قاعدة البيانات من آخر نسخة (لا تؤثر على الملفات)</p>
              </div>
            </div>
            <div className="admin-card-footer">
              <V2BackupActions type="restore-database" />
            </div>
          </div>

          <div className="admin-card admin-accent-teal">
            <div className="admin-card-header">
              <Download size={24} />
              <div>
                <h3>استعادة الملفات المرفوعة</h3>
                <p>استعادة الملفات من آخر نسخة (لا تؤثر على قاعدة البيانات)</p>
              </div>
            </div>
            <div className="admin-card-footer">
              <V2BackupActions type="restore-uploads" />
            </div>
          </div>

          <div className="admin-card admin-accent-rose">
            <div className="admin-card-header">
              <Archive size={24} />
              <div>
                <h3>استعادة كاملة</h3>
                <p>استعادة قاعدة البيانات والملفات معاً من آخر نسخة كاملة</p>
              </div>
            </div>
            <div className="admin-card-footer">
              <V2BackupActions type="restore-full" />
            </div>
          </div>
        </div>
      </div>

      <div className="dashboard-section" style={{ marginTop: "2rem" }}>
        <div className="admin-card admin-accent-amber">
          <div className="admin-card-header">
            <RotateCcw size={24} />
            <div>
              <h3>Auto Restore الذكي</h3>
              <p>يكتشف تلقائياً إذا كانت قاعدة البيانات فارغة أو الملفات مفقودة ويستعيد النوع المناسب</p>
            </div>
          </div>
          <div className="admin-card-footer">
            <V2BackupActions type="auto-restore" />
          </div>
        </div>
      </div>

      <V2BackupTable />
    </div>
  );
}
