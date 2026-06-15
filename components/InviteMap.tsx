"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { LocateFixed, MapPin, Navigation, Route, Share2 } from "lucide-react";
import { getInvitationTranslator, resolveLocale } from "@/lib/i18n";
import type { Language } from "@/lib/types";

type Coordinates = {
  lat: number;
  lng: number;
};

type LocationState = "idle" | "locating" | "ready" | "unavailable";
type ShareState = "idle" | "copied";

function getSearchDestination(venue: string, city: string) {
  return [venue, city].filter(Boolean).join(" ").trim() || "Cairo Egypt";
}

function getMapDestination(mapUrl: string, fallback: string) {
  if (!mapUrl) return fallback;
  try {
    const parsed = new URL(mapUrl);
    const searchValue = parsed.searchParams.get("q") || parsed.searchParams.get("query") || parsed.searchParams.get("daddr");
    if (searchValue && !extractCoordinates(searchValue)) return searchValue.trim();
    const placeMatch = parsed.pathname.match(/\/maps\/place\/([^/]+)/);
    if (placeMatch?.[1]) return decodeURIComponent(placeMatch[1].replace(/\+/g, " ")).trim();
  } catch {
    return fallback;
  }
  return fallback;
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

function getGoogleCoordinatesUrl(coordinates: Coordinates, zoom = 13) {
  return `https://www.google.com/maps/@${coordinates.lat},${coordinates.lng},${zoom}z/data=!3m1!1e3`;
}

function getDirectionsDestination(destination: string, coordinates: Coordinates | null) {
  return coordinates ? `${coordinates.lat},${coordinates.lng}` : destination;
}

function withSatelliteMapType(url: string, zoom = "13") {
  try {
    const parsed = new URL(url);
    if (!parsed.hostname.includes("google.") && !parsed.hostname.includes("maps.google.")) return url;
    if (parsed.pathname.includes("/maps/embed/v1/")) {
      parsed.searchParams.set("maptype", "satellite");
      parsed.searchParams.set("zoom", parsed.searchParams.get("zoom") || zoom);
    } else {
      parsed.searchParams.set("t", "k");
      parsed.searchParams.set("z", zoom);
    }
    return parsed.toString();
  } catch {
    return url;
  }
}

function getEmbedUrl(mapUrl: string, destination: string, coordinates: Coordinates | null, userCoordinates: Coordinates | null, hasVenueLink: boolean) {
  if (mapUrl.includes("/maps/embed") || mapUrl.includes("output=embed")) {
    return withSatelliteMapType(mapUrl, "13");
  }
  if (!hasVenueLink && userCoordinates) {
    return withSatelliteMapType(`https://maps.google.com/maps?q=${userCoordinates.lat},${userCoordinates.lng}&z=13&output=embed`, "13");
  }
  if (coordinates) {
    return withSatelliteMapType(`https://maps.google.com/maps?q=${coordinates.lat},${coordinates.lng}&z=13&output=embed`, "13");
  }
  return withSatelliteMapType(`https://maps.google.com/maps?q=${encodeURIComponent(destination)}&z=13&output=embed`, "13");
}

function getLocationUrl(mapUrl: string, destination: string, coordinates: Coordinates | null, userCoordinates: Coordinates | null, hasVenueLink: boolean) {
  if (!hasVenueLink && userCoordinates) return getGoogleCoordinatesUrl(userCoordinates);
  if (coordinates) return getGoogleCoordinatesUrl(coordinates);
  if (mapUrl && !mapUrl.includes("/maps/embed") && !mapUrl.includes("output=embed")) return mapUrl;
  return getGoogleSearchUrl(destination);
}

function getDirectionsUrl(destination: string, coordinates: Coordinates | null, userCoordinates: Coordinates | null) {
  if (userCoordinates) {
    return `https://www.google.com/maps/dir/?api=1&origin=${userCoordinates.lat},${userCoordinates.lng}&destination=${encodeURIComponent(getDirectionsDestination(destination, coordinates))}`;
  }
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(getDirectionsDestination(destination, coordinates))}`;
}

export function InviteMap({ venue, city, mapUrl, locale = "ar" }: { venue: string; city: string; mapUrl: string; locale?: Language }) {
  const t = getInvitationTranslator(resolveLocale(locale));
  const [userCoordinates, setUserCoordinates] = useState<Coordinates | null>(null);
  const [locationState, setLocationState] = useState<LocationState>("idle");
  const [shareState, setShareState] = useState<ShareState>("idle");
  const locationRequestedRef = useRef(false);
  const hasVenueLink = Boolean(mapUrl.trim());
  const fallbackDestination = useMemo(() => getSearchDestination(venue, city), [city, venue]);
  const coordinates = useMemo(() => extractCoordinates(mapUrl), [mapUrl]);
  const destination = useMemo(() => getMapDestination(mapUrl, fallbackDestination), [fallbackDestination, mapUrl]);
  const mapEmbed = useMemo(() => getEmbedUrl(mapUrl, destination, coordinates, userCoordinates, hasVenueLink), [coordinates, destination, hasVenueLink, mapUrl, userCoordinates]);
  const locationUrl = useMemo(() => getLocationUrl(mapUrl, destination, coordinates, userCoordinates, hasVenueLink), [coordinates, destination, hasVenueLink, mapUrl, userCoordinates]);
  const directionsUrl = useMemo(() => getDirectionsUrl(destination, coordinates, userCoordinates), [coordinates, destination, userCoordinates]);

  const requestUserLocation = useCallback((force = false) => {
    if (!("geolocation" in navigator)) {
      setLocationState("unavailable");
      return;
    }
    if (locationRequestedRef.current && !force) return;
    locationRequestedRef.current = true;
    setLocationState("locating");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setUserCoordinates({
          lat: Number(position.coords.latitude.toFixed(6)),
          lng: Number(position.coords.longitude.toFixed(6)),
        });
        setLocationState("ready");
      },
      () => setLocationState("unavailable"),
      { enableHighAccuracy: true, maximumAge: 90000, timeout: 9000 },
    );
  }, []);

  useEffect(() => {
    requestUserLocation();
  }, [requestUserLocation]);

  async function shareLocation() {
    setShareState("idle");
    const shareData = {
      title: t("invitation.map.shareTitle"),
      text: destination,
      url: locationUrl,
    };
    try {
      if (navigator.share) {
        await navigator.share(shareData);
        return;
      }
      await navigator.clipboard.writeText(locationUrl);
      setShareState("copied");
      window.setTimeout(() => setShareState("idle"), 1800);
    } catch {
      // Sharing can be cancelled by the visitor; keep the map usable without noisy UI.
    }
  }

  return (
    <div className={`map-frame route-map is-clean-map ${hasVenueLink ? "" : "is-missing-venue-link"} ${userCoordinates ? "has-user-location" : ""}`}>
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
      <span className="map-luxury-marker" aria-hidden="true">
        <MapPin size={23} />
      </span>
      {!hasVenueLink ? (
        <div className="map-missing-link-badge">
          <span>{t("invitation.map.locationSoon")}</span>
        </div>
      ) : null}
      {userCoordinates ? (
        <div className="map-user-location-badge">
          <LocateFixed size={13} />
          <span>{t("invitation.map.visitorLocation")}</span>
        </div>
      ) : null}
      {!userCoordinates ? (
        <button className="map-locate-action" type="button" onClick={() => requestUserLocation(true)} disabled={locationState === "locating"}>
          <LocateFixed size={17} />
          <span>{locationState === "locating" ? t("invitation.map.locating") : t("invitation.map.useMyLocation")}</span>
        </button>
      ) : null}
      <div className="map-actions" aria-label={t("invitation.map.actionsLabel")}>
        <a className="map-action recommended" href={locationUrl} target="_blank" rel="noreferrer">
          <MapPin size={17} />
          <span>{t("invitation.map.openLocation")}</span>
        </a>
        <a className="map-action" href={directionsUrl} target="_blank" rel="noreferrer">
          <Route size={17} />
          <span>{t("invitation.map.directions")}</span>
        </a>
        <button className="map-action map-action-share" type="button" onClick={shareLocation}>
          <Share2 size={17} />
          <span>{shareState === "copied" ? t("invitation.map.copied") : t("invitation.map.share")}</span>
        </button>
      </div>
    </div>
  );
}
