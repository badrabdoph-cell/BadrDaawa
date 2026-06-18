"use client";

import { AlertCircle, CheckCircle2, Copy, Info, X, XCircle } from "lucide-react";
import { useEffect, useState } from "react";

export type ToastType = "success" | "error" | "info" | "warning";

export interface ToastItem {
  id: string;
  message: string;
  type: ToastType;
  title?: string;
  details?: string;
  errorCode?: string;
  duration?: number;
  copyLabel?: string;
}

interface ToastProps extends ToastItem {
  onClose: (id: string) => void;
  onCopy?: (id: string) => void;
}

export function Toast({ id, message, type, title, details, errorCode, duration, copyLabel, onClose, onCopy }: ToastProps) {
  const autoCloseDuration = duration ?? (details ? 0 : 3000);

  useEffect(() => {
    if (autoCloseDuration > 0) {
      const timer = setTimeout(() => onClose(id), autoCloseDuration);
      return () => clearTimeout(timer);
    }
  }, [id, autoCloseDuration, onClose]);

  const getIcon = () => {
    switch (type) {
      case "success":
        return <CheckCircle2 size={20} />;
      case "error":
        return <XCircle size={20} />;
      case "warning":
        return <AlertCircle size={20} />;
      case "info":
      default:
        return <Info size={20} />;
    }
  };

  return (
    <div className={`toast toast-${type}`} role={type === "error" ? "alert" : "status"} dir="rtl">
      <div className="toast-icon">{getIcon()}</div>
      <div className="toast-content">
        {title ? <strong className="toast-title">{title}</strong> : null}
        <div className="toast-message">{message}</div>
        {details && type !== "error" ? (
          <div className="toast-actions">
            <button className="toast-copy" onClick={() => onCopy?.(id)} type="button">
              <Copy size={14} />
              {copyLabel || "نسخ التفاصيل"}
            </button>
          </div>
        ) : null}
      </div>
      <button
        className="toast-close"
        onClick={() => onClose(id)}
        type="button"
        aria-label="إغلاق"
      >
        <X size={16} />
      </button>
    </div>
  );
}

interface ToastContainerProps {
  toasts: ToastItem[];
  onClose: (id: string) => void;
  onCopy?: (id: string) => void;
}

export function ToastContainer({ toasts, onClose, onCopy }: ToastContainerProps) {
  return (
    <div className="toast-container">
      {toasts.map((toast) => (
        <Toast
          key={toast.id}
          {...toast}
          onClose={onClose}
          onCopy={onCopy}
        />
      ))}
    </div>
  );
}

let toastCounter = 0;

export function useToast() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const addToast = (message: string, type: ToastType = "info", options: Omit<Partial<ToastItem>, "id" | "message" | "type"> = {}) => {
    const id = `${Date.now()}-${++toastCounter}`;
    setToasts((prev) => [...prev, { id, message, type, ...options }]);
    return id;
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  };

  const success = (message: string, options?: Omit<Partial<ToastItem>, "id" | "message" | "type">) => addToast(message, "success", options);
  const error = (message: string, options?: Omit<Partial<ToastItem>, "id" | "message" | "type">) => addToast(message, "error", options);
  const info = (message: string, options?: Omit<Partial<ToastItem>, "id" | "message" | "type">) => addToast(message, "info", options);
  const warning = (message: string, options?: Omit<Partial<ToastItem>, "id" | "message" | "type">) => addToast(message, "warning", options);

  return { toasts, addToast, removeToast, success, error, info, warning };
}
