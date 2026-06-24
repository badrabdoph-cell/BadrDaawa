"use client";

import { Edit3, Pencil } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { ContentTextEntry } from "@/lib/content-text-registry";

type Marker = {
  key: string;
  label: string;
  kind: string;
  value: string;
  sourceLabel?: string;
  href?: string;
  top: number;
  left: number;
  right: number;
  width: number;
};

type RegistryEntry = Pick<ContentTextEntry, "id" | "title" | "text" | "href" | "sourceLabel" | "editable">;

const ignoredSelector = [
  ".broadcast-markers",
  "script",
  "style",
  "noscript",
  "input",
  "textarea",
  "select",
  "option",
  "[contenteditable='true']",
  "[data-broadcast-ignore]",
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

function directText(element: HTMLElement) {
  return Array.from(element.childNodes)
    .filter((node) => node.nodeType === Node.TEXT_NODE)
    .map((node) => node.textContent || "")
    .join(" ")
    .trim();
}

function elementText(element: HTMLElement) {
  return (directText(element) || element.innerText || element.textContent || "").replace(/\s+/g, " ").trim();
}

function findReadableElement(target: EventTarget | null) {
  let element = target instanceof HTMLElement ? target : null;
  while (element && element !== document.body) {
    if (element.matches(ignoredSelector)) return null;
    if (element.closest(".broadcast-markers")) return null;
    const explicitId = element.dataset.broadcastId || element.dataset.broadcastKey;
    const text = elementText(element);
    const normalized = normalizeText(text);
    if (explicitId || (normalized.length >= 2 && normalized.length <= 450)) return element;
    element = element.parentElement;
  }
  return null;
}

function findEntry(element: HTMLElement, entries: RegistryEntry[]) {
  const explicitId = element.dataset.broadcastId || element.dataset.broadcastKey;
  if (explicitId) return entries.find((entry) => entry.id === explicitId);

  const text = normalizeText(elementText(element));
  if (!text) return null;

  const exact = entries.find((entry) => normalizeText(entry.text) === text);
  if (exact) return exact;

  if (text.length < 12) return null;

  return (
    entries
      .filter((entry) => {
        const entryText = normalizeText(entry.text);
        return entryText.length >= text.length && entryText.includes(text);
      })
      .sort((a, b) => normalizeText(a.text).length - normalizeText(b.text).length)[0] || null
  );
}

function readMarker(element: HTMLElement, entry: RegistryEntry): Marker | null {
  const rect = element.getBoundingClientRect();
  if (!rect.width || !rect.height) return null;
  return {
    key: entry.id,
    label: entry.title || "تعديل النص",
    kind: "text",
    value: entry.text,
    sourceLabel: entry.sourceLabel,
    href: entry.href,
    top: Math.max(8, rect.top),
    left: Math.max(4, rect.right - 38),
    right: rect.right,
    width: rect.width,
  };
}

export function BroadcastAnnotator() {
  const [marker, setMarker] = useState<Marker | null>(null);
  const [entries, setEntries] = useState<RegistryEntry[]>([]);
  const [hoveredElement, setHoveredElement] = useState<HTMLElement | null>(null);
  const [overlayStyle, setOverlayStyle] = useState<React.CSSProperties | null>(null);
  const prevMarkerRef = useRef<string | null>(null);

  useEffect(() => {
    let alive = true;
    fetch("/api/admin/broadcast", { credentials: "same-origin", cache: "no-store" })
      .then((response) => (response.ok ? response.json() : null))
      .then((data: { fields?: RegistryEntry[] } | null) => {
        if (!alive) return;
        setEntries((data?.fields || []).filter((entry) => entry.editable && entry.text.trim()));
      })
      .catch(() => {
        if (alive) setEntries([]);
      });

    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    document.body.classList.add("broadcast-edit-mode");

    const selectFromTarget = (target: EventTarget | null) => {
      const element = findReadableElement(target);
      if (!element) {
        setHoveredElement(null);
        setOverlayStyle(null);
        setMarker(null);
        return;
      }
      const entry = findEntry(element, entries);
      if (entry) {
        setHoveredElement(element);
        setMarker(readMarker(element, entry));
      } else {
        setHoveredElement(null);
        setOverlayStyle(null);
        setMarker(null);
      }
    };

    const refresh = () => {
      const key = marker?.key;
      if (!key) return;
      const explicit = document.querySelector<HTMLElement>(`[data-broadcast-id="${CSS.escape(key)}"], [data-broadcast-key="${CSS.escape(key)}"]`);
      const entry = entries.find((item) => item.id === key);
      if (explicit && entry) {
        setMarker(readMarker(explicit, entry));
        setHoveredElement(explicit);
      }
    };

    const onMove = (event: MouseEvent) => selectFromTarget(event.target);
    const onFocus = (event: FocusEvent) => selectFromTarget(event.target);
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
  }, [entries, marker?.key]);

  useEffect(() => {
    if (!hoveredElement || !marker) {
      setOverlayStyle(null);
      return;
    }
    const rect = hoveredElement.getBoundingClientRect();
    setOverlayStyle({
      position: "fixed",
      top: rect.top,
      left: rect.left,
      width: rect.width,
      height: rect.height,
      boxShadow: "inset 0 0 0 2px rgba(243, 207, 115, 0.5)",
      borderRadius: "4px",
      pointerEvents: "none",
      zIndex: 9998,
      transition: "box-shadow 0.15s ease",
    });
  }, [hoveredElement, marker?.key]);

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
          onClick={() => {
            window.parent.postMessage(
              { source: "badr-broadcast", type: "edit", marker },
              window.location.origin,
            );
          }}
        >
          <Edit3 size={14} />
          <span className="broadcast-marker-label">{marker.label}</span>
        </button>
      ) : null}
    </div>
  );
}
