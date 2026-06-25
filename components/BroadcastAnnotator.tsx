"use client";

import { useEffect, useRef, useState } from "react";
import type { ContentTextEntry } from "@/lib/content-text-registry";
import { createSiteTextOverrideId, matchBroadcastEntry, normalizeBroadcastText } from "@/lib/broadcast-editing";

type RegistryEntry = Pick<ContentTextEntry, "id" | "title" | "text" | "href" | "sourceLabel" | "editable">;

type Marker = {
  key: string;
  label: string;
  value: string;
  sourceLabel?: string;
  path?: string;
  originalText?: string;
  occurrence?: number;
};

type LivePreview = {
  key: string;
  value: string;
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

function elementText(element: HTMLElement) {
  // Get only the text from this specific element, not from children
  // This is crucial for table cells where we want individual text items
  let text = "";
  for (const node of element.childNodes) {
    if (node.nodeType === Node.TEXT_NODE) {
      text += node.textContent || "";
    }
  }
  return text.replace(/\s+/g, " ").trim();
}

function getElementTextOnly(element: HTMLElement): string {
  // Get text only from this element, ignoring all child elements
  let text = "";
  for (const node of element.childNodes) {
    if (node.nodeType === Node.TEXT_NODE) {
      text += node.textContent || "";
    }
  }
  return text.replace(/\s+/g, " ").trim();
}

function exactMatchEntry(element: HTMLElement, entries: RegistryEntry[]) {
  return matchBroadcastEntry(
    { broadcastId: element.dataset.broadcastId, text: getElementTextOnly(element) || elementText(element) },
    entries,
  );
}

function findBroadcastElement(element: HTMLElement): HTMLElement | null {
  const direct = element.closest("[data-broadcast-id]");
  if (direct instanceof HTMLElement && !direct.matches(ignoredSelector)) return direct;
  return null;
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

function getCleanPagePath() {
  return window.location.pathname || "/";
}

function getTextOccurrence(element: HTMLElement, text: string) {
  const normalized = normalizeBroadcastText(text);
  if (!normalized) return 0;
  let occurrence = 0;
  const elements = Array.from(document.querySelectorAll("*"));
  for (const candidate of elements) {
    if (!(candidate instanceof HTMLElement)) continue;
    if (candidate.matches(ignoredSelector)) continue;
    if (normalizeBroadcastText(getElementTextOnly(candidate)) !== normalized) continue;
    if (candidate === element) return occurrence;
    occurrence++;
  }
  return 0;
}

export function BroadcastAnnotator() {
  const [entries, setEntries] = useState<RegistryEntry[]>([]);
  const entriesRef = useRef<RegistryEntry[]>([]);
  const fetchedRef = useRef(false);
  const hoveredRef = useRef<HTMLElement | null>(null);
  const livePreviewRef = useRef<Map<string, string>>(new Map());

  entriesRef.current = entries;

  function applyLivePreview(key: string, value: string) {
    const escapedKey = typeof CSS !== "undefined" && typeof CSS.escape === "function" ? CSS.escape(key) : key.replace(/"/g, '\\"');
    const keyedElements = Array.from(document.querySelectorAll(`[data-broadcast-id="${escapedKey}"]`));
    const targetElements = keyedElements.length
      ? keyedElements
      : Array.from(document.querySelectorAll("*")).filter((element) => {
          if (!(element instanceof HTMLElement)) return false;
          if (element.matches(ignoredSelector)) return false;
          return exactMatchEntry(element, entriesRef.current)?.id === key;
        });

    for (const element of targetElements) {
      if (!(element instanceof HTMLElement)) continue;
      if (!element.dataset.broadcastOriginal) {
        element.dataset.broadcastOriginal = getElementTextOnly(element) || element.textContent || "";
      }
      element.dataset.broadcastPreviewKey = key;
      setElementTextPreservingChildren(element, value);
    }
  }

  function restoreOriginalText(key: string) {
    const allElements = document.querySelectorAll("*");
    for (const element of allElements) {
      if (!(element instanceof HTMLElement)) continue;
      if (element.dataset.broadcastOriginal && element.dataset.broadcastPreviewKey === key) {
        // Find the updated entry with this key and use its new text
        const match = entriesRef.current.find((e: RegistryEntry) => e.id === key);
        setElementTextPreservingChildren(element, match?.text || element.dataset.broadcastOriginal);
        delete element.dataset.broadcastOriginal;
        delete element.dataset.broadcastPreviewKey;
      }
    }
  }

  useEffect(() => {
    let alive = true;

    function onParentMessage(event: MessageEvent) {
      if (event.data?.source === "badr-broadcast-parent") {
        if (!alive) return;

        if (Array.isArray(event.data.entries)) {
          fetchedRef.current = true;
          setEntries(event.data.entries.filter((e: RegistryEntry) => e.editable && e.text.trim()));
        }

        if (event.data.livePreview) {
          const preview = event.data.livePreview as LivePreview;
          if (preview.key && preview.value !== undefined) {
            livePreviewRef.current.set(preview.key, preview.value);
            applyLivePreview(preview.key, preview.value);
          }
        }

        // Clear live preview when saved
        if (event.data.clearPreview) {
          const key = event.data.clearPreview as string;
          livePreviewRef.current.delete(key);
          restoreOriginalText(key);
        }
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

    const broadcastElement = findBroadcastElement(element);
    if (broadcastElement) {
      highlightElement(broadcastElement);
      return;
    }

    // For tables, prioritize the specific cell (td/th) or the direct text container
    const tableCell = element.closest("td, th") as HTMLElement | null;
    if (tableCell) {
      // Try to find the specific text node within the cell
      let textContainer: HTMLElement | null = element;
      while (textContainer && textContainer !== tableCell) {
        const text = getElementTextOnly(textContainer);
        if (text && text.length >= 2) {
          const exact = exactMatchEntry(textContainer, entriesRef.current);
          if (exact) { highlightElement(textContainer); return; }
        }
        textContainer = textContainer.parentElement;
      }
      // If no match found in children, try the cell itself
      const cellText = getElementTextOnly(tableCell);
      if (cellText && cellText.length >= 2) {
        const exact = exactMatchEntry(tableCell, entriesRef.current);
        if (exact) { highlightElement(tableCell); return; }
      }
      // If still no match, highlight the cell anyway for inline editing
      highlightElement(tableCell);
      return;
    }

    const ancestors: HTMLElement[] = [];
    let current: HTMLElement | null = element;
    while (current && current !== document.body && ancestors.length < 15) {
      if (current.matches(ignoredSelector)) break;
      const text = getElementTextOnly(current);
      const normalized = normalizeBroadcastText(text);
      if (normalized.length >= 2 && normalized.length <= 500) {
        ancestors.push(current);
      }
      current = current.parentElement;
    }

    // First, try to find exact match starting from smallest element (closest to click)
    for (const candidate of ancestors) {
      const exact = exactMatchEntry(candidate, entriesRef.current);
      if (exact) { highlightElement(candidate); return; }
    }

    if (ancestors.length > 0) {
      highlightElement(ancestors[0]);
      return;
    }

    clearHighlight();
  }

  useEffect(() => {
    document.body.classList.add("broadcast-edit-mode");

    const onMove = (event: MouseEvent) => selectFromTarget(event.target);

    const onClick = (event: MouseEvent) => {
      const element = hoveredRef.current;
      if (!element) return;

      const target = event.target instanceof Element ? event.target : null;

      if (target && !element.contains(target)) return;

      event.preventDefault();
      event.stopPropagation();

      const text = getElementTextOnly(element) || elementText(element);
      if (!text || text.length < 2) return;

      const match = exactMatchEntry(element, entriesRef.current);
      const occurrence = getTextOccurrence(element, text);
      const overrideKey = createSiteTextOverrideId(getCleanPagePath(), text, occurrence);
      if (!match) {
        element.dataset.broadcastId = overrideKey;
      }

      const marker: Marker = {
        key: match?.id || overrideKey,
        label: match?.title || "تعديل النص",
        value: match ? match.text : text,
        sourceLabel: match?.sourceLabel || "نص ثابت في الصفحة",
        path: match ? undefined : getCleanPagePath(),
        originalText: match ? undefined : text,
        occurrence: match ? undefined : occurrence,
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
