"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useRef, useState } from "react";
import { LocateFixed, MapPin, Route, Share2 } from "lucide-react";
import { getInvitationTranslator, resolveLocale } from "@/lib/i18n";
import { extractCoordinatesFromUrl, getTextDestination, isEmbedUrl, isShortLink, resolveShortLink } from "@/lib/map-url";
import type { Coordinates } from "@/lib/map-url";
import type { Language } from "@/lib/types";

const LeafletMap = dynamic(() => import("./LeafletMap"), { ssr: false });

type LocationState = "idle" | "locating" | "ready" | "unavailable";
type ShareState = "idle" | "copied";

export function InviteMap({ venue, city, mapUrl, latitude, longitude, locale = "ar" }: {
  venue: string; city: string; mapUrl: string; latitude?: number | null; longitude?: number | null; locale?: Language;
}) {
  const t = getInvitationTranslator(resolveLocale(locale));
  const [userCoords, setUserCoords] = useState<Coordinates | null>(null);
  const [locationState, setLocationState] = useState<LocationState>("idle");
  const [shareState, setShareState] = useState<ShareState>("idle");
  const [resolvedCoords, setResolvedCoords] = useState<Coordinates | null>(null);
  const locationRequestedRef = useRef(false);
  const hasVenueLink = Boolean(mapUrl.trim());

  const venueCoords = useMemo<Coordinates | null>(() => {
    if (typeof latitude === "number" && typeof longitude === "number" && Number.isFinite(latitude) && Number.isFinite(longitude)) {
      return { lat: latitude, lng: longitude };
    }
    return extractCoordinatesFromUrl(mapUrl) || resolvedCoords;
  }, [latitude, longitude, mapUrl, resolvedCoords]);

  const hasVenueCoords = useMemo(() => venueCoords !== null, [venueCoords]);

  useEffect(() => {
    if (venueCoords !== null) return;
    if (!isShortLink(mapUrl)) return;
    let cancelled = false;
    resolveShortLink(mapUrl).then((resolvedUrl) => {
      if (cancelled || !resolvedUrl) return;
      const coords = extractCoordinatesFromUrl(resolvedUrl);
      if (coords) setResolvedCoords(coords);
    });
    return () => { cancelled = true; };
  }, [mapUrl, venueCoords]);

  const destParam = useMemo(() => {
    if (venueCoords) return `${venueCoords.lat},${venueCoords.lng}`;
    return getTextDestination(mapUrl, venue, city);
  }, [venueCoords, mapUrl, venue, city]);

  const locationUrl = useMemo(() => {
    if (venueCoords) {
      return `https://maps.google.com/maps?q=${venueCoords.lat},${venueCoords.lng}&z=17`;
    }
    if (hasVenueLink && !isEmbedUrl(mapUrl)) return mapUrl;
    return `https://maps.google.com/maps?q=${encodeURIComponent(destParam)}`;
  }, [venueCoords, mapUrl, destParam, hasVenueLink]);

  const directionsUrl = useMemo(() => {
    if (venueCoords) {
      if (userCoords) {
        return `https://www.google.com/maps/dir/?api=1&origin=${userCoords.lat},${userCoords.lng}&destination=${venueCoords.lat},${venueCoords.lng}`;
      }
      return `https://www.google.com/maps/dir/?api=1&destination=${venueCoords.lat},${venueCoords.lng}`;
    }
    if (hasVenueLink && !isEmbedUrl(mapUrl)) {
      return mapUrl;
    }
    if (userCoords) {
      return `https://www.google.com/maps/dir/?api=1&origin=${userCoords.lat},${userCoords.lng}&destination=${encodeURIComponent(destParam)}`;
    }
    return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destParam)}`;
  }, [venueCoords, userCoords, destParam, hasVenueLink, mapUrl]);

  const requestUserLocation = (force = false) => {
    if (!("geolocation" in navigator)) { setLocationState("unavailable"); return; }
    if (locationRequestedRef.current && !force) return;
    locationRequestedRef.current = true;
    setLocationState("locating");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setUserCoords({
          lat: Number(position.coords.latitude.toFixed(6)),
          lng: Number(position.coords.longitude.toFixed(6)),
        });
        setLocationState("ready");
      },
      () => setLocationState("unavailable"),
      { enableHighAccuracy: true, maximumAge: 120000, timeout: 30000 },
    );
  };

  async function shareLocation() {
    setShareState("idle");
    try {
      if (navigator.share) {
        await navigator.share({ title: t("invitation.map.shareTitle"), text: destParam, url: locationUrl });
        return;
      }
      await navigator.clipboard.writeText(locationUrl);
      setShareState("copied");
      window.setTimeout(() => setShareState("idle"), 1800);
    } catch {
      /* user cancelled or clipboard denied */
    }
  }

  return (
    <div className={`map-frame route-map is-clean-map ${hasVenueLink ? "" : "is-missing-venue-link"} ${hasVenueCoords ? "has-venue-location" : ""} ${userCoords ? "has-user-location" : ""}`}>
      <div className="map-visual-fallback" aria-hidden="true">
        <span className="map-road map-road-main" />
        <span className="map-road map-road-soft map-road-one" />
        <span className="map-road map-road-soft map-road-two" />
        <span className="map-road map-road-soft map-road-three" />
        <span className="map-fallback-pin venue"><MapPin size={18} /></span>
        {userCoords ? <span className="map-fallback-pin visitor"><LocateFixed size={16} /></span> : null}
      </div>
      <LeafletMap venueCoords={venueCoords} userCoords={userCoords} />
      {!hasVenueLink ? (
        <div className="map-missing-link-badge"><span>{t("invitation.map.locationSoon")}</span></div>
      ) : null}
      {userCoords ? (
        <div className="map-user-location-badge"><LocateFixed size={13} /><span>{t("invitation.map.visitorLocation")}</span></div>
      ) : null}
      {!userCoords ? (
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
