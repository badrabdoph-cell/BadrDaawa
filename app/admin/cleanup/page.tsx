"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Activity, Database, FileImage, HardDrive, RefreshCw, ScanLine,
  Trash2, Archive, Clock, ShieldCheck, TriangleAlert, Gauge,
  Server, Wifi, Image as ImageIcon, Music, Bug, CheckCircle2,
  XCircle, ChevronDown, ChevronUp, Loader2, Search,
} from "lucide-react";
import Link from "next/link";

type Severity = "low" | "medium" | "high" | "critical";
type Category = "media" | "database" | "backups" | "packages" | "optimization" | "unused-files";

type Issue = {
  id: string; category: Category; title: string; description: string;
  severity: Severity; count: number; sizeBytes: number; action: string;
  autoFixable: boolean; safeToAutoFix: boolean;
};

type DBStatus = {
  oldAnalytics: number; oldNotifications: number; oldErrors: number;
  expiredTrashInvitations: number; expiredTrashOrders: number; expiredTrashCustomers: number;
  orphanedGuestBook: number; orphanedCheckIns: number; orphanedClientMessages: number;
  orphanedCoupleSettings: number; orphanedLiveModes: number;
  orphanedGuestRsvp: number; orphanedAnalytics: number;
  orphanedInvitationNotes: number; orphanedOrderNotes: number; orphanedCustomerNotes: number;
  total: number;
};

type OptimizeStatus = {
  lastOptimizedAt: string | null; pendingOptimizations: number;
  cacheSize: string; cacheSizeBytes: number; indexStatus: string;
  tableCount: number; dbSize: string;
};

type MediaReport = {
  totalFiles: number; totalSizeBytes: number; imageFiles: number;
  audioFiles: number; orphanFiles: Array<{ url: string; relativePath: string; sizeBytes: number }>;
  duplicateFiles: Array<{ url: string; sizeBytes: number }>;
  duplicateSizeBytes: number;
  oldTemporaryFiles: Array<{ url: string; sizeBytes: number }>;
  unusedMusicFiles: Array<{ url: string; sizeBytes: number }>;
  backupFiles: Array<{ fileName: string; sizeBytes: number; createdAt: string }>;
  oldBackupFiles: Array<{ fileName: string; sizeBytes: number; createdAt: string }>;
  databaseOrphanRecords: number;
  recoverableSizeBytes: number;
};

type ScanReport = {
  scannedAt: string; totalIssues: number; totalRecoverableBytes: number;
  issues: Issue[]; mediaReport: MediaReport | null; trashCount: number;
  backupCount: number; databaseStatus: DBStatus; packageStatus: { totalPackages: number; unusedPackages: number };
  optimizationStatus: OptimizeStatus;
};

type TabId = "overview" | "media" | "database" | "backups" | "optimization" | "packages";

const tabs: { id: TabId; label: string; icon: typeof Activity }[] = [
  { id: "overview", label: "نظرة عامة", icon: Activity },
  { id: "media", label: "الوسائط", icon: FileImage },
  { id: "database", label: "قاعدة البيانات", icon: Database },
  { id: "backups", label: "النسخ", icon: Archive },
  { id: "optimization", label: "تحسين", icon: Gauge },
  { id: "packages", label: "الحزم", icon: Bug },
];

