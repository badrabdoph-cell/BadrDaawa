"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { ToastContainer, type ToastItem, type ToastType } from "@/components/Toast";

const NOTIFY_EVENT = "badrdaawa:notify";
const MAX_TOASTS = 6;
const DUPLICATE_WINDOW_MS = 3500;
const MAX_DETAIL_LENGTH = 9000;

type NotificationInput = {
  type?: ToastType;
  title?: string;
  message: string;
  details?: string;
  duration?: number;
};

type InternalNotificationInput = NotificationInput & {
  signature?: string;
};

declare global {
  interface Window {
    badrNotify?: (notification: NotificationInput) => void;
  }

  interface WindowEventMap {
    [NOTIFY_EVENT]: CustomEvent<NotificationInput>;
  }
}

function truncate(value: string, maxLength = MAX_DETAIL_LENGTH) {
  if (value.length <= maxLength) {
    return value;
  }

  return `${value.slice(0, maxLength)}\n\n... تم اختصار باقي التفاصيل لطولها.`;
}

function serializeValue(value: unknown): string {
  if (value instanceof Error) {
    return value.stack || `${value.name}: ${value.message}`;
  }

  if (typeof value === "string") {
    return value;
  }

  if (value === undefined) {
    return "undefined";
  }

  try {
    const seen = new WeakSet<object>();
    const json = JSON.stringify(
      value,
      (_key, currentValue) => {
        if (currentValue instanceof Error) {
          return {
            name: currentValue.name,
            message: currentValue.message,
            stack: currentValue.stack,
          };
        }

        if (typeof currentValue === "object" && currentValue !== null) {
          if (seen.has(currentValue)) {
            return "[Circular]";
          }
          seen.add(currentValue);
        }

        if (typeof currentValue === "function") {
          return `[Function ${currentValue.name || "anonymous"}]`;
        }

        return currentValue;
      },
      2,
    );

    return json || String(value);
  } catch {
    return String(value);
  }
}

function buildReport(title: string, lines: Array<[string, unknown] | string>) {
  const report = [
    "BadrDaawa Diagnostic Report",
    `Time: ${new Date().toISOString()}`,
    `URL: ${typeof window !== "undefined" ? window.location.href : "unknown"}`,
    `User Agent: ${typeof navigator !== "undefined" ? navigator.userAgent : "unknown"}`,
    "",
    `Event: ${title}`,
    ...lines.map((line) => {
      if (typeof line === "string") {
        return line;
      }

      const [label, value] = line;
      return `${label}: ${serializeValue(value)}`;
    }),
  ].join("\n");

  return truncate(report);
}

async function copyText(value: string) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(value);
    return;
  }

  const textarea = document.createElement("textarea");
  textarea.value = value;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.insetInlineStart = "-9999px";
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand("copy");
  textarea.remove();
}

function getFetchMeta(input: RequestInfo | URL, init?: RequestInit) {
  let url = "unknown";
  let method = init?.method || "GET";

  if (typeof input === "string") {
    url = input;
  } else if (input instanceof URL) {
    url = input.toString();
  } else if (typeof Request !== "undefined" && input instanceof Request) {
    url = input.url;
    method = init?.method || input.method || method;
  }

  return {
    method: method.toUpperCase(),
    url,
  };
}

function shortUrl(url: string) {
  try {
    const parsed = new URL(url, window.location.origin);
    return `${parsed.pathname}${parsed.search}`;
  } catch {
    return url;
  }
}

