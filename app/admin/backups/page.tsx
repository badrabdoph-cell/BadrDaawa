import {
  Database,
  CloudUpload,
  Archive,
  RotateCcw,
  Download,
  HardDrive,
  Github,
  CalendarClock,
  ShieldCheck,
} from "lucide-react";
import { findLatestBackupOnGitHubByType, getScheduledBackupInfo } from "@/lib/backups";
import { V2BackupActions } from "./v2/V2BackupActions";
import { V2BackupTable } from "./v2/V2BackupTable";
import { EmergencyMigration } from "./v2/EmergencyMigration";

export const dynamic = "force-dynamic";

function formatDate(date: Date) {
  if (Number.isNaN(date.getTime())) return "غير متاح";
  return new Intl.DateTimeFormat("ar-EG-u-nu-latn", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Africa/Cairo",
  }).format(date);
}

export default async function BackupsPage() {
  const [db, uploads, full, schedule] = await Promise.all([
    findLatestBackupOnGitHubByType("database").catch(() => null),
    findLatestBackupOnGitHubByType("uploads").catch(() => null),
    findLatestBackupOnGitHubByType("full").catch(() => null),
    getScheduledBackupInfo().catch(() => null),
  ]);

  const createSections = [
    { type: "database" as const, title: "قاعدة البيانات", desc: "نسخة DB فقط (تلقائي كل ساعة)", icon: Database, accent: "blue", latest: db },
    { type: "uploads" as const, title: "الملفات", desc: "نسخة ملفات فقط (تلقائي كل 24-48 ساعة)", icon: CloudUpload, accent: "teal", latest: uploads },
    { type: "full" as const, title: "نسخة كاملة", desc: "قاعدة بيانات + ملفات (يدوي فقط)", icon: Archive, accent: "rose", latest: full },
  ] as const;

  const restoreSections = [
    { type: "restore-database" as const, title: "استعادة DB", desc: "جداول من آخر نسخة (لا تؤثر على الملفات)", icon: RotateCcw, accent: "blue" },
    { type: "restore-uploads" as const, title: "استعادة الملفات", desc: "ملفات من آخر نسخة (لا تؤثر على DB)", icon: Download, accent: "teal" },
    { type: "restore-full" as const, title: "استعادة كاملة", desc: "قاعدة بيانات وملفات معاً", icon: Archive, accent: "rose" },
  ] as const;

  const nextSchedule = schedule?.nextScheduledAt ? new Date(schedule.nextScheduledAt) : null;

  return (
    <div>
      <div className="dashboard-head">
        <div>
          <span className="eyebrow">Backup & Migration</span>
          <h1>النسخ الاحتياطي</h1>
          <p>إنشاء واستعادة وفحص وهجرة البيانات</p>
        </div>
      </div>

      {/* ── Schedule Info ── */}
      <div className="dashboard-section">
        <div className="admin-card" style={{ border: "1px solid rgba(245,234,214,0.1)", borderRadius: 12, padding: "14px 18px", display: "flex", flexWrap: "wrap", gap: "16px 32px", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: "0.85rem" }}>
            <CalendarClock size={16} />
            <span style={{ opacity: 0.6, fontWeight: 800 }}>النسخة القادمة:</span>
            <strong>{nextSchedule ? formatDate(nextSchedule) : "يدوي فقط (بدون جدولة)"}</strong>
          </div>
          {schedule?.lastScheduled ? (
            <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: "0.85rem" }}>
              <RotateCcw size={16} />
              <span style={{ opacity: 0.6, fontWeight: 800 }}>آخر نسخة مجدولة:</span>
              <strong>{formatDate(new Date(schedule.lastScheduled.createdAt))}</strong>
              <span style={{ opacity: 0.5, fontSize: "0.78rem" }}>— {schedule.lastScheduled.status}</span>
            </div>
          ) : null}
          {schedule?.lastScheduledSuccess ? (
            <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: "0.85rem" }}>
              <ShieldCheck size={16} color="#4caf87" />
              <span style={{ opacity: 0.6, fontWeight: 800 }}>آخر نجاح:</span>
              <strong>{formatDate(new Date(schedule.lastScheduledSuccess.createdAt))}</strong>
            </div>
          ) : null}
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginRight: "auto" }}>
            <span style={{ fontSize: "0.78rem", opacity: 0.4 }}>التشغيل التلقائي عبر Railway Cron</span>
          </div>
        </div>
      </div>

      {/* ── Create Backups ── */}
      <div className="dashboard-section">
        <h2>إنشاء نسخة</h2>
        <div className="admin-card-grid">
          {createSections.map((s) => (
            <div key={s.type} className={`admin-card admin-accent-${s.accent}`}>
              <div className="admin-card-header">
                <s.icon size={24} />
                <div>
                  <h3>{s.title}</h3>
                  <p>{s.desc}</p>
                </div>
              </div>
              <div className="admin-card-body">
                {s.latest ? (
                  <div className="backup-info">
                    <Github size={14} />
                    <span>{s.latest.fileName}</span>
                    <small>{formatDate(s.latest.createdAt)}</small>
                  </div>
                ) : (
                  <div className="backup-info muted">
                    <HardDrive size={14} />
                    <span>لا توجد نسخة سابقة</span>
                  </div>
                )}
              </div>
              <div className="admin-card-footer">
                <V2BackupActions type={s.type} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Restore ── */}
      <div className="dashboard-section">
        <h2>الاستعادة</h2>
        <div className="admin-card-grid">
          {restoreSections.map((s) => (
            <div key={s.type} className={`admin-card admin-accent-${s.accent}`}>
              <div className="admin-card-header">
                <s.icon size={24} />
                <div>
                  <h3>{s.title}</h3>
                  <p>{s.desc}</p>
                </div>
              </div>
              <div className="admin-card-footer">
                <V2BackupActions type={s.type} />
              </div>
            </div>
          ))}
          <div className="admin-card admin-accent-amber">
            <div className="admin-card-header">
              <RotateCcw size={24} />
              <div>
                <h3>Auto Restore الذكي</h3>
                <p>يكتشف تلقائياً البيانات الفارغة ويستعيد النوع المناسب</p>
              </div>
            </div>
            <div className="admin-card-footer">
              <V2BackupActions type="auto-restore" />
            </div>
          </div>
        </div>
      </div>

      {/* ── Emergency Migration ── */}
      <div className="dashboard-section">
        <EmergencyMigration />
      </div>

      {/* ── Backup Table ── */}
      <div className="dashboard-section">
        <V2BackupTable />
      </div>
    </div>
  );
}
