"use client";

import { Github, History, Loader2, CheckCircle2, XCircle, AlertTriangle, CloudDownload, FileJson } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { ConfirmDialog } from "@/components/ConfirmDialog";

type GitHubBackupEntry = {
  fileName: string;
  repoPath: string;
  sha: string;
  size: number;
  createdAt: string;
  type: string;
};

type GitHubListResponse = {
  backups: GitHubBackupEntry[];
  totalSize: number;
  commitSha?: string;
  error?: string;
};

type RestoreResult = {
  ok: boolean;
  fileName: string;
  itemsRestored: number;
  uploadsRestored: number;
  durationMs: number;
  error: string | null;
};

const STEP_LABELS: Record<string, string> = {
  adminUsers: "المشرفين",
  customers: "العملاء",
  invitations: "الدعوات",
  guestRsvps: "تأكيدات الحضور",
  orderRequests: "طلبات الزبائن",
  analyticsEvents: "إحصائيات",
  appSettings: "إعدادات التطبيق",
  guestBookMessages: "رسائل سجل الزوار",
  coupleMessagesSettings: "إعدادات رسائل الزوجين",
  clientMessages: "رسائل العملاء",
  invitationCheckIns: "تسجيلات الدخول",
  weddingLiveModes: "حالات البث المباشر",
  internalNotes: "ملاحظات داخلية",
  auditLogs: "سجل التدقيق",
  backupJobs: "وظائف النسخ",
  syncLogs: "سجل المزامنة",
};

function formatBytes(value: number) {
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("ar-EG-u-nu-latn", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Africa/Cairo",
  }).format(date);
}

const BACKUP_TYPE_LABELS: Record<string, string> = {
  scheduled: "تلقائي",
  manual: "يدوي",
  verify: "تحقق",
  "storage-cleanup-orphans": "تنظيف-يتامى",
  "storage-cleanup-duplicates": "تنظيف-مكررات",
  "storage-cleanup": "تنظيف-تخزين",
};

