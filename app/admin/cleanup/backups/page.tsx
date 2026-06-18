import { getMediaCleanupReport } from "@/lib/media-cleanup";
import { formatBytes } from "@/lib/cleanup";
import { generateCsrfToken } from "@/lib/csrf";
import { Archive, Clock, HardDrive, AlertTriangle, Trash2, ShieldCheck } from "lucide-react";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function BackupCleanupPage() {
  const [report, csrfToken] = await Promise.all([
    getMediaCleanupReport().catch(() => null),
    generateCsrfToken(),
  ]);

  const oldBackups = report?.oldBackupFiles || [];

  return (
    <>
      <div className="dashboard-head">
        <div>
          <span className="eyebrow">Backup Cleanup</span>
          <h1>💾 تنظيف النسخ الاحتياطية</h1>
          <p>حذف النسخ القديمة حسب مدة الاحتفاظ المحددة (30 يوماً)، والاحتفاظ بآخر 5 نسخ من كل نوع.</p>
        </div>
      </div>

      {oldBackups.length === 0 ? (
        <div className="notice success">
          <ShieldCheck size={18} />
          <span>جميع النسخ الاحتياطية ضمن سياسة الاحتفاظ — لا توجد نسخ قديمة للحذف.</span>
        </div>
      ) : (
        <div className="notice warning">
          <AlertTriangle size={18} />
          <span>تم العثور على {oldBackups.length} نسخة احتياطية قديمة — يمكن استعادة {formatBytes(oldBackups.reduce((s, f) => s + f.sizeBytes, 0))}.</span>
        </div>
      )}

      <div className="backup-metrics-grid" style={{ marginTop: 18 }}>
        <div className="backup-metric-card">
          <Archive size={20} className="metric-icon" />
          <span className="metric-label">إجمالي النسخ</span>
          <span className="metric-value">{report?.backupFiles.length || 0}</span>
        </div>
        <div className="backup-metric-card">
          <Clock size={20} className="metric-icon" />
          <span className="metric-label">قديمة (للحذف)</span>
          <span className="metric-value">{oldBackups.length}</span>
        </div>
        <div className="backup-metric-card">
          <HardDrive size={20} className="metric-icon" />
          <span className="metric-label">مساحة قابلة للاستعادة</span>
          <span className="metric-value">{formatBytes(oldBackups.reduce((s, f) => s + f.sizeBytes, 0))}</span>
        </div>
        <div className="backup-metric-card">
          <Archive size={20} className="metric-icon" />
          <span className="metric-label">سياسة الاحتفاظ</span>
          <span className="metric-value">30 يوماً</span>
        </div>
      </div>

      <div className="panel" style={{ marginTop: 18 }}>
        <div className="admin-card-head">
          <Trash2 size={20} />
          <div>
            <span className="eyebrow">Cleanup Actions</span>
            <h2>إجراءات التنظيف</h2>
          </div>
        </div>
        <div className="backup-action-menu" style={{ marginTop: 14 }}>
          <form action="/api/admin/cleanup/execute" method="post">
            <input type="hidden" name="csrf" value={csrfToken} />
            <input type="hidden" name="action" value="old-backups" />
            <button className="btn btn-gold" type="submit" disabled={oldBackups.length === 0}>
              🗑 حذف النسخ القديمة ({oldBackups.length})
            </button>
          </form>
          <span className="backup-action-divider" />
          <Link className="btn btn-soft" href="/admin/backups">
            <Archive size={17} />
            إدارة النسخ الاحتياطية
          </Link>
          <span className="backup-action-meta">
            سياسة الاحتفاظ: آخر 5 نسخ من كل نوع · 30 يوم كحد أقصى
          </span>
        </div>
      </div>

      {oldBackups.length > 0 && (
        <div className="panel" style={{ marginTop: 14 }}>
          <div className="admin-card-head">
            <Archive size={20} />
            <div>
              <span className="eyebrow">Old Backups</span>
              <h2>النسخ القديمة المحددة للحذف</h2>
            </div>
          </div>
          <div className="table-shell" style={{ marginTop: 14 }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>الملف</th>
                  <th>النوع</th>
                  <th>الحجم</th>
                  <th>تاريخ الإنشاء</th>
                  <th>السبب</th>
                </tr>
              </thead>
              <tbody>
                {oldBackups.map((backup) => (
                  <tr key={backup.fileName}>
                    <td style={{ fontSize: "0.8rem", direction: "ltr", textAlign: "left" }}>
                      {backup.fileName}
                    </td>
                    <td>{backup.type === "scheduled" ? "تلقائي" : backup.type === "manual" ? "يدوي" : backup.type}</td>
                    <td style={{ direction: "ltr", textAlign: "right" }}>{formatBytes(backup.sizeBytes)}</td>
                    <td>{new Date(backup.createdAt).toLocaleDateString("ar-SA")}</td>
                    <td>{backup.cleanupReasons.join("، ") || "قديم"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="backup-restore-panel panel" style={{ marginTop: 18 }}>
        <div className="admin-card-head">
          <AlertTriangle size={22} />
          <div>
            <span className="eyebrow">Policy</span>
            <h2>سياسة الاحتفاظ بالنسخ الاحتياطية</h2>
          </div>
        </div>
        <ul style={{ margin: "14px 0 0", paddingRight: 20, display: "grid", gap: 8, color: "rgba(245,234,214,0.7)", fontWeight: 850, lineHeight: 1.65 }}>
          <li>الاحتفاظ بآخر <strong>5 نسخ</strong> على الأقل من كل نوع (يدوي، تلقائي، ...)</li>
          <li>حذف النسخ الأقدم من <strong>30 يوماً</strong> تلقائياً</li>
          <li>النسخ المكررة بنفس المحتوى تُحذف تلقائياً</li>
          <li>النسخ المُعلَمة كـ &quot;آمنة&quot; (Safe) لا تُحذف أبداً</li>
          <li>جميع عمليات الحذف تسبقها نسخة احتياطية تلقائية</li>
        </ul>
      </div>
    </>
  );
}
