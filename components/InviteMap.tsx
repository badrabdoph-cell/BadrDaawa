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

function getEmbedUrl(mapUrl: string, destination: string, coordinates: Coordinates | null, hasVenueLink: boolean) {
  if (mapUrl.includes("/maps/embed") || mapUrl.includes("output=embed")) {
    return mapUrl;
  }
  if (coordinates) {
    return `https://maps.google.com/maps?q=${coordinates.lat},${coordinates.lng}&z=15&output=embed&hl=${document.documentElement.lang || "ar"}`;
  }
  return `https://maps.google.com/maps?q=${encodeURIComponent(destination)}&z=15&output=embed&hl=${document.documentElement.lang || "ar"}`;
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
  const mapEmbed = useMemo(() => getEmbedUrl(mapUrl, destination, coordinates, hasVenueLink), [coordinates, destination, hasVenueLink, mapUrl]);
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
    <div className="map-frame route-map is-clean-map">
      <iframe
        src={mapEmbed}
        title={t("invitation.map.iframeTitle")}
        loading="lazy"
        referrerPolicy="no-referrer"
      />
      <span className="map-luxury-marker" aria-hidden="true">
        <MapPin size={15} />
      </span>
      <div className="map-actions" aria-label={t("invitation.map.actionsLabel")}>
        <a className="map-action recommended" href={locationUrl} target="_blank" rel="noreferrer">
          <MapPin size={16} />
          <span>{t("invitation.map.openLocation")}</span>
        </a>
        <a className="map-action" href={directionsUrl} target="_blank" rel="noreferrer">
          <Route size={16} />
          <span>{t("invitation.map.directions")}</span>
        </a>
        <button className="map-action map-action-share" type="button" onClick={shareLocation}>
          <Share2 size={16} />
          <span>{shareState === "copied" ? t("invitation.map.copied") : t("invitation.map.share")}</span>
        </button>
      </div>
      <style>{`
        .map-frame {
          position: relative;
          overflow: hidden;
          border-radius: 16px;
          background: #f0ebe2;
          min-height: 200px;
          border: 0;
          box-shadow: none;
        }
        .map-frame iframe {
          width: 100%;
          height: 100%;
          min-height: 200px;
          display: block;
          border: 0;
          filter: saturate(0.92) contrast(1.04);
          opacity: 1;
          transition: opacity 320ms ease;
        }
        .map-luxury-marker {
          position: absolute;
          top: 50%;
          left: 50%;
          z-index: 9;
          display: grid;
          place-items: center;
          width: 40px;
          height: 40px;
          margin-top: -44px;
          border-radius: 50% 50% 50% 8px;
          border: 0;
          background: #fff;
          box-shadow: 0 4px 14px rgba(0,0,0,0.22), 0 0 0 5px rgba(255,255,255,0.48);
          pointer-events: none;
          animation: map-marker-drop 600ms cubic-bezier(0.2, 0.82, 0.2, 1.18) both;
          transform: translate(-50%, -50%) rotate(-45deg);
        }
        .map-luxury-marker svg {
          width: 18px;
          height: 18px;
          color: #b8873b;
          filter: drop-shadow(0 1px 2px rgba(0,0,0,0.12));
          transform: rotate(45deg);
        }
        @keyframes map-marker-drop {
          from {
            opacity: 0;
            transform: translate(-50%, -50%) translateY(-18px) rotate(-45deg);
          }
          to {
            opacity: 1;
            transform: translate(-50%, -50%) rotate(-45deg);
          }
        }
        .map-actions {
          position: relative;
          inset: auto;
          z-index: auto;
          display: flex !important;
          gap: 8px;
          padding: 12px 16px 16px;
          grid-template-columns: none;
        }
        .map-action {
          flex: 1;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          min-height: 40px;
          padding: 8px 10px;
          border: 1px solid rgba(189, 143, 63, 0.2);
          border-radius: 12px;
          background: rgba(255, 250, 241, 0.92);
          color: #2f2418;
          font: inherit;
          font-size: 0.78rem;
          font-weight: 850;
          cursor: pointer;
          appearance: none;
          text-decoration: none;
          box-shadow: 0 4px 12px rgba(46, 31, 11, 0.1);
          transition: transform 120ms ease, background 120ms ease, box-shadow 120ms ease;
          white-space: nowrap;
        }
        .map-action:hover {
          transform: translateY(-1px);
          box-shadow: 0 8px 20px rgba(46, 31, 11, 0.16);
        }
        .map-action:active {
          transform: scale(0.97);
        }
        .map-action.recommended {
          border-color: rgba(212, 175, 55, 0.42);
          background: linear-gradient(135deg, #f5e6c0, #f0dba8);
          color: #241708;
        }
        .map-action.recommended:active {
          box-shadow: 0 2px 6px rgba(38, 24, 4, 0.1);
        }
        .map-action-share {
          background: rgba(255, 250, 241, 0.96);
        }
        .map-action span {
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .map-action svg {
          flex: 0 0 auto;
        }
        @media (max-width: 420px) {
          .map-actions {
            gap: 6px;
            padding: 10px 12px 14px;
          }
          .map-action {
            min-height: 36px;
            font-size: 0.72rem;
            padding: 6px 8px;
          }
          .map-luxury-marker {
            width: 34px;
            height: 34px;
            margin-top: -38px;
          }
          .map-luxury-marker svg {
            width: 15px;
            height: 15px;
          }
        }
      `}</style>
    </div>
  );
}
