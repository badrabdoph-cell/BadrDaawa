"use client";

import { useMemo } from "react";
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
  return `https://www.google.com/maps/search/?api=1&query=${coordinates.lat},${coordinates.lng}`;
}

function getEmbedUrl(mapUrl: string, destination: string, coordinates: Coordinates | null) {
  if (mapUrl.includes("/maps/embed") || mapUrl.includes("output=embed")) {
    return mapUrl;
  }
  if (coordinates) {
    return `https://maps.google.com/maps?q=${coordinates.lat},${coordinates.lng}&t=k&z=15&output=embed`;
  }
  return `https://maps.google.com/maps?q=${encodeURIComponent(destination)}&t=k&z=15&output=embed`;
}

function getOpenUrl(mapUrl: string, destination: string, coordinates: Coordinates | null) {
  if (coordinates) return getGoogleCoordinatesUrl(coordinates);
  if (mapUrl && !mapUrl.includes("/maps/embed") && !mapUrl.includes("output=embed")) return mapUrl;
  return getGoogleSearchUrl(destination);
}

export function InviteMap({ venue, city, mapUrl, locale = "ar" }: { venue: string; city: string; mapUrl: string; locale?: Language }) {
  const t = getInvitationTranslator(resolveLocale(locale));
  const destination = getSearchDestination(venue, city);
  const coordinates = useMemo(() => extractCoordinates(mapUrl), [mapUrl]);
  const mapEmbed = useMemo(() => getEmbedUrl(mapUrl, destination, coordinates), [coordinates, destination, mapUrl]);
  const openUrl = useMemo(() => getOpenUrl(mapUrl, destination, coordinates), [coordinates, destination, mapUrl]);

  return (
    <div className="map-frame route-map is-clean-map">
      <iframe src={mapEmbed} title={t("invitation.map.iframeTitle")} loading="lazy" />
      <a className="map-open-layer" href={openUrl} target="_blank" rel="noreferrer" aria-label={t("invitation.map.openGoogle")} />
    </div>
  );
}
