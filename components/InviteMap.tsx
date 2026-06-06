"use client";

import { useEffect, useMemo, useState } from "react";
import { LocateFixed, MapPin, Navigation } from "lucide-react";

type Coordinates = {
  lat: number;
  lng: number;
};

export function InviteMap({ venue, city, mapUrl }: { venue: string; city: string; mapUrl: string }) {
  const [coords, setCoords] = useState<Coordinates | null>(null);
  const [status, setStatus] = useState<"idle" | "locating" | "ready" | "blocked">("idle");
  const destination = `${venue} ${city}`.trim();

  useEffect(() => {
    if (!navigator.geolocation) {
      setStatus("blocked");
      return;
    }

    setStatus("locating");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setCoords({ lat: position.coords.latitude, lng: position.coords.longitude });
        setStatus("ready");
      },
      () => setStatus("blocked"),
      { enableHighAccuracy: true, maximumAge: 60000, timeout: 8000 },
    );
  }, []);

  const mapEmbed = useMemo(() => {
    if (coords) {
      return `https://maps.google.com/maps?saddr=${coords.lat},${coords.lng}&daddr=${encodeURIComponent(destination)}&t=k&z=13&output=embed`;
    }
    return `https://maps.google.com/maps?q=${encodeURIComponent(destination)}&t=k&z=15&output=embed`;
  }, [coords, destination]);

  const directionsUrl = coords
    ? `https://www.google.com/maps/dir/${coords.lat},${coords.lng}/${encodeURIComponent(destination)}`
    : mapUrl || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(destination)}`;

  return (
    <div className="map-frame route-map">
      <iframe src={mapEmbed} title="خريطة مكان الفرح" loading="lazy" />
      <div className="map-satellite-shade" />
      <svg className="map-route-overlay" viewBox="0 0 100 100" aria-hidden="true">
        <path className="route-alt route-alt-one" d="M20 80 C28 68 39 69 43 57 C48 42 28 36 34 22 C45 14 55 25 67 20 C79 15 86 20 82 30" />
        <path className="route-alt route-alt-two" d="M82 30 C72 35 70 47 76 57 C65 61 52 56 43 57" />
        <path className="route-main" d="M20 80 C28 70 35 69 42 58 C52 43 57 40 58 28 C59 21 70 20 82 30" />
      </svg>
      <span className="route-time route-time-left">51 د</span>
      <span className="route-time route-time-right">43 د</span>
      <span className="route-time route-time-main">
        <Navigation size={18} />
        39 د
      </span>
      <span className={`map-user-dot ${status === "ready" ? "ready" : ""}`} title={status === "ready" ? "موقعك اتحدد" : "بنحدد موقعك"}>
        <LocateFixed size={16} />
      </span>
      <span className="map-venue-marker" title={destination}>
        <MapPin size={54} fill="currentColor" />
      </span>
      <span className="map-venue-label">{venue}</span>
      <a className="map-directions" href={directionsUrl} target="_blank" rel="noreferrer">
        <Navigation size={15} />
        افتح الاتجاهات على Google Maps
      </a>
    </div>
  );
}
