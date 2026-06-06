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

function readMarkers() {
  return Array.from(document.querySelectorAll<HTMLElement>("[data-broadcast-key]"))
    .map((element) => {
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
    })
    .filter((marker): marker is Marker => Boolean(marker?.key));
}

export function BroadcastAnnotator() {
  const [markers, setMarkers] = useState<Marker[]>([]);

  useEffect(() => {
    document.body.classList.add("broadcast-edit-mode");
    const update = () => setMarkers(readMarkers());
    update();

    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    const timer = window.setInterval(update, 900);

    return () => {
      document.body.classList.remove("broadcast-edit-mode");
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
      window.clearInterval(timer);
    };
  }, []);

  return (
    <div className="broadcast-markers" aria-label="أزرار تعديل شاشة بث الموقع">
      {markers.map((marker) => (
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
      ))}
    </div>
  );
}