function getRouteNotification(pathname: string, params: URLSearchParams): InternalNotificationInput | null {
  const error = params.get("error");
  if (error) {
    const messages: Record<string, string> = {
      images: "فشل رفع أو حفظ الصور.",
      invalid: "البيانات أو الإجراء غير صالح.",
      missing: "في بيانات ناقصة مطلوبة.",
      music: "فشل رفع أو حفظ ملف الموسيقى.",
      session: "جلسة الدخول انتهت أو غير صالحة.",
    };

    return {
      type: "error",
      title: pathname.startsWith("/admin") ? "خطأ في الأدمن" : "حصل خطأ",
      message: messages[error] || `حصل خطأ: ${error}`,
      details: buildReport("Route error parameter", [
        ["Path", pathname],
        ["Query", params.toString()],
        ["Error", error],
      ]),
      signature: `route-error:${pathname}:${params.toString()}`,
    };
  }

  const status = params.get("status");
  if (status) {
    const errorStatuses = new Set(["failed", "error", "missing", "invalid", "delete-error"]);
    const successMessages: Record<string, string> = {
      accepted: "تم قبول الطلب وتنفيذ الإجراء.",
      converted: "تم تحويل الطلب إلى دعوة منشورة.",
      delete: "تم الحذف بنجاح.",
      pause: "تم الإيقاف بنجاح.",
      published: "تم النشر بنجاح.",
      resume: "تم التشغيل بنجاح.",
      updated: "تم التحديث بنجاح.",
    };

    const isError = errorStatuses.has(status) || status.includes("error") || status.includes("failed");
    return {
      type: isError ? "error" : "success",
      title: isError ? "تعذر تنفيذ الإجراء" : "تم تنفيذ الإجراء",
      message: isError ? `فشل الإجراء: ${status}` : successMessages[status] || "تم تنفيذ الإجراء بنجاح.",
      details: buildReport("Route status parameter", [
        ["Path", pathname],
        ["Query", params.toString()],
        ["Status", status],
      ]),
      duration: isError ? 0 : 5000,
      signature: `route-status:${pathname}:${params.toString()}`,
    };
  }

  const saved = params.get("saved");
  if (saved) {
    const isError = saved.includes("error") || saved === "0";
    return {
      type: isError ? "error" : "success",
      title: isError ? "تعذر الحفظ" : "تم الحفظ",
      message: isError ? `الحفظ فشل: ${saved}` : "تم حفظ التعديل بنجاح.",
      details: buildReport("Route saved parameter", [
        ["Path", pathname],
        ["Query", params.toString()],
        ["Saved", saved],
      ]),
      duration: isError ? 0 : 4500,
      signature: `route-saved:${pathname}:${params.toString()}`,
    };
  }

  const created = params.get("created");
  if (created) {
    return {
      type: "success",
      title: "تم الإنشاء",
      message: "تم إنشاء العنصر بنجاح.",
      details: buildReport("Route created parameter", [
        ["Path", pathname],
        ["Query", params.toString()],
        ["Created", created],
      ]),
      duration: 4500,
      signature: `route-created:${pathname}:${params.toString()}`,
    };
  }

  return null;
}

