"use client";

import { useEffect, useMemo, useState } from "react";
import { LocateFixed, MapPin, Navigation, Route } from "lucide-react";

type Coordinates = {
  lat: number;
  lng: number;
};

type DeviceType = "ios" | "android" | "desktop";

function detectDeviceType(userAgent: string): DeviceType {
  const normalized = userAgent.toLowerCase();
  const isAppleTouchDesktop = normalized.includes("macintosh") && typeof navigator !== "undefined" && navigator.maxTouchPoints > 1;
  if (/iphone|ipad|ipod/.test(normalized) || isAppleTouchDesktop) return "ios";
  if (normalized.includes("android")) return "android";
  return "desktop";
}

function getSearchDestination(venue: string, city: string) {
  return [venue, city].filter(Boolean).join(" ").trim() || "Wedding venue";
}

function extractCoordinates(value: string) {
  if (!value) return null;
  let decoded = value;
  try {
    decoded = decodeURIComponent(value);
  } catch {
    decoded = value;
  }
  const patterns = [
    /@(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)/,
    /[?&](?:q|query|ll|daddr)=(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)/,
    /!3d(-?\d+(?:\.\d+)?)!4d(-?\d+(?:\.\d+)?)/,
  ];
  for (const pattern of patterns) {
    const match = decoded.match(pattern);
    if (!match) continue;
    const lat = Number(match[1]);
    const lng = Number(match[2]);
    if (Number.isFinite(lat) && Number.isFinite(lng)) return { lat, lng };
  }
  return null;
}

function getGoogleSearchUrl(destination: string) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(destination)}`;
}

export function InviteMap({ venue, city, mapUrl }: { venue: string; city: string; mapUrl: string }) {
  const [coords, setCoords] = useState<Coordinates | null>(null);
  const [status, setStatus] = useState<"idle" | "locating" | "ready" | "blocked">("idle");
  const [deviceType, setDeviceType] = useState<DeviceType>("desktop");
  const destination = getSearchDestination(venue, city);
  const mapCoordinates = useMemo(() => extractCoordinates(mapUrl), [mapUrl]);

  useEffect(() => {
    setDeviceType(detectDeviceType(navigator.userAgent));
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
      return `https://maps.google.com/maps?saddr=${coords.lat},${coords.lng}&daddr=${encodeURIComponent(destination)}&t=k&z=14&output=embed`;
    }
    if (mapUrl.includes("/maps/embed") || mapUrl.includes("output=embed")) {
      return mapUrl;
    }
    if (mapCoordinates) {
      return `https://maps.google.com/maps?q=${mapCoordinates.lat},${mapCoordinates.lng}&t=k&z=15&output=embed`;
    }
    return `https://maps.google.com/maps?q=${encodeURIComponent(destination)}&t=k&z=15&output=embed`;
  }, [coords, destination, mapCoordinates, mapUrl]);

  const navigationLinks = useMemo(() => {
    const destinationCoordinates = mapCoordinates ? `${mapCoordinates.lat},${mapCoordinates.lng}` : "";
    const googleDestination = destinationCoordinates || destination;
    const googleMapsUrl = coords
      ? `https://www.google.com/maps/dir/?api=1&origin=${coords.lat},${coords.lng}&destination=${encodeURIComponent(googleDestination)}`
      : mapUrl || getGoogleSearchUrl(destination);
    const appleMapsUrl = destinationCoordinates
      ? `https://maps.apple.com/?daddr=${encodeURIComponent(destinationCoordinates)}&dirflg=d`
      : `https://maps.apple.com/?q=${encodeURIComponent(destination)}&dirflg=d`;
    const wazeUrl = destinationCoordinates
      ? `https://waze.com/ul?ll=${encodeURIComponent(destinationCoordinates)}&navigate=yes`
      : `https://waze.com/ul?q=${encodeURIComponent(destination)}&navigate=yes`;
    const links = [
      { key: "google", label: "Google Maps", href: googleMapsUrl, icon: Navigation, recommended: deviceType === "android" || deviceType === "desktop" },
      { key: "apple", label: "Apple Maps", href: appleMapsUrl, icon: MapPin, recommended: deviceType === "ios" },
      { key: "waze", label: "Waze", href: wazeUrl, icon: Route, recommended: false },
    ];
    if (deviceType === "ios") return [links[1], links[0], links[2]];
    if (deviceType === "android") return [links[0], links[2], links[1]];
    return links;
  }, [coords, destination, deviceType, mapCoordinates, mapUrl]);

  return (
    <div className="map-frame route-map">
      <iframe src={mapEmbed} title="خريطة مكان الفرح" loading="lazy" />
      <div className="map-live-caption">
        <span className={`map-live-dot ${status === "ready" ? "ready" : ""}`}>
          <LocateFixed size={14} />
        </span>
        <span>{status === "ready" ? "موقعك متزامن مع الخريطة" : status === "locating" ? "بنحدد موقعك الآن" : venue}</span>
      </div>
      <div className="map-actions" aria-label="خيارات فتح خريطة مكان الحفل">
        {navigationLinks.map((link) => {
          const Icon = link.icon;
          return (
            <a className={link.recommended ? "map-action recommended" : "map-action"} href={link.href} target="_blank" rel="noreferrer" key={link.key}>
              <Icon size={15} />
              <span>{link.label}</span>
              {link.recommended ? <b>مناسب لجهازك</b> : null}
            </a>
          );
        })}
      </div>
    </div>
  );
}
