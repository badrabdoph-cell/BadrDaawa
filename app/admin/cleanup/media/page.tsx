import { getMediaCleanupReport } from "@/lib/media-cleanup";
import { formatBytes } from "@/lib/cleanup";
import { generateCsrfToken } from "@/lib/csrf";
import { FileImage, Image as ImageIcon, Music, Video, HardDrive, AlertTriangle, Trash2 } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function MediaCleanupPage() {
  const csrfToken = await generateCsrfToken();
  const report = await getMediaCleanupReport().catch(() => null);

  return (
    <>
      <div className="dashboard-head">
        <div>
          <span className="eyebrow">Media Cleanup</span>
          <h1>🖼 تنظيف الوسائط</h1>
          <p>اكتشاف الصور والملفات غير المرتبطة بأي دعوة، الملفات المكررة، والملفات المؤقتة القديمة.</p>
        </div>
      </div>

      {report ? (
        <>
          <div className="backup-metrics-grid">
            <div className="backup-metric-card">
              <FileImage size={20} className="metric-icon" />
              <span className="metric-label">إجمالي الملفات</span>
              <span className="metric-value">{report.totalFiles}</span>
            </div>
            <div className="backup-metric-card">
              <ImageIcon size={20} className="metric-icon" />
              <span className="metric-label">صور</span>
              <span className="metric-value">{report.imageFiles}</span>
            </div>
            <div className="backup-metric-card">
              <Music size={20} className="metric-icon" />
              <span className="metric-label">موسيقى</span>
              <span className="metric-value">{report.audioFiles}</span>
            </div>
            <div className="backup-metric-card">
              <HardDrive size={20} className="metric-icon" />
              <span className="metric-label">إجمالي الحجم</span>
              <span className="metric-value">{formatBytes(report.totalSizeBytes)}</span>
            </div>
          </div>

          <div className="backup-health-grid">
            <div className="panel backup-health-card backup-health-card--ok">
              <div className="backup-health-header">
                <AlertTriangle size={22} />
                <span className="admin-health-pill warning">{report.orphanFiles.length}</span>
              </div>
              <h2>ملفات يتيمة</h2>
              <p>ملفات مرفوعة ليس لها مرجع في أي دعوة أو طلب.</p>
              <strong>{formatBytes(report.orphanFiles.reduce((s, f) => s + f.sizeBytes, 0))}</strong>
            </div>
            <div className="panel backup-health-card backup-health-card--ok">
              <div className="backup-health-header">
                <FileImage size={22} />
                <span className="admin-health-pill warning">{report.duplicateFiles.length}</span>
              </div>
              <h2>ملفات مكررة</h2>
              <p>ملفات بنفس المحتوى يمكن حذف النسخ الزائدة منها.</p>
              <strong>{formatBytes(report.duplicateSizeBytes)}</strong>
            </div>
            <div className="panel backup-health-card backup-health-card--ok">
              <div className="backup-health-header">
                <ImageIcon size={22} />
                <span className="admin-health-pill warning">{report.unusedOriginalImages.length}</span>
              </div>
              <h2>صور أصلية غير مستخدمة</h2>
              <p>صور عالية الدقة بدون مرجع.</p>
              <strong>{formatBytes(report.unusedOriginalImages.reduce((s, f) => s + f.sizeBytes, 0))}</strong>
            </div>
            <div className="panel backup-health-card backup-health-card--ok">
              <div className="backup-health-header">
                <Music size={22} />
                <span className="admin-health-pill warning">{report.unusedMusicFiles.length}</span>
              </div>
              <h2>ملفات موسيقى غير مرتبطة</h2>
              <p>ملفات صوت وفيديو بدون مرجع.</p>
              <strong>{formatBytes(report.unusedMusicFiles.reduce((s, f) => s + f.sizeBytes, 0))}</strong>
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
            <div className="notice warning" style={{ marginTop: 14 }}>
              <AlertTriangle size={18} />
              <span>سيتم إنشاء نسخة احتياطية تلقائياً قبل الحذف. يمكنك اختيار نوع التنظيف.</span>
            </div>
            <div className="backup-action-menu" style={{ marginTop: 14, flexWrap: "wrap" }}>
              <form action="/api/admin/cleanup/execute" method="post">
                <input type="hidden" name="csrf" value={csrfToken} />
                <input type="hidden" name="action" value="orphans" />
                <button className="btn btn-gold" type="submit">
                  🧹 حذف الملفات اليتيمة ({report.orphanFiles.length})
                </button>
              </form>
              <span className="backup-action-divider" />
              <form action="/api/admin/cleanup/execute" method="post">
                <input type="hidden" name="csrf" value={csrfToken} />
                <input type="hidden" name="action" value="duplicates" />
                <button className="btn btn-soft" type="submit">
                  🧹 حذف الملفات المكررة ({report.duplicateFiles.length})
                </button>
              </form>
              <span className="backup-action-divider" />
              <form action="/api/admin/cleanup/execute" method="post">
                <input type="hidden" name="csrf" value={csrfToken} />
                <input type="hidden" name="action" value="temp" />
                <button className="btn btn-soft" type="submit">
                  🧹 حذف الملفات المؤقتة ({report.oldTemporaryFiles.length})
                </button>
              </form>
              <span className="backup-action-divider" />
              <form action="/api/admin/cleanup/execute" method="post">
                <input type="hidden" name="csrf" value={csrfToken} />
                <input type="hidden" name="action" value="all" />
                <button className="btn btn-gold btn-glow" type="submit">
                  🧹 تنظيف شامل للوسائط
                </button>
              </form>
              <span className="backup-action-meta">
                إجمالي قابل للاستعادة: {formatBytes(report.recoverableSizeBytes)}
              </span>
            </div>
          </div>

          {report.orphanFiles.length > 0 && (
            <div className="panel" style={{ marginTop: 14 }}>
              <div className="admin-card-head">
                <FileImage size={20} />
                <div>
                  <span className="eyebrow">Orphan Files Preview</span>
                  <h2>معاينة الملفات اليتيمة</h2>
                </div>
              </div>
              <div className="table-shell" style={{ marginTop: 14 }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>الملف</th>
                      <th>النوع</th>
                      <th>الحجم</th>
                      <th>تاريخ التعديل</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.orphanFiles.slice(0, 50).map((file) => (
                      <tr key={file.url}>
                        <td style={{ fontSize: "0.8rem", direction: "ltr", textAlign: "left" }}>
                          {file.relativePath}
                        </td>
                        <td>{file.kind === "image" ? "صورة" : file.kind === "audio" ? "موسيقى" : "فيديو"}</td>
                        <td style={{ direction: "ltr", textAlign: "right" }}>{formatBytes(file.sizeBytes)}</td>
                        <td>{new Date(file.modifiedAt).toLocaleDateString("ar-SA")}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {report.orphanFiles.length > 50 && (
                <p style={{ marginTop: 8, color: "rgba(245,234,214,0.5)", fontSize: "0.82rem" }}>
                  ... و {report.orphanFiles.length - 50} ملف آخر
                </p>
              )}
            </div>
          )}
        </>
      ) : (
        <div className="notice danger">
          <AlertTriangle size={18} />
          <span>تعذر فحص الوسائط. قد يكون مجلد الرفع غير متاح.</span>
        </div>
      )}
    </>
  );
}
