"use client";

import { useEffect, useRef, useState } from "react";
import { Crosshair, Loader2, MapPin, Navigation, X } from "lucide-react";

const FALLBACK_LAT = 30.0444;
const FALLBACK_LNG = 31.2357;
const GEO_OK_ZOOM = 16;
const FLY_ZOOM = 17;
const GEOCODE_DEBOUNCE_MS = 800;

type GeocodeResult = {
  lat: number;
  lng: number;
  placeName: string;
  city: string;
  governorate: string;
  googleMapsUrl: string;
};

type GeoStatus = "idle" | "locating" | "ready" | "error";
type LoadStatus = "idle" | "loading" | "ready" | "error";

/* ───── Leaflet loader ───── */
function loadLeaflet(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (typeof (window as any).L !== "undefined") {
      resolve();
      return;
    }

    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
    link.onerror = () => reject(new Error("leaflet-css-failed"));
    document.head.appendChild(link);

    const s = document.createElement("script");
    s.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
    s.async = true;
    s.onload = () => {
      const check = (n = 0) => {
        if (n > 20) { reject(new Error("leaflet-timeout")); return; }
        if (typeof (window as any).L !== "undefined") resolve();
        else setTimeout(() => check(n + 1), 50);
      };
      check();
    };
    s.onerror = () => reject(new Error("leaflet-js-failed"));
    document.head.appendChild(s);
  });
}

/* ───── Nominatim reverse geocode ───── */
type OSMAddr = {
  road?: string; house_number?: string; city?: string; town?: string;
  village?: string; county?: string; state?: string; country?: string;
  suburb?: string; neighbourhood?: string; amenity?: string; shop?: string;
  tourism?: string; leisure?: string; office?: string; man_made?: string;
  craft?: string; building?: string;
};

type NominatimResult = {
  lat: string; lon: string; display_name: string; name?: string;
  category?: string; type?: string; address: OSMAddr;
};

let _lastNominatim = 0;

async function reverseGeocode(lat: number, lng: number): Promise<GeocodeResult> {
  const now = Date.now();
  const wait = 1000 - (now - _lastNominatim);
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  _lastNominatim = Date.now();

  const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=jsonv2&addressdetails=1&accept-language=ar`;
  const res = await fetch(url, { headers: { "User-Agent": "BadrDaawa/1.0" } });
  if (!res.ok) throw new Error(`nominatim-${res.status}`);

  const d: NominatimResult = await res.json();
  const a = d.address || ({} as OSMAddr);

  const isPOI = ["amenity","shop","tourism","leisure","office","man_made","craft"].includes(d.category || "");
  let placeName = "";
  if (isPOI && d.name) placeName = d.name;
  if (!placeName && a.amenity) placeName = a.amenity;
  if (!placeName && a.shop) placeName = a.shop;
  if (!placeName) {
    const parts = [a.road, a.house_number].filter(Boolean);
    if (parts.length) placeName = parts.join(" ");
  }
  if (!placeName) placeName = d.display_name?.split(",")[0]?.trim() || "";
  if (!placeName) placeName = `${lat.toFixed(6)}, ${lng.toFixed(6)}`;

  const city = a.city || a.town || a.village || a.county || a.suburb || "";
  const governorate = a.state || "";

  return {
    lat: Number(lat.toFixed(6)),
    lng: Number(lng.toFixed(6)),
    placeName,
    city,
    governorate,
    googleMapsUrl: `https://www.openstreetmap.org/?mlat=${lat.toFixed(6)}&mlon=${lng.toFixed(6)}`,
  };
}

/* ───── geolocation ───── */
function getCurrentPosition(): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    if (!("geolocation" in navigator)) { reject(new Error("no-geolocation")); return; }
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: true, timeout: 9000, maximumAge: 90000,
    });
  });
}

