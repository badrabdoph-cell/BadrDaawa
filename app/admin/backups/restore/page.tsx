import { History, ShieldAlert, ShieldCheck } from "lucide-react";
import GitHubBackupsPanel from "../GitHubBackupsPanel";

export const dynamic = "force-dynamic";

export default function RestorePage() {
  return (
    <>
      <div className="dashboard-head">
        <div>
          <span className="eyebrow">Restore Center</span>
          <h1>مركز الاستعادة</h1>
          <p>استعادة البيانات من النسخ الاحتياطية على GitHub</p>
        </div>
      </div>

      <div className="panel backup-restore-panel" style={{ marginBottom: 18 }}>
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
            اختر نسخة من الجدول أدناه واضغط على زر الاستعادة. سيتم تحميل الملف من GitHub وحذف جميع البيانات الحالية (العملاء، الدعوات، الطلبات، الإحصائيات، إلخ) واستبدالها ببيانات النسخة. هذا الإجراء لا يمكن التراجع عنه.
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

      <GitHubBackupsPanel />
    </>
  );
}
