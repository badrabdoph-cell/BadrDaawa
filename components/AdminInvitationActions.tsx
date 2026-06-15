"use client";

import { Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ConfirmDialog } from "@/components/ConfirmDialog";

export function AdminInvitationSingleDelete({ code }: { code: string }) {
  const router = useRouter();
  const [confirm, setConfirm] = useState(false);

  async function handleDelete() {
    try {
      const response = await fetch(`/api/admin/invitations/${encodeURIComponent(code)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ action: "hard-delete" }),
      });
      const data = (await response.json().catch(() => null)) as { ok?: boolean; error?: string } | null;
      if (!response.ok || !data?.ok) throw new Error(data?.error || "تعذر الحذف.");
      router.refresh();
    } catch (error) {
      alert(error instanceof Error ? error.message : "تعذر حذف الدعوة.");
    } finally {
      setConfirm(false);
    }
  }

  return (
    <>
      <button className="btn btn-soft danger-soft" type="button" onClick={() => setConfirm(true)}>
        <Trash2 size={16} /> حذف
      </button>
      <ConfirmDialog
        isOpen={confirm}
        title="تأكيد حذف الدعوة"
        message={`هل أنت متأكد من حذف الدعوة (${code}) نهائياً؟ لا يمكن التراجع عن هذا الإجراء.`}
        confirmText="حذف"
        cancelText="إلغاء"
        isDangerous
        onConfirm={handleDelete}
        onCancel={() => setConfirm(false)}
      />
    </>
  );
}