export function LocationPickerModal({
  open,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  onConfirm: (result: GeocodeResult) => void;
  onCancel: () => void;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<any>(null);
  const geoTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef = useRef(false);
  const initStartedRef = useRef(false);
  const geoAttemptedRef = useRef(false);
  const pendingCenterRef = useRef<[number, number] | null>(null);

  const [loadStatus, setLoadStatus] = useState<LoadStatus>("idle");
  const [geoStatus, setGeoStatus] = useState<GeoStatus>("idle");
  const [location, setLocation] = useState<GeocodeResult | null>(null);
  const [locating, setLocating] = useState(false);

  /* ========== reset on close ========== */
  useEffect(() => {
    if (!open) {
      setLoadStatus("idle");
      setGeoStatus("idle");
      setLocation(null);
      setLocating(false);
      initStartedRef.current = false;
      geoAttemptedRef.current = false;
      pendingCenterRef.current = null;
      if (geoTimeoutRef.current) {
        clearTimeout(geoTimeoutRef.current);
        geoTimeoutRef.current = null;
      }
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    }
  }, [open]);

  /* ========== load Leaflet ========== */
  useEffect(() => {
    if (!open) return;
    mountedRef.current = true;
    let cancelled = false;

    (async () => {
      setLoadStatus("loading");
      try {
        await loadLeaflet();
        if (!cancelled) setLoadStatus("ready");
      } catch {
        if (!cancelled) setLoadStatus("error");
      }
    })();

    return () => { cancelled = true; mountedRef.current = false; };
  }, [open]);

  /* ========== geolocation on mount ========== */
  useEffect(() => {
    if (!open || geoAttemptedRef.current) return;
    geoAttemptedRef.current = true;

    getCurrentPosition()
      .then((pos) => {
        if (!mountedRef.current) return;
        const { latitude: lat, longitude: lng } = pos.coords;
        pendingCenterRef.current = [lat, lng];
        const map = mapRef.current;
        if (map) map.setView([lat, lng], GEO_OK_ZOOM);
      })
      .catch(() => {});
  }, [open]);

  /* ========== init map ========== */
  useEffect(() => {
    if (loadStatus !== "ready" || !open || !containerRef.current || initStartedRef.current) return;
    initStartedRef.current = true;

    const L = (window as any).L;
    if (!L) return;

    const startCenter = pendingCenterRef.current || [FALLBACK_LAT, FALLBACK_LNG];
    pendingCenterRef.current = null;

    const map = L.map(containerRef.current, {
      center: startCenter,
      zoom: GEO_OK_ZOOM,
      zoomControl: true,
      attributionControl: true,
    });

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(map);

    mapRef.current = map;

    function startGeocode() {
      if (geoTimeoutRef.current) clearTimeout(geoTimeoutRef.current);
      const c = map.getCenter();
      geoTimeoutRef.current = setTimeout(async () => {
        if (!mountedRef.current) return;
        setGeoStatus("locating");
        try {
          const info = await reverseGeocode(c.lat, c.lng);
          if (!mountedRef.current) return;
          setLocation(info);
          setGeoStatus("ready");
        } catch {
          if (mountedRef.current) setGeoStatus("error");
        }
      }, GEOCODE_DEBOUNCE_MS);
    }

    map.on("moveend", startGeocode);
    map.on("zoomend", startGeocode);

    /* initial geocode */
    setGeoStatus("locating");
    reverseGeocode(startCenter[0], startCenter[1])
      .then((info) => {
        if (!mountedRef.current) return;
        setLocation(info);
        setGeoStatus("ready");
      })
      .catch(() => {
        if (mountedRef.current) setGeoStatus("error");
      });
  }, [loadStatus, open]);

  /* ========== use my location ========== */
  function handleLocate() {
    if (!("geolocation" in navigator)) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        if (!mountedRef.current) return;
        const { latitude: lat, longitude: lng } = pos.coords;
        const map = mapRef.current;
        if (map) map.setView([lat, lng], FLY_ZOOM);
        setLocating(false);
      },
      () => { if (mountedRef.current) setLocating(false); },
      { enableHighAccuracy: true, timeout: 9000, maximumAge: 90000 },
    );
  }

  /* ========== confirm / cancel ========== */
  function handleConfirm() {
    if (!location) return;
    onConfirm(location);
  }

  function handleCancel() {
    if (geoTimeoutRef.current) clearTimeout(geoTimeoutRef.current);
    if (mapRef.current) {
      mapRef.current.remove();
      mapRef.current = null;
    }
    setLoadStatus("idle");
    setGeoStatus("idle");
    setLocation(null);
    setLocating(false);
    initStartedRef.current = false;
    geoAttemptedRef.current = false;
    pendingCenterRef.current = null;
    onCancel();
  }

  if (!open) return null;

  return (
    <div className="location-picker-overlay" role="dialog" aria-modal="true" aria-label="اختيار الموقع من الخريطة">
      <div className="location-picker-container">
        {/* header */}
        <div className="location-picker-header">
          <h2>اختيار الموقع من الخريطة</h2>
          <button className="location-picker-close" type="button" onClick={handleCancel} aria-label="إلغاء">
            <X size={20} />
          </button>
        </div>

        {/* body */}
        <div className="location-picker-body">
          {loadStatus === "error" ? (
            <div className="location-picker-state">
              <p className="location-picker-state-icon">⚠️</p>
              <p>تعذر تحميل الخريطة. تأكد من اتصالك بالإنترنت أو الصق الرابط يدوياً.</p>
              <button className="btn btn-soft" type="button" onClick={handleCancel}>إغلاق</button>
            </div>
          ) : loadStatus !== "ready" ? (
            <div className="location-picker-state">
              <Loader2 size={28} className="animate-float" />
              <p>جار تحميل الخريطة...</p>
            </div>
          ) : (
            <>
              {/* fixed center pin */}
              <div className="location-picker-map-wrapper">
                <div ref={containerRef} className="location-picker-map" />
                <div className="location-picker-pin" aria-hidden="true">
                  <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
                    <path d="M20 4C11.72 4 5 10.72 5 19C5 30.25 20 40 20 40C20 40 35 30.25 35 19C35 10.72 28.28 4 20 4Z" fill="#EA4335" />
                    <path d="M20 4C11.72 4 5 10.72 5 19C5 30.25 20 40 20 40C20 40 35 30.25 35 19C35 10.72 28.28 4 20 4Z" fill="url(#pinShadow)" />
                    <circle cx="20" cy="18" r="7" fill="white" />
                    <defs>
                      <radialGradient id="pinShadow" cx="0.5" cy="0.3" r="0.6">
                        <stop offset="0" stopColor="black" stopOpacity="0.15" />
                        <stop offset="1" stopColor="black" stopOpacity="0" />
                      </radialGradient>
                    </defs>
                  </svg>
                </div>
              </div>

              {/* location details panel */}
              <div className="location-picker-details">
                {geoStatus === "error" ? (
                  <div className="location-picker-details-row location-picker-details-error">
                    <Navigation size={16} />
                    <span>تعذر تحديد العنوان. حرّك الخريطة وحاول مجدداً.</span>
                  </div>
                ) : geoStatus === "locating" ? (
                  <div className="location-picker-details-row">
                    <Loader2 size={16} className="animate-float" />
                    <span>جاري تحديد الموقع...</span>
                  </div>
                ) : location ? (
                  <>
                    <div className="location-picker-details-row">
                      <MapPin size={16} />
                      <span className="location-picker-details-place">{location.placeName}</span>
                    </div>
                    {(location.city || location.governorate) ? (
                      <div className="location-picker-details-row location-picker-details-secondary">
                        <Navigation size={14} />
                        <span>{[location.city, location.governorate].filter(Boolean).join("، ")}</span>
                      </div>
                    ) : null}
                    <div className="location-picker-details-coords">
                      {location.lat}، {location.lng}
                    </div>
                  </>
                ) : null}
              </div>
            </>
          )}
        </div>

        {/* actions */}
        {loadStatus === "ready" ? (
          <div className="location-picker-actions">
            <button className="btn btn-glass" type="button" onClick={handleLocate} disabled={locating}>
              <Crosshair size={17} />
              {locating ? "جلب الموقع..." : "استخدام موقعي الحالي"}
            </button>
            <div className="location-picker-actions-right">
              <button className="btn btn-gold btn-glow" type="button" onClick={handleConfirm}
                disabled={geoStatus !== "ready" || !location}>
                تأكيد الموقع
              </button>
              <button className="btn btn-soft" type="button" onClick={handleCancel}>إلغاء</button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
