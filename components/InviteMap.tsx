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
      return `https://maps.google.com/maps?saddr=${coords.lat},${coords.lng}&daddr=${encodeURIComponent(destination)}&output=embed`;
    }
    return `https://maps.google.com/maps?q=${encodeURIComponent(destination)}&z=15&output=embed`;
  }, [coords, destination]);

  const directionsUrl = coords
    ? `https://www.google.com/maps/dir/${coords.lat},${coords.lng}/${encodeURIComponent(destination)}`
    : mapUrl || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(destination)}`;

  return (
    <div className="map-frame">
      <iframe src={mapEmbed} title="خريطة مكان الفرح" loading="lazy" />
      <span className={`map-pin user-pin ${status === "ready" ? "ready" : ""}`}>
        <LocateFixed size={14} />
        {status === "ready" ? "موقعك اتحدد" : status === "locating" ? "بنحدد موقعك" : "موقعك"}
      </span>
      <span className="map-pin venue-pin">
        <MapPin size={14} />
        الفرح
      </span>
      <a className="map-directions" href={directionsUrl} target="_blank" rel="noreferrer">
        <Navigation size={15} />
        افتح الاتجاهات
      </a>
    </div>
  );
}
