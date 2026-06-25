"use client";

import { useEffect } from "react";
import { createSiteTextOverrideId } from "@/lib/broadcast-editing";
import type { SiteTextOverride } from "@/lib/site-text-overrides";

const ignoredSelector = [
  "script", "style", "noscript",
  "input", "textarea", "select", "option",
  "[contenteditable='true']",
  "[data-broadcast-ignore]",
  "img", "svg", "video", "audio", "canvas",
  "br", "hr",
].join(",");

function getElementTextOnly(element: HTMLElement): string {
  let text = "";
  for (const node of element.childNodes) {
    if (node.nodeType === Node.TEXT_NODE) text += node.textContent || "";
  }
  return text.replace(/\s+/g, " ").trim();
}

function setElementTextPreservingChildren(element: HTMLElement, value: string) {
  const textNodes = Array.from(element.childNodes).filter((node) => node.nodeType === Node.TEXT_NODE);
  if (!textNodes.length) {
    element.textContent = value;
    return;
  }
  textNodes.forEach((node, index) => {
    node.textContent = index === 0 ? value : "";
  });
}

export function SiteTextOverrideApplier({ overrides }: { overrides: SiteTextOverride[] }) {
  useEffect(() => {
    if (!overrides.length || window.location.pathname.startsWith("/admin")) return;
    const path = window.location.pathname;
    const overrideMap = new Map(overrides.filter((item) => item.path === path).map((item) => [`site-text-overrides.${item.id}`, item]));
    if (!overrideMap.size) return;

    const elements = Array.from(document.querySelectorAll("*"));
    const seen = new Map<string, number>();
    for (const element of elements) {
      if (!(element instanceof HTMLElement)) continue;
      if (element.matches(ignoredSelector)) continue;
      const text = getElementTextOnly(element);
      if (!text) continue;
      const baseKey = `${path}|${text}`;
      const occurrence = seen.get(baseKey) || 0;
      seen.set(baseKey, occurrence + 1);
      const id = createSiteTextOverrideId(path, text, occurrence);
      const override = overrideMap.get(id);
      if (!override) continue;
      element.dataset.broadcastId = id;
      setElementTextPreservingChildren(element, override.text);
    }
  }, [overrides]);

  return null;
}