export function GlobalNotifications() {
  const pathname = usePathname() || "/";
  const searchParams = useSearchParams();
  const searchQuery = searchParams.toString();
  const [notifications, setNotifications] = useState<ToastItem[]>([]);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const duplicateMapRef = useRef(new Map<string, number>());
  const lastRouteKeyRef = useRef("");

  const addNotification = useCallback((notification: InternalNotificationInput) => {
    const message = notification.message?.trim() || "حصل إشعار جديد.";
    const signature = notification.signature || `${notification.type || "info"}:${notification.title || ""}:${message}:${notification.details?.slice(0, 220) || ""}`;
    const now = Date.now();
    const previousTime = duplicateMapRef.current.get(signature) || 0;

    if (now - previousTime < DUPLICATE_WINDOW_MS) {
      return "";
    }

    duplicateMapRef.current.set(signature, now);

    const id = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const item: ToastItem = {
      id,
      type: notification.type || "info",
      title: notification.title,
      message,
      details: notification.details ? truncate(notification.details) : undefined,
      duration: notification.duration ?? (notification.type === "error" || notification.details ? 0 : 4000),
    };

    setNotifications((current) => [...current, item].slice(-MAX_TOASTS));
    return id;
  }, []);

  const removeNotification = useCallback((id: string) => {
    setNotifications((current) => current.filter((notification) => notification.id !== id));
  }, []);

  const handleCopy = useCallback(
    async (id: string) => {
      const notification = notifications.find((item) => item.id === id);
      if (!notification) {
        return;
      }

      const value = notification.details || `${notification.title || ""}\n${notification.message}`.trim();
      await copyText(value);
      setCopiedId(id);
      window.setTimeout(() => {
        setCopiedId((current) => (current === id ? null : current));
      }, 1800);
    },
    [notifications],
  );

  useEffect(() => {
    window.badrNotify = addNotification;

    const handleCustomNotification = (event: WindowEventMap[typeof NOTIFY_EVENT]) => {
      addNotification(event.detail);
    };

    window.addEventListener(NOTIFY_EVENT, handleCustomNotification);

    return () => {
      if (window.badrNotify === addNotification) {
        delete window.badrNotify;
      }
      window.removeEventListener(NOTIFY_EVENT, handleCustomNotification);
    };
  }, [addNotification]);

  useEffect(() => {
    const handleWindowError = (event: ErrorEvent) => {
      const error = event.error instanceof Error ? event.error : null;
      addNotification({
        type: "error",
        title: "خطأ في الموقع",
        message: error?.message || event.message || "حصل خطأ غير متوقع في الصفحة.",
        details: buildReport("window.error", [
          ["Message", event.message],
          ["File", event.filename],
          ["Line", event.lineno],
          ["Column", event.colno],
          ["Error", error || event.error],
        ]),
        signature: `window-error:${event.message}:${event.filename}:${event.lineno}:${event.colno}`,
      });
    };

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      addNotification({
        type: "error",
        title: "خطأ غير متوقع",
        message: event.reason instanceof Error ? event.reason.message : "وعد برمجي فشل بدون معالجة.",
        details: buildReport("unhandledrejection", [["Reason", event.reason]]),
        signature: `unhandled:${serializeValue(event.reason).slice(0, 220)}`,
      });
    };

    window.addEventListener("error", handleWindowError);
    window.addEventListener("unhandledrejection", handleUnhandledRejection);

    return () => {
      window.removeEventListener("error", handleWindowError);
      window.removeEventListener("unhandledrejection", handleUnhandledRejection);
    };
  }, [addNotification]);

  useEffect(() => {
    const previousConsoleError = window.console.error;

    window.console.error = (...args: unknown[]) => {
      previousConsoleError.apply(window.console, args);

      const firstError = args.find((arg) => arg instanceof Error) as Error | undefined;
      const message = firstError?.message || args.map((arg) => serializeValue(arg)).join(" ").slice(0, 240) || "تم تسجيل خطأ في الكونسول.";

      addNotification({
        type: "error",
        title: "خطأ في الكونسول",
        message,
        details: buildReport("console.error", [["Arguments", args]]),
        signature: `console-error:${message}`,
      });
    };

    return () => {
      window.console.error = previousConsoleError;
    };
  }, [addNotification]);

  useEffect(() => {
    const previousFetch = window.fetch;

    window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
      const meta = getFetchMeta(input, init);

      try {
        const response = await previousFetch.call(window, input, init);

        if (response.redirected && response.url.includes("/admin/login")) {
          addNotification({
            type: "warning",
            title: "جلسة الأدمن",
            message: "تم تحويل الطلب لتسجيل الدخول. غالبًا الجلسة انتهت.",
            details: buildReport("fetch redirected to login", [
              ["Request URL", meta.url],
              ["Response URL", response.url],
              ["Method", meta.method],
            ]),
            signature: `fetch-login:${meta.method}:${meta.url}`,
          });
        }

        if (!response.ok) {
          let responseText = "";
          try {
            responseText = await response.clone().text();
          } catch (readError) {
            responseText = `Could not read response body: ${serializeValue(readError)}`;
          }

          addNotification({
            type: "error",
            title: "فشل طلب في الموقع",
            message: `${response.status} ${response.statusText || ""} - ${shortUrl(meta.url)}`.trim(),
            details: buildReport("fetch non-ok response", [
              ["Request URL", meta.url],
              ["Method", meta.method],
              ["Status", response.status],
              ["Status Text", response.statusText],
              ["Response URL", response.url],
              ["Response Body", truncate(responseText, 5000)],
            ]),
            signature: `fetch-status:${response.status}:${meta.method}:${meta.url}`,
          });
        }

        return response;
      } catch (error) {
        addNotification({
          type: "error",
          title: "فشل الاتصال",
          message: error instanceof Error ? error.message : "تعذر تنفيذ طلب الشبكة.",
          details: buildReport("fetch network failure", [
            ["Request URL", meta.url],
            ["Method", meta.method],
            ["Error", error],
          ]),
          signature: `fetch-error:${meta.method}:${meta.url}:${serializeValue(error).slice(0, 160)}`,
        });
        throw error;
      }
    };

    return () => {
      window.fetch = previousFetch;
    };
  }, [addNotification]);

  useEffect(() => {
    const routeKey = `${pathname}?${searchQuery}`;
    if (lastRouteKeyRef.current === routeKey) {
      return;
    }

    lastRouteKeyRef.current = routeKey;
    const params = new URLSearchParams(searchQuery);
    const notification = getRouteNotification(pathname, params);
    if (notification) {
      addNotification(notification);
    }
  }, [addNotification, pathname, searchQuery]);

  return (
    <ToastContainer
      toasts={notifications.map((notification) => ({
        ...notification,
        copyLabel: copiedId === notification.id ? "تم النسخ" : notification.copyLabel,
      }))}
      onClose={removeNotification}
      onCopy={handleCopy}
    />
  );
}
