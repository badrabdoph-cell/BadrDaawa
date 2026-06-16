/* Google Maps JavaScript API type declarations (CDN-loaded, no npm package) */

declare namespace google.maps {
  class Map {
    constructor(element: HTMLElement, opts?: MapOptions);
    getCenter(): LatLng;
    setCenter(center: LatLngLiteral | LatLng): void;
    getZoom(): number;
    setZoom(zoom: number): void;
    setOptions(opts: MapOptions): void;
    getDiv(): HTMLElement;
  }

  interface MapOptions {
    center?: LatLngLiteral | LatLng;
    zoom?: number;
    mapTypeId?: MapTypeId | string;
    tilt?: number;
    heading?: number;
    gestureHandling?: "cooperative" | "greedy" | "none";
    zoomControl?: boolean;
    mapTypeControl?: boolean;
    fullscreenControl?: boolean;
    streetViewControl?: boolean;
    rotateControl?: boolean;
  }

  interface MapTypeId {
    HYBRID: "hybrid";
    SATELLITE: "satellite";
    ROADMAP: "roadmap";
    TERRAIN: "terrain";
  }

  const MapTypeId: MapTypeId;

  class LatLng {
    constructor(lat: number, lng: number, noWrap?: boolean);
    lat(): number;
    lng(): number;
  }

  interface LatLngLiteral {
    lat: number;
    lng: number;
  }

  class Geocoder {
    constructor();
    geocode(
      request: GeocoderRequest,
      callback: (results: GeocoderResult[] | null, status: GeocoderStatus) => void,
    ): void;
  }

  interface GeocoderRequest {
    address?: string;
    location?: LatLng | LatLngLiteral;
    placeId?: string;
    bounds?: LatLngBounds | LatLngBoundsLiteral;
    componentRestrictions?: GeocoderComponentRestrictions;
    region?: string;
  }

  interface GeocoderComponentRestrictions {
    administrativeArea?: string;
    country?: string;
    locality?: string;
    postalCode?: string;
    route?: string;
  }

  interface GeocoderResult {
    address_components: GeocoderAddressComponent[];
    formatted_address: string;
    geometry: GeocoderGeometry;
    place_id: string;
    types: string[];
    partial_match?: boolean;
  }

  interface GeocoderAddressComponent {
    long_name: string;
    short_name: string;
    types: string[];
  }

  interface GeocoderGeometry {
    location: LatLng;
    location_type: string;
    viewport: LatLngBounds;
    bounds?: LatLngBounds;
  }

  type GeocoderStatus =
    | "OK"
    | "ZERO_RESULTS"
    | "OVER_QUERY_LIMIT"
    | "REQUEST_DENIED"
    | "INVALID_REQUEST"
    | "UNKNOWN_ERROR"
    | "ERROR";

  class LatLngBounds {
    constructor(sw?: LatLngLiteral | LatLng, ne?: LatLngLiteral | LatLng);
    extend(point: LatLngLiteral | LatLng): LatLngBounds;
  }

  interface LatLngBoundsLiteral {
    east: number;
    north: number;
    south: number;
    west: number;
  }

  namespace event {
    function addListener(
      instance: object,
      eventName: string,
      handler: (...args: unknown[]) => void,
    ): void;
  }
}

interface Window {
  google?: {
    maps?: typeof google.maps;
  };
}
