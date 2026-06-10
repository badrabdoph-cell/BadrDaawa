"use client";

import { useCallback, useEffect, useRef, useState } from "react";
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
  code?: string;
  duration?: number;
};

type InternalNotificationInput = NotificationInput & {
  signature?: string;
};

declare global {
  interface Window {
    badrNotify?: (notification: NotificationInput) => string;
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

function hashText(value: string) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36).toUpperCase().padStart(7, "0");
}

function createErrorCode(signature: string) {
  return `ERR-${Date.now().toString(36).toUpperCase()}-${hashText(signature).slice(0, 7)}`;
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

function trackClientError(input: { route?: string; message: string; stack?: string; source: string; digest?: string }) {
  const route = input.route || (typeof window !== "undefined" ? window.location.href : "unknown-route");
  if (route.includes("/api/errors")) return input.digest || createErrorCode(`${input.source}:${input.message}:${route}`);
  const digest = input.digest || createErrorCode(`${input.source}:${input.message}:${route}`);

  fetch("/api/errors", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      route,
      message: input.message,
      stack: input.stack,
      source: input.source,
      digest,
    }),
    keepalive: true,
  }).catch(() => undefined);
  return digest;
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

function isAdminRequest(url: string) {
  try {
    const parsed = new URL(url, window.location.origin);
    return parsed.pathname.startsWith("/api/admin") || parsed.pathname.startsWith("/api/auth/admin");
  } catch {
    return url.startsWith("/api/admin") || url.startsWith("/api/auth/admin");
  }
}

function isMutatingMethod(method: string) {
  return !["GET", "HEAD", "OPTIONS"].includes(method.toUpperCase());
}

function getAdminRequestLabel(url: string) {
  const path = shortUrl(url).split("?")[0];
  if (path.includes("/notification-center")) return "تحديث التنبيه";
  if (path.includes("/orders")) return "تحديث الطلب";
  if (path.includes("/invitations")) return "تحديث الدعوة";
  if (path.includes("/templates")) return "تحديث القالب";
  if (path.includes("/music")) return "تحديث الموسيقى";
  if (path.includes("/media")) return "تحديث الوسائط";
  if (path.includes("/sync")) return "المزامنة";
  if (path.includes("/logout")) return "تسجيل الخروج";
  return "الإجراء";
}

function isAdminPath(pathname = typeof window === "undefined" ? "" : window.location.pathname) {
  return pathname.startsWith("/admin");
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
      title: pathname.startsWith("/admin") ? "خطأ في الأدمن" : "تعذر تنفيذ الإجراء",
      message: messages[error] || `حصل خطأ: ${error}`,
      duration: 6500,
      signature: `route-error:${pathname}:${params.toString()}`,
    };
  }

  const status = params.get("status");
  if (status) {
    const errorStatuses = new Set(["failed", "error", "missing", "invalid", "delete-error"]);
    const successMessages: Record<string, string> = {
      accepted: "تم قبول الطلب وتنفيذ الإجراء.",
      archive: "تمت الأرشفة بنجاح.",
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
      duration: isError ? 6500 : 5000,
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
      duration: isError ? 6500 : 4500,
      signature: `route-saved:${pathname}:${params.toString()}`,
    };
  }

  const created = params.get("created");
  if (created) {
    return {
      type: "success",
      title: "تم الإنشاء",
      message: "تم إنشاء العنصر بنجاح.",
      duration: 4500,
      signature: `route-created:${pathname}:${params.toString()}`,
    };
  }

  return null;
}

