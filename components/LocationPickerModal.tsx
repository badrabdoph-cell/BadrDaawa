"use client";

import { useEffect, useRef, useState } from "react";
import { Crosshair, Loader2, MapPin, Navigation, X } from "lucide-react";

const FALLBACK_CENTER = { lat: 30.0444, lng: 31.2357 };
const GEO_OK_ZOOM = 16;
const FLY_ZOOM = 17;
const GEOCODE_DEBOUNCE_MS = 500;

type GeocodeResult = {
  lat: number;
  lng: number;
  placeName: string;
  city: string;
  governorate: string;
  googleMapsUrl: string;
};

type GeoStatus = "idle" | "locating" | "ready" | "error";
type LoadStatus = "idle" | "fetching-key" | "loading-maps" | "ready" | "error";

type MapsApi = typeof google.maps;

/* ───── priority-ordered venue types for reverse geocode ───── */
const VENUE_TYPES = new Set([
  "establishment",
  "premise",
  "point_of_interest",
  "subpremise",
  "shopping_mall",
  "stadium",
  "museum",
  "university",
  "school",
  "airport",
  "bus_station",
  "train_station",
  "subway_station",
  "transit_station",
  "park",
  "restaurant",
  "lodging",
  "mosque",
  "church",
  "synagogue",
  "hospital",
  "police",
  "post_office",
  "bank",
  "supermarket",
  "department_store",
  "store",
  "car_dealer",
  "car_rental",
  "car_repair",
  "gas_station",
  "pharmacy",
  "doctor",
  "dentist",
  "beauty_salon",
  "hair_care",
  "gym",
  "spa",
  "night_club",
  "movie_theater",
  "casino",
  "bowling_alley",
  "art_gallery",
  "library",
  "book_store",
  "florist",
  "bakery",
  "food",
  "meal_delivery",
  "meal_takeaway",
  "convenience_store",
  "electronics_store",
  "hardware_store",
  "home_goods_store",
  "furniture_store",
  "shoe_store",
  "clothing_store",
  "jewelry_store",
  "pet_store",
  "bicycle_store",
  "laundry",
  "parking",
  "taxi_stand",
  "ferry_terminal",
  "light_rail_station",
  "campground",
  "natural_feature",
  "tourist_attraction",
  "amusement_park",
  "aquarium",
  "zoo",
]);

function getCurrentPosition(): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    if (!("geolocation" in navigator)) {
      reject(new Error("no-geolocation"));
      return;
    }
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: true,
      timeout: 9000,
      maximumAge: 90000,
    });
  });
}

function loadGoogleMapsScript(key: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(
      'script[src*="maps.googleapis.com/maps/api/js"]',
    );
    if (existing) {
      if (window.google?.maps) {
        resolve();
        return;
      }
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () => reject(new Error("gmaps-load-failed")));
      return;
    }
    const s = document.createElement("script");
    s.src = `https://maps.googleapis.com/maps/api/js?key=${key}&libraries=places&loading=async`;
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("gmaps-load-failed"));
    document.head.appendChild(s);
  });
}

async function fetchApiKey(): Promise<string> {
  const res = await fetch("/api/config/google-maps-key");
  if (!res.ok) return "";
  const data = await res.json();
  return typeof data.key === "string" ? data.key : "";
}

function geocodeLatLng(
  maps: MapsApi,
  lat: number,
  lng: number,
): Promise<google.maps.GeocoderResult[]> {
  const geocoder = new maps.Geocoder();
  return new Promise((resolve, reject) => {
    geocoder.geocode({ location: { lat, lng } }, (results, status) => {
      if (status === "OK" && results?.length) {
        resolve(results);
      } else {
        reject(new Error(`geocode-failed:${status}`));
      }
    });
  });
}

