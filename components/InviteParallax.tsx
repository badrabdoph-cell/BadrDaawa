"use client";

import { useEffect } from "react";

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function InviteParallax() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (reduceMotion.matches) return;

    let frame = 0;
    let elements: HTMLElement[] = [];
    const visible = new Set<HTMLElement>();

    function refreshElements() {
      elements = Array.from(document.querySelectorAll<HTMLElement>("[data-invite-parallax]")).filter((element) => !element.closest(".invite-gallery-lightbox"));
      visible.clear();
      elements.forEach((element) => observer.observe(element));
      scheduleUpdate();
    }

    function update() {
      frame = 0;
      const viewportHeight = window.innerHeight || 1;
      const maxOffset = window.innerWidth < 640 ? 12 : 26;

      visible.forEach((element) => {
        const rect = element.getBoundingClientRect();
        const center = rect.top + rect.height / 2;
        const progress = clamp((center - viewportHeight / 2) / (viewportHeight + rect.height), -1, 1);
        const strength = Number(element.dataset.inviteParallaxStrength || "1") || 1;
        const y = clamp(-progress * maxOffset * strength, -maxOffset, maxOffset);
        element.style.setProperty("--invite-parallax-y", `${y.toFixed(2)}px`);
      });
    }

    function scheduleUpdate() {
      if (frame) return;
      frame = window.requestAnimationFrame(update);
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const element = entry.target as HTMLElement;
          if (entry.isIntersecting) visible.add(element);
          else {
            visible.delete(element);
            element.style.removeProperty("--invite-parallax-y");
          }
        });
        scheduleUpdate();
      },
      { rootMargin: "18% 0px" },
    );

    refreshElements();
    window.addEventListener("scroll", scheduleUpdate, { passive: true });
    window.addEventListener("resize", refreshElements);

    return () => {
      if (frame) window.cancelAnimationFrame(frame);
      window.removeEventListener("scroll", scheduleUpdate);
      window.removeEventListener("resize", refreshElements);
      observer.disconnect();
      elements.forEach((element) => element.style.removeProperty("--invite-parallax-y"));
    };
  }, []);

  return null;
}
