export type Coordinates = {
  lat: number;
  lng: number;
};

export function extractCoordinatesFromUrl(value: string): Coordinates | null {
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

export function getTextDestination(mapUrl: string, venue: string, city: string): string {
  if (!mapUrl) return [venue, city].filter(Boolean).join(" ").trim() || "Cairo Egypt";
  try {
    const parsed = new URL(mapUrl);
    const q = parsed.searchParams.get("q");
    if (q && !extractCoordinatesFromUrl(mapUrl)) return q;
    const placeMatch = parsed.pathname.match(/\/maps\/place\/([^/]+)/);
    if (placeMatch?.[1]) return decodeURIComponent(placeMatch[1].replace(/\+/g, " "));
  } catch {
    /* not a valid URL */
  }
  return [venue, city].filter(Boolean).join(" ").trim() || "Cairo Egypt";
}

export function isEmbedUrl(value: string) {
  return value.includes("/maps/embed") || value.includes("output=embed");
}

export function isShortLink(value: string) {
  try {
    const hostname = new URL(value).hostname;
    return hostname.includes("goo.gl") || hostname.includes("goo.la") || hostname.includes("shorturl.at") || hostname.includes("tinyurl.com") || hostname.includes("bit.ly");
  } catch {
    return false;
  }
}

export async function resolveShortLink(url: string): Promise<string | null> {
  try {
    const res = await fetch(`/api/resolve-url?url=${encodeURIComponent(url)}`);
    if (!res.ok) return null;
    const data = await res.json();
    return data.resolvedUrl || null;
  } catch {
    return null;
  }
}

export function tryMakeEmbedUrl(mapUrl: string): string | null {
  if (!mapUrl) return null;
  if (isEmbedUrl(mapUrl)) return mapUrl;
  if (isShortLink(mapUrl)) return null;
  try {
    const p = new URL(mapUrl);
    if (p.hostname.includes("google.") || p.hostname.includes("maps.google.")) {
      return `https://maps.google.com/maps${p.search}&output=embed&t=k&z=17`;
    }
  } catch {
    /* not a valid URL */
  }
  return null;
}
