import Link from "next/link";
import {
  Activity,
  Database,
  FileImage,
  HardDrive,
  Package,
  RefreshCw,
  ScanLine,
  Trash2,
  Archive,
  Bug,
  Image as ImageIcon,
  Clock,
  ShieldCheck,
  TriangleAlert,
  ArrowLeft,
  Gauge,
  FileText,
} from "lucide-react";
import { runFullScan, formatBytes } from "@/lib/cleanup";

export const dynamic = "force-dynamic";

function severityColor(severity: string) {
  return severity === "critical"
    ? "danger"
    : severity === "high"
      ? "danger"
      : severity === "medium"
        ? "warning"
        : "info";
}

function severityIcon(severity: string) {
  if (severity === "critical" || severity === "high") return TriangleAlert;
  return Clock;
}

export default async function CleanupPage() {
  const scan = await runFullScan();

  const categoryCards = [
    {
      href: "/admin/cleanup/media",
      icon: FileImage,
      title: "الوسائط غير المستخدمة",
      desc: "صور وملفات وموارد غير مرتبطة",
      count: scan.mediaReport?.orphanFiles.length ?? 0,
      size: scan.mediaReport?.recoverableSizeBytes ?? 0,
      color: "rose",
    },
    {
      href: "/admin/cleanup/database",
      icon: Database,
      title: "تنظيف قاعدة البيانات",
      desc: "سجلات منتهية، إشعارات قديمة، بيانات يتيمة",
      count: scan.databaseStatus.total,
      size: 0,
      color: "blue",
    },
    {
      href: "/admin/cleanup/backups",
      icon: Archive,
      title: "تنظيف النسخ الاحتياطية",
      desc: "نسخ قديمة ومكررة",
      count: scan.mediaReport?.oldBackupFiles.length ?? 0,
      size: scan.mediaReport?.oldBackupFiles.reduce((s, f) => s + f.sizeBytes, 0) ?? 0,
      color: "violet",
    },
    {
      href: "/admin/cleanup/optimization",
      icon: Gauge,
      title: "تحسين الأداء",
      desc: "فهارس، كاش، إحصائيات، ضغط",
      count: 4,
      size: 0,
      color: "green",
    },
  ];

  const totalRecoverable = scan.totalRecoverableBytes;
  const issueCounts = {
    high: scan.issues.filter((i) => i.severity === "high" || i.severity === "critical").length,
    medium: scan.issues.filter((i) => i.severity === "medium").length,
    low: scan.issues.filter((i) => i.severity === "low").length,
  };

  return (
    <>
      <div className="dashboard-head">
        <div>
          <span className="eyebrow">System Maintenance</span>
          <h1>🧹 تنظيف وصيانة النظام</h1>
          <p>أداة شاملة لفحص وتنظيف وتحسين أداء المنصة — ملفات، قاعدة بيانات، وسائط، نسخ احتياطية، حزم، وأداء.</p>
        </div>
      </div>

      {scan.totalIssues > 0 ? (
        <div className={scan.totalIssues > 10 ? "notice warning" : "notice success"}>
          <ShieldCheck size={18} />
          <span>
            الفحص الأخير: <strong>{scan.totalIssues}</strong> مشكلة تم اكتشافها
            {totalRecoverable > 0 ? ` — يمكن استعادة ${formatBytes(totalRecoverable)}` : ""} 
            — آخر فحص: {new Date(scan.scannedAt).toLocaleString("ar-SA")}
          </span>
        </div>
      ) : (
        <div className="notice success">
          <ShieldCheck size={18} />
          <span>لم يتم العثور على مشاكل — النظام بحالة جيدة.</span>
        </div>
      )}

      <div className="backup-metrics-grid">
        <div className="backup-metric-card" style={issueCounts.high > 0 ? { borderColor: "rgba(217,83,79,0.3)" } : {}}>
          <TriangleAlert size={20} className="metric-icon" style={issueCounts.high > 0 ? { background: "rgba(217,83,79,0.15)", color: "#d9534f" } : {}} />
          <span className="metric-label">مشاكل عالية</span>
          <span className="metric-value">{issueCounts.high}</span>
        </div>
        <div className="backup-metric-card">
          <Clock size={20} className="metric-icon" />
          <span className="metric-label">مشاكل متوسطة</span>
          <span className="metric-value">{issueCounts.medium}</span>
        </div>
        <div className="backup-metric-card">
          <Bug size={20} className="metric-icon" />
          <span className="metric-label">مشاكل بسيطة</span>
          <span className="metric-value">{issueCounts.low}</span>
        </div>
        <div className="backup-metric-card">
          <HardDrive size={20} className="metric-icon" />
          <span className="metric-label">مساحة قابلة للاستعادة</span>
          <span className="metric-value">{formatBytes(totalRecoverable)}</span>
        </div>
      </div>

      <div className="panel" style={{ marginBottom: 18 }}>
        <div className="admin-card-head">
          <ScanLine size={20} />
          <div>
            <span className="eyebrow">Quick Actions</span>
            <h2>إجراءات سريعة</h2>
          </div>
        </div>
        <div className="backup-action-menu" style={{ marginTop: 14 }}>
          <Link className="btn btn-gold btn-glow" href="/admin/cleanup/scan">
            <ScanLine size={17} />
            فحص شامل للمشروع
          </Link>
          <span className="backup-action-divider" />
          <Link className="btn btn-soft" href="/admin/trash">
            <Trash2 size={17} />
            سلة المهملات
          </Link>
          <Link className="btn btn-soft" href="/admin/backups">
            <Archive size={17} />
            النسخ الاحتياطي
          </Link>
          <Link className="btn btn-soft" href="/admin/system-health">
            <Activity size={17} />
            صحة النظام
          </Link>
          <span className="backup-action-meta">
            آخر فحص: {new Date(scan.scannedAt).toLocaleString("ar-SA")}
          </span>
        </div>
      </div>

      <div className="backup-health-grid" style={{ marginBottom: 18 }}>
        {categoryCards.map((card) => {
          const Icon = card.icon;
          return (
            <Link href={card.href} key={card.href} className="panel backup-health-card backup-health-card--ok" style={{ textDecoration: "none", cursor: "pointer" }}>
              <div className="backup-health-header">
                <Icon size={22} />
                {card.count > 0 ? (
                  <span className="admin-health-pill warning">{card.count}</span>
                ) : (
                  <span className="admin-health-pill good">0</span>
                )}
              </div>
              <h2>{card.title}</h2>
              <strong>{card.desc}</strong>
              {card.size > 0 ? <p>المساحة المتوقعة: {formatBytes(card.size)}</p> : null}
              {card.count === 0 ? <p style={{ color: "rgba(76,175,135,0.8)" }}>لا توجد مشاكل</p> : null}
            </Link>
          );
        })}
      </div>

      {scan.issues.length > 0 && (
        <div className="panel">
          <div className="admin-card-head">
            <FileText size={20} />
            <div>
              <span className="eyebrow">Issues Found</span>
              <h2>المشاكل المكتشفة ({scan.issues.length})</h2>
            </div>
          </div>
          <div style={{ marginTop: 14, display: "grid", gap: 8 }}>
            {scan.issues.slice(0, 10).map((issue) => {
              const SevIcon = severityIcon(issue.severity);
              return (
                <div
                  key={issue.id}
                  className="admin-order-item"
                  style={{ borderColor: issue.severity === "high" || issue.severity === "critical" ? "rgba(217,83,79,0.2)" : "rgba(245,234,214,0.09)" }}
                >
                  <SevIcon size={18} style={{ color: issue.severity === "high" || issue.severity === "critical" ? "#d9534f" : "#f3cf73" }} />
                  <span>
                    <strong>{issue.title}</strong>
                    <small>
                      {issue.description}
                      {issue.sizeBytes > 0 ? ` — ${formatBytes(issue.sizeBytes)}` : ""}
                    </small>
                  </span>
                  <span className={`admin-health-pill ${severityColor(issue.severity)}`}>
                    {issue.severity === "high" ? "عالي" : issue.severity === "medium" ? "متوسط" : "بسيط"}
                  </span>
                </div>
              );
            })}
            {scan.issues.length > 10 && (
              <Link href="/admin/cleanup/scan" className="btn btn-soft" style={{ justifySelf: "center", marginTop: 8 }}>
                عرض كل {scan.issues.length} مشكلة
              </Link>
            )}
          </div>
        </div>
      )}

      <div className="panel" style={{ marginTop: 18, borderColor: "rgba(243,207,115,0.15)" }}>
        <div className="admin-card-head">
          <RefreshCw size={20} />
          <div>
            <span className="eyebrow">Auto Maintenance</span>
            <h2>الصيانة التلقائية</h2>
          </div>
        </div>
        <p style={{ margin: "12px 0", color: "rgba(245,234,214,0.68)", fontWeight: 850, lineHeight: 1.65 }}>
          يمكن جدولة التنظيف التلقائي عبر مهام CRON. يتم حذف السجلات المنتهية تلقائياً والنسخ الاحتياطية القديمة وفق سياسة الاحتفاظ.
        </p>
        <div className="admin-start-grid" style={{ marginTop: 12 }}>
          <div className="admin-start-card" style={{ cursor: "default" }}>
            <ShieldCheck size={20} />
            <span>
              <strong>التنظيف التلقائي</strong>
              <small style={{ display: "block", color: "rgba(245,234,214,0.55)", fontWeight: 850 }}>
                يتم تفعيله عبر CRON
              </small>
            </span>
          </div>
          <div className="admin-start-card" style={{ cursor: "default" }}>
            <Clock size={20} />
            <span>
              <strong>الاحتفاظ بالنسخ</strong>
              <small style={{ display: "block", color: "rgba(245,234,214,0.55)", fontWeight: 850 }}>
                30 يوم للنسخ الاحتياطية
              </small>
            </span>
          </div>
          <div className="admin-start-card" style={{ cursor: "default" }}>
            <Database size={20} />
            <span>
              <strong>الاحتفاظ بالسجلات</strong>
              <small style={{ display: "block", color: "rgba(245,234,214,0.55)", fontWeight: 850 }}>
                90 يوم للتحليلات القديمة
              </small>
            </span>
          </div>
          <div className="admin-start-card" style={{ cursor: "default" }}>
            <Trash2 size={20} />
            <span>
              <strong>تفريغ المهملات</strong>
              <small style={{ display: "block", color: "rgba(245,234,214,0.55)", fontWeight: 850 }}>
                30 يوم للعناصر المحذوفة
              </small>
            </span>
          </div>
        </div>
      </div>
    </>
  );
}
