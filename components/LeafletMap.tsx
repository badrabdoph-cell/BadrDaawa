"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { Coordinates } from "@/lib/map-url";

const VENUE_SVG = `<svg width="44" height="44" viewBox="0 0 44 44" fill="none"><defs><linearGradient id="vg" x1="14" y1="2" x2="30" y2="42"><stop stop-color="#EFD275"/><stop offset=".5" stop-color="#D4AF37"/><stop offset="1" stop-color="#9F7424"/></linearGradient><filter id="vs"><feDropShadow dx="0" dy="4" stdDeviation="6" flood-opacity=".35"/></filter></defs><path d="M22 44c0 0-16-14-16-27a16 16 0 1 1 32 0c0 13-16 27-16 27Z" fill="url(#vg)" filter="url(#vs)"/><circle cx="22" cy="17" r="7" fill="#fff" opacity=".95"/><circle cx="22" cy="17" r="4" fill="#9F7424"/></svg>`;

const USER_SVG = `<svg width="32" height="32" viewBox="0 0 32 32" fill="none"><defs><filter id="us"><feDropShadow dx="0" dy="2" stdDeviation="4" flood-opacity=".3"/></filter></defs><circle cx="16" cy="16" r="14" fill="#2563eb" stroke="#fff" stroke-width="3" filter="url(#us)"/></svg>`;

export default function LeafletMap({
  venueCoords,
  userCoords,
}: {
  venueCoords: Coordinates | null;
  userCoords: Coordinates | null;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<L.LayerGroup | null>(null);
  const routeRef = useRef<L.LayerGroup | null>(null);
  const routeQueryRef = useRef<string>("");

  useEffect(() => {
    if (mapRef.current || !containerRef.current) return;

    const el = containerRef.current;
    const map = L.map(el, {
      zoomControl: false,
      attributionControl: false,
    });

    L.tileLayer("https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png", {
      maxZoom: 19,
    }).addTo(map);

    map.setView([30.0444, 31.2357], 5);

    mapRef.current = map;
    markersRef.current = L.layerGroup().addTo(map);
    routeRef.current = L.layerGroup().addTo(map);

    requestAnimationFrame(() => {
      map.invalidateSize();
    });

    const observer = new ResizeObserver(() => map.invalidateSize());
    observer.observe(el);

    return () => {
      observer.disconnect();
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    map.invalidateSize({ debounceMoveend: true });

    markersRef.current?.clearLayers();
    routeRef.current?.clearLayers();

    const pts: [number, number][] = [];

    if (venueCoords) {
      const p: [number, number] = [venueCoords.lat, venueCoords.lng];
      L.marker(p, {
        icon: L.divIcon({ className: "", html: VENUE_SVG, iconSize: [44, 44], iconAnchor: [22, 44] }),
      }).addTo(markersRef.current!);
      pts.push(p);
    }

    if (userCoords) {
      const p: [number, number] = [userCoords.lat, userCoords.lng];
      L.marker(p, {
        icon: L.divIcon({ className: "", html: USER_SVG, iconSize: [32, 32], iconAnchor: [16, 16] }),
      }).addTo(markersRef.current!);
      pts.push(p);
    }

    if (pts.length === 1) {
      map.setView(pts[0], 17);
    } else if (pts.length > 1) {
      map.fitBounds(L.latLngBounds(pts), { padding: [80, 80], maxZoom: 17 });
    }

    if (venueCoords && userCoords) {
      const qk = `${venueCoords.lat.toFixed(5)},${venueCoords.lng.toFixed(5)}_${userCoords.lat.toFixed(5)},${userCoords.lng.toFixed(5)}`;
      routeQueryRef.current = qk;

      L.polyline(
        [[venueCoords.lat, venueCoords.lng], [userCoords.lat, userCoords.lng]],
        { color: "#b8873b", weight: 3, dashArray: "8 8", opacity: 0.7 },
      ).addTo(routeRef.current!);

      fetch(
        `https://router.project-osrm.org/route/v1/driving/${venueCoords.lng},${venueCoords.lat};${userCoords.lng},${userCoords.lat}?geometries=geojson&overview=full`
      )
        .then((r) => r.json())
        .then((data) => {
          if (routeQueryRef.current !== qk) return;
          if (data?.routes?.[0]?.geometry) {
            const coords: [number, number][] = data.routes[0].geometry.coordinates.map(
              (c: number[]) => [c[1], c[0]],
            );
            routeRef.current?.clearLayers();
            L.polyline(coords, { color: "#b8873b", weight: 4, opacity: 0.85 }).addTo(
              routeRef.current!,
            );
          }
        })
        .catch(() => {});
    }
  }, [venueCoords, userCoords]);

  return <div ref={containerRef} className="leaflet-map-container" />;
}