function formatBytes(value: number) {
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
  if (value < 1024 * 1024 * 1024) return `${(value / (1024 * 1024)).toFixed(1)} MB`;
  return `${(value / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

function severityIcon(sev: Severity) {
  if (sev === "critical" || sev === "high") return TriangleAlert;
  if (sev === "medium") return Clock;
  return Bug;
}

function severityLabel(sev: Severity) {
  if (sev === "critical") return "حرج";
  if (sev === "high") return "عالي";
  if (sev === "medium") return "متوسط";
  return "بسيط";
}

function severityClass(sev: Severity) {
  if (sev === "critical" || sev === "high") return "danger";
  if (sev === "medium") return "warning";
  return "info";
}

function MetricCard({ icon: Icon, label, value, sub, color }: {
  icon: React.ComponentType<{ size?: number; className?: string; style?: React.CSSProperties }>; label: string; value: string; sub?: string; color?: string;
}) {
  return (
    <div className="backup-metric-card">
      <Icon size={20} className="metric-icon" style={color ? { background: `${color}15`, color } : {}} />
      <span className="metric-label">{label}</span>
      <span className="metric-value">{value}</span>
      {sub && <span style={{ fontSize: "0.75rem", color: "rgba(245,234,214,0.5)" }}>{sub}</span>}
    </div>
  );
}

function ActionButton({ label, count, action, disabled, busy, glow }: {
  label: string; count?: number; action: () => void; disabled?: boolean; busy?: boolean; glow?: boolean;
}) {
  return (
    <button
      className={`btn ${glow ? "btn-gold btn-glow" : "btn-soft"}`}
      onClick={action}
      disabled={disabled || busy}
      style={{ opacity: disabled ? 0.4 : 1, display: "inline-flex", alignItems: "center", gap: 6 }}
    >
      {busy ? <Loader2 size={16} className="spin" /> : <Trash2 size={16} />}
      {label} {count !== undefined && `(${count})`}
    </button>
  );
}

export default function CleanupDashboard() {
  const [activeTab, setActiveTab] = useState<TabId>("overview");
  const [report, setReport] = useState<ScanReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<{ ok: boolean; details?: string[]; error?: string } | null>(null);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(["overview"]));

  const doScan = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/cleanup/scan", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "فشل الفحص");
      setReport(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "خطأ غير معروف");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { doScan(); }, [doScan]);

  const doAction = async (action: string, apiPath: string, body?: Record<string, string>) => {
    setBusyAction(action);
    setLastResult(null);
    try {
      const res = await fetch(apiPath, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ...body }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "فشل");
      setLastResult({ ok: true, details: data.details, error: data.error });
      await doScan();
    } catch (e) {
      setLastResult({ ok: false, error: e instanceof Error ? e.message : "خطأ" });
    } finally {
      setBusyAction(null);
    }
  };

  const toggleSection = (id: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const r = report;

  return (
    <div>
      <div className="dashboard-head">
        <div>
          <span className="eyebrow">System Maintenance</span>
          <h1>🧹 تنظيف وصيانة النظام</h1>
          <p>لوحة موحدة لفحص وتنظيف وتحسين المنصة — وسائط، قاعدة بيانات، نسخ، تحسين، وحزم</p>
        </div>
        <button className="btn btn-gold btn-glow" onClick={doScan} disabled={loading}>
          <RefreshCw size={17} className={loading ? "spin" : ""} />
          {loading ? "جارٍ الفحص..." : "فحص جديد"}
        </button>
      </div>

      {error && (
        <div className="notice danger"><XCircle size={18} /><span>{error}</span></div>
      )}

      {lastResult && (
        <div className={`notice ${lastResult.ok ? "success" : "danger"}`}>
          {lastResult.ok ? <CheckCircle2 size={18} /> : <XCircle size={18} />}
          <span>
            {lastResult.ok ? "✅ تم بنجاح" : `❌ فشل: ${lastResult.error}`}
            {lastResult.details?.length ? ` — ${lastResult.details.slice(0, 3).join(" · ")}` : ""}
          </span>
        </div>
      )}

      {loading && !report && (
        <div className="notice" style={{ textAlign: "center", padding: 40 }}>
          <Loader2 size={32} className="spin" />
          <p style={{ marginTop: 12 }}>جارٍ فحص النظام...</p>
        </div>
      )}

      <div style={{ display: "flex", gap: 6, marginBottom: 18, flexWrap: "wrap" }}>
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              className={`btn ${activeTab === tab.id ? "btn-gold" : "btn-soft"}`}
              onClick={() => setActiveTab(tab.id)}
              style={{ display: "inline-flex", alignItems: "center", gap: 5 }}
            >
              <Icon size={16} />
              {tab.label}
              {r && tab.id === "overview" && r.totalIssues > 0 && (
                <span className="admin-health-pill warning" style={{ marginRight: 4 }}>{r.totalIssues}</span>
              )}
            </button>
          );
        })}
      </div>

      {r && activeTab === "overview" && (
        <>
          <div className="backup-metrics-grid">
            <MetricCard icon={TriangleAlert} label="مشاكل" value={String(r.totalIssues)} color="#d9534f" />
            <MetricCard icon={HardDrive} label="مساحة قابلة للاستعادة" value={formatBytes(r.totalRecoverableBytes)} />
            <MetricCard icon={Trash2} label="سلة المهملات" value={`${r.trashCount} عنصر`} />
            <MetricCard icon={Archive} label="النسخ" value={`${r.backupCount} نسخة`} sub={`${r.mediaReport?.oldBackupFiles.length || 0} قديمة`} />
          </div>

          <div className="backup-health-grid" style={{ marginBottom: 18 }}>
            {r.issues.filter((i) => i.severity === "high" || i.severity === "critical").slice(0, 6).map((issue) => {
              const SevIcon = severityIcon(issue.severity);
              return (
                <div key={issue.id} className="panel backup-health-card" style={{ borderColor: "rgba(217,83,79,0.2)" }}>
                  <div className="backup-health-header">
                    <SevIcon size={20} style={{ color: "#d9534f" }} />
                    <span className={`admin-health-pill ${severityClass(issue.severity)}`}>{severityLabel(issue.severity)}</span>
                  </div>
                  <h2>{issue.title}</h2>
                  <p>{issue.description}</p>
                  {issue.sizeBytes > 0 && <strong>{formatBytes(issue.sizeBytes)}</strong>}
                  {issue.autoFixable && issue.safeToAutoFix && (
                    <ActionButton
                      label="إصلاح"
                      action={() => doAction(issue.id.includes("backup") ? "old-backups" : issue.id.includes("orphan") ? "orphans" : issue.id.includes("duplicate") ? "duplicates" : issue.id.includes("temp") ? "temp" : "all", "/api/admin/cleanup/execute")}
                      busy={busyAction === issue.id}
                      disabled={busyAction !== null}
                    />
                  )}
                </div>
              );
            })}
          </div>

          <div className="panel">
            <div
              className="admin-card-head" style={{ cursor: "pointer" }}
              onClick={() => toggleSection("issues")}
            >
              <Search size={20} />
              <div style={{ flex: 1 }}>
                <span className="eyebrow">Issues</span>
                <h2>كل المشاكل ({r.issues.length})</h2>
              </div>
              {expandedSections.has("issues") ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
            </div>
            {expandedSections.has("issues") && (
              <div style={{ marginTop: 14, display: "grid", gap: 8 }}>
                {r.issues.length === 0 ? (
                  <p style={{ color: "rgba(76,175,135,0.8)" }}>✅ لا توجد مشاكل — النظام بحالة ممتازة</p>
                ) : (
                  r.issues.map((issue) => {
                    const SevIcon = severityIcon(issue.severity);
                    return (
                      <div key={issue.id} className="admin-order-item" style={{
                        borderColor: issue.severity === "high" || issue.severity === "critical"
                          ? "rgba(217,83,79,0.2)" : "rgba(245,234,214,0.09)",
                      }}>
                        <SevIcon size={18} style={{ color: issue.severity === "high" || issue.severity === "critical" ? "#d9534f" : "#f3cf73" }} />
                        <span style={{ flex: 1 }}>
                          <strong>{issue.title}</strong>
                          <small>{issue.description}{issue.sizeBytes > 0 ? ` — ${formatBytes(issue.sizeBytes)}` : ""}{issue.count > 1 ? ` (${issue.count})` : ""}</small>
                        </span>
                        <span className={`admin-health-pill ${severityClass(issue.severity)}`}>{severityLabel(issue.severity)}</span>
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </div>

          <div className="backup-restore-panel panel" style={{ marginTop: 14 }}>
            <div
              className="admin-card-head" style={{ cursor: "pointer" }}
              onClick={() => toggleSection("status")}
            >
              <Server size={20} />
              <div style={{ flex: 1 }}>
                <span className="eyebrow">System Status</span>
                <h2>حالة النظام</h2>
              </div>
              {expandedSections.has("status") ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
            </div>
            {expandedSections.has("status") && (
              <div className="backup-detail-grid" style={{ marginTop: 14 }}>
                <div className="backup-detail-row">
                  <span className="backup-detail-label">قاعدة البيانات</span>
                  <span className="backup-detail-value">{r.databaseStatus.total > 0 ? `${r.databaseStatus.total} سجل للتنظيف` : "نظيفة"}</span>
                </div>
                <div className="backup-detail-row">
                  <span className="backup-detail-label">حجم DB</span>
                  <span className="backup-detail-value">{r.optimizationStatus.dbSize}</span>
                </div>
                <div className="backup-detail-row">
                  <span className="backup-detail-label">جداول</span>
                  <span className="backup-detail-value">{r.optimizationStatus.tableCount}</span>
                </div>
                <div className="backup-detail-row">
                  <span className="backup-detail-label">حجم الكاش</span>
                  <span className="backup-detail-value">{r.optimizationStatus.cacheSize}</span>
                </div>
                <div className="backup-detail-row">
                  <span className="backup-detail-label">الفهارس</span>
                  <span className="backup-detail-value">{r.optimizationStatus.indexStatus}</span>
                </div>
                <div className="backup-detail-row">
                  <span className="backup-detail-label">الحزم</span>
                  <span className="backup-detail-value">{r.packageStatus.totalPackages} إجمالي{r.packageStatus.unusedPackages > 0 ? ` · ${r.packageStatus.unusedPackages} غير مستخدمة` : ""}</span>
                </div>
                <div className="backup-detail-row">
                  <span className="backup-detail-label">آخر تحسين</span>
                  <span className="backup-detail-value">{r.optimizationStatus.lastOptimizedAt ? new Date(r.optimizationStatus.lastOptimizedAt).toLocaleString("ar-SA") : "لم يتم"}</span>
                </div>
                <div className="backup-detail-row">
                  <span className="backup-detail-label">آخر فحص</span>
                  <span className="backup-detail-value">{new Date(r.scannedAt).toLocaleString("ar-SA")}</span>
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {r && activeTab === "media" && (
        <>
          <div className="backup-metrics-grid">
            <MetricCard icon={FileImage} label="إجمالي الملفات" value={String(r.mediaReport?.totalFiles || 0)} />
            <MetricCard icon={ImageIcon} label="صور" value={String(r.mediaReport?.imageFiles || 0)} color="#6abf69" />
            <MetricCard icon={Music} label="موسيقى" value={String(r.mediaReport?.audioFiles || 0)} color="#d4a574" />
            <MetricCard icon={HardDrive} label="الحجم الكلي" value={formatBytes(r.mediaReport?.totalSizeBytes || 0)} />
          </div>

          <div className="backup-health-grid" style={{ marginBottom: 18 }}>
            <div className="panel backup-health-card">
              <div className="backup-health-header">
                <TriangleAlert size={22} />
                <span className="admin-health-pill warning">{r.mediaReport?.orphanFiles.length || 0}</span>
              </div>
              <h2>ملفات يتيمة</h2>
              <p>ملفات بدون مرجع</p>
              <strong>{formatBytes(r.mediaReport?.orphanFiles.reduce((s, f) => s + f.sizeBytes, 0) || 0)}</strong>
              <div style={{ marginTop: 8 }}>
                <ActionButton label="حذف اليتامى" count={r.mediaReport?.orphanFiles.length} action={() => doAction("orphans", "/api/admin/cleanup/execute")} busy={busyAction === "orphans"} disabled={!r.mediaReport?.orphanFiles.length} />
              </div>
            </div>
            <div className="panel backup-health-card">
              <div className="backup-health-header">
                <FileImage size={22} />
                <span className="admin-health-pill warning">{r.mediaReport?.duplicateFiles.length || 0}</span>
              </div>
              <h2>ملفات مكررة</h2>
              <p>نفس المحتوى</p>
              <strong>{formatBytes(r.mediaReport?.duplicateSizeBytes || 0)}</strong>
              <div style={{ marginTop: 8 }}>
                <ActionButton label="حذف المكررات" count={r.mediaReport?.duplicateFiles.length} action={() => doAction("duplicates", "/api/admin/cleanup/execute")} busy={busyAction === "duplicates"} disabled={!r.mediaReport?.duplicateFiles.length} />
              </div>
            </div>
            <div className="panel backup-health-card">
              <div className="backup-health-header">
                <Clock size={22} />
                <span className="admin-health-pill warning">{r.mediaReport?.oldTemporaryFiles.length || 0}</span>
              </div>
              <h2>ملفات مؤقتة قديمة</h2>
              <p>أقدم من 7 أيام</p>
              <strong>{formatBytes(r.mediaReport?.oldTemporaryFiles.reduce((s, f) => s + f.sizeBytes, 0) || 0)}</strong>
              <div style={{ marginTop: 8 }}>
                <ActionButton label="حذف المؤقتة" count={r.mediaReport?.oldTemporaryFiles.length} action={() => doAction("temp", "/api/admin/cleanup/execute")} busy={busyAction === "temp"} disabled={!r.mediaReport?.oldTemporaryFiles.length} />
              </div>
            </div>
            <div className="panel backup-health-card">
              <div className="backup-health-header">
                <Music size={22} />
                <span className="admin-health-pill warning">{r.mediaReport?.unusedMusicFiles.length || 0}</span>
              </div>
              <h2>موسيقى غير مرتبطة</h2>
              <p>صوت/فيديو بدون مرجع</p>
              <strong>{formatBytes(r.mediaReport?.unusedMusicFiles.reduce((s, f) => s + f.sizeBytes, 0) || 0)}</strong>
              <div style={{ marginTop: 8 }}>
                <ActionButton label="حذف غير المرتبط" count={r.mediaReport?.unusedMusicFiles.length} action={() => doAction("music-unused", "/api/admin/cleanup/execute")} busy={busyAction === "music-unused"} disabled={!r.mediaReport?.unusedMusicFiles.length} />
              </div>
            </div>
          </div>

          <div className="panel">
            <div className="admin-card-head">
              <Trash2 size={20} />
              <div><span className="eyebrow">Bulk</span><h2>تنظيف شامل للوسائط</h2></div>
            </div>
            <div className="backup-action-menu" style={{ marginTop: 14 }}>
              <ActionButton label="تنظيف شامل" glow action={() => doAction("all", "/api/admin/cleanup/execute")} busy={busyAction === "all"} />
              <span className="backup-action-meta">
                إجمالي قابل للاستعادة: {formatBytes(r.mediaReport?.recoverableSizeBytes || 0)}
              </span>
            </div>
          </div>

          {r.mediaReport && r.mediaReport.orphanFiles.length > 0 && expandedSections.has("orphans") && (
            <div className="panel" style={{ marginTop: 14 }}>
              <div className="admin-card-head" style={{ cursor: "pointer" }} onClick={() => toggleSection("orphans")}>
                <FileImage size={20} />
                <div style={{ flex: 1 }}><span className="eyebrow">Preview</span><h2>معاينة الملفات اليتيمة</h2></div>
                <ChevronDown size={18} />
              </div>
            </div>
          )}
        </>
      )}

      {r && activeTab === "database" && (
        <>
          <div className="backup-metrics-grid">
            <MetricCard icon={Clock} label="تحليلات قديمة (+90 يوم)" value={String(r.databaseStatus.oldAnalytics)} />
            <MetricCard icon={Bug} label="سجلات أخطاء قديمة (+90 يوم)" value={String(r.databaseStatus.oldErrors)} />
            <MetricCard icon={Trash2} label="مهملات منتهية (+30 يوم)" value={String(r.databaseStatus.expiredTrashInvitations + r.databaseStatus.expiredTrashOrders + r.databaseStatus.expiredTrashCustomers)} sub={`${r.databaseStatus.expiredTrashInvitations} دعوة · ${r.databaseStatus.expiredTrashOrders} طلب · ${r.databaseStatus.expiredTrashCustomers} عميل`} />
            <MetricCard icon={Database} label="سجلات يتيمة" value={String(
              r.databaseStatus.orphanedGuestBook + r.databaseStatus.orphanedCheckIns + r.databaseStatus.orphanedClientMessages +
              r.databaseStatus.orphanedCoupleSettings + r.databaseStatus.orphanedLiveModes +
              r.databaseStatus.orphanedGuestRsvp + r.databaseStatus.orphanedAnalytics +
              r.databaseStatus.orphanedInvitationNotes + r.databaseStatus.orphanedOrderNotes + r.databaseStatus.orphanedCustomerNotes
            )} color="#d9534f" />
          </div>

          <div className="panel">
            <div className="admin-card-head"><Trash2 size={20} /><div><span className="eyebrow">Actions</span><h2>إجراءات التنظيف</h2></div></div>
            <div className="backup-action-menu" style={{ marginTop: 14, flexWrap: "wrap", gap: 8 }}>
              <ActionButton label="حذف تحليلات قديمة" count={r.databaseStatus.oldAnalytics} action={() => doAction("old-analytics", "/api/admin/cleanup/database")} busy={busyAction === "old-analytics"} disabled={!r.databaseStatus.oldAnalytics} />
              <ActionButton label="حذف سجلات أخطاء قديمة" count={r.databaseStatus.oldErrors} action={() => doAction("old-errors", "/api/admin/cleanup/database")} busy={busyAction === "old-errors"} disabled={!r.databaseStatus.oldErrors} />
              <ActionButton label="تفريغ المهملات" count={r.databaseStatus.expiredTrashInvitations + r.databaseStatus.expiredTrashOrders + r.databaseStatus.expiredTrashCustomers} action={() => doAction("expired-trash", "/api/admin/cleanup/database")} busy={busyAction === "expired-trash"} disabled={!(r.databaseStatus.expiredTrashInvitations + r.databaseStatus.expiredTrashOrders + r.databaseStatus.expiredTrashCustomers)} />
              <ActionButton label="حذف السجلات اليتيمة" action={() => doAction("orphans", "/api/admin/cleanup/database")} busy={busyAction === "db-orphans"} />
              <ActionButton label="تنظيف شامل لقاعدة البيانات" glow action={() => doAction("all", "/api/admin/cleanup/database")} busy={busyAction === "db-all"} />
            </div>
          </div>

          <div className="panel" style={{ marginTop: 14 }}>
            <div className="admin-card-head" style={{ cursor: "pointer" }} onClick={() => toggleSection("db-detail")}>
              <Database size={20} />
              <div style={{ flex: 1 }}><span className="eyebrow">Details</span><h2>تفاصيل السجلات</h2></div>
              {expandedSections.has("db-detail") ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
            </div>
            {expandedSections.has("db-detail") && (
              <div className="backup-detail-grid" style={{ marginTop: 14 }}>
                <div className="backup-detail-row"><span className="backup-detail-label">تحليلات قديمة (+90 يوم)</span><span className="backup-detail-value">{r.databaseStatus.oldAnalytics}</span></div>
                <div className="backup-detail-row"><span className="backup-detail-label">إشعارات قديمة (+90 يوم)</span><span className="backup-detail-value">{r.databaseStatus.oldNotifications}</span></div>
                <div className="backup-detail-row"><span className="backup-detail-label">سجلات أخطاء (+90 يوم)</span><span className="backup-detail-value">{r.databaseStatus.oldErrors}</span></div>
                <div className="backup-detail-row"><span className="backup-detail-label">دعوات منتهية (+30 يوم)</span><span className="backup-detail-value">{r.databaseStatus.expiredTrashInvitations}</span></div>
                <div className="backup-detail-row"><span className="backup-detail-label">طلبات منتهية (+30 يوم)</span><span className="backup-detail-value">{r.databaseStatus.expiredTrashOrders}</span></div>
                <div className="backup-detail-row"><span className="backup-detail-label">عملاء منتهيون (+30 يوم)</span><span className="backup-detail-value">{r.databaseStatus.expiredTrashCustomers}</span></div>
                <div className="backup-detail-row"><span className="backup-detail-label">رسائل تهنئة يتيمة</span><span className="backup-detail-value">{r.databaseStatus.orphanedGuestBook}</span></div>
                <div className="backup-detail-row"><span className="backup-detail-label">تسجيلات حضور يتيمة</span><span className="backup-detail-value">{r.databaseStatus.orphanedCheckIns}</span></div>
                <div className="backup-detail-row"><span className="backup-detail-label">رسائل عملاء يتيمة</span><span className="backup-detail-value">{r.databaseStatus.orphanedClientMessages}</span></div>
                <div className="backup-detail-row"><span className="backup-detail-label">إعدادات رسائل يتيمة</span><span className="backup-detail-value">{r.databaseStatus.orphanedCoupleSettings}</span></div>
                <div className="backup-detail-row"><span className="backup-detail-label">Live Mode يتيم</span><span className="backup-detail-value">{r.databaseStatus.orphanedLiveModes}</span></div>
                <div className="backup-detail-row"><span className="backup-detail-label">RSVP يتيم</span><span className="backup-detail-value">{r.databaseStatus.orphanedGuestRsvp}</span></div>
                <div className="backup-detail-row"><span className="backup-detail-label">Analytics يتيم</span><span className="backup-detail-value">{r.databaseStatus.orphanedAnalytics}</span></div>
                <div className="backup-detail-row"><span className="backup-detail-label">ملاحظات دعوة يتيمة</span><span className="backup-detail-value">{r.databaseStatus.orphanedInvitationNotes}</span></div>
                <div className="backup-detail-row"><span className="backup-detail-label">ملاحظات طلب يتيمة</span><span className="backup-detail-value">{r.databaseStatus.orphanedOrderNotes}</span></div>
                <div className="backup-detail-row"><span className="backup-detail-label">ملاحظات عميل يتيمة</span><span className="backup-detail-value">{r.databaseStatus.orphanedCustomerNotes}</span></div>
              </div>
            )}
          </div>
        </>
      )}

      {r && activeTab === "backups" && (
        <>
          <div className="backup-metrics-grid">
            <MetricCard icon={Archive} label="إجمالي النسخ" value={String(r.mediaReport?.backupFiles.length || 0)} />
            <MetricCard icon={Clock} label="قديمة (للحذف)" value={String(r.mediaReport?.oldBackupFiles.length || 0)} color="#d9534f" />
            <MetricCard icon={HardDrive} label="مساحة قابلة للاستعادة" value={formatBytes(r.mediaReport?.oldBackupFiles.reduce((s, f) => s + f.sizeBytes, 0) || 0)} />
            <MetricCard icon={ShieldCheck} label="متوسط العمر" value={r.mediaReport?.backupFiles.length ? "—" : "لا توجد نسخ"} />
          </div>

          <div className="notice warning">
            <Clock size={18} />
            <span>النسخ المحلية فقط في لوحة التنظيف. النسخ على GitHub (V2) تُدار تلقائياً عبر cron.</span>
          </div>

          <div className="panel">
            <div className="admin-card-head"><Trash2 size={20} /><div><span className="eyebrow">Actions</span><h2>إجراءات</h2></div></div>
            <div className="backup-action-menu" style={{ marginTop: 14 }}>
              <ActionButton label="حذف النسخ القديمة" count={r.mediaReport?.oldBackupFiles.length} action={() => doAction("old-backups", "/api/admin/cleanup/execute")} busy={busyAction === "old-backups"} disabled={!r.mediaReport?.oldBackupFiles.length} />
              <Link className="btn btn-soft" href="/admin/backups"><Archive size={17} /> إدارة النسخ الاحتياطية</Link>
            </div>
          </div>

          {r.mediaReport && r.mediaReport.oldBackupFiles.length > 0 && expandedSections.has("old-backups") && (
            <div className="panel" style={{ marginTop: 14 }}>
              <div className="admin-card-head" style={{ cursor: "pointer" }} onClick={() => toggleSection("old-backups")}>
                <Archive size={20} />
                <div style={{ flex: 1 }}><span className="eyebrow">Old Backups</span><h2>النسخ القديمة ({r.mediaReport.oldBackupFiles.length})</h2></div>
                <ChevronDown size={18} />
              </div>
            </div>
          )}
        </>
      )}

      {r && activeTab === "optimization" && (
        <>
          <div className="backup-metrics-grid">
            <MetricCard icon={Gauge} label="حجم الكاش" value={r.optimizationStatus.cacheSize} />
            <MetricCard icon={Server} label="جداول DB" value={String(r.optimizationStatus.tableCount)} />
            <MetricCard icon={Database} label="حجم DB" value={r.optimizationStatus.dbSize} />
            <MetricCard icon={ShieldCheck} label="الفهارس" value={r.optimizationStatus.indexStatus} />
          </div>

          <div className="backup-health-grid" style={{ marginBottom: 18 }}>
            <div className="panel backup-health-card">
              <div className="backup-health-header"><Database size={22} /><span className="admin-health-pill good">آمن</span></div>
              <h2>إعادة بناء فهارس DB</h2>
              <p>تحسين سرعة الاستعلامات</p>
              <ActionButton label="تشغيل" action={() => doAction("reindex", "/api/admin/cleanup/optimize")} busy={busyAction === "reindex"} />
            </div>
            <div className="panel backup-health-card">
              <div className="backup-health-header"><Activity size={22} /><span className="admin-health-pill good">آمن</span></div>
              <h2>تحديث إحصائيات DB</h2>
              <p>تشغيل ANALYZE</p>
              <ActionButton label="تشغيل" action={() => doAction("analyze", "/api/admin/cleanup/optimize")} busy={busyAction === "analyze"} />
            </div>
            <div className="panel backup-health-card">
              <div className="backup-health-header"><RefreshCw size={22} /><span className="admin-health-pill good">آمن</span></div>
              <h2>تنظيف الكاش</h2>
              <p>مسح كاش Next.js وملفات .next/cache</p>
              <ActionButton label="تشغيل" action={() => doAction("clear-cache", "/api/admin/cleanup/optimize")} busy={busyAction === "clear-cache"} />
            </div>
            <div className="panel backup-health-card">
              <div className="backup-health-header"><BarChart3 size={22} /><span className="admin-health-pill good">آمن</span></div>
              <h2>إعادة حساب الإحصائيات</h2>
              <p>تحديث إحصائيات المنصة</p>
              <ActionButton label="تشغيل" action={() => doAction("recalculate-stats", "/api/admin/cleanup/optimize")} busy={busyAction === "recalculate-stats"} />
            </div>
          </div>

          <div className="panel">
            <div className="admin-card-head"><Zap size={20} /><div><span className="eyebrow">Bulk</span><h2>تحسين شامل</h2></div></div>
            <p style={{ margin: "12px 0", color: "rgba(245,234,214,0.68)", fontWeight: 850 }}>
              تنفيذ جميع عمليات التحسين مرة واحدة
            </p>
            <ActionButton label="⚡ تحسين شامل" glow action={() => doAction("all", "/api/admin/cleanup/optimize")} busy={busyAction === "opt-all"} />
          </div>

          {r.optimizationStatus.lastOptimizedAt && (
            <div className="notice success" style={{ marginTop: 14 }}>
              <ShieldCheck size={18} />
              <span>آخر تحسين: {new Date(r.optimizationStatus.lastOptimizedAt).toLocaleString("ar-SA")}</span>
            </div>
          )}
        </>
      )}

      {r && activeTab === "packages" && (
        <>
          <div className="backup-metrics-grid">
            <MetricCard icon={PackageIcon} label="إجمالي الحزم" value={String(r.packageStatus.totalPackages)} />
            <MetricCard icon={Bug} label="غير مستخدمة" value={String(r.packageStatus.unusedPackages)} color={r.packageStatus.unusedPackages > 0 ? "#d9534f" : undefined} />
          </div>

          {r.packageStatus.unusedPackages > 0 && (
            <div className="notice warning">
              <Bug size={18} />
              <span>{r.packageStatus.unusedPackages} حزمة غير مستخدمة — راجع package.json يدوياً لإزالتها</span>
            </div>
          )}

          {r.packageStatus.unusedPackages === 0 && (
            <div className="notice success">
              <ShieldCheck size={18} />
              <span>جميع الحزم تبدو مستخدمة</span>
            </div>
          )}
        </>
      )}

      <style jsx>{`
        .spin { animation: spin 1s linear infinite; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}

function BarChart3(props: { size?: number; className?: string; style?: React.CSSProperties }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={props.size || 24} height={props.size || 24} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={props.style} className={props.className}>
      <line x1="12" y1="20" x2="12" y2="10" /><line x1="18" y1="20" x2="18" y2="4" /><line x1="6" y1="20" x2="6" y2="16" />
    </svg>
  );
}

function Zap(props: { size?: number; className?: string; style?: React.CSSProperties }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={props.size || 24} height={props.size || 24} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={props.style} className={props.className}>
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
    </svg>
  );
}

function PackageIcon(props: { size?: number; className?: string; style?: React.CSSProperties }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={props.size || 24} height={props.size || 24} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={props.style} className={props.className}>
      <line x1="16.5" y1="9.4" x2="7.5" y2="4.21" /><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
      <polyline points="3.27 6.96 12 12.01 20.73 6.96" /><line x1="12" y1="22.08" x2="12" y2="12" />
    </svg>
  );
}
