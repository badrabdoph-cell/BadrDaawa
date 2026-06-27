"use client";

import { useMemo, useState } from "react";
import { MapPin, Route, Share2 } from "lucide-react";
import { getInvitationTranslator, resolveLocale } from "@/lib/i18n";
import type { Language } from "@/lib/types";

type Coordinates = {
  lat: number;
  lng: number;
};

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

function getGoogleCoordinatesUrl(coordinates: Coordinates, zoom = 15) {
  return `https://www.google.com/maps/@${coordinates.lat},${coordinates.lng},${zoom}z/data=!3m1!1e3`;
}

function getDirectionsDestination(destination: string, coordinates: Coordinates | null) {
  return coordinates ? `${coordinates.lat},${coordinates.lng}` : destination;
}

function getEmbedUrl(mapUrl: string, destination: string, coordinates: Coordinates | null) {
  if (mapUrl.includes("/maps/embed") || mapUrl.includes("output=embed")) {
    return mapUrl;
  }
  if (coordinates) {
    return `https://maps.google.com/maps?q=${coordinates.lat},${coordinates.lng}&z=15&output=embed`;
  }
  return `https://maps.google.com/maps?q=${encodeURIComponent(destination)}&z=15&output=embed`;
}

function getLocationUrl(mapUrl: string, destination: string, coordinates: Coordinates | null, hasVenueLink: boolean) {
  if (coordinates) return getGoogleCoordinatesUrl(coordinates);
  if (hasVenueLink && !mapUrl.includes("/maps/embed") && !mapUrl.includes("output=embed")) return mapUrl;
  return getGoogleSearchUrl(destination);
}

function getDirectionsUrl(destination: string, coordinates: Coordinates | null) {
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(getDirectionsDestination(destination, coordinates))}`;
}

export function InviteMap({ venue, city, mapUrl, locale = "ar" }: { venue: string; city: string; mapUrl: string; locale?: Language }) {
  const t = getInvitationTranslator(resolveLocale(locale));
  const [shareState, setShareState] = useState<ShareState>("idle");
  const hasVenueLink = Boolean(mapUrl.trim());
  const fallbackDestination = useMemo(() => getSearchDestination(venue, city), [city, venue]);
  const coordinates = useMemo(() => extractCoordinates(mapUrl), [mapUrl]);
  const destination = useMemo(() => getMapDestination(mapUrl, fallbackDestination), [fallbackDestination, mapUrl]);
  const mapEmbed = useMemo(() => getEmbedUrl(mapUrl, destination, coordinates), [coordinates, destination, mapUrl]);
  const locationUrl = useMemo(() => getLocationUrl(mapUrl, destination, coordinates, hasVenueLink), [coordinates, destination, hasVenueLink, mapUrl]);
  const directionsUrl = useMemo(() => getDirectionsUrl(destination, coordinates), [coordinates, destination]);

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

  if (!hasVenueLink) return null;

  return (
    <div className="map-frame route-map is-clean-map" style={{ position: "relative", overflow: "hidden", borderRadius: 16, background: "#f0ebe2" }}>
      <iframe
        src={mapEmbed}
        title={t("invitation.map.iframeTitle")}
        loading="lazy"
        style={{
          position: "absolute", inset: 0, width: "100%", height: "100%",
          border: 0, display: "block", filter: "saturate(0.92) contrast(1.04)", opacity: 1,
        }}
      />
      <span className="map-luxury-marker" aria-hidden="true" style={{
        position: "absolute", top: "50%", left: "50%", zIndex: 9,
        display: "grid", placeItems: "center",
        width: 40, height: 40, marginTop: -44,
        borderRadius: "50% 50% 50% 8px", border: 0,
        background: "#fff", color: "#b8873b",
        boxShadow: "0 4px 14px rgba(0,0,0,0.22), 0 0 0 5px rgba(255,255,255,0.48)",
        pointerEvents: "none",
        transform: "translate(-50%, -50%) rotate(-45deg)",
      }}>
        <MapPin size={15} style={{ transform: "rotate(45deg)", filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.12))" }} />
      </span>
      <div className="map-actions" aria-label={t("invitation.map.actionsLabel")} style={{
        position: "relative", inset: "auto", zIndex: "auto",
        display: "flex", gap: 8, padding: "12px 16px 16px",
      }}>
        <a className="map-action recommended" href={locationUrl} target="_blank" rel="noreferrer" style={{
          flex: 1, display: "inline-flex", alignItems: "center", justifyContent: "center",
          gap: 6, minHeight: 40, padding: "8px 10px",
          border: "1px solid rgba(212, 175, 55, 0.42)", borderRadius: 12,
          background: "linear-gradient(135deg, #f5e6c0, #f0dba8)", color: "#241708",
          font: "inherit", fontSize: "0.78rem", fontWeight: 850,
          cursor: "pointer", textDecoration: "none", whiteSpace: "nowrap",
          boxShadow: "0 4px 12px rgba(46, 31, 11, 0.1)",
          transition: "transform 120ms ease, box-shadow 120ms ease",
        }}>
          <MapPin size={16} />
          <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t("invitation.map.openLocation")}</span>
        </a>
        <a className="map-action" href={directionsUrl} target="_blank" rel="noreferrer" style={{
          flex: 1, display: "inline-flex", alignItems: "center", justifyContent: "center",
          gap: 6, minHeight: 40, padding: "8px 10px",
          border: "1px solid rgba(189, 143, 63, 0.2)", borderRadius: 12,
          background: "rgba(255, 250, 241, 0.92)", color: "#2f2418",
          font: "inherit", fontSize: "0.78rem", fontWeight: 850,
          cursor: "pointer", textDecoration: "none", whiteSpace: "nowrap",
          boxShadow: "0 4px 12px rgba(46, 31, 11, 0.1)",
          transition: "transform 120ms ease, box-shadow 120ms ease",
        }}>
          <Route size={16} />
          <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t("invitation.map.directions")}</span>
        </a>
        <button className="map-action map-action-share" type="button" onClick={shareLocation} style={{
          flex: 1, display: "inline-flex", alignItems: "center", justifyContent: "center",
          gap: 6, minHeight: 40, padding: "8px 10px",
          border: "1px solid rgba(189, 143, 63, 0.2)", borderRadius: 12,
          background: "rgba(255, 250, 241, 0.96)", color: "#2f2418",
          font: "inherit", fontSize: "0.78rem", fontWeight: 850,
          cursor: "pointer", whiteSpace: "nowrap",
          boxShadow: "0 4px 12px rgba(46, 31, 11, 0.1)",
          transition: "transform 120ms ease, box-shadow 120ms ease",
        }}>
          <Share2 size={16} />
          <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{shareState === "copied" ? t("invitation.map.copied") : t("invitation.map.share")}</span>
        </button>
      </div>
    </div>
  );
}
