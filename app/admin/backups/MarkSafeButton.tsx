"use client";

import { ShieldCheck, ShieldPlus } from "lucide-react";
import { useState } from "react";
import { useRouter } from "next/navigation";

export function MarkSafeButton({
  fileName,
  isSafe,
  label,
}: {
  fileName: string;
  isSafe: boolean;
  label: string | null;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleToggle() {
    setLoading(true);
    try {
      if (isSafe) {
        await fetch(`/api/admin/backups/${encodeURIComponent(fileName)}/safe`, {
          method: "DELETE",
        });
      } else {
        const lbl = prompt("تصنيف النسخة (مثال: نسخة نظيفة قبل التعديلات):");
        if (!lbl || !lbl.trim()) {
          setLoading(false);
          return;
        }
        await fetch(`/api/admin/backups/${encodeURIComponent(fileName)}/safe`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ label: lbl.trim() }),
        });
      }
      router.refresh();
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      className={`btn btn-icon ${isSafe ? "btn-soft" : "btn-ghost"}`}
      type="button"
      onClick={handleToggle}
      disabled={loading}
      title={isSafe ? "إزالة من الموثوقة" : "تحديد كنسخة موثوقة"}
    >
      {loading ? (
        <span className="sync-spin">...</span>
      ) : isSafe ? (
        <ShieldCheck size={17} />
      ) : (
        <ShieldPlus size={17} />
      )}
    </button>
  );
}
