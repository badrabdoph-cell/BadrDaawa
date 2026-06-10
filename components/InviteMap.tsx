"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, LocateFixed, MapPin, Navigation } from "lucide-react";
import { getInvitationTranslator, resolveLocale } from "@/lib/i18n";
import type { Language } from "@/lib/types";

type Coordinates = {
  lat: number;
  lng: number;
};

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

function getGoogleCoordinatesUrl(coordinates: Coordinates) {
  return `https://www.google.com/maps/@${coordinates.lat},${coordinates.lng},18z/data=!3m1!1e3`;
}

function getDirectionsDestination(destination: string, coordinates: Coordinates | null) {
  return coordinates ? `${coordinates.lat},${coordinates.lng}` : destination;
}

function withSatelliteMapType(url: string) {
  try {
    const parsed = new URL(url);
    if (!parsed.hostname.includes("google.") && !parsed.hostname.includes("maps.google.")) return url;
    if (parsed.pathname.includes("/maps/embed/v1/")) {
      parsed.searchParams.set("maptype", "satellite");
    } else {
      parsed.searchParams.set("t", "k");
    }
    return parsed.toString();
  } catch {
    const separator = url.includes("?") ? "&" : "?";
    return `${url}${separator}t=k`;
  }
}

function getEmbedUrl(mapUrl: string, destination: string, coordinates: Coordinates | null, userCoordinates: Coordinates | null, hasVenueLink: boolean) {
  if (mapUrl.includes("/maps/embed") || mapUrl.includes("output=embed")) {
    return withSatelliteMapType(mapUrl);
  }
  if (!hasVenueLink && userCoordinates) {
    return withSatelliteMapType(`https://maps.google.com/maps?q=${userCoordinates.lat},${userCoordinates.lng}&z=17&output=embed`);
  }
  if (hasVenueLink && userCoordinates) {
    return withSatelliteMapType(`https://maps.google.com/maps?saddr=${userCoordinates.lat},${userCoordinates.lng}&daddr=${encodeURIComponent(getDirectionsDestination(destination, coordinates))}&z=14&output=embed`);
  }
  if (coordinates) {
    return withSatelliteMapType(`https://maps.google.com/maps?q=${coordinates.lat},${coordinates.lng}&z=17&output=embed`);
  }
  return withSatelliteMapType(`https://maps.google.com/maps?q=${encodeURIComponent(destination)}&z=16&output=embed`);
}

function getOpenUrl(mapUrl: string, destination: string, coordinates: Coordinates | null, userCoordinates: Coordinates | null, hasVenueLink: boolean) {
  if (hasVenueLink && userCoordinates) {
    return `https://www.google.com/maps/dir/?api=1&origin=${userCoordinates.lat},${userCoordinates.lng}&destination=${encodeURIComponent(getDirectionsDestination(destination, coordinates))}`;
  }
  if (!hasVenueLink && userCoordinates) return getGoogleCoordinatesUrl(userCoordinates);
  if (coordinates) return getGoogleCoordinatesUrl(coordinates);
  if (mapUrl && !mapUrl.includes("/maps/embed") && !mapUrl.includes("output=embed")) return mapUrl;
  return getGoogleSearchUrl(destination);
}

export function InviteMap({ venue, city, mapUrl, locale = "ar" }: { venue: string; city: string; mapUrl: string; locale?: Language }) {
  const t = getInvitationTranslator(resolveLocale(locale));
  const [userCoordinates, setUserCoordinates] = useState<Coordinates | null>(null);
  const hasVenueLink = Boolean(mapUrl.trim());
  const destination = getSearchDestination(venue, city);
  const coordinates = useMemo(() => extractCoordinates(mapUrl), [mapUrl]);
  const mapEmbed = useMemo(() => getEmbedUrl(mapUrl, destination, coordinates, userCoordinates, hasVenueLink), [coordinates, destination, hasVenueLink, mapUrl, userCoordinates]);
  const openUrl = useMemo(() => getOpenUrl(mapUrl, destination, coordinates, userCoordinates, hasVenueLink), [coordinates, destination, hasVenueLink, mapUrl, userCoordinates]);

  useEffect(() => {
    if (!("geolocation" in navigator)) return;
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setUserCoordinates({
          lat: Number(position.coords.latitude.toFixed(6)),
          lng: Number(position.coords.longitude.toFixed(6)),
        });
      },
      () => undefined,
      { enableHighAccuracy: true, maximumAge: 120000, timeout: 7000 },
    );
  }, []);

  return (
    <div className={`map-frame route-map is-clean-map ${hasVenueLink ? "" : "is-missing-venue-link"}`}>
      <div className="map-visual-fallback" aria-hidden="true">
        <span className="map-road map-road-main" />
        <span className="map-road map-road-soft map-road-one" />
        <span className="map-road map-road-soft map-road-two" />
        <span className="map-road map-road-soft map-road-three" />
        <span className="map-fallback-pin venue">
          <MapPin size={18} />
        </span>
        {userCoordinates ? (
          <span className="map-fallback-pin visitor">
            <LocateFixed size={16} />
          </span>
        ) : null}
      </div>
      <iframe src={mapEmbed} title={t("invitation.map.iframeTitle")} loading="lazy" />
      {!hasVenueLink ? (
        <div className="map-missing-link-badge">
          <AlertTriangle size={14} />
          <span>لم يضع العرسان رابط القاعه بعد</span>
        </div>
      ) : null}
      {userCoordinates ? (
        <div className="map-user-location-badge">
          <LocateFixed size={13} />
          <span>{t("invitation.map.ready")}</span>
        </div>
      ) : null}
      <a className="map-directions" href={openUrl} target="_blank" rel="noreferrer" aria-label={t("invitation.map.openGoogle")}>
        <Navigation size={18} />
        <span>{t("invitation.map.openGoogle")}</span>
      </a>
      <a className="map-open-layer" href={openUrl} target="_blank" rel="noreferrer" aria-label={t("invitation.map.openGoogle")} />
    </div>
  );
}
