/**
 * The slice of the Google Maps JavaScript API this platform uses.
 *
 * @types/google.maps is ~9k lines describing an API surface of which we touch
 * a map, a marker and two events. Declaring that slice here keeps the contract
 * visible and reviewable, and keeps a dependency out of the build for types
 * that never reach runtime. Widen it when a map needs more, and only then.
 */
declare namespace google.maps {
  type LatLngLiteral = { lat: number; lng: number };

  interface LatLng {
    lat(): number;
    lng(): number;
  }

  interface MapMouseEvent {
    latLng: LatLng | null;
  }

  interface MapOptions {
    center?: LatLngLiteral;
    zoom?: number;
    mapTypeId?: string;
    mapTypeControl?: boolean;
    streetViewControl?: boolean;
    fullscreenControl?: boolean;
    scrollwheel?: boolean;
    gestureHandling?: "cooperative" | "greedy" | "none" | "auto";
    clickableIcons?: boolean;
    zoomControl?: boolean;
  }

  class Map {
    constructor(element: HTMLElement, options?: MapOptions);
    setCenter(position: LatLngLiteral): void;
    setZoom(zoom: number): void;
    getZoom(): number | undefined;
    addListener(event: string, handler: (event: MapMouseEvent) => void): MapsEventListener;
  }

  interface MarkerOptions {
    map?: Map | null;
    position?: LatLngLiteral;
    draggable?: boolean;
    title?: string;
    cursor?: string;
  }

  /**
   * google.maps.Marker is deprecated in favour of AdvancedMarkerElement, which
   * requires a cloud-configured Map ID. Marker keeps working (Google commits to
   * at least 12 months' notice and continued support) and needs no Map ID, so
   * the platform stays on it until a Map ID is part of the configuration.
   */
  class Marker {
    constructor(options?: MarkerOptions);
    setPosition(position: LatLngLiteral): void;
    setMap(map: Map | null): void;
    getPosition(): LatLng | null;
    addListener(event: string, handler: (event: MapMouseEvent) => void): MapsEventListener;
  }

  interface MapsEventListener {
    remove(): void;
  }

  namespace event {
    function clearInstanceListeners(instance: object): void;
  }
}

interface Window {
  google?: typeof google;
}
