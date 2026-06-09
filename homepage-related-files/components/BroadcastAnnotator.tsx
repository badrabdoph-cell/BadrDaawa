"use client";

import { Pencil } from "lucide-react";
import { useEffect, useState } from "react";

type Marker = {
  key: string;
  label: string;
  kind: string;
  value: string;
  top: number;
  left: number;
};

function readMarker(element: HTMLElement): Marker | null {
  const rect = element.getBoundingClientRect();
  if (!rect.width || !rect.height) return null;
  return {
    key: element.dataset.broadcastKey || "",
    label: element.dataset.broadcastLabel || "تعديل",
    kind: element.dataset.broadcastKind || "text",
    value: element.dataset.broadcastValue || element.textContent?.trim() || "",
    top: Math.max(10, rect.top + 8),
    left: Math.min(window.innerWidth - 52, Math.max(10, rect.left + rect.width - 42)),
  };
}

export function BroadcastAnnotator() {
  const [marker, setMarker] = useState<Marker | null>(null);

  useEffect(() => {
    document.body.classList.add("broadcast-edit-mode");

    const selectFromTarget = (target: EventTarget | null) => {
      const element = target instanceof HTMLElement ? target.closest<HTMLElement>("[data-broadcast-key]") : null;
      if (element) setMarker(readMarker(element));
    };

    const refresh = () => {
      const key = marker?.key;
      if (!key) return;
      const element = document.querySelector<HTMLElement>(`[data-broadcast-key="${CSS.escape(key)}"]`);
      if (element) setMarker(readMarker(element));
    };

    const onMove = (event: MouseEvent) => selectFromTarget(event.target);
    const onFocus = (event: FocusEvent) => selectFromTarget(event.target);

    document.addEventListener("mouseover", onMove);
    document.addEventListener("focusin", onFocus);

    window.addEventListener("resize", refresh);
    window.addEventListener("scroll", refresh, true);

    return () => {
      document.body.classList.remove("broadcast-edit-mode");
      document.removeEventListener("mouseover", onMove);
      document.removeEventListener("focusin", onFocus);
      window.removeEventListener("resize", refresh);
      window.removeEventListener("scroll", refresh, true);
    };
  }, [marker?.key]);

  return (
    <div className="broadcast-markers" aria-label="أزرار تعديل شاشة بث الموقع">
      {marker ? (
        <button
          className="broadcast-marker-button"
          key={marker.key}
          style={{ top: marker.top, left: marker.left }}
          type="button"
          title={marker.label}
          onClick={() => {
            window.parent.postMessage({ source: "badr-broadcast", type: "edit", marker }, window.location.origin);
          }}
        >
          <Pencil size={15} />
        </button>
      ) : null}
    </div>
  );
}
