"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, LocateFixed, MapPin, X } from "lucide-react";

interface LMap {
  remove: () => void;
  getCenter: () => { lat: number; lng: number };
  setView: (center: [number, number], zoom: number) => void;
}
interface LMarker {
  setLatLng: (latlng: [number, number]) => void;
  addTo: (map: LMap) => LMarker;
}
interface LTileLayer {
  addTo: (map: LMap) => void;
}
interface LMapModule {
  map: (element: HTMLElement, options: Record<string, unknown>) => LMap;
  marker: (center: [number, number], options: Record<string, unknown>) => LMarker;
  tileLayer: (url: string, options: Record<string, unknown>) => LTileLayer;
}

const LEAFLET_VERSION = "1.9.4";
const CSS_URL = `https://unpkg.com/leaflet@${LEAFLET_VERSION}/dist/leaflet.css`;
const JS_URL = `https://unpkg.com/leaflet@${LEAFLET_VERSION}/dist/leaflet.js`;
const TILE_URL = "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";
const TILE_ATTRIBUTION = "&copy; <a href=\"https://openstreetmap.org/copyright\">OpenStreetMap</a>";
const DEFAULT_CENTER: [number, number] = [30.0444, 31.2357];
const DEFAULT_ZOOM = 13;

type LocationResult = {
  lat: number;
  lng: number;
  address: string;
};

function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = src;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error(`Failed to load: ${src}`));
    document.head.appendChild(script);
  });
}

function loadStylesheet(href: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = href;
    link.onload = () => resolve();
    link.onerror = () => reject(new Error(`Failed to load: ${href}`));
    document.head.appendChild(link);
  });
}

async function reverseGeocode(lat: number, lng: number): Promise<string> {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&addressdetails=1&accept-language=ar`,
      { headers: { "User-Agent": "BadrDaawa/1.0" } },
    );
    if (!response.ok) return `${lat}, ${lng}`;
    const data = await response.json();
    return data.display_name || `${lat}, ${lng}`;
  } catch {
    return `${lat}, ${lng}`;
  }
}

export function LocationPickerModal({
  open,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  onConfirm: (result: LocationResult) => void;
  onCancel: () => void;
}) {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<LMap | null>(null);
  const markerRef = useRef<LMarker | null>(null);
  const [leafletReady, setLeafletReady] = useState(false);
  const [locating, setLocating] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [loadError, setLoadError] = useState(false);

  const mountedRef = useRef(false);

  useEffect(() => {
    if (!open) return;
    mountedRef.current = true;
    let cancelled = false;

    async function init() {
      try {
        const existingLink = document.querySelector<HTMLLinkElement>(`link[href="${CSS_URL}"]`);
        if (!existingLink) await loadStylesheet(CSS_URL);

        const existingScript = document.querySelector<HTMLScriptElement>(`script[src="${JS_URL}"]`);
        if (!existingScript) await loadScript(JS_URL);

        if (cancelled) return;
        setLeafletReady(true);
      } catch {
        if (!cancelled) setLoadError(true);
      }
    }

    init();
    return () => {
      cancelled = true;
      mountedRef.current = false;
    };
  }, [open]);

  useEffect(() => {
    if (!leafletReady || !open || !mapContainerRef.current) return;
    if (mapInstanceRef.current) return;

    const L = (window as unknown as Record<string, unknown>).L as LMapModule | undefined;
    if (!L?.map) return;

    const map = L.map(mapContainerRef.current, {
      center: DEFAULT_CENTER,
      zoom: DEFAULT_ZOOM,
      zoomControl: true,
      attributionControl: true,
    });

    L.tileLayer(TILE_URL, { attribution: TILE_ATTRIBUTION, maxZoom: 19 }).addTo(map);

    const marker = L.marker(DEFAULT_CENTER, { draggable: false }).addTo(map);
    markerRef.current = marker;

    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
      markerRef.current = null;
    };
  }, [leafletReady, open]);

  useEffect(() => {
    if (!open) {
      mapInstanceRef.current?.remove();
      mapInstanceRef.current = null;
      markerRef.current = null;
      setLeafletReady(false);
      setLoadError(false);
      setLocating(false);
      setConfirming(false);
      mountedRef.current = false;
    }
  }, [open]);

  function handleLocate() {
    if (!("geolocation" in navigator) || !mapInstanceRef.current) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const map = mapInstanceRef.current;
        if (!map) { setLocating(false); return; }
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        map.setView([lat, lng], DEFAULT_ZOOM);
        markerRef.current?.setLatLng([lat, lng]);
        setLocating(false);
      },
      () => setLocating(false),
      { enableHighAccuracy: true, timeout: 9000, maximumAge: 90000 },
    );
  }

  async function handleConfirm() {
    const map = mapInstanceRef.current;
    if (!map) return;
    setConfirming(true);
    try {
      const center = map.getCenter();
      const lat = Number(center.lat.toFixed(6));
      const lng = Number(center.lng.toFixed(6));
      markerRef.current?.setLatLng([lat, lng]);
      const address = await reverseGeocode(lat, lng);
      if (mountedRef.current) {
        onConfirm({ lat, lng, address });
      }
    } finally {
      if (mountedRef.current) setConfirming(false);
    }
  }

  function handleCancel() {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
      markerRef.current = null;
    }
    setLeafletReady(false);
    setLoadError(false);
    onCancel();
  }

  if (!open) return null;

  return (
    <div className="location-picker-overlay" role="dialog" aria-modal="true" aria-label="اختيار الموقع من الخريطة">
      <div className="location-picker-container">
        <div className="location-picker-header">
          <h2>اختيار الموقع من الخريطة</h2>
          <button className="location-picker-close" type="button" onClick={handleCancel} aria-label="إلغاء">
            <X size={20} />
          </button>
        </div>

        <div className="location-picker-body">
          {loadError ? (
            <div className="location-picker-error">
              <p>تعذر تحميل الخريطة. يرجى التحقق من اتصال الإنترنت أو لصق الرابط يدوياً.</p>
              <button className="btn btn-soft" type="button" onClick={handleCancel}>إغلاق</button>
            </div>
          ) : !leafletReady ? (
            <div className="location-picker-loading">
              <Loader2 size={24} className="animate-float" />
              <span>جار تحميل الخريطة...</span>
            </div>
          ) : (
            <>
              <div className="location-picker-map-wrapper">
                <div ref={mapContainerRef} className="location-picker-map" />
                <div className="location-picker-pin" aria-hidden="true">
                  <MapPin size={32} />
                </div>
              </div>
              <p className="location-picker-hint">حرّك الخريطة لتحديد المكان، الدبوس ثابت في المنتصف</p>
            </>
          )}
        </div>

        <div className="location-picker-actions">
          <button
            className="btn btn-glass"
            type="button"
            onClick={handleLocate}
            disabled={locating || !leafletReady}
          >
            <LocateFixed size={17} />
            {locating ? "جلب الموقع..." : "استخدام موقعي الحالي"}
          </button>
          <div className="location-picker-actions-right">
            <button
              className="btn btn-gold btn-glow"
              type="button"
              onClick={handleConfirm}
              disabled={confirming || !leafletReady}
            >
              {confirming ? (
                <><Loader2 size={17} className="animate-float" /> جاري التأكيد...</>
              ) : (
                "تأكيد الموقع"
              )}
            </button>
            <button className="btn btn-soft" type="button" onClick={handleCancel}>
              إلغاء
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
