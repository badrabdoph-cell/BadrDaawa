"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ContentTextEntry } from "@/lib/content-text-registry";

type RegistryEntry = Pick<ContentTextEntry, "id" | "title" | "text" | "href" | "sourceLabel" | "editable">;

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

function findEntry(element: HTMLElement, entries: RegistryEntry[]) {
  const explicitId = element.dataset.broadcastId || element.dataset.broadcastKey;
  if (explicitId) return entries.find((entry) => entry.id === explicitId);

  const text = normalizeText(elementText(element));
  if (!text || text.length < 2) return null;

  const exact = entries.find((entry) => normalizeText(entry.text) === text);
  if (exact) return exact;

  if (text.length < 8) return null;

  const best = entries
    .filter((entry) => {
      const entryText = normalizeText(entry.text);
      return text.includes(entryText) || entryText.includes(text);
    })
    .sort((a, b) => Math.abs(b.text.length - text.length) - Math.abs(a.text.length - text.length))[0];

  return best || null;
}

export function BroadcastAnnotator() {
  const [entries, setEntries] = useState<RegistryEntry[]>([]);
  const entriesRef = useRef<RegistryEntry[]>([]);
  const fetchedRef = useRef(false);
  const hoveredRef = useRef<HTMLElement | null>(null);
  const editingRef = useRef<HTMLElement | null>(null);
  const originalTextRef = useRef<string>("");
  const [, forceRender] = useState(0);

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

  function selectFromTarget(target: EventTarget | null) {
    if (editingRef.current) return;

    let element = target instanceof HTMLElement ? target : null;
    while (element && element !== document.body) {
      if (element.matches(ignoredSelector)) { element = null; break; }
      if (element.closest(".broadcast-markers")) { element = null; break; }
      const text = elementText(element);
      const normalized = normalizeText(text);
      if (normalized.length >= 2 && normalized.length <= 500) break;
      element = element.parentElement;
    }

    if (hoveredRef.current && hoveredRef.current !== element) {
      hoveredRef.current.style.removeProperty("box-shadow");
      hoveredRef.current.style.removeProperty("border-radius");
    }

    hoveredRef.current = element || null;

    if (element) {
      element.style.boxShadow = "inset 0 0 0 2px rgba(243, 207, 115, 0.7)";
      element.style.borderRadius = "4px";
      element.style.transition = "box-shadow 0.15s ease";
    }
  }

  function beginEdit(element: HTMLElement) {
    const text = elementText(element);
    if (!text || text.length < 2) return;

    const entry = findEntry(element, entriesRef.current);

    originalTextRef.current = text;
    editingRef.current = element;

    element.contentEditable = "true";
    element.style.boxShadow = "inset 0 0 0 2px #f3cf73, 0 0 0 4px rgba(243, 207, 115, 0.15)";
    element.style.borderRadius = "4px";
    element.style.backgroundColor = "rgba(243, 207, 115, 0.06)";
    element.style.outline = "none";
    element.focus();

    const range = document.createRange();
    range.selectNodeContents(element);
    const selection = window.getSelection();
    if (selection) {
      selection.removeAllRanges();
      selection.addRange(range);
    }

    forceRender((n) => n + 1);
  }

  function saveEdit() {
    const element = editingRef.current;
    if (!element) return;

    const newText = elementText(element);
    const originalText = originalTextRef.current;
    if (newText === originalText || !newText) {
      cancelEdit();
      return;
    }

    const entry = findEntry(element, entriesRef.current);
    const key = entry?.id || `inline.${normalizeText(originalText).slice(0, 40)}`;

    window.parent.postMessage(
      {
        source: "badr-broadcast",
        type: "save",
        marker: {
          key,
          value: newText,
          label: entry?.title || "تعديل النص",
          sourceLabel: entry?.sourceLabel,
        },
      },
      window.location.origin,
    );

    element.contentEditable = "false";
    element.style.boxShadow = "inset 0 0 0 2px rgba(74, 222, 128, 0.6)";
    element.style.backgroundColor = "rgba(74, 222, 128, 0.04)";
    setTimeout(() => {
      element.style.removeProperty("box-shadow");
      element.style.removeProperty("background-color");
      element.style.removeProperty("border-radius");
    }, 1200);

    editingRef.current = null;
    originalTextRef.current = "";
    forceRender((n) => n + 1);
  }

  function cancelEdit() {
    const element = editingRef.current;
    if (!element) return;

    element.contentEditable = "false";
    element.style.removeProperty("box-shadow");
    element.style.removeProperty("background-color");
    element.style.removeProperty("border-radius");
    editingRef.current = null;
    originalTextRef.current = "";
    forceRender((n) => n + 1);
  }

  useEffect(() => {
    document.body.classList.add("broadcast-edit-mode");

    const onMove = (event: MouseEvent) => selectFromTarget(event.target);
    const onFocus = (event: FocusEvent) => selectFromTarget(event.target);

    const onClick = (event: MouseEvent) => {
      const target = event.target instanceof Element ? event.target : null;
      const link = target?.closest("a[href]") as HTMLAnchorElement | null;
      if (link && !event.defaultPrevented && !event.metaKey && !event.ctrlKey) {
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

      if (editingRef.current) return;

      const element = hoveredRef.current;
      if (!element) return;
      if (target && !element.contains(target as Node)) return;

      event.preventDefault();
      event.stopPropagation();
      beginEdit(element);
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (!editingRef.current) return;
      if (event.key === "Escape") {
        event.preventDefault();
        cancelEdit();
      } else if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) {
        event.preventDefault();
        saveEdit();
      }
    };

    const onBlur = (event: FocusEvent) => {
      if (!editingRef.current) return;
      const related = event.relatedTarget as Node | null;
      if (related && editingRef.current.contains(related)) return;
      if (related && (related as HTMLElement)?.closest?.(".broadcast-edit-toolbar")) return;
      setTimeout(() => {
        if (document.activeElement === editingRef.current) return;
        saveEdit();
      }, 200);
    };

    document.addEventListener("mouseover", onMove);
    document.addEventListener("focusin", onFocus);
    document.addEventListener("click", onClick, true);
    document.addEventListener("keydown", onKeyDown, true);
    document.addEventListener("blur", onBlur, true);

    return () => {
      document.body.classList.remove("broadcast-edit-mode");
      document.removeEventListener("mouseover", onMove);
      document.removeEventListener("focusin", onFocus);
      document.removeEventListener("click", onClick, true);
      document.removeEventListener("keydown", onKeyDown, true);
      document.removeEventListener("blur", onBlur, true);
    };
  }, []);

  const isEditing = editingRef.current !== null;
  const editingKey = isEditing ? (() => {
    const element = editingRef.current!;
    const entry = findEntry(element, entriesRef.current);
    return entry?.id || `inline.${normalizeText(elementText(element)).slice(0, 40)}`;
  })() : null;

  return (
    <div className="broadcast-markers" aria-label="تعديل النصوص">
      {isEditing ? (
        <div
          className="broadcast-edit-toolbar"
          key={editingKey}
          onMouseDown={(e) => e.preventDefault()}
        >
          <button className="broadcast-toolbar-save" type="button" onClick={saveEdit}>
            حفظ
          </button>
          <button className="broadcast-toolbar-cancel" type="button" onClick={cancelEdit}>
            إلغاء
          </button>
          <span className="broadcast-toolbar-hint">Ctrl+Enter ↵</span>
        </div>
      ) : null}
    </div>
  );
}
