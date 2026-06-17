import {
  TriangleAlert,
  ShieldCheck,
  ShieldX,
  FileWarning,
  ArrowLeft,
  ListChecks,
  Siren,
  ExternalLink,
} from "lucide-react";
import { getSafeBackups, listBackupSnapshots } from "@/lib/backups";
import { MarkSafePanel } from "./MarkSafePanel";
import { SafeBackupRow } from "./SafeBackupRow";

export const dynamic = "force-dynamic";

function formatDate(iso: string) {
  return new Intl.DateTimeFormat("ar-EG-u-nu-latn", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Africa/Cairo",
  }).format(new Date(iso));
}

export default async function EmergencyPage() {
  const [backups, safeBackups] = await Promise.all([
    listBackupSnapshots().catch(() => [] as Awaited<ReturnType<typeof listBackupSnapshots>>),
    getSafeBackups().catch(() => [] as Awaited<ReturnType<typeof getSafeBackups>>),
  ]);

  const backupByFileName = new Map(backups.map((b) => [b.fileName, b]));
  const safeFileNames = new Set(safeBackups.map((s) => s.backupFileName));

  const safeBackupsWithData = safeBackups.map((safe) => ({
    safe,
    backup: backupByFileName.get(safe.backupFileName) ?? null,
    fileExists: backupByFileName.has(safe.backupFileName),
  }));

  const totalBackups = backups.length;
  const healthyCount = backups.filter((b) => b.status === "SUCCESS").length;
  const systemOk = safeBackupsWithData.some((s) => s.fileExists);

  return (
    <>
      <div className="dashboard-head emergency-head">
        <div>
          <span className="eyebrow">Emergency Recovery</span>
          <h1>نظام الطوارئ</h1>
          <p>استعادة الموقع بالكامل من نسخة احتياطية موثوقة في حالات الطوارئ</p>
        </div>
        <span className="admin-health-pill danger">
          <TriangleAlert size={16} />
          وضع الطوارئ
        </span>
      </div>

      <div className="panel emergency-warning">
        <TriangleAlert size={22} />
        <div>
          <strong>تحذير: هذا القسم مخصص لحالات الطوارئ فقط</strong>
          <p>
            استخدام الاستعادة سيحذف جميع البيانات الحالية (العملاء، الدعوات، تأكيدات الحضور،
            الطلبات، الإحصائيات، إلخ) ويستبدلها بالكامل ببيانات النسخة المختارة.
            هذا الإجراء لا يمكن التراجع عنه!
          </p>
        </div>
      </div>

      {/* ── Step-by-step guide ── */}
      <div className="panel" style={{ marginBottom: 20 }}>
        <div className="admin-card-head">
          <Siren size={22} />
          <div>
            <span className="eyebrow">Emergency Procedure</span>
            <h2>دليل الطوارئ</h2>
            <p>اتبع هذه الخطوات بالترتيب لاستعادة الموقع بشكل آمن</p>
          </div>
        </div>

        <div className="emergency-steps">
          <div className={`emergency-step ${safeBackups.length > 0 ? "step-done" : ""}`}>
            <div className="step-number">1</div>
            <div className="step-body">
              <strong>اختر نسخة احتياطية سليمة</strong>
              <p>استخدم النموذج أدناه لإضافة نسخة احتياطية كـ "نسخة موثوقة". يفضل اختيار أحدث نسخة قبل إجراء أي تعديلات كبيرة.</p>
            </div>
          </div>

          <div className={`emergency-step ${systemOk ? "step-done" : ""}`}>
            <div className="step-number">2</div>
            <div className="step-body">
              <strong>تحقق من سلامة النسخة</strong>
              <p>تأكد من أن النسخة الاحتياطية موجودة على الخادم وقابلة للاستعادة. النسخ الموثوقة تظهر في الجدول أدناه مع مؤشر الحالة.</p>
            </div>
          </div>

          <div className="emergency-step">
            <div className="step-number">3</div>
            <div className="step-body">
              <strong>استعد النسخة (فقط في حالات الطوارئ الحقيقية)</strong>
              <p>اضغط على زر الاستعادة في الجدول أدناه. سيطلب منك تأكيد الإجراء. بعد الاستعادة، سيتم إعادة تحميل الصفحة تلقائياً.</p>
            </div>
          </div>

          <div className="emergency-step">
            <div className="step-number">4</div>
            <div className="step-body">
              <strong>تأكد من صحة البيانات بعد الاستعادة</strong>
              <p>تفقد البيانات الأساسية: العملاء، الدعوات، الطلبات. تأكد من أن كل شيء يعمل بشكل طبيعي قبل مغادرة لوحة التحكم.</p>
            </div>
          </div>
        </div>

        {/* Quick actions */}
        <div className="emergency-quick-actions">
          <span className="eyebrow">إجراءات سريعة</span>
          <div className="emergency-quick-row">
            <a href="/admin/backups" className="btn btn-soft">
              <ArrowLeft size={17} />
              العودة لصفحة النسخ الاحتياطي
            </a>
            <a href="/admin/dashboard" className="btn btn-soft">
              <ExternalLink size={17} />
              لوحة التحكم
            </a>
          </div>
        </div>
      </div>

      {/* ── System status summary ── */}
      <div className="panel" style={{ marginBottom: 20 }}>
        <div className="admin-card-head">
          <ListChecks size={22} />
          <div>
            <span className="eyebrow">System Status</span>
            <h2>حالة النظام</h2>
            <p>ملخص سريع لحالة النسخ الاحتياطية والنظام</p>
          </div>
        </div>
        <div className="emergency-status-grid">
          <div className="emergency-stat-card">
            <span className="stat-value">{totalBackups}</span>
            <span className="stat-label">إجمالي النسخ</span>
          </div>
          <div className="emergency-stat-card">
            <span className="stat-value" style={{ color: healthyCount > 0 ? "#22c55e" : "#ff4444" }}>
              {healthyCount}
            </span>
            <span className="stat-label">نسخ سليمة</span>
          </div>
          <div className="emergency-stat-card">
            <span className="stat-value">{safeBackups.length}</span>
            <span className="stat-label">نسخ موثوقة</span>
          </div>
          <div className="emergency-stat-card">
            <span className={`stat-value ${systemOk ? "text-green" : "text-red"}`}>
              {systemOk ? "جاهز" : "غير جاهز"}
            </span>
            <span className="stat-label">جاهزية الطوارئ</span>
          </div>
        </div>
      </div>

      <MarkSafePanel backups={backups} safeFileNames={safeFileNames} />

      <div className="panel">
        <div className="admin-card-head">
          <ShieldCheck size={22} />
          <div>
            <span className="eyebrow">Verified Safe Backups</span>
            <h2>النسخ الموثوقة</h2>
            <p>هذه النسخ تم تحديدها كنسخ سليمة يمكن استعادتها في حالات الطوارئ</p>
          </div>
          {safeBackups.length > 0 ? (
            <span className="admin-health-pill success" style={{ fontSize: "0.78rem" }}>
              <ShieldCheck size={14} />
              {safeBackups.length} نسخة
            </span>
          ) : null}
        </div>

        {safeBackups.length === 0 ? (
          <div className="admin-empty-state">
            <ShieldX size={32} />
            <strong>لا توجد نسخ موثوقة حتى الآن</strong>
            <p>استخدم النموذج أعلاه لإضافة نسخة احتياطية موثوقة.</p>
          </div>
        ) : (
          <div className="backup-table-wrapper">
            <table className="backup-table emergency-table">
              <thead>
                <tr>
                  <th>الاسم / التصنيف</th>
                  <th>الملف</th>
                  <th>تاريخ النسخة</th>
                  <th>تاريخ التحديد</th>
                  <th>حالة الملف</th>
                  <th>الحجم</th>
                  <th>الإجراءات</th>
                </tr>
              </thead>
              <tbody>
                {safeBackupsWithData.map(({ safe, backup, fileExists }) => (
                  <SafeBackupRow
                    key={safe.id}
                    safeEntry={safe}
                    backup={backup}
                    fileExists={fileExists}
                    formatDate={formatDate}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}

        {safeBackupsWithData.filter((s) => !s.fileExists).length > 0 ? (
          <div className="emergency-warning" style={{ marginTop: 16, marginBottom: 0 }}>
            <FileWarning size={18} />
            <div>
              <strong>بعض النسخ الموثوقة غير موجودة على الخادم</strong>
              <p>
                النسخ الموثوقة التي تظهر بدون ملف قد تكون تم حذفها أو نقلها.
                يمكنك إزالتها من قائمة الموثوقة لإزالة التحذير.
              </p>
            </div>
          </div>
        ) : null}
      </div>
    </>
  );
}
