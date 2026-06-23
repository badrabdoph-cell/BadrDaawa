"use client";

import { useCallback, useState } from "react";
import { Loader2, CheckCircle2, XCircle, ArrowRightFromLine, ArrowLeftToLine, ShieldCheck, AlertTriangle, ExternalLink } from "lucide-react";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { OperationProgressDialog } from "@/components/OperationProgressDialog";

type StepResult = {
  step: string;
  ok: boolean;
  detail?: string;
};

type MigrationResult = {
  ok: boolean;
  steps: StepResult[];
  message: string;
  commitSha?: string;
  commitUrl?: string;
};

export function EmergencyMigration() {
  const [mode, setMode] = useState<"go" | "return" | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<MigrationResult | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);

  const handleGo = useCallback(async () => {
    setMode("go");
    setLoading(true);
    setResult(null);
    const steps: StepResult[] = [];

    try {
      // 1. Full backup
      const backupRes = await fetch("/api/admin/backups/full", { method: "POST" });
      const backupData = await backupRes.json().catch(() => ({}));
      if (backupRes.ok) {
        steps.push({ step: "نسخ احتياطي كامل", ok: true, detail: backupData.fileName || "تم" });
      } else {
        steps.push({ step: "نسخ احتياطي كامل", ok: false, detail: backupData.error || backupData.message || "فشل" });
        setResult({ ok: false, steps, message: "فشلت عملية النسخ الاحتياطي" });
        setLoading(false);
        return;
      }

      // 2. Verify integrity
      const verifyRes = await fetch("/api/admin/backups/verify-integrity?type=full");
      const verifyData = await verifyRes.json().catch(() => ({}));
      if (verifyRes.ok && verifyData.ok) {
        steps.push({ step: "فحص سلامة النسخة", ok: true, detail: "تم الفحص بنجاح" });
      } else {
        steps.push({ step: "فحص سلامة النسخة", ok: false, detail: verifyData.error || "فشل الفحص" });
      }

      setResult({
        ok: steps.every((s) => s.ok),
        steps,
        message: steps.every((s) => s.ok)
          ? "النسخة جاهزة للهجرة ✓"
          : "تم النسخ لكن هناك مشاكل في الفحص",
        commitSha: backupData.commitSha,
        commitUrl: backupData.commitUrl,
      });
    } catch (err) {
      steps.push({ step: "خطأ غير متوقع", ok: false, detail: err instanceof Error ? err.message : "خطأ" });
      setResult({ ok: false, steps, message: "فشلت العملية" });
    } finally {
      setLoading(false);
    }
  }, []);

  const handleReturn = useCallback(async () => {
    setMode("return");
    setLoading(true);
    setResult(null);
    const steps: StepResult[] = [];

    try {
      // 1. Restore full from GitHub
      const restoreRes = await fetch("/api/admin/backups/github/restore/full", { method: "POST" });
      const restoreData = await restoreRes.json().catch(() => ({}));
      if (restoreRes.ok && restoreData.ok) {
        steps.push({ step: "استعادة النسخة الكاملة", ok: true, detail: `تم استعادة ${restoreData.itemsRestored || 0} عنصر` });
      } else {
        steps.push({ step: "استعادة النسخة الكاملة", ok: false, detail: restoreData.error || restoreData.message || "فشل" });
        setResult({ ok: false, steps, message: "فشلت عملية الاستعادة" });
        setLoading(false);
        return;
      }

      // 2. Verify after restore
      const verifyRes = await fetch("/api/admin/backups/verify-integrity?type=full");
      const verifyData = await verifyRes.json().catch(() => ({}));
      if (verifyRes.ok && verifyData.ok) {
        steps.push({ step: "فحص ما بعد الاستعادة", ok: true, detail: "البيانات سليمة" });
      } else {
        steps.push({ step: "فحص ما بعد الاستعادة", ok: false, detail: verifyData.error || "فشل الفحص" });
      }

      setResult({
        ok: steps.every((s) => s.ok),
        steps,
        message: steps.every((s) => s.ok)
          ? "تمت استعادة النسخة بنجاح ✓"
          : "تمت الاستعادة لكن هناك مشاكل في الفحص",
      });
    } catch (err) {
      steps.push({ step: "خطأ غير متوقع", ok: false, detail: err instanceof Error ? err.message : "خطأ" });
      setResult({ ok: false, steps, message: "فشلت العملية" });
    } finally {
      setLoading(false);
    }
  }, []);

  return (
    <div className="admin-card admin-accent-amber">
      <div className="admin-card-header">
        <ShieldCheck size={24} />
        <div>
          <h3>الهجرة بين الحسابات / الاستضافة (ذهاب وعودة)</h3>
          <p>نسخ احتياطي كامل + فحص سلامة + استعادة عند العودة — ضمان نقل البيانات بدون أخطاء</p>
        </div>
      </div>

      <div className="admin-card-body">
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <button
            className="btn btn-gold btn-glow"
            onClick={() => { setShowConfirm(true); setMode("go"); }}
            disabled={loading}
          >
            <ArrowRightFromLine size={17} />
            {loading && mode === "go" ? "..." : "ذهاب — تجهيز للهجرة"}
          </button>
          <button
            className="btn btn-danger"
            onClick={() => { setShowConfirm(true); setMode("return"); }}
            disabled={loading}
          >
            <ArrowLeftToLine size={17} />
            {loading && mode === "return" ? "..." : "عودة — استعادة البيانات"}
          </button>
        </div>

        {loading && (
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 12, opacity: 0.6 }}>
            <Loader2 size={18} className="spin" />
            <span>{mode === "go" ? "جاري تجهيز النسخة للهجرة..." : "جاري استعادة البيانات..."}</span>
          </div>
        )}

        {result && (
          <div className="backup-info" style={{ marginTop: 12 }}>
            <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: 6 }}>
              {result.steps.map((step, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: "0.82rem" }}>
                  {step.ok ? <CheckCircle2 size={14} color="#4caf87" /> : <XCircle size={14} color="#d9534f" />}
                  <span>{step.step}</span>
                  {step.detail && <span style={{ opacity: 0.6, fontSize: "0.78rem" }}>— {step.detail}</span>}
                </div>
              ))}
              <div style={{ marginTop: 6, fontWeight: 600, color: result.ok ? "#4caf87" : "#d9534f" }}>
                {result.message}
              </div>
              {result.commitUrl && (
                <a href={result.commitUrl} target="_blank" rel="noreferrer" style={{ fontSize: "0.78rem", color: "#f3cf73", textDecoration: "underline", textUnderlineOffset: 2 }}>
                  <ExternalLink size={12} /> عرض على GitHub
                </a>
              )}
            </div>
          </div>
        )}
      </div>

      {showConfirm && (
        <ConfirmDialog
          isOpen={true}
          title={mode === "go" ? "تأكيد تجهيز الهجرة" : "تأكيد العودة والاستعادة"}
          message={
            mode === "go"
              ? "سيتم إنشاء نسخة احتياطية كاملة (قاعدة بيانات + ملفات)، رفعها إلى GitHub، وفحص سلامتها. قد تستغرق العملية عدة دقائق."
              : "سيتم استعادة أحدث نسخة كاملة من GitHub. سيتم حذف جميع البيانات الحالية واستبدالها. هذا الإجراء لا يمكن التراجع عنه!"
          }
          confirmText={mode === "go" ? "تأكيد الهجرة" : "تأكيد الاستعادة"}
          isDangerous={mode === "return"}
          onConfirm={mode === "go" ? handleGo : handleReturn}
          onCancel={() => { setShowConfirm(false); setMode(null); }}
        />
      )}
    </div>
  );
}
