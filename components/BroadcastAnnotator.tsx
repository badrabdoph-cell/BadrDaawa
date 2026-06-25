"use client";

import { Edit3 } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import type { ContentTextEntry } from "@/lib/content-text-registry";

type RegistryEntry = Pick<ContentTextEntry, "id" | "title" | "text" | "href" | "sourceLabel" | "editable">;

type Marker = {
  key: string;
  label: string;
  value: string;
  sourceLabel?: string;
  top: number;
  left: number;
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
  const [marker, setMarker] = useState<Marker | null>(null);
  const [entries, setEntries] = useState<RegistryEntry[]>([]);
  const [hoveredElement, setHoveredElement] = useState<HTMLElement | null>(null);
  const [overlayStyle, setOverlayStyle] = useState<React.CSSProperties | null>(null);
  const entriesRef = useRef<RegistryEntry[]>([]);
  const fetchedRef = useRef(false);

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
          fetchedRef.current = true;
          setEntries((data?.fields || []).filter((e) => e.editable && e.text.trim()));
        })
        .catch(() => {
          if (alive) fetchedRef.current = true;
        });
    }, 500);

    return () => {
      alive = false;
      window.removeEventListener("message", onParentMessage);
    };
  }, []);

  const selectFromTarget = useCallback(
    (target: EventTarget | null) => {
      let element = target instanceof HTMLElement ? target : null;
      while (element && element !== document.body) {
        if (element.matches(ignoredSelector)) { element = null; break; }
        if (element.closest(".broadcast-markers")) { element = null; break; }
        const text = elementText(element);
        const normalized = normalizeText(text);
        if (normalized.length >= 2 && normalized.length <= 500) break;
        element = element.parentElement;
      }

      if (!element) {
        setHoveredElement(null);
        setOverlayStyle(null);
        setMarker(null);
        return;
      }

      const entry = findEntry(element, entriesRef.current);
      const rect = element.getBoundingClientRect();
      if (!rect.width || !rect.height) {
        setHoveredElement(null);
        setOverlayStyle(null);
        setMarker(null);
        return;
      }

      setHoveredElement(element);
      setOverlayStyle({
        position: "fixed" as const,
        top: rect.top,
        left: rect.left,
        width: rect.width,
        height: rect.height,
        boxShadow: "inset 0 0 0 2px rgba(243, 207, 115, 0.6)",
        borderRadius: "4px",
        pointerEvents: "none" as const,
        zIndex: 9998,
        transition: "box-shadow 0.15s ease",
      });

      const text = elementText(element);
      setMarker({
        key: entry?.id || `inline.${normalizeText(text).slice(0, 40)}`,
        label: entry?.title || "تعديل النص",
        value: text,
        sourceLabel: entry?.sourceLabel,
        top: Math.max(8, rect.top),
        left: Math.max(4, rect.right - 38),
      });
    },
    [],
  );

  useEffect(() => {
    document.body.classList.add("broadcast-edit-mode");

    const onMove = (event: MouseEvent) => selectFromTarget(event.target);
    const onFocus = (event: FocusEvent) => selectFromTarget(event.target);

    const refresh = () => {
      if (!marker?.key) return;
      const explicit = document.querySelector<HTMLElement>(
        `[data-broadcast-id="${CSS.escape(marker.key)}"], [data-broadcast-key="${CSS.escape(marker.key)}"]`,
      );
      if (explicit) selectFromTarget(explicit);
    };

    const onClick = (event: MouseEvent) => {
      const target = event.target instanceof Element ? event.target : null;
      const link = target?.closest("a[href]") as HTMLAnchorElement | null;
      if (!link || link.target || event.defaultPrevented || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return;

      const url = new URL(link.href, window.location.origin);
      if (url.origin !== window.location.origin || url.pathname.startsWith("/admin")) return;
      url.searchParams.set("broadcast", "1");
      if (url.href !== link.href) {
        event.preventDefault();
        window.location.href = url.toString();
        window.dispatchEvent(new CustomEvent("broadcast-mode-location-change"));
      }
    };

    document.addEventListener("mouseover", onMove);
    document.addEventListener("focusin", onFocus);
    document.addEventListener("click", onClick, true);
    window.addEventListener("resize", refresh);
    window.addEventListener("scroll", refresh, true);

    return () => {
      document.body.classList.remove("broadcast-edit-mode");
      document.removeEventListener("mouseover", onMove);
      document.removeEventListener("focusin", onFocus);
      document.removeEventListener("click", onClick, true);
      window.removeEventListener("resize", refresh);
      window.removeEventListener("scroll", refresh, true);
    };
  }, [selectFromTarget, marker?.key]);

  function handlePencilClick() {
    if (!marker) return;
    window.parent.postMessage(
      { source: "badr-broadcast", type: "edit", marker },
      window.location.origin,
    );
  }

  return (
    <div className="broadcast-markers" aria-label="أزرار تعديل شاشة بث الموقع">
      {overlayStyle ? <div style={overlayStyle} className="broadcast-hover-overlay" /> : null}
      {marker ? (
        <button
          className="broadcast-marker-button"
          key={marker.key}
          style={{ top: marker.top, left: marker.left }}
          type="button"
          title={marker.label}
          onClick={handlePencilClick}
        >
          <Edit3 size={14} />
          <span className="broadcast-marker-label">{marker.label}</span>
        </button>
      ) : null}
    </div>
  );
}
