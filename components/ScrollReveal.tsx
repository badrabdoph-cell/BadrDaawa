"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

const revealSelector = [
  "main > section",
  "main > article",
  "main .section",
  ".dashboard-content > *",
  ".panel",
  ".admin-card",
  ".stats-card",
  ".template-card",
  ".pricing-card",
  ".feature-card",
  ".invite-card",
  ".template-photographer-card",
].join(",");

const excludedSelector = [
  "[data-no-scroll-animation]",
  ".dashboard-sidebar",
  ".dashboard-topbar",
  ".admin-mobile-nav-shell",
  ".admin-mobile-menu",
  ".admin-mobile-menu-backdrop",
  ".template-preview-floating-actions",
  ".new-invite-preview-frame",
  ".toast",
  ".global-notifications",
].join(",");

declare global {
  interface Window {
    __badrErrorSurfaceReady?: boolean;
  }
}

function isHTMLElement(value: Element): value is HTMLElement {
  return value instanceof HTMLElement;
}

function prepareRevealElements() {
  const elements = Array.from(document.querySelectorAll(revealSelector)).filter(isHTMLElement);
  const seen = new Set<HTMLElement>();
  const prepared: HTMLElement[] = [];

  elements.forEach((element) => {
    if (seen.has(element) || element.closest(excludedSelector)) return;
    seen.add(element);
    prepared.push(element);
  });

  prepared.forEach((element, index) => {
    element.dataset.scrollReveal = "true";
    element.style.setProperty("--scroll-reveal-delay", `${Math.min((index % 5) * 35, 140)}ms`);

    const bounds = element.getBoundingClientRect();
    if (bounds.top < window.innerHeight * 0.92) {
      element.dataset.scrollRevealState = "visible";
    }
  });

  return prepared;
}

function hashText(value: string) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36).toUpperCase().padStart(7, "0");
}

function createErrorCode(value: string) {
  return `ERR-${Date.now().toString(36).toUpperCase()}-${hashText(value).slice(0, 7)}`;
}

function reportNativeError(input: { code: string; message: string; stack?: string; source: string }) {
  fetch("/api/errors", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      route: window.location.href,
      message: input.message,
      stack: input.stack || input.message,
      source: input.source,
      digest: input.code,
    }),
    keepalive: true,
  }).catch(() => undefined);
}

function setupNativeErrorSurface() {
  if (window.__badrErrorSurfaceReady) return;
  window.__badrErrorSurfaceReady = true;

  const existingBadrNotify = (window as any).badrNotify;

  (window as any).badrNotify = (notification: any) => {
    if (typeof existingBadrNotify === "function") {
      existingBadrNotify(notification);
    }
    if (notification.type === "error") {
      return "site-error";
    }
    return "";
  };

  window.addEventListener("error", (event) => {
    const error = event.error instanceof Error ? event.error : null;
    const message = error?.message || event.message || "error";
    const stack = error?.stack || `${event.filename}:${event.lineno}:${event.colno}`;
    const code = createErrorCode(`window.error:${message}:${stack}`);
    reportNativeError({ code, message, stack, source: "window.error" });
  });

  window.addEventListener("unhandledrejection", (event) => {
    const error = event.reason instanceof Error ? event.reason : null;
    const message = error?.message || "error";
    const stack = error?.stack || String(event.reason || "");
    const code = createErrorCode(`unhandledrejection:${message}:${stack}`);
    reportNativeError({ code, message, stack, source: "unhandledrejection" });
  });
}

export function ScrollReveal() {
  const pathname = usePathname();

  useEffect(() => {
    setupNativeErrorSurface();

    if (pathname.startsWith("/admin")) {
      document.documentElement.classList.add("scroll-animations-disabled");
      return;
    }

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      document.documentElement.classList.add("scroll-animations-disabled");
      return;
    }

    let observer: IntersectionObserver | null = null;
    let mutationObserver: MutationObserver | null = null;
    let raf = 0;

    function setup() {
      window.cancelAnimationFrame(raf);
      raf = window.requestAnimationFrame(() => {
        const elements = prepareRevealElements();
        document.documentElement.classList.add("scroll-animations-ready");

        observer?.disconnect();
        observer = new IntersectionObserver(
          (entries) => {
            entries.forEach((entry) => {
              if (!entry.isIntersecting) return;
              const target = entry.target as HTMLElement;
              target.dataset.scrollRevealState = "visible";
              observer?.unobserve(target);
            });
          },
          { rootMargin: "0px 0px -10% 0px", threshold: 0.12 },
        );

        elements.forEach((element) => {
          if (element.dataset.scrollRevealState !== "visible") observer?.observe(element);
        });
      });
    }

    setup();

    mutationObserver = new MutationObserver(() => setup());
    mutationObserver.observe(document.body, { childList: true, subtree: true });

    return () => {
      window.cancelAnimationFrame(raf);
      observer?.disconnect();
      mutationObserver?.disconnect();
    };
  }, [pathname]);

  return null;
}
