"use client";

import { useEffect, useState } from "react";
import { BroadcastAnnotator } from "@/components/BroadcastAnnotator";

export function BroadcastModeGate() {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    const update = () => {
      const url = new URL(window.location.href);
      setEnabled(url.searchParams.get("broadcast") === "1" && !url.pathname.startsWith("/admin"));
    };

    update();
    window.addEventListener("popstate", update);
    window.addEventListener("broadcast-mode-location-change", update);
    return () => {
      window.removeEventListener("popstate", update);
      window.removeEventListener("broadcast-mode-location-change", update);
    };
  }, []);

  return enabled ? <BroadcastAnnotator /> : null;
}
