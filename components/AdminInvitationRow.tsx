"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  MoreHorizontal, Settings2, Eye, Trash2,
  Ban, CheckCircle, Copy, Check,
} from "lucide-react";
import { ConfirmDialog } from "@/components/ConfirmDialog";

type Props = {
  code: string;
  groomName: string;
  brideName: string;
  weddingDate: string;
  views: string;
  stateEmoji: string;
  stateLabel: string;
  stateClass: string;
  publicPath: string;
  adminPath: string;
  invitationUrl: string;
  adminUrl: string;
  isDisabled: boolean;
  disabledReason?: string;
  disabledBy?: string;
  trialDays?: number;
  trialRemaining?: number;
};

function CopyButton({ value, label, onDone }: { value: string; label: string; onDone: () => void }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      window.setTimeout(() => { setCopied(false); onDone(); }, 1200);
    } catch {
      onDone();
    }
  }

  return (
    <button type="button" onClick={copy}>
      {copied ? <Check size={16} /> : <Copy size={16} />}
      {copied ? "تم النسخ" : label}
    </button>
  );
}

export function AdminInvitationRow({
  code, groomName, brideName, weddingDate, views,
  stateEmoji, stateLabel, stateClass,
  publicPath, adminPath, invitationUrl, adminUrl,
  isDisabled, disabledReason, disabledBy,
  trialDays, trialRemaining,
}: Props) {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [mobileExpanded, setMobileExpanded] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    function handleClick(e: MouseEvent) {
      if (
        menuRef.current && !menuRef.current.contains(e.target as Node) &&
        btnRef.current && !btnRef.current.contains(e.target as Node)
      ) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [menuOpen]);

  async function handleToggleState() {
    if (!isDisabled) {
      const reason = window.prompt("سبب التعطيل (مطلوب):");
      if (reason === null) return;
      if (!reason.trim()) {
        alert("يجب كتابة سبب التعطيل.");
        return;
      }
      setActionLoading(true);
      try {
        const res = await fetch(`/api/admin/invitations/${encodeURIComponent(code)}`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Accept: "application/json" },
          body: JSON.stringify({ action: "disable", disabledReason: reason.trim() }),
        });
        const data = await res.json().catch(() => null) as { ok?: boolean } | null;
        if (!res.ok || !data?.ok) throw new Error("تعذر تعطيل الدعوة.");
        router.refresh();
      } catch (err) {
        alert(err instanceof Error ? err.message : "حدث خطأ.");
      } finally {
        setActionLoading(false);
        setMenuOpen(false);
      }
      return;
    }

    setActionLoading(true);
    try {
      const res = await fetch(`/api/admin/invitations/${encodeURIComponent(code)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ action: "enable" }),
      });
      const data = await res.json().catch(() => null) as { ok?: boolean } | null;
      if (!res.ok || !data?.ok) throw new Error("تعذر تفعيل الدعوة.");
      router.refresh();
    } catch (err) {
      alert(err instanceof Error ? err.message : "حدث خطأ.");
    } finally {
      setActionLoading(false);
      setMenuOpen(false);
    }
  }

  async function handleDelete() {
    setActionLoading(true);
    try {
      const res = await fetch(`/api/admin/invitations/${encodeURIComponent(code)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ action: "hard-delete" }),
      });
      const data = await res.json().catch(() => null) as { ok?: boolean } | null;
      if (!res.ok || !data?.ok) throw new Error("تعذر الحذف.");
      router.refresh();
    } catch (err) {
      alert(err instanceof Error ? err.message : "حدث خطأ.");
    } finally {
      setActionLoading(false);
      setDeleteConfirm(false);
      setMenuOpen(false);
    }
  }

  return (
    <>
      <tr className={`admin-invitation-row ${mobileExpanded ? "expanded" : ""}`}>
        <td className="cell-state" data-label="">
          <span className={`state-dot ${stateClass.replace("status ", "")}`}>{stateEmoji}</span>
        </td>
        <td className="cell-name" data-label="اسم الدعوة">
          <button
            className="mobile-expand-toggle"
            type="button"
            onClick={() => setMobileExpanded((v) => !v)}
            aria-label={mobileExpanded ? "طي التفاصيل" : "توسيع التفاصيل"}
          >
            <span className={`chevron ${mobileExpanded ? "rotated" : ""}`}>{">"}</span>
          </button>
          <div className="admin-name-content">
            <span className="inv-code">{code}</span>
            <strong>{groomName} و {brideName}</strong>
            {isDisabled && (disabledReason || disabledBy) ? (
              <small className="disabled-hint" title={disabledBy ? `بواسطة: ${disabledBy}` : undefined}>
                {disabledReason ? `🔴 ${disabledReason}` : disabledBy ? `معطلة بواسطة ${disabledBy}` : null}
              </small>
            ) : null}
          </div>
        </td>
        <td className="cell-date" data-label="تاريخ الحفل">{weddingDate}</td>
        <td className="cell-views" data-label="الزيارات">{views}</td>
        <td className="cell-status" data-label="الحالة">
          <span className={stateClass}>{stateLabel}</span>
          {trialDays && trialRemaining != null ? (
            <small className="trial-remaining-badge">
              متبقي {trialRemaining} / {trialDays} يوم
            </small>
          ) : null}
        </td>
        <td className="cell-actions" data-label="الإجراءات">
          <div className="admin-row-actions">
            <Link className="btn btn-sm btn-gold" href={adminPath}>
              <Settings2 size={16} />
              إدارة
            </Link>
            <div className="admin-more-actions" ref={menuRef}>
              <button
                ref={btnRef}
                className="btn btn-sm btn-soft more-trigger"
                type="button"
                onClick={() => setMenuOpen((v) => !v)}
              >
                <MoreHorizontal size={16} />
                إجراء
              </button>
              {menuOpen ? (
                <div className="admin-more-menu">
                  <Link href={publicPath}>
                    <Eye size={16} />
                    عرض الدعوة
                  </Link>
                  <CopyButton value={invitationUrl} label="نسخ رابط الدعوة" onDone={() => setMenuOpen(false)} />
                  <CopyButton value={adminUrl} label="نسخ رابط الإدارة" onDone={() => setMenuOpen(false)} />
                  <button type="button" onClick={handleToggleState} disabled={actionLoading}>
                    {isDisabled ? <CheckCircle size={16} /> : <Ban size={16} />}
                    {isDisabled ? "تفعيل الدعوة" : "تعطيل الدعوة"}
                  </button>
                  <button type="button" onClick={() => { setDeleteConfirm(true); setMenuOpen(false); }} className="danger-action">
                    <Trash2 size={16} />
                    حذف الدعوة
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        </td>
      </tr>
      <ConfirmDialog
        isOpen={deleteConfirm}
        title="تأكيد حذف الدعوة"
        message={`هل أنت متأكد من حذف الدعوة (${code}) نهائياً؟ لا يمكن التراجع عن هذا الإجراء.`}
        confirmText="حذف"
        cancelText="إلغاء"
        isDangerous
        onConfirm={handleDelete}
        onCancel={() => setDeleteConfirm(false)}
      />
    </>
  );
}
