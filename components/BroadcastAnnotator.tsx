"use client";

import { useEffect, useRef, useState } from "react";
import type { ContentTextEntry } from "@/lib/content-text-registry";

type RegistryEntry = Pick<ContentTextEntry, "id" | "title" | "text" | "href" | "sourceLabel" | "editable">;

type Marker = {
  key: string;
  label: string;
  value: string;
  sourceLabel?: string;
};

const ignoredSelector = [
  ".broadcast-markers",
  "script", "style", "noscript",
  "input", "textarea", "select", "option",
  "[contenteditable='true']",
  "[data-broadcast-ignore]",
  "img", "svg", "video", "audio", "canvas",
  "br", "hr",
].join(",");

function normalizeText(value: string) {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u064B-\u065F\u0670]/g, "")
    .replace(/\u0640/g, "")
    .replace(/[إأآا]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/[^\p{L}\p{N}\s]+/gu, " ")
    .replace(/\s+/g, " ");
}

function elementText(element: HTMLElement) {
  return (element.innerText || element.textContent || "").replace(/\s+/g, " ").trim();
}

function exactMatchEntry(element: HTMLElement, entries: RegistryEntry[]) {
  const text = normalizeText(elementText(element));
  if (!text || text.length < 2) return null;
  return entries.find((entry) => normalizeText(entry.text) === text) || null;
}

export function BroadcastAnnotator() {
  const [entries, setEntries] = useState<RegistryEntry[]>([]);
  const entriesRef = useRef<RegistryEntry[]>([]);
  const fetchedRef = useRef(false);
  const hoveredRef = useRef<HTMLElement | null>(null);

  entriesRef.current = entries;

  useEffect(() => {
    let alive = true;

    function onParentMessage(event: MessageEvent) {
      if (event.data?.source === "badr-broadcast-parent" && Array.isArray(event.data.entries)) {
        if (!alive) return;
        fetchedRef.current = true;
        setEntries(event.data.entries.filter((e: RegistryEntry) => e.editable && e.text.trim()));
      }
    }

    window.addEventListener("message", onParentMessage);

    setTimeout(() => {
      if (!alive || fetchedRef.current) return;
      fetch("/api/admin/broadcast", { credentials: "same-origin", cache: "no-store" })
        .then((r) => (r.ok ? r.json() : null))
        .then((data: { fields?: RegistryEntry[] } | null) => {
          if (!alive) return;
          if (!data?.fields?.length) { fetchedRef.current = true; return; }
          fetchedRef.current = true;
          setEntries(data.fields.filter((e) => e.editable && e.text.trim()));
        })
        .catch(() => { if (alive) fetchedRef.current = true; });
    }, 500);

    return () => { alive = false; window.removeEventListener("message", onParentMessage); };
  }, []);

  function clearHighlight() {
    if (hoveredRef.current) {
      hoveredRef.current.style.removeProperty("box-shadow");
      hoveredRef.current.style.removeProperty("border-radius");
      hoveredRef.current = null;
    }
  }

  function highlightElement(element: HTMLElement) {
    if (hoveredRef.current === element) return;
    clearHighlight();
    hoveredRef.current = element;
    element.style.boxShadow = "inset 0 0 0 2px rgba(243, 207, 115, 0.75)";
    element.style.borderRadius = "4px";
    element.style.transition = "box-shadow 0.12s ease";
  }

  function selectFromTarget(target: EventTarget | null) {
    let element = target instanceof HTMLElement ? target : null;
    if (!element || element.closest(".broadcast-markers")) { clearHighlight(); return; }

    const ancestors: HTMLElement[] = [];
    let current: HTMLElement | null = element;
    while (current && current !== document.body && ancestors.length < 10) {
      if (current.matches(ignoredSelector)) break;
      const text = elementText(current);
      const normalized = normalizeText(text);
      if (normalized.length >= 2 && normalized.length <= 500) {
        ancestors.push(current);
      }
      current = current.parentElement;
    }

    for (const candidate of ancestors) {
      const exact = exactMatchEntry(candidate, entriesRef.current);
      if (exact) { highlightElement(candidate); return; }
    }

    if (ancestors.length > 0) {
      highlightElement(ancestors[0]);
    } else {
      clearHighlight();
    }
  }

  useEffect(() => {
    document.body.classList.add("broadcast-edit-mode");

    const onMove = (event: MouseEvent) => selectFromTarget(event.target);

    const onClick = (event: MouseEvent) => {
      const element = hoveredRef.current;
      if (!element) return;

      const target = event.target instanceof Element ? event.target : null;

      const link = target?.closest("a[href]") as HTMLAnchorElement | null;
      if (link && !event.defaultPrevented && !event.metaKey && !event.ctrlKey && !event.shiftKey) {
        const url = new URL(link.href, window.location.origin);
        if (url.origin === window.location.origin && !url.pathname.startsWith("/admin")) {
          url.searchParams.set("broadcast", "1");
          if (url.href !== link.href) {
            event.preventDefault();
            window.location.href = url.toString();
            window.dispatchEvent(new CustomEvent("broadcast-mode-location-change"));
            return;
          }
        }
      }

      if (target && !element.contains(target)) return;

      event.preventDefault();
      event.stopPropagation();

      const text = elementText(element);
      if (!text || text.length < 2) return;

      const match = exactMatchEntry(element, entriesRef.current);

      const marker: Marker = {
        key: match?.id || `inline.${normalizeText(text).slice(0, 40)}`,
        label: match?.title || "تعديل النص",
        value: match ? match.text : text,
        sourceLabel: match?.sourceLabel,
      };

      window.parent.postMessage(
        { source: "badr-broadcast", type: "edit", marker },
        window.location.origin,
      );
    };

    document.addEventListener("mouseover", onMove);
    document.addEventListener("click", onClick, true);

    return () => {
      document.body.classList.remove("broadcast-edit-mode");
      document.removeEventListener("mouseover", onMove);
      document.removeEventListener("click", onClick, true);
    };
  }, []);

  return <div className="broadcast-markers" />;
}
