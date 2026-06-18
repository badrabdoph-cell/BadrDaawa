"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  MoreHorizontal, Settings2, Eye, Trash2, Pencil, Save, X,
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
  const [editing, setEditing] = useState(false);
  const [editGroom, setEditGroom] = useState(groomName);
  const [editBride, setEditBride] = useState(brideName);
  const [editDate, setEditDate] = useState(weddingDate);
  const [editSaving, setEditSaving] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const editRef = useRef<HTMLDivElement>(null);

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

  useEffect(() => {
    if (!editing) return;
    function handleClick(e: MouseEvent) {
      if (editRef.current && !editRef.current.contains(e.target as Node)) {
        handleCancelEdit();
      }
    }
    setTimeout(() => document.addEventListener("mousedown", handleClick), 0);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [editing]);

  function handleStartEdit() {
    setEditGroom(groomName);
    setEditBride(brideName);
    setEditDate(weddingDate);
    setEditing(true);
    setMenuOpen(false);
  }

  async function handleSaveEdit() {
    if (!editGroom.trim() || !editBride.trim()) {
      alert("اسم العريس والعروس مطلوبان.");
      return;
    }
    setEditSaving(true);
    try {
      const res = await fetch(`/api/admin/invitations/${encodeURIComponent(code)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({
          action: "update-details",
          groomName: editGroom.trim(),
          brideName: editBride.trim(),
          weddingDate: editDate,
        }),
      });
      const data = await res.json().catch(() => null) as { ok?: boolean } | null;
      if (!res.ok || !data?.ok) throw new Error("تعذر حفظ التعديلات.");
      router.refresh();
      setEditing(false);
    } catch (err) {
      alert(err instanceof Error ? err.message : "حدث خطأ.");
    } finally {
      setEditSaving(false);
    }
  }

  function handleCancelEdit() {
    setEditing(false);
    setEditGroom(groomName);
    setEditBride(brideName);
    setEditDate(weddingDate);
  }

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
      <tr className={`admin-invitation-row ${mobileExpanded ? "expanded" : ""} ${editing ? "editing" : ""}`}>
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
            {editing ? (
              <div className="inline-edit-fields" ref={editRef}>
                <input
                  className="inline-edit-input"
                  value={editGroom}
                  onChange={(e) => setEditGroom(e.target.value)}
                  placeholder="اسم العريس"
                />
                <input
                  className="inline-edit-input"
                  value={editBride}
                  onChange={(e) => setEditBride(e.target.value)}
                  placeholder="اسم العروس"
                />
                <div className="inline-edit-actions">
                  <button className="btn btn-sm btn-gold" type="button" onClick={handleSaveEdit} disabled={editSaving}>
                    {editSaving ? "..." : <><Save size={14} /> حفظ</>}
                  </button>
                  <button className="btn btn-sm btn-soft" type="button" onClick={handleCancelEdit}>
                    <X size={14} /> إلغاء
                  </button>
                </div>
              </div>
            ) : (
              <>
                <span className="inv-code">{code}</span>
                <strong>{groomName} و {brideName}</strong>
                {isDisabled && (disabledReason || disabledBy) ? (
                  <small className="disabled-hint" title={disabledBy ? `بواسطة: ${disabledBy}` : undefined}>
                    {disabledReason ? `🔴 ${disabledReason}` : disabledBy ? `معطلة بواسطة ${disabledBy}` : null}
                  </small>
                ) : null}
              </>
            )}
          </div>
        </td>
        <td className="cell-date" data-label="تاريخ الحفل">
          {editing ? (
            <input
              className="inline-edit-input inline-edit-date"
              type="date"
              value={editDate}
              onChange={(e) => setEditDate(e.target.value)}
            />
          ) : (
            weddingDate
          )}
        </td>
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
            {editing ? null : (
              <Link className="btn btn-sm btn-gold" href={adminPath}>
                <Settings2 size={16} />
                إدارة
              </Link>
            )}
            {editing ? null : (
              <button className="btn btn-sm btn-soft" type="button" onClick={handleStartEdit}>
                <Pencil size={16} />
                تعديل
              </button>
            )}
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
