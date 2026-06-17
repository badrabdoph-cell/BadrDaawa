"use client";

import { History, Loader2, CheckCircle2, XCircle, AlertTriangle } from "lucide-react";
import { useState } from "react";
import { ConfirmDialog } from "@/components/ConfirmDialog";

type RestoreResult = {
  ok: boolean;
  fileName: string;
  itemsRestored: number;
  uploadsRestored: number;
  steps: Array<{ table: string; deleted: number; inserted: number }>;
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

export function RestoreBackupButton({ fileName }: { fileName: string }) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<RestoreResult | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);

  async function doRestore() {
    setShowConfirm(false);
    setLoading(true);
    setResult(null);
    try {
      const response = await fetch(`/api/admin/backups/${encodeURIComponent(fileName)}/restore`, {
        method: "POST",
        headers: { Accept: "application/json" },
      });
      const payload = (await response.json()) as RestoreResult;
      setResult(payload);
      if (payload.ok) {
        setTimeout(() => window.location.reload(), 3000);
      }
    } catch (error) {
      setResult({
        ok: false,
        fileName,
        itemsRestored: 0,
        uploadsRestored: 0,
        steps: [],
        durationMs: 0,
        error: error instanceof Error ? error.message : "فشل الاتصال بالخادم",
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <button
        className="btn btn-danger btn-icon"
        type="button"
        onClick={() => setShowConfirm(true)}
        disabled={loading}
        title="استعادة النسخة"
      >
        {loading ? <Loader2 size={17} className="sync-spin" /> : <History size={17} />}
      </button>

      <ConfirmDialog
        isOpen={showConfirm}
        title="استعادة النسخة الاحتياطية"
        message={`هل أنت متأكد من استعادة النسخة "${fileName}"؟
سيتم حذف جميع البيانات الحالية (العملاء، الدعوات، تأكيدات الحضور، الطلبات، الإحصائيات، إلخ) واستبدالها ببيانات النسخة.
هذا الإجراء لا يمكن التراجع عنه!`}
        confirmText="استعادة النسخة"
        cancelText="إلغاء"
        isDangerous
        isLoading={loading}
        onConfirm={doRestore}
        onCancel={() => setShowConfirm(false)}
      />

      {result ? (
        <div className="restore-result-overlay" onClick={() => setResult(null)} role="dialog" aria-modal="true">
          <div className="restore-result-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="restore-result-header">
              {result.ok ? <CheckCircle2 size={28} className="restore-icon-success" /> : <XCircle size={28} className="restore-icon-error" />}
              <h3>{result.ok ? "تمت الاستعادة بنجاح" : "فشلت الاستعادة"}</h3>
              <button className="restore-result-close" type="button" onClick={() => setResult(null)} aria-label="إغلاق">
                <XCircle size={20} />
              </button>
            </div>

            {result.ok ? (
              <div className="restore-result-summary">
                <span>تم استعادة <strong>{result.itemsRestored}</strong> سجل و <strong>{result.uploadsRestored}</strong> ملف خلال {(result.durationMs / 1000).toFixed(1)}ث</span>
              </div>
            ) : (
              <div className="restore-result-error">
                <AlertTriangle size={18} />
                <span>{result.error}</span>
              </div>
            )}

            <div className="restore-result-steps">
              {result.steps
                .filter((s) => s.deleted > 0 || s.inserted > 0)
                .map((step) => (
                  <div key={step.table} className="restore-step-row">
                    <span className="restore-step-label">{STEP_LABELS[step.table] || step.table}</span>
                    <span className="restore-step-counts">
                      <span className="restore-step-deleted">-{step.deleted}</span>
                      <span className="restore-step-arrow">&rarr;</span>
                      <span className="restore-step-inserted">+{step.inserted}</span>
                    </span>
                  </div>
                ))}
            </div>

            {result.ok ? (
              <p className="restore-result-reload">سيتم تحديث الصفحة خلال 3 ثوان...</p>
            ) : null}

            <button className="btn btn-soft" type="button" onClick={() => setResult(null)}>
              إغلاق
            </button>
          </div>
        </div>
      ) : null}
    </>
  );
}
