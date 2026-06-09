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

export function ScrollReveal() {
  const pathname = usePathname();

  useEffect(() => {
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
