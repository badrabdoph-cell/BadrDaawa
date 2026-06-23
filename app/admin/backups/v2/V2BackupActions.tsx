"use client";

import { Loader2, CheckCircle2, XCircle, AlertTriangle, History, CloudUpload, Archive, Database, RotateCcw, Copy, ChevronDown, ChevronUp } from "lucide-react";
import { useCallback, useState } from "react";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { OperationProgressDialog } from "@/components/OperationProgressDialog";

type ActionType = "database" | "full" | "restore-database" | "restore-uploads" | "restore-full" | "auto-restore";

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

type OperationMeta = {
  id: string;
  type: ActionType;
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

export function V2BackupActions({ type, overrides }: {
  type: ActionType;
  overrides?: { fileName?: string; commitSha?: string };
}) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<RestoreResult | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [operation, setOperation] = useState<OperationMeta | null>(null);
  const [showErrorDetails, setShowErrorDetails] = useState(false);
  const [copyDone, setCopyDone] = useState(false);
  const config = ACTION_CONFIG[type];
  const Icon = config.icon;

  const onOperationDone = useCallback((_resultData: unknown, error: string | null) => {
    setOperation(null);
    setLoading(false);
    if (error) {
      setResult({ ok: false, error });
    }
  }, []);

  async function doAction() {
    setShowConfirm(false);
    setLoading(true);
    setResult(null);
    setShowErrorDetails(false);

    try {
      const opRes = await fetch("/api/admin/backups/operations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type }),
      });
      const { operationId } = await opRes.json();
      setOperation({ id: operationId, type });

      const body: Record<string, unknown> = { operationId };
      if (overrides?.fileName) body.fileName = overrides.fileName;
      if (overrides?.commitSha) body.sha = overrides.commitSha;

      const response = await fetch(config.endpoint, {
        method: config.method,
        headers: { Accept: "application/json", "Content-Type": "application/json" },
        body: config.method === "POST" ? JSON.stringify(body) : undefined,
      });
      const payload = (await response.json()) as RestoreResult;
      setOperation(null);
      setResult(payload);
      if (payload.ok || payload.executed) {
        setTimeout(() => window.location.reload(), 3000);
      }
    } catch (error) {
      setOperation(null);
      setResult({
        ok: false,
        error: error instanceof Error ? error.message : "فشل الاتصال بالخادم",
      });
    } finally {
      setLoading(false);
    }
  }

  const copyError = async () => {
    if (!result?.error) return;
    const text = [
      `Error: ${result.error}`,
      `Action: ${config.label}`,
      `Time: ${new Date().toISOString()}`,
    ].join("\n");
    await navigator.clipboard.writeText(text);
    setCopyDone(true);
    setTimeout(() => setCopyDone(false), 2000);
  };

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
        message={overrides?.fileName
          ? `${config.confirmMessage}\n\nالملف: ${overrides.fileName}`
          : config.confirmMessage}
        confirmText="تأكيد"
        cancelText="إلغاء"
        isDangerous={config.dangerous}
        isLoading={loading}
        onConfirm={doAction}
        onCancel={() => setShowConfirm(false)}
      />

      {operation ? (
        <OperationProgressDialog<RestoreResult>
          operationId={operation.id}
          onDone={onOperationDone}
        />
      ) : null}

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
                <div style={{ flex: 1, display: "grid", gap: 8 }}>
                  <span style={{ fontWeight: 600 }}>{result.error}</span>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                    <button className="btn btn-sm btn-soft" type="button" onClick={() => setShowErrorDetails(!showErrorDetails)}>
                      {showErrorDetails ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                      <span>{showErrorDetails ? "إخفاء التفاصيل" : "عرض تفاصيل الخطأ"}</span>
                    </button>
                    <button className="btn btn-sm btn-soft" type="button" onClick={copyError}>
                      <Copy size={13} />
                      <span>{copyDone ? "تم النسخ" : "نسخ الخطأ"}</span>
                    </button>
                  </div>
                  {showErrorDetails ? (
                    <pre className="error-details-box">
                      {JSON.stringify({ ...result, error: undefined }, null, 2)}
                    </pre>
                  ) : null}
                </div>
              </div>
            ) : null}

            {result.itemsRestored !== undefined || result.uploadsRestored !== undefined ? (
              <div className="restore-result-summary">
                <span>
                  {result.itemsRestored !== undefined && <strong>{result.itemsRestored.toLocaleString("ar-EG")}</strong>}
                  {result.itemsRestored !== undefined ? " سجل " : ""}
                  {result.uploadsRestored !== undefined && <strong>{result.uploadsRestored.toLocaleString("ar-EG")}</strong>}
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
