import { runFullScan, formatBytes } from "@/lib/cleanup";

export const dynamic = "force-dynamic";

function severityClass(severity: string) {
  if (severity === "critical" || severity === "high") return "danger";
  if (severity === "medium") return "warning";
  return "info";
}

function severityLabel(severity: string) {
  if (severity === "critical") return "حرج";
  if (severity === "high") return "عالي";
  if (severity === "medium") return "متوسط";
  return "بسيط";
}

function categoryLabel(category: string) {
  const labels: Record<string, string> = {
    "unused-files": "ملفات غير مستخدمة",
    database: "قاعدة البيانات",
    media: "الوسائط",
    backups: "النسخ الاحتياطية",
    packages: "الحزم",
    optimization: "تحسين الأداء",
  };
  return labels[category] || category;
}

export default async function ScanPage() {
  const scan = await runFullScan();

  const grouped = new Map<string, typeof scan.issues>();
  for (const issue of scan.issues) {
    const existing = grouped.get(issue.category) || [];
    existing.push(issue);
    grouped.set(issue.category, existing);
  }

  return (
    <>
      <div className="dashboard-head">
        <div>
          <span className="eyebrow">Full Scan Report</span>
          <h1>تقرير الفحص الشامل</h1>
          <p>آخر فحص: {new Date(scan.scannedAt).toLocaleString("ar-SA")}</p>
        </div>
        <form action="/admin/cleanup/scan" method="get">
          <button className="btn btn-gold btn-glow" type="submit">
            🔄 إعادة الفحص
          </button>
        </form>
      </div>

      <div className="backup-metrics-grid">
        <div className="backup-metric-card">
          <span className="metric-label">إجمالي المشاكل</span>
          <span className="metric-value">{scan.totalIssues}</span>
        </div>
        <div className="backup-metric-card">
          <span className="metric-label">مساحة قابلة للاستعادة</span>
          <span className="metric-value">{formatBytes(scan.totalRecoverableBytes)}</span>
        </div>
        <div className="backup-metric-card">
          <span className="metric-label">سلة المهملات</span>
          <span className="metric-value">{scan.trashCount} عنصر</span>
        </div>
        <div className="backup-metric-card">
          <span className="metric-label">النسخ الاحتياطية</span>
          <span className="metric-value">{scan.backupCount} نسخة</span>
        </div>
      </div>

      {scan.issues.length === 0 ? (
        <div className="notice success" style={{ marginTop: 18 }}>
          <span>✅ لم يتم العثور على أي مشاكل — النظام بحالة ممتازة!</span>
        </div>
      ) : (
        Array.from(grouped.entries()).map(([category, issues]) => (
          <section key={category} className="panel" style={{ marginTop: 14 }}>
            <div className="admin-card-head">
              <span className="metric-label">{categoryLabel(category)}</span>
              <h2>{issues.length} مشكلة</h2>
            </div>
            <div style={{ marginTop: 12, display: "grid", gap: 8 }}>
              {issues.map((issue) => (
                <div
                  key={issue.id}
                  className="admin-order-item"
                  style={{
                    borderColor:
                      issue.severity === "high" || issue.severity === "critical"
                        ? "rgba(217,83,79,0.2)"
                        : "rgba(245,234,214,0.09)",
                  }}
                >
                  <span>
                    <strong>{issue.title}</strong>
                    <small>
                      {issue.description}
                      {issue.sizeBytes > 0 ? ` — ${formatBytes(issue.sizeBytes)}` : ""}
                      {issue.count > 1 ? ` (${issue.count})` : ""}
                    </small>
                  </span>
                  <span className={`admin-health-pill ${severityClass(issue.severity)}`}>
                    {severityLabel(issue.severity)}
                  </span>
                </div>
              ))}
            </div>
            <div className="backup-action-menu" style={{ marginTop: 12 }}>
              {issues.some((i) => i.autoFixable && i.safeToAutoFix) && (
                <form action="/api/admin/cleanup/execute" method="post">
                  <input type="hidden" name="category" value={category} />
                  <button className="btn btn-gold" type="submit">
                    🧹 تنفيذ التنظيف الآمن ({categoryLabel(category)})
                  </button>
                </form>
              )}
            </div>
          </section>
        ))
      )}

      {scan.mediaReport && (
        <section className="panel" style={{ marginTop: 18 }}>
          <div className="admin-card-head">
            <span className="metric-label">Media Report</span>
            <h2>تقرير الوسائط التفصيلي</h2>
          </div>
          <div className="backup-metrics-grid" style={{ marginTop: 14 }}>
            <div className="backup-metric-card">
              <span className="metric-label">إجمالي الملفات</span>
              <span className="metric-value">{scan.mediaReport.totalFiles}</span>
            </div>
            <div className="backup-metric-card">
              <span className="metric-label">مستخدمة</span>
              <span className="metric-value">{scan.mediaReport.usedFiles.length}</span>
            </div>
            <div className="backup-metric-card">
              <span className="metric-label">غير مستخدمة</span>
              <span className="metric-value">{scan.mediaReport.unusedFiles.length}</span>
            </div>
            <div className="backup-metric-card">
              <span className="metric-label">إجمالي الحجم</span>
              <span className="metric-value">{formatBytes(scan.mediaReport.totalSizeBytes)}</span>
            </div>
          </div>
          {scan.mediaReport.databaseOrphans.length > 0 && (
            <div className="notice warning" style={{ marginTop: 12 }}>
              <span>{scan.mediaReport.databaseOrphanRecords} سجل يتيم في قاعدة البيانات</span>
            </div>
          )}
          {scan.mediaReport.oldBackupFiles.length > 0 && (
            <div className="notice warning">
              <span>{scan.mediaReport.oldBackupFiles.length} نسخة احتياطية قديمة (يمكن حذف {formatBytes(scan.mediaReport.oldBackupFiles.reduce((s, f) => s + f.sizeBytes, 0))})</span>
            </div>
          )}
        </section>
      )}

      <section className="panel" style={{ marginTop: 18, borderColor: "rgba(49,95,86,0.2)" }}>
        <div className="admin-card-head">
          <span className="metric-label">System Status</span>
          <h2>حالة النظام</h2>
        </div>
        <div className="backup-detail-grid" style={{ marginTop: 14 }}>
          <div className="backup-detail-row">
            <span className="backup-detail-label">قاعدة البيانات</span>
            <span className="backup-detail-value">
              {scan.databaseStatus.total > 0
                ? `${scan.databaseStatus.total} سجل للتنظيف`
                : "نظيفة"}
            </span>
          </div>
          <div className="backup-detail-row">
            <span className="backup-detail-label">الحزم</span>
            <span className="backup-detail-value">
              {scan.packageStatus.totalPackages} إجمالي
              {scan.packageStatus.unusedPackages > 0
                ? ` · ${scan.packageStatus.unusedPackages} غير مستخدمة`
                : ""}
            </span>
          </div>
          <div className="backup-detail-row">
            <span className="backup-detail-label">النسخ الاحتياطية</span>
            <span className="backup-detail-value">
              {scan.backupCount} نسخة
              {scan.mediaReport?.oldBackupFiles.length
                ? ` · ${scan.mediaReport.oldBackupFiles.length} قديمة`
                : ""}
            </span>
          </div>
          <div className="backup-detail-row">
            <span className="backup-detail-label">حجم الكاش</span>
            <span className="backup-detail-value">{scan.optimizationStatus.cacheSize}</span>
          </div>
        </div>
      </section>
    </>
  );
}
