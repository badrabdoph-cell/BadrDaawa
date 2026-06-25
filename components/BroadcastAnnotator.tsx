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

function findTextLeaf(element: HTMLElement): HTMLElement | null {
  // Find the leaf element that actually contains the text
  // This helps with nested elements like <td><span>text</span></td>
  let current: HTMLElement | null = element;
  while (current) {
    const directText = getElementTextOnly(current);
    if (directText && directText.trim().length >= 2) {
      // This element has direct text, use it
      return current;
    }
    // Move to first child element
    const firstChild = Array.from(current.children).find(
      (child) => child instanceof HTMLElement
    ) as HTMLElement | null;
    if (firstChild) {
      current = firstChild;
    } else {
      break;
    }
  }
  return element;
}

function findSmallestTextElement(element: HTMLElement): HTMLElement | null {
  // Find the smallest element that has direct text content
  let current: HTMLElement | null = element;
  let smallest: HTMLElement | null = null;

  while (current) {
    const text = elementText(current);
    if (text && text.trim().length >= 2) {
      smallest = current;
      // Check if this element has child elements with text
      const hasTextChildren = Array.from(current.children).some(
        (child) => child instanceof HTMLElement && elementText(child).trim().length >= 2
      );
      if (!hasTextChildren) {
        // This is a leaf element with text, use it
        return smallest;
      }
    }
    // Move to first child element if exists
    const firstChild = Array.from(current.children).find(
      (child) => child instanceof HTMLElement
    ) as HTMLElement | null;
    if (firstChild) {
      current = firstChild;
    } else {
      break;
    }
  }

  return smallest || element;
}

function exactMatchEntry(element: HTMLElement, entries: RegistryEntry[]) {
  const text = normalizeText(getElementTextOnly(element));
  if (!text || text.length < 2) return null;
  return entries.find((entry) => normalizeText(entry.text) === text) || null;
}

export function BroadcastAnnotator() {
  const [entries, setEntries] = useState<RegistryEntry[]>([]);
  const entriesRef = useRef<RegistryEntry[]>([]);
  const fetchedRef = useRef(false);
  const hoveredRef = useRef<HTMLElement | null>(null);
  const livePreviewRef = useRef<Map<string, string>>(new Map());

  entriesRef.current = entries;

  function applyLivePreview(key: string, value: string) {
    // Find all elements that match this entry and update their text
    const allElements = document.querySelectorAll("*");
    for (const element of allElements) {
      if (!(element instanceof HTMLElement)) continue;
      if (element.matches(ignoredSelector)) continue;

      const text = elementText(element);
      if (!text) continue;

      // Check if this element matches any entry with the given key
      const match = entriesRef.current.find((e: RegistryEntry) => e.id === key);
      if (match && normalizeText(text) === normalizeText(match.text)) {
        // Store original text if not already stored
        if (!element.dataset.broadcastOriginal) {
          element.dataset.broadcastOriginal = element.textContent || "";
        }
        element.textContent = value;
      }
    }
  }

  function restoreOriginalText(key: string) {
    const allElements = document.querySelectorAll("*");
    for (const element of allElements) {
      if (!(element instanceof HTMLElement)) continue;
      if (element.dataset.broadcastOriginal) {
        // Find the updated entry with this key and use its new text
        const match = entriesRef.current.find((e: RegistryEntry) => e.id === key);
        if (match) {
          element.textContent = match.text;
        } else {
          element.textContent = element.dataset.broadcastOriginal;
        }
        delete element.dataset.broadcastOriginal;
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

    // Find the leaf element that contains the actual text
    const leaf = findTextLeaf(element);
    if (leaf) {
      const text = getElementTextOnly(leaf);
      if (text && text.length >= 2) {
        const exact = exactMatchEntry(leaf, entriesRef.current);
        if (exact) {
          highlightElement(leaf);
          return;
        }
      }
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
      const normalized = normalizeText(text);
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

    // If no exact match, select the smallest element with text
    if (ancestors.length > 0) {
      highlightElement(ancestors[ancestors.length - 1]);
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
