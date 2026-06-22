"use client";

import { Loader2, CheckCircle2, XCircle, AlertTriangle, History, CloudUpload, Archive, Database, RotateCcw } from "lucide-react";
import { useState } from "react";
import { ConfirmDialog } from "@/components/ConfirmDialog";

type ActionType = "database" | "uploads" | "full" | "restore-database" | "restore-uploads" | "restore-full" | "auto-restore";

type RestoreResult = {
  ok: boolean;
  type?: string;
  fileName?: string;
  itemsRestored?: number;
  uploadsRestored?: number;
  durationMs?: number;
  error?: string;
  executed?: boolean;
  restored?: boolean;
  reason?: string;
};

const ACTION_CONFIG: Record<ActionType, {
  icon: typeof History;
  label: string;
  confirmTitle: string;
  confirmMessage: string;
  endpoint: string;
  method: "POST" | "GET";
  dangerous: boolean;
}> = {
  database: {
    icon: Database,
    label: "إنشاء نسخة قاعدة بيانات",
    confirmTitle: "نسخ قاعدة البيانات",
    confirmMessage: "سيتم إنشاء نسخة احتياطية من قاعدة البيانات ورفعها إلى GitHub.",
    endpoint: "/api/admin/backups/database",
    method: "POST",
    dangerous: false,
  },
  uploads: {
    icon: CloudUpload,
    label: "إنشاء نسخة ملفات",
    confirmTitle: "نسخ الملفات المرفوعة",
    confirmMessage: "سيتم إنشاء نسخة احتياطية من جميع الملفات المرفوعة ورفعها إلى GitHub.",
    endpoint: "/api/admin/backups/uploads",
    method: "POST",
    dangerous: false,
  },
  full: {
    icon: Archive,
    label: "إنشاء نسخة كاملة",
    confirmTitle: "نسخ كاملة",
    confirmMessage: "سيتم إنشاء نسخة احتياطية كاملة (قاعدة بيانات + ملفات) ورفعها إلى GitHub.",
    endpoint: "/api/admin/backups/full",
    method: "POST",
    dangerous: false,
  },
  "restore-database": {
    icon: RotateCcw,
    label: "استعادة قاعدة البيانات",
    confirmTitle: "استعادة قاعدة البيانات",
    confirmMessage: "سيتم حذف جميع البيانات الحالية واستبدالها ببيانات آخر نسخة قاعدة بيانات. هذا الإجراء لا يمكن التراجع عنه!",
    endpoint: "/api/admin/backups/github/restore/database",
    method: "POST",
    dangerous: true,
  },
  "restore-uploads": {
    icon: CloudUpload,
    label: "استعادة الملفات",
    confirmTitle: "استعادة الملفات المرفوعة",
    confirmMessage: "سيتم استبدال جميع الملفات المرفوعة بملفات آخر نسخة احتياطية. هذا الإجراء لا يمكن التراجع عنه!",
    endpoint: "/api/admin/backups/github/restore/uploads",
    method: "POST",
    dangerous: true,
  },
  "restore-full": {
    icon: Archive,
    label: "استعادة كاملة",
    confirmTitle: "استعادة كاملة",
    confirmMessage: "سيتم حذف جميع البيانات والملفات الحالية واستبدالها بآخر نسخة كاملة. هذا الإجراء لا يمكن التراجع عنه!",
    endpoint: "/api/admin/backups/github/restore/full",
    method: "POST",
    dangerous: true,
  },
  "auto-restore": {
    icon: RotateCcw,
    label: "تشغيل Auto Restore",
    confirmTitle: "Auto Restore",
    confirmMessage: "سيتم التحقق من حالة قاعدة البيانات والملفات واستعادة النوع المناسب تلقائياً.",
    endpoint: "/api/admin/backups/auto-restore",
    method: "POST",
    dangerous: false,
  },
};

export function V2BackupActions({ type }: { type: ActionType }) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<RestoreResult | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const config = ACTION_CONFIG[type];
  const Icon = config.icon;

  async function doAction() {
    setShowConfirm(false);
    setLoading(true);
    setResult(null);
    try {
      const response = await fetch(config.endpoint, {
        method: config.method,
        headers: { Accept: "application/json", "Content-Type": "application/json" },
        body: config.method === "POST" ? "{}" : undefined,
      });
      const payload = (await response.json()) as RestoreResult;
      setResult(payload);
      if (payload.ok || payload.executed) {
        setTimeout(() => window.location.reload(), 3000);
      }
    } catch (error) {
      setResult({
        ok: false,
        error: error instanceof Error ? error.message : "فشل الاتصال بالخادم",
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <button
        className={`btn ${config.dangerous ? "btn-danger" : "btn-gold"} btn-icon`}
        type="button"
        onClick={() => setShowConfirm(true)}
        disabled={loading}
        title={config.label}
        style={{ width: "100%", justifyContent: "center" }}
      >
        {loading ? <Loader2 size={17} className="sync-spin" /> : <Icon size={17} />}
        <span style={{ marginRight: 8 }}>{config.label}</span>
      </button>

      <ConfirmDialog
        isOpen={showConfirm}
        title={config.confirmTitle}
        message={config.confirmMessage}
        confirmText="تأكيد"
        cancelText="إلغاء"
        isDangerous={config.dangerous}
        isLoading={loading}
        onConfirm={doAction}
        onCancel={() => setShowConfirm(false)}
      />

      {result ? (
        <div className="restore-result-overlay" onClick={() => setResult(null)} role="dialog" aria-modal="true">
          <div className="restore-result-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="restore-result-header">
              {(result.ok || result.restored || result.executed) && !result.error ? (
                <CheckCircle2 size={28} className="restore-icon-success" />
              ) : (
                <XCircle size={28} className="restore-icon-error" />
              )}
              <h3>
                {result.ok || (result.executed && result.restored)
                  ? "تمت العملية بنجاح"
                  : result.executed && !result.restored
                    ? "لم يتم تنفيذ أي استعادة"
                    : "فشلت العملية"}
              </h3>
              <button className="restore-result-close" type="button" onClick={() => setResult(null)} aria-label="إغلاق">
                <XCircle size={20} />
              </button>
            </div>

            {result.reason ? (
              <div className="restore-result-summary">
                <span>{result.reason}</span>
              </div>
            ) : result.error ? (
              <div className="restore-result-error">
                <AlertTriangle size={18} />
                <span>{result.error}</span>
              </div>
            ) : null}

            {result.itemsRestored !== undefined || result.uploadsRestored !== undefined ? (
              <div className="restore-result-summary">
                <span>
                  {result.itemsRestored !== undefined && <strong>{result.itemsRestored}</strong>}
                  {result.itemsRestored !== undefined ? " سجل " : ""}
                  {result.uploadsRestored !== undefined && <strong>{result.uploadsRestored}</strong>}
                  {result.uploadsRestored !== undefined ? " ملف" : ""}
                  {result.durationMs ? ` (خلال ${(result.durationMs / 1000).toFixed(1)}ث)` : ""}
                </span>
              </div>
            ) : null}

            {result.ok || result.restored ? (
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
