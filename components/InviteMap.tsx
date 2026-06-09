"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, LocateFixed, MapPin, Navigation, Route, Share2 } from "lucide-react";
import { getInvitationTranslator, resolveLocale } from "@/lib/i18n";
import type { Language } from "@/lib/types";

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

function getDistanceKm(from: Coordinates, to: Coordinates) {
  const earthRadiusKm = 6371;
  const toRadians = (value: number) => (value * Math.PI) / 180;
  const deltaLat = toRadians(to.lat - from.lat);
  const deltaLng = toRadians(to.lng - from.lng);
  const lat1 = toRadians(from.lat);
  const lat2 = toRadians(to.lat);
  const a = Math.sin(deltaLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLng / 2) ** 2;
  return earthRadiusKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function formatDistance(distanceKm: number, locale: Language) {
  const numberLocale = locale === "ar" ? "ar-EG-u-nu-latn" : "en-US";
  if (distanceKm < 1) {
    return `${new Intl.NumberFormat(numberLocale, { maximumFractionDigits: 0 }).format(distanceKm * 1000)} ${locale === "ar" ? "متر" : "m"}`;
  }
  return `${new Intl.NumberFormat(numberLocale, { maximumFractionDigits: 1 }).format(distanceKm)} ${locale === "ar" ? "كم" : "km"}`;
}

export function InviteMap({ venue, city, mapUrl, locale = "ar" }: { venue: string; city: string; mapUrl: string; locale?: Language }) {
  const resolvedLocale = resolveLocale(locale);
  const t = getInvitationTranslator(resolvedLocale);
  const [coords, setCoords] = useState<Coordinates | null>(null);
  const [status, setStatus] = useState<"idle" | "locating" | "ready" | "blocked">("idle");
  const [deviceType, setDeviceType] = useState<DeviceType>("desktop");
  const [shareState, setShareState] = useState<"idle" | "copied">("idle");
  const destination = getSearchDestination(venue, city);
  const mapCoordinates = useMemo(() => extractCoordinates(mapUrl), [mapUrl]);
  const distanceLabel = useMemo(() => {
    if (!coords || !mapCoordinates) return "";
    return formatDistance(getDistanceKm(coords, mapCoordinates), resolvedLocale);
  }, [coords, mapCoordinates, resolvedLocale]);

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
      : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(googleDestination)}`;
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

  const googleMapsLink = navigationLinks.find((link) => link.key === "google")?.href || mapUrl || getGoogleSearchUrl(destination);
  const secondaryLinks = navigationLinks.filter((link) => link.key !== "google").slice(0, 1);

  async function shareLocation() {
    const shareUrl = googleMapsLink;
    const shareText = [venue, city].filter(Boolean).join(" - ");
    try {
      if (navigator.share) {
        await navigator.share({
          title: t("invitation.map.shareTitle"),
          text: shareText || destination,
          url: shareUrl,
        });
        return;
      }
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(`${shareText || destination}\n${shareUrl}`);
        setShareState("copied");
        window.setTimeout(() => setShareState("idle"), 1800);
      }
    } catch {
      setShareState("idle");
    }
  }

  return (
    <div className="map-frame route-map">
      <iframe src={mapEmbed} title={t("invitation.map.iframeTitle")} loading="lazy" />
      <div className="map-preview-badge">
        <MapPin size={14} />
        <span>{t("invitation.map.preview")}</span>
      </div>
      <div className="map-live-caption">
        <span className={`map-live-dot ${status === "ready" ? "ready" : ""}`}>
          <LocateFixed size={14} />
        </span>
        <span>{status === "ready" ? t("invitation.map.ready") : status === "locating" ? t("invitation.map.locating") : venue}</span>
        {distanceLabel ? <strong>{t("invitation.map.distanceAway", { distance: distanceLabel })}</strong> : null}
      </div>
      <div className="map-actions" aria-label={t("invitation.map.actionsLabel")}>
        <a className="map-action recommended map-action-google" href={googleMapsLink} target="_blank" rel="noreferrer">
          <Navigation size={15} />
          <span>{t("invitation.map.openGoogle")}</span>
        </a>
        <button className="map-action map-action-share" type="button" onClick={shareLocation}>
          {shareState === "copied" ? <Check size={15} /> : <Share2 size={15} />}
          <span>{shareState === "copied" ? t("invitation.map.copied") : t("invitation.map.share")}</span>
        </button>
        {secondaryLinks.map((link) => {
          const Icon = link.icon;
          return (
            <a className={link.recommended ? "map-action recommended" : "map-action"} href={link.href} target="_blank" rel="noreferrer" key={link.key}>
              <Icon size={15} />
              <span>{link.label}</span>
            </a>
          );
        })}
      </div>
    </div>
  );
}
