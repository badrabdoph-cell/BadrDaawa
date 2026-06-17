"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  MoreHorizontal, Settings2, Eye, Trash2,
  Ban, CheckCircle, ChevronLeft, Check, Copy,
} from "lucide-react";
import { ConfirmDialog } from "@/components/ConfirmDialog";

export type PublishedInvitationRowProps = {
  code: string;
  groomName: string;
  brideName: string;
  templateName?: string;
  weddingDate: string;
  views: string;
  status: string;
  statusLabel: string;
  statusClass: string;
  publicPath: string;
  adminPath: string;
  invitationUrl: string;
  adminUrl: string;
  disabledAt?: string | null;
};

function MenuCopyButton({ value, label, onDone }: { value: string; label: string; onDone: () => void }) {
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

export function PublishedInvitationRow({
  code, groomName, brideName, templateName,
  weddingDate, views, statusLabel, statusClass,
  publicPath, adminPath, invitationUrl, adminUrl,
  disabledAt,
}: PublishedInvitationRowProps) {
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

  const isDisabled = !!disabledAt;

  async function handleToggleState() {
    setActionLoading(true);
    try {
      const action = isDisabled ? "enable" : "disable";
      const res = await fetch(`/api/admin/invitations/${encodeURIComponent(code)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ action }),
      });
      const data = await res.json().catch(() => null) as { ok?: boolean } | null;
      if (!res.ok || !data?.ok) throw new Error("تعذر تحديث الحالة.");
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
      <tr className={`published-row ${mobileExpanded ? "expanded" : ""}`}>
        <td className="published-cell name-cell" data-label="الدعوة">
          <button
            className="mobile-expand-toggle"
            type="button"
            onClick={() => setMobileExpanded((v) => !v)}
            aria-label={mobileExpanded ? "طي التفاصيل" : "توسيع التفاصيل"}
          >
            <ChevronLeft size={16} className={`chevron ${mobileExpanded ? "rotated" : ""}`} />
          </button>
          <div className="published-name-content">
            <strong>{groomName} و {brideName}</strong>
            {templateName ? <span className="template-label">{templateName}</span> : null}
          </div>
        </td>

        <td className="published-cell date-cell" data-label="تاريخ الحفل">
          <span className="cell-text">{weddingDate}</span>
        </td>

        <td className="published-cell views-cell" data-label="الزيارات">
          <span className="cell-text">{views}</span>
        </td>

        <td className="published-cell status-cell" data-label="الحالة">
          <span className={statusClass}>{statusLabel}</span>
        </td>

        <td className="published-cell actions-cell" data-label="الإجراءات">
          <div className="published-actions">
            <Link className="btn btn-sm btn-gold" href={adminPath}>
              <Settings2 size={16} />
              <span className="action-label">إدارة الدعوة</span>
            </Link>
            <Link className="btn btn-sm btn-soft" href={publicPath}>
              <Eye size={16} />
              <span className="action-label">عرض</span>
            </Link>
            <div className="more-actions" ref={menuRef}>
              <button
                ref={btnRef}
                className="more-actions-trigger"
                type="button"
                onClick={() => setMenuOpen((v) => !v)}
                aria-label="المزيد من الإجراءات"
              >
                <MoreHorizontal size={18} />
              </button>
              {menuOpen ? (
                <div className="more-actions-menu">
                  <MenuCopyButton value={invitationUrl} label="نسخ رابط الدعوة" onDone={() => setMenuOpen(false)} />
                  <MenuCopyButton value={adminUrl} label="نسخ رابط الإدارة" onDone={() => setMenuOpen(false)} />
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
