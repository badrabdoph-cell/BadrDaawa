import { scanDatabase } from "@/lib/cleanup";
import { getMediaCleanupReport } from "@/lib/media-cleanup";
import { generateCsrfToken } from "@/lib/csrf";
import { Database, Trash2, Clock, AlertTriangle } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function DatabaseCleanupPage() {
  const [dbStatus, mediaReport, csrfToken] = await Promise.all([
    scanDatabase(),
    getMediaCleanupReport().catch(() => null),
    generateCsrfToken(),
  ]);

  const sectionStyle = { display: "grid", gap: 10, padding: 16, border: "1px solid rgba(245,234,214,0.1)", borderRadius: 14 };

  return (
    <>
      <div className="dashboard-head">
        <div>
          <span className="eyebrow">Database Cleanup</span>
          <h1>🗄 تنظيف قاعدة البيانات</h1>
          <p>حذف السجلات المؤقتة القديمة، الإشعارات المقروءة، الأخطاء المنتهية، وملفات سلة المهملات منتهية الصلاحية.</p>
        </div>
      </div>

      {dbStatus.total === 0 && (!mediaReport || mediaReport.databaseOrphanRecords === 0) ? (
        <div className="notice success">
          <span>✅ قاعدة البيانات نظيفة — لا توجد سجلات للتنظيف.</span>
        </div>
      ) : (
        <div className="notice warning">
          <AlertTriangle size={18} />
          <span>تم العثور على {dbStatus.total + (mediaReport?.databaseOrphanRecords || 0)} سجل للتنظيف.</span>
        </div>
      )}

      <div className="backup-health-grid" style={{ marginTop: 18 }}>
        <div className="panel backup-health-card backup-health-card--ok">
          <div className="backup-health-header">
            <Clock size={22} />
            <span className="admin-health-pill warning">{dbStatus.oldTempRecords}</span>
          </div>
          <h2>سجلات التحليلات القديمة</h2>
          <p>سجلات Analytics أقدم من 90 يوماً — آمنة للحذف ولا تؤثر على البيانات الحالية.</p>
        </div>

        <div className="panel backup-health-card backup-health-card--ok">
          <div className="backup-health-header">
            <Database size={22} />
            <span className="admin-health-pill warning">{dbStatus.oldNotifications}</span>
          </div>
          <h2>الإشعارات القديمة</h2>
          <p>إشعارات مقروءة ومنتهية الصلاحية أقدم من 90 يوماً.</p>
        </div>

        <div className="panel backup-health-card backup-health-card--ok">
          <div className="backup-health-header">
            <Trash2 size={22} />
            <span className="admin-health-pill warning">{dbStatus.expiredTrash}</span>
          </div>
          <h2>سلة المهملات منتهية</h2>
          <p>دعوات وطلبات وعملاء في سلة المهملات أقدم من 30 يوماً — يمكن حذفها نهائياً.</p>
        </div>

        <div className="panel backup-health-card backup-health-card--ok">
          <div className="backup-health-header">
            <AlertTriangle size={22} />
            <span className="admin-health-pill warning">{dbStatus.orphanedRecords}</span>
          </div>
          <h2>سجلات يتيمة</h2>
          <p>رسائل تهنئة، تسجيلات حضور، رسائل عملاء بدون دعوة مرتبطة.</p>
        </div>
      </div>

      {mediaReport && mediaReport.databaseOrphans.length > 0 && (
        <div className="panel" style={{ marginTop: 14 }}>
          <div className="admin-card-head">
            <Database size={20} />
            <div>
              <span className="eyebrow">Orphaned Records</span>
              <h2>السجلات اليتيمة (مرتبطة بغير موجود)</h2>
            </div>
          </div>
          <div style={{ marginTop: 14, display: "grid", gap: 8 }}>
            {mediaReport.databaseOrphans.map((orphan) => (
              <div key={orphan.kind} className="admin-order-item" style={{ borderColor: "rgba(217,83,79,0.15)" }}>
                <AlertTriangle size={18} style={{ color: "#d9534f" }} />
                <span>
                  <strong>{orphan.label}</strong>
                  <small>{orphan.count} سجل{orphan.sampleIds.length > 0 ? ` — نموذج: ${orphan.sampleIds.slice(0, 3).join(", ")}` : ""}</small>
                </span>
                <span className="admin-health-pill danger">{orphan.count}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="panel" style={{ marginTop: 18 }}>
        <div className="admin-card-head">
          <Database size={20} />
          <div>
            <span className="eyebrow">Actions</span>
            <h2>إجراءات التنظيف</h2>
          </div>
        </div>
        <div className="notice warning" style={{ marginTop: 14 }}>
          <AlertTriangle size={18} />
          <span>سيتم إنشاء نسخة احتياطية تلقائياً قبل أي عملية حذف. هذا الإجراء آمن.</span>
        </div>
        <div className="backup-action-menu" style={{ marginTop: 14 }}>
          <form action="/api/admin/cleanup/database" method="post">
            <input type="hidden" name="csrf" value={csrfToken} />
            <input type="hidden" name="action" value="old-analytics" />
            <button className="btn btn-gold" type="submit">
              🗑 حذف سجلات التحليلات القديمة ({dbStatus.oldTempRecords})
            </button>
          </form>
          <span className="backup-action-divider" />
          <form action="/api/admin/cleanup/database" method="post">
            <input type="hidden" name="csrf" value={csrfToken} />
            <input type="hidden" name="action" value="expired-trash" />
            <button className="btn btn-gold" type="submit">
              🗑 تفريغ المهملات منتهية الصلاحية ({dbStatus.expiredTrash})
            </button>
          </form>
          <span className="backup-action-divider" />
          <form action="/api/admin/cleanup/database" method="post">
            <input type="hidden" name="csrf" value={csrfToken} />
            <input type="hidden" name="action" value="orphans" />
            <button className="btn btn-soft" type="submit">
              🗑 حذف السجلات اليتيمة ({dbStatus.orphanedRecords})
            </button>
          </form>
        </div>
      </div>
    </>
  );
}