export function GlobalNotifications() {
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

    const isError = notification.type === "error";
    const errorCode = isError ? notification.code || createErrorCode(signature) : undefined;
    const id = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const item: ToastItem = {
      id,
      type: notification.type || "info",
      title: notification.title || (isError ? "تعذر تنفيذ الإجراء" : undefined),
      message,
      details: notification.details ? truncate(notification.details) : undefined,
      errorCode,
      duration: notification.duration ?? (isError ? 6500 : notification.details ? 0 : 4000),
    };

    setNotifications((current) => [...current, item].slice(-MAX_TOASTS));
    return id;
  }, []);

  const removeNotification = useCallback((id: string) => {
    setNotifications((current) => current.filter((notification) => notification.id !== id));
  }, []);

  if (typeof window !== "undefined") {
    window.badrNotify = addNotification;
  }

  const handleCopy = useCallback(
    async (id: string) => {
      const notification = notifications.find((item) => item.id === id);
      if (!notification) {
        return;
      }

      const value = notification.type === "error" ? notification.errorCode || notification.details || "ERR" : notification.details || `${notification.title || ""}\n${notification.message}`.trim();
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
      window.removeEventListener(NOTIFY_EVENT, handleCustomNotification);
    };
  }, [addNotification]);

  useEffect(() => {
    const handleWindowError = (event: ErrorEvent) => {
      const error = event.error instanceof Error ? event.error : null;
      const report = buildReport("window.error", [
        ["Message", event.message],
        ["File", event.filename],
        ["Line", event.lineno],
        ["Column", event.colno],
        ["Error", error || event.error],
      ]);
      const code = trackClientError({
        route: typeof window !== "undefined" ? window.location.href : event.filename,
        message: error?.message || event.message || "حصل خطأ غير متوقع في الصفحة.",
        stack: error?.stack || report,
        source: "window.error",
      });
      void code;
    };

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      const error = event.reason instanceof Error ? event.reason : null;
      const report = buildReport("unhandledrejection", [["Reason", event.reason]]);
      const code = trackClientError({
        message: error?.message || "وعد برمجي فشل بدون معالجة.",
        stack: error?.stack || report,
        source: "unhandledrejection",
      });
      void code;
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

      void message;
    };

    return () => {
      window.console.error = previousConsoleError;
    };
  }, [addNotification]);

  useEffect(() => {
    const previousFetch = window.fetch;

    window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
      const meta = getFetchMeta(input, init);
      const isAdminMutation = isAdminPath() && isAdminRequest(meta.url) && isMutatingMethod(meta.method) && !meta.url.includes("/api/errors");
      const actionLabel = getAdminRequestLabel(meta.url);

      if (isAdminMutation) {
        addNotification({
          type: "info",
          title: "جاري التنفيذ",
          message: `${actionLabel} قيد التنفيذ الآن...`,
          duration: 1800,
          signature: `admin-fetch-start:${meta.method}:${shortUrl(meta.url)}:${Date.now().toString().slice(0, -3)}`,
        });
      }

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
          const report = buildReport("fetch non-ok response", [
            ["Request URL", meta.url],
            ["Method", meta.method],
            ["Status", response.status],
            ["Status Text", response.statusText],
            ["Response URL", response.url],
            ["Response Body", truncate(responseText, 5000)],
          ]);

          if (!meta.url.includes("/api/errors")) {
            const code = trackClientError({
              route: meta.url,
              message: `${response.status} ${response.statusText || ""} - ${shortUrl(meta.url)}`.trim(),
              stack: report,
              source: "fetch.non_ok",
            });
            void code;
          }

          if (isAdminPath() && isAdminRequest(meta.url) && !meta.url.includes("/api/errors")) {
            addNotification({
              type: "error",
              title: "فشل تنفيذ الإجراء",
              message: `${actionLabel} لم يكتمل. كود الاستجابة ${response.status}.`,
              details: report,
              duration: 7000,
              signature: `admin-fetch-error:${meta.method}:${meta.url}:${response.status}`,
            });
          }
        } else if (isAdminMutation) {
          addNotification({
            type: "success",
            title: "تم التنفيذ",
            message: `${actionLabel} تم بنجاح.`,
            duration: 3000,
            signature: `admin-fetch-success:${meta.method}:${shortUrl(meta.url)}:${Date.now().toString().slice(0, -3)}`,
          });
        }

        return response;
      } catch (error) {
        const report = buildReport("fetch network failure", [
          ["Request URL", meta.url],
          ["Method", meta.method],
          ["Error", error],
        ]);
        if (!meta.url.includes("/api/errors")) {
          const code = trackClientError({
            route: meta.url,
            message: error instanceof Error ? error.message : "تعذر تنفيذ طلب الشبكة.",
            stack: error instanceof Error ? error.stack || report : report,
            source: "fetch.network",
          });
          void code;
        }
        if (isAdminPath() && isAdminRequest(meta.url) && !meta.url.includes("/api/errors")) {
          addNotification({
            type: "error",
            title: "تعذر الاتصال",
            message: `${actionLabel} لم يصل للسيرفر. راجع الاتصال أو أعد المحاولة.`,
            details: report,
            duration: 7000,
            signature: `admin-fetch-network:${meta.method}:${meta.url}`,
          });
        }
        throw error;
      }
    };

    return () => {
      window.fetch = previousFetch;
    };
  }, [addNotification]);

  useEffect(() => {
    const pathname = window.location.pathname || "/";
    const searchQuery = window.location.search.startsWith("?") ? window.location.search.slice(1) : window.location.search;
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
  }, [addNotification]);

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
