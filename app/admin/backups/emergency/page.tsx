import { TriangleAlert, ShieldCheck, ShieldX } from "lucide-react";
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
    listBackupSnapshots(),
    getSafeBackups(),
  ]);

  const safeFileNames = new Set(safeBackups.map((s) => s.backupFileName));

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
          <p>استخدام الاستعادة سيحذف جميع البيانات الحالية (العملاء، الدعوات، تأكيدات الحضور، الطلبات، الإحصائيات، إلخ) ويستبدلها بالكامل ببيانات النسخة المختارة. هذا الإجراء لا يمكن التراجع عنه!</p>
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
                  <th>النوع</th>
                  <th>الحجم</th>
                  <th>الإجراءات</th>
                </tr>
              </thead>
              <tbody>
                {backups
                  .filter((b) => safeFileNames.has(b.fileName))
                  .map((backup) => {
                    const safe = safeBackups.find((s) => s.backupFileName === backup.fileName)!;
                    return (
                      <SafeBackupRow
                        key={backup.fileName}
                        backup={backup}
                        safeEntry={safe}
                        formatDate={formatDate}
                      />
                    );
                  })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