export default function GitHubBackupsPanel() {
  const [data, setData] = useState<GitHubListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [restoreLoading, setRestoreLoading] = useState(false);
  const [restoreResult, setRestoreResult] = useState<RestoreResult | null>(null);
  const [confirmTarget, setConfirmTarget] = useState<{ fileName: string; sha: string; createdAt: string } | null>(null);

  const fetchBackups = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/backups/github", {
        headers: { Accept: "application/json" },
      });
      if (!res.ok) {
        const body = await res.text().catch(() => "");
        throw new Error(`فشل جلب النسخ: ${res.status} ${body}`);
      }
      const json = (await res.json()) as GitHubListResponse;
      if (json.error) {
        setError(json.error);
      } else {
        setData(json);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "فشل الاتصال بالخادم");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBackups();
  }, [fetchBackups]);

  async function doRestore(fileName: string, sha: string, createdAt: string) {
    setConfirmTarget(null);
    setRestoreLoading(true);
    setRestoreResult(null);
    try {
      const res = await fetch("/api/admin/backups/github/restore", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ fileName, sha, createdAt }),
      });
      const result = (await res.json()) as RestoreResult;
      setRestoreResult(result);
      if (result.ok) {
        setTimeout(() => window.location.reload(), 3000);
      }
    } catch (err) {
      setRestoreResult({
        ok: false,
        fileName,
        itemsRestored: 0,
        uploadsRestored: 0,
        durationMs: 0,
        error: err instanceof Error ? err.message : "فشل الاتصال بالخادم",
      });
    } finally {
      setRestoreLoading(false);
    }
  }

  const latest = data?.backups?.[0];

  return (
    <div className="panel" style={{ marginTop: 18 }}>
      <div className="admin-card-head">
        <Github size={22} />
        <div>
          <span className="eyebrow">GitHub Backups</span>
          <h2>النسخ الاحتياطية على GitHub</h2>
        </div>
        {data?.commitSha ? (
          <span style={{
            direction: "ltr",
            fontSize: "0.72rem",
            color: "rgba(245,234,214,0.4)",
            fontFamily: "var(--font-jetbrains-mono, ui-monospace, monospace)",
            marginLeft: "auto",
          }}>
            HEAD: {data.commitSha.slice(0, 7)}
          </span>
        ) : null}
      </div>

      {error ? (
        <div className="notice danger" style={{ marginTop: 10 }}>
          <AlertTriangle size={18} />
          {error}
        </div>
      ) : null}

      {loading ? (
        <div className="admin-empty-state" style={{ padding: "24px 0" }}>
          <Loader2 size={24} className="sync-spin" />
          <p>جاري تحميل النسخ من GitHub...</p>
        </div>
      ) : null}

      {data && !error ? (
        <>
          {data.backups.length === 0 ? (
            <div className="admin-empty-state" style={{ padding: "24px 0" }}>
              <CloudDownload size={28} />
              <strong>لا توجد نسخ احتياطية على GitHub</strong>
              <p>أنشئ نسخة احتياطية أولاً لتظهر هنا.</p>
            </div>
          ) : (
            <>
              <div className="backup-metrics-grid" style={{ marginTop: 14 }}>
                <div className="backup-metric-card">
                  <FileJson size={20} className="metric-icon" />
                  <span className="metric-label">عدد النسخ</span>
                  <span className="metric-value">{data.backups.length}</span>
                </div>
                <div className="backup-metric-card">
                  <CloudDownload size={20} className="metric-icon" />
                  <span className="metric-label">إجمالي الحجم</span>
                  <span className="metric-value">{formatBytes(data.totalSize)}</span>
                </div>
                {latest ? (
                  <div className="backup-metric-card">
                    <History size={20} className="metric-icon" />
                    <span className="metric-label">آخر نسخة</span>
                    <span className="metric-value" style={{ fontSize: "0.85rem" }}>
                      {formatDate(latest.createdAt)}
                    </span>
                  </div>
                ) : null}
              </div>

              {latest ? (
                <div style={{ marginTop: 14 }}>
                  <button
                    className="btn btn-danger"
                    type="button"
                    onClick={() =>
                      setConfirmTarget({
                        fileName: latest.fileName,
                        sha: latest.sha,
                        createdAt: latest.createdAt,
                      })
                    }
                    disabled={restoreLoading}
                  >
                    {restoreLoading ? (
                      <Loader2 size={17} className="sync-spin" />
                    ) : (
                      <History size={17} />
                    )}
                    استعادة آخر نسخة: {latest.fileName}
                  </button>
                  <span style={{ fontSize: "0.78rem", color: "rgba(245,234,214,0.45)", marginRight: 10 }}>
                    {formatBytes(latest.size)} — {formatDate(latest.createdAt)}
                  </span>
                </div>
              ) : null}

              <div className="backup-table-wrapper" style={{ marginTop: 16 }}>
                <div className="table-shell">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>الملف</th>
                        <th>النوع</th>
                        <th>الحجم</th>
                        <th>تاريخ الإنشاء</th>
                        <th>SHA</th>
                        <th>إجراءات</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.backups.map((backup) => (
                        <tr key={backup.repoPath}>
                          <td>
                            <span className="backup-file-name">{backup.fileName}</span>
                          </td>
                          <td>{BACKUP_TYPE_LABELS[backup.type] || backup.type}</td>
                          <td style={{ direction: "ltr", textAlign: "right" }}>
                            {formatBytes(backup.size)}
                          </td>
                          <td>{formatDate(backup.createdAt)}</td>
                          <td>
                            <span style={{
                              fontFamily: "var(--font-jetbrains-mono, ui-monospace, monospace)",
                              fontSize: "0.72rem",
                              color: "rgba(245,234,214,0.5)",
                              direction: "ltr",
                              display: "inline-block",
                            }}>
                              {backup.sha.slice(0, 7)}
                            </span>
                          </td>
                          <td>
                            <button
                              className="btn btn-danger btn-icon"
                              type="button"
                              onClick={() =>
                                setConfirmTarget({
                                  fileName: backup.fileName,
                                  sha: backup.sha,
                                  createdAt: backup.createdAt,
                                })
                              }
                              disabled={restoreLoading}
                              title="استعادة النسخة"
                            >
                              <History size={17} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </>
      ) : null}

      <ConfirmDialog
        isOpen={confirmTarget !== null}
        title="استعادة النسخة من GitHub"
        message={
          confirmTarget
            ? `هل أنت متأكد من استعادة النسخة "${confirmTarget.fileName}" من GitHub؟
سيتم تحميل الملف من GitHub وحذف جميع البيانات الحالية (العملاء، الدعوات، تأكيدات الحضور، الطلبات، الإحصائيات، إلخ) واستبدالها ببيانات النسخة.
هذا الإجراء لا يمكن التراجع عنه!`
            : ""
        }
        confirmText="استعادة النسخة"
        cancelText="إلغاء"
        isDangerous
        isLoading={restoreLoading}
        onConfirm={() => {
          if (confirmTarget) {
            doRestore(confirmTarget.fileName, confirmTarget.sha, confirmTarget.createdAt);
          }
        }}
        onCancel={() => setConfirmTarget(null)}
      />

      {restoreResult ? (
        <div className="restore-result-overlay" onClick={() => setRestoreResult(null)} role="dialog" aria-modal="true">
          <div className="restore-result-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="restore-result-header">
              {restoreResult.ok ? (
                <CheckCircle2 size={28} className="restore-icon-success" />
              ) : (
                <XCircle size={28} className="restore-icon-error" />
              )}
              <h3>{restoreResult.ok ? "تمت الاستعادة بنجاح" : "فشلت الاستعادة"}</h3>
              <button
                className="restore-result-close"
                type="button"
                onClick={() => setRestoreResult(null)}
                aria-label="إغلاق"
              >
                <XCircle size={20} />
              </button>
            </div>

            {restoreResult.ok ? (
              <div className="restore-result-summary">
                <span>
                  تم استعادة <strong>{restoreResult.itemsRestored}</strong> سجل و{" "}
                  <strong>{restoreResult.uploadsRestored}</strong> ملف خلال{" "}
                  {(restoreResult.durationMs / 1000).toFixed(1)}ث
                </span>
              </div>
            ) : (
              <div className="restore-result-error">
                <AlertTriangle size={18} />
                <span>{restoreResult.error}</span>
              </div>
            )}

            {restoreResult.ok ? (
              <p className="restore-result-reload">سيتم تحديث الصفحة خلال 3 ثوان...</p>
            ) : null}

            <button className="btn btn-soft" type="button" onClick={() => setRestoreResult(null)}>
              إغلاق
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