function extractPlaceInfo(
  results: google.maps.GeocoderResult[],
  lat: number,
  lng: number,
): GeocodeResult {
  const allComponents: google.maps.GeocoderAddressComponent[] = [];
  const resultTypes = new Set(results[0]?.types || []);

  for (const r of results) {
    if (r.address_components) {
      allComponents.push(...r.address_components);
    }
  }

  /* ── placeName: venue POI first, then route, then formatted_address ── */
  let placeName = "";
  let streetName = "";

  for (const comp of allComponents) {
    const typeSet = new Set(comp.types);
    const isVenue = [...typeSet].some((t) => VENUE_TYPES.has(t));
    if (isVenue && !placeName) {
      placeName = comp.long_name;
    }
    if (typeSet.has("route") && !streetName) {
      streetName = comp.long_name;
    }
  }

  if (!placeName) {
    placeName =
      streetName ||
      results[0]?.formatted_address ||
      `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
  }

  /* ── city: locality > sublocality > admin_level_2 > postal_town ── */
  const cityPriority = [
    "locality",
    "sublocality",
    "administrative_area_level_2",
    "postal_town",
    "neighborhood",
  ];
  let city = "";
  for (const ct of cityPriority) {
    const comp = allComponents.find((c) => c.types.includes(ct));
    if (comp) {
      city = comp.long_name;
      break;
    }
  }

  /* ── governorate: admin_level_1 ── */
  const govComp = allComponents.find((c) =>
    c.types.includes("administrative_area_level_1"),
  );
  const governorate = govComp?.long_name || "";

  return {
    lat: Number(lat.toFixed(6)),
    lng: Number(lng.toFixed(6)),
    placeName,
    city,
    governorate,
    googleMapsUrl: `https://maps.google.com/?q=${lat.toFixed(6)},${lng.toFixed(6)}`,
  };
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
  const mapRef = useRef<google.maps.Map | null>(null);
  const geoTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef = useRef(false);
  const pendingGeoRef = useRef<{ lat: number; lng: number } | null>(null);
  const geoAttemptedRef = useRef(false);
  const initCalledRef = useRef(false);

  const [loadStatus, setLoadStatus] = useState<LoadStatus>("idle");
  const [geoStatus, setGeoStatus] = useState<GeoStatus>("idle");
  const [location, setLocation] = useState<GeocodeResult | null>(null);
  const [locating, setLocating] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  /* ========== reset on close ========== */
  useEffect(() => {
    if (!open) {
      setLoadStatus("idle");
      setGeoStatus("idle");
      setLocation(null);
      setLocating(false);
      setErrorMessage("");
      initCalledRef.current = false;
      geoAttemptedRef.current = false;
      pendingGeoRef.current = null;
      if (geoTimeoutRef.current) {
        clearTimeout(geoTimeoutRef.current);
        geoTimeoutRef.current = null;
      }
      if (mapRef.current) {
        const el = (mapRef.current as unknown as { getDiv(): HTMLElement }).getDiv();
        mapRef.current = null;
      }
    }
  }, [open]);

  /* ========== load Google Maps ========== */
  useEffect(() => {
    if (!open) return;
    mountedRef.current = true;
    let cancelled = false;

    (async () => {
      setLoadStatus("fetching-key");
      const key = await fetchApiKey();
      if (cancelled) return;
      if (!key) {
        setLoadStatus("error");
        setErrorMessage("مفتاح Google Maps غير مضبوط. تواصل مع مدير الموقع.");
        return;
      }
      setLoadStatus("loading-maps");
      try {
        await loadGoogleMapsScript(key);
        if (!cancelled) setLoadStatus("ready");
      } catch {
        if (!cancelled) {
          setLoadStatus("error");
          setErrorMessage("تعذر تحميل الخريطة. تحقق من صحة مفتاح Google Maps.");
        }
      }
    })();

    return () => {
      cancelled = true;
      mountedRef.current = false;
    };
  }, [open]);

  /* ========== geolocation on mount ========== */
  useEffect(() => {
    if (!open || geoAttemptedRef.current) return;
    geoAttemptedRef.current = true;

    getCurrentPosition()
      .then((pos) => {
        if (!mountedRef.current) return;
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        pendingGeoRef.current = { lat, lng };

        console.log("[LocationPicker] Geolocation on mount:", { lat, lng });

        const map = mapRef.current;
        if (map) {
          map.setCenter({ lat, lng });
          map.setZoom(GEO_OK_ZOOM);
        }
      })
      .catch((err) => {
        if (!mountedRef.current) return;
        console.log("[LocationPicker] Geolocation on mount failed:", err.message);
      });
  }, [open]);

  /* ========== init map ========== */
  useEffect(() => {
    if (loadStatus !== "ready" || !open || !containerRef.current || mapRef.current || initCalledRef.current) return;

    const maps = window.google?.maps;
    if (!maps) return;

    initCalledRef.current = true;
    const startCenter = pendingGeoRef.current || FALLBACK_CENTER;

    const map = new maps.Map(containerRef.current, {
      center: startCenter,
      zoom: GEO_OK_ZOOM,
      mapTypeId: "hybrid",
      tilt: 45,
      gestureHandling: "greedy",
      zoomControl: true,
      mapTypeControl: false,
      fullscreenControl: false,
      streetViewControl: false,
    });

    mapRef.current = map;

    maps.event.addListener(map, "dragend", () => {
      handleMoveEnd(maps);
    });

    maps.event.addListener(map, "zoom_changed", () => {
      handleMoveEnd(maps);
    });

    doGeocode(maps, startCenter.lat, startCenter.lng);
    /* eslint-disable-next-line react-hooks/exhaustive-deps */
  }, [loadStatus, open]);

  /* ========== handle moveend ========== */
  function handleMoveEnd(maps: MapsApi) {
    if (geoTimeoutRef.current) clearTimeout(geoTimeoutRef.current);
    const map = mapRef.current;
    if (!map) return;
    const center = map.getCenter();
    const lat = center.lat();
    const lng = center.lng();
    geoTimeoutRef.current = setTimeout(() => {
      doGeocode(maps, lat, lng);
    }, GEOCODE_DEBOUNCE_MS);
  }

  /* ========== reverse geocode ========== */
  async function doGeocode(maps: MapsApi, lat: number, lng: number) {
    setGeoStatus("locating");
    try {
      const results = await geocodeLatLng(maps, lat, lng);
      if (!mountedRef.current) return;
      const info = extractPlaceInfo(results, lat, lng);
      setLocation(info);
      setGeoStatus("ready");
    } catch {
      if (mountedRef.current) {
        setGeoStatus("error");
      }
    }
  }

  /* ========== B: use my location ========== */
  function handleLocate() {
    if (!("geolocation" in navigator)) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        if (!mountedRef.current) return;
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        console.log("[LocationPicker] Use My Location success:", { lat, lng });
        const map = mapRef.current;
        if (!map) {
          setLocating(false);
          return;
        }
        map.setCenter({ lat, lng });
        map.setZoom(FLY_ZOOM);
        setLocating(false);
      },
      () => {
        if (!mountedRef.current) return;
        console.log("[LocationPicker] Use My Location denied");
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 9000, maximumAge: 90000 },
    );
  }

  /* ========== confirm ========== */
  function handleConfirm() {
    if (!location) return;
    console.log("[LocationPicker] Confirm:", location);
    onConfirm(location);
  }

  /* ========== cancel ========== */
  function handleCancel() {
    if (geoTimeoutRef.current) clearTimeout(geoTimeoutRef.current);
    if (mapRef.current) {
      mapRef.current = null;
    }
    setLoadStatus("idle");
    setGeoStatus("idle");
    setLocation(null);
    setLocating(false);
    setErrorMessage("");
    initCalledRef.current = false;
    geoAttemptedRef.current = false;
    pendingGeoRef.current = null;
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
              <p>{errorMessage || "تعذر تحميل الخريطة. تأكد من اتصالك بالإنترنت أو الصق الرابط يدوياً."}</p>
              <button className="btn btn-soft" type="button" onClick={handleCancel}>إغلاق</button>
            </div>
          ) : loadStatus !== "ready" ? (
            <div className="location-picker-state">
              <Loader2 size={28} className="animate-float" />
              <p>
                {loadStatus === "fetching-key"
                  ? "جار تجهيز الخريطة..."
                  : "جار تحميل الخريطة..."}
              </p>
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
                      <span className="location-picker-details-place">
                        {location.placeName}
                      </span>
                    </div>
                    {(location.city || location.governorate) ? (
                      <div className="location-picker-details-row location-picker-details-secondary">
                        <Navigation size={14} />
                        <span>
                          {[location.city, location.governorate].filter(Boolean).join("، ")}
                        </span>
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
            <button
              className="btn btn-glass"
              type="button"
              onClick={handleLocate}
              disabled={locating}
            >
              <Crosshair size={17} />
              {locating ? "جلب الموقع..." : "استخدام موقعي الحالي"}
            </button>
            <div className="location-picker-actions-right">
              <button
                className="btn btn-gold btn-glow"
                type="button"
                onClick={handleConfirm}
                disabled={geoStatus !== "ready" || !location}
              >
                تأكيد الموقع
              </button>
              <button className="btn btn-soft" type="button" onClick={handleCancel}>
                إلغاء
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
