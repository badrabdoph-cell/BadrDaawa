"use client";

import { useEffect } from "react";

const animationSelector = [
  ".template-color-scope main > section",
  ".template-color-scope main > div > section",
  ".template-color-scope main > section > section",
  ".template-color-scope .invite-card",
  ".template-color-scope .interactive-gallery",
  ".template-color-scope section[class*='-card']",
  ".template-color-scope section[class*='-gallery']",
  ".template-color-scope section[class*='-map']",
  ".template-color-scope section[class*='-photographer']",
  ".template-color-scope section[class*='-qr']",
  ".template-color-scope article[class*='story']",
].join(",");

function getAnimationEffect(element: HTMLElement, index: number) {
  const className = element.className.toString().toLowerCase();
  if (className.includes("gallery") || className.includes("photo") || className.includes("media")) return "scale";
  if (className.includes("map") || className.includes("timeline") || className.includes("story")) return index % 2 === 0 ? "slide-right" : "slide-left";
  return "fade";
}

function shouldAnimate(element: HTMLElement) {
  if (element.dataset.inviteScrollSkip === "true") return false;
  if (element.closest(".invite-opening, .invite-gallery-lightbox, .toast-container")) return false;
  if (element.classList.contains("invite-gallery-slide")) return false;
  if (element.matches("[data-invite-parallax]")) return false;
  return true;
}

export function InviteScrollAnimations() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (reduceMotion.matches) return;
    if (!("IntersectionObserver" in window)) return;

    let elements: HTMLElement[] = [];

    function collectElements() {
      const seen = new Set<HTMLElement>();
      elements = Array.from(document.querySelectorAll<HTMLElement>(animationSelector)).filter((element, index) => {
        if (seen.has(element) || !shouldAnimate(element)) return false;
        seen.add(element);
        if (!element.dataset.inviteScrollEffect) element.dataset.inviteScrollEffect = getAnimationEffect(element, index);
        element.dataset.inviteScroll = "true";
        element.style.setProperty("--invite-scroll-delay", `${Math.min(index % 5, 4) * 55}ms`);
        return true;
      });
      elements.forEach((element) => observer.observe(element));
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const element = entry.target as HTMLElement;
          if (!entry.isIntersecting) return;
          element.classList.add("is-in-view");
          observer.unobserve(element);
        });
      },
      { rootMargin: "0px 0px -10% 0px", threshold: 0.16 },
    );

    collectElements();
    const refreshTimer = window.setTimeout(collectElements, 500);

    return () => {
      window.clearTimeout(refreshTimer);
      observer.disconnect();
      elements.forEach((element) => {
        element.classList.remove("is-in-view");
        element.removeAttribute("data-invite-scroll");
        element.style.removeProperty("--invite-scroll-delay");
      });
    };
  }, []);

  return null;
}
