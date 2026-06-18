import { checkOptimizationStatus } from "@/lib/cleanup";
import { generateCsrfToken } from "@/lib/csrf";
import {
  Gauge,
  Database,
  RefreshCw,
  Image as ImageIcon,
  BarChart3,
  HardDrive,
  ShieldCheck,
  AlertTriangle,
  Zap,
} from "lucide-react";

export const dynamic = "force-dynamic";

export default async function OptimizationPage() {
  const [status, csrfToken] = await Promise.all([
    checkOptimizationStatus(),
    generateCsrfToken(),
  ]);

  const optimizationTasks = [
    {
      id: "reindex",
      icon: Database,
      title: "إعادة بناء فهارس قاعدة البيانات",
      desc: "تحسين سرعة الاستعلامات عبر إعادة بناء الفهارس",
      action: "reindex",
      safe: true,
    },
    {
      id: "analyze",
      icon: BarChart3,
      title: "تحديث إحصائيات قاعدة البيانات",
      desc: "تشغيل ANALYZE لتحديث إحصائيات الاستعلامات",
      action: "analyze",
      safe: true,
    },
    {
      id: "cache",
      icon: RefreshCw,
      title: "تنظيف ذاكرة التخزين المؤقت",
      desc: "مسح كاش Next.js وذاكرة المتصفح المؤقتة",
      action: "clear-cache",
      safe: true,
    },
    {
      id: "media-optimize",
      icon: ImageIcon,
      title: "ضغط وتحسين الوسائط",
      desc: "ضغط الصور وتحسين جودتها لتقليل حجم التخزين",
      action: "optimize-media",
      safe: false,
    },
    {
      id: "stats",
      icon: BarChart3,
      title: "إعادة حساب إحصائيات المنصة",
      desc: "إعادة حساب إحصائيات الدعوات والزيارات والأداء",
      action: "recalculate-stats",
      safe: true,
    },
  ];

  return (
    <>
      <div className="dashboard-head">
        <div>
          <span className="eyebrow">Performance Optimization</span>
          <h1>⚙️ تحسين الأداء</h1>
          <p>إعادة بناء الفهارس، تنظيف الكاش، ضغط الوسائط، وإعادة حساب الإحصائيات لتحسين أداء المنصة.</p>
        </div>
      </div>

      <div className="backup-metrics-grid">
        <div className="backup-metric-card">
          <Gauge size={20} className="metric-icon" />
          <span className="metric-label">حجم الكاش</span>
          <span className="metric-value">{status.cacheSize}</span>
        </div>
        <div className="backup-metric-card">
          <Zap size={20} className="metric-icon" />
          <span className="metric-label">تحسينات معلقة</span>
          <span className="metric-value">{status.pendingOptimizations.length}</span>
        </div>
        <div className="backup-metric-card">
          <HardDrive size={20} className="metric-icon" />
          <span className="metric-label">حالة الفهارس</span>
          <span className="metric-value" style={{ fontSize: "0.9rem" }}>{status.indexStatus}</span>
        </div>
        <div className="backup-metric-card">
          <ShieldCheck size={20} className="metric-icon" />
          <span className="metric-label">آخر تحسين</span>
          <span className="metric-value" style={{ fontSize: "0.85rem" }}>{status.lastOptimizedAt || "لم يتم"}</span>
        </div>
      </div>

      <div className="notice success" style={{ marginTop: 14 }}>
        <ShieldCheck size={18} />
        <span>جميع عمليات التحسين آمنة وتُنفذ بدون تأثير على البيانات أو الخدمة.</span>
      </div>

      <div className="backup-health-grid" style={{ marginTop: 18 }}>
        {optimizationTasks.map((task) => {
          const Icon = task.icon;
          return (
            <div key={task.id} className="panel backup-health-card backup-health-card--ok">
              <div className="backup-health-header">
                <Icon size={22} />
                {task.safe ? (
                  <span className="admin-health-pill good">آمن</span>
                ) : (
                  <span className="admin-health-pill warning">يتطلب مراجعة</span>
                )}
              </div>
              <h2>{task.title}</h2>
              <p>{task.desc}</p>
              <div className="backup-action-menu" style={{ marginTop: 8 }}>
                <form action="/api/admin/cleanup/optimize" method="post">
                  <input type="hidden" name="csrf" value={csrfToken} />
                  <input type="hidden" name="action" value={task.action} />
                  <button className="btn btn-soft" type="submit">
                    تشغيل
                  </button>
                </form>
              </div>
            </div>
          );
        })}
      </div>

      <div className="backup-restore-panel panel" style={{ marginTop: 18 }}>
        <div className="admin-card-head">
          <AlertTriangle size={22} />
          <div>
            <span className="eyebrow">Bulk Optimization</span>
            <h2>تحسين شامل</h2>
          </div>
        </div>
        <p style={{ margin: "12px 0", color: "rgba(245,234,214,0.68)", fontWeight: 850, lineHeight: 1.65 }}>
          تنفيذ جميع عمليات التحسين الآمنة مرة واحدة. هذا سيقوم بإعادة بناء الفهارس، تحديث الإحصائيات، وتنظيف الكاش.
        </p>
        <form action="/api/admin/cleanup/optimize" method="post">
          <input type="hidden" name="csrf" value={csrfToken} />
          <input type="hidden" name="action" value="all" />
          <button className="btn btn-gold btn-glow" type="submit">
            ⚡ تحسين شامل
          </button>
        </form>
      </div>
    </>
  );
}
