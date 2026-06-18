"use client";

import { AlertTriangle, X } from "lucide-react";
import { useEffect, useRef } from "react";

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  isDangerous?: boolean;
  isLoading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

const FOCUSABLE_SELECTOR = "button, [href], input, select, textarea, [tabindex]:not([tabindex=\"-1\"])";

export function ConfirmDialog({
  isOpen,
  title,
  message,
  confirmText = "تأكيد",
  cancelText = "إلغاء",
  isDangerous = false,
  isLoading = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const triggerRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (isOpen) {
      triggerRef.current = document.activeElement as HTMLElement | null;
      dialogRef.current?.showModal();
    } else {
      dialogRef.current?.close();
      triggerRef.current?.focus();
      triggerRef.current = null;
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const dialog = dialogRef.current;
    if (!dialog) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Tab") return;
      const focusable = dialog.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR);
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey) {
        if (document.activeElement === first) {
          event.preventDefault();
          last.focus();
        }
      } else {
        if (document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };

    dialog.addEventListener("keydown", handleKeyDown);
    return () => dialog.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  const handleConfirm = () => {
    onConfirm();
  };

  const handleCancel = () => {
    onCancel();
  };

  return (
    <dialog
      ref={dialogRef}
      className="confirm-dialog"
      onCancel={handleCancel}
    >
      <div className="confirm-dialog-content">
        <div className="confirm-dialog-header">
          {isDangerous && <AlertTriangle size={24} className="confirm-dialog-icon danger" />}
          <h2>{title}</h2>
          <button
            className="confirm-dialog-close"
            onClick={handleCancel}
            type="button"
            aria-label="إغلاق"
          >
            <X size={20} />
          </button>
        </div>

        <p className="confirm-dialog-message">{message}</p>

        <div className="confirm-dialog-actions">
          <button
            className="btn btn-soft"
            onClick={handleCancel}
            disabled={isLoading}
            type="button"
          >
            {cancelText}
          </button>
          <button
            className={`btn ${isDangerous ? "btn-danger" : "btn-gold"}`}
            onClick={handleConfirm}
            disabled={isLoading}
            type="button"
          >
            {isLoading ? "جاري..." : confirmText}
          </button>
        </div>
      </div>
    </dialog>
  );
}
