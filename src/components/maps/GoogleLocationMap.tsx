"use client";

import { useEffect, useRef } from "react";

type LatLng = { lat: number; lng: number };

export type GoogleLocationMapProps = {
  /** The pin. null on both means "no point chosen yet" — the map shows `center` with no marker. */
  latitude: number | null;
  longitude: number | null;
  /** Where to look when there is no pin. */
  center: LatLng & { zoom: number };
  /** Omit to make the map read-only: no click-to-pick, no dragging. */
  onPick?: (lat: number, lng: number) => void;
  /** Coordinate precision handed back to the caller. Six decimals ≈ 11 cm. */
  precision?: number;
  className?: string;
  style?: React.CSSProperties;
};

/** Imperative handles kept out of React state — a map is not a value to re-render. */
type MapRefs = {
  map: google.maps.Map | null;
  marker: google.maps.Marker | null;
  listeners: google.maps.MapsEventListener[];
};

/**
 * One Google map, shared by every picker on the platform.
 *
 * The Maps API is imperative and long-lived: the map is created once into a
 * div and then mutated. So the instance lives in a ref, the effects that
 * create it and the effects that update it are separate, and `onPick` is read
 * through a ref — otherwise every keystroke in the parent form would tear the
 * map down and rebuild it, losing the user's zoom and pan.
 *
 * The caller must have confirmed `useGoogleMaps()` is "ready" before rendering
 * this; it does not load the API itself.
 */
export default function GoogleLocationMap({
  latitude, longitude, center, onPick, precision = 6, className, style,
}: GoogleLocationMapProps) {
  const container = useRef<HTMLDivElement | null>(null);
  const refs = useRef<MapRefs>({ map: null, marker: null, listeners: [] });
  const pickRef = useRef(onPick);
  // Kept current after every render so the map's long-lived click and drag
  // listeners always call the parent's latest handler without being rebuilt.
  useEffect(() => { pickRef.current = onPick; });

  const hasPoint = latitude != null && longitude != null;
  const round = (n: number) => Number(n.toFixed(precision));

  // Create the map once, and tear down its listeners on unmount.
  useEffect(() => {
    const element = container.current;
    if (!element || refs.current.map) return;
    const maps = window.google?.maps;
    if (!maps) return;

    const map = new maps.Map(element, {
      center: hasPoint ? { lat: latitude, lng: longitude } : { lat: center.lat, lng: center.lng },
      zoom: hasPoint ? 15 : center.zoom,
      mapTypeControl: true,
      streetViewControl: false,
      fullscreenControl: true,
      // A map inside a scrolling form must not swallow the page scroll:
      // "cooperative" pans on drag and zooms only with ctrl/⌘ + wheel.
      gestureHandling: "cooperative",
      clickableIcons: false,
    });
    refs.current.map = map;

    if (pickRef.current) {
      refs.current.listeners.push(
        map.addListener("click", (event) => {
          const point = event.latLng;
          if (point) pickRef.current?.(round(point.lat()), round(point.lng()));
        }),
      );
    }

    const current = refs.current;
    return () => {
      for (const listener of current.listeners) listener.remove();
      current.listeners = [];
      current.marker?.setMap(null);
      current.marker = null;
      current.map = null;
    };
    // Deliberately once: the map is created with the position it has at mount
    // and moved by the effects below. Re-running this would rebuild the map.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Follow the pin: move the marker, create it on the first pick, remove it if the point is cleared.
  useEffect(() => {
    const map = refs.current.map;
    const maps = window.google?.maps;
    if (!map || !maps) return;

    if (!hasPoint) {
      refs.current.marker?.setMap(null);
      refs.current.marker = null;
      return;
    }

    const position = { lat: latitude, lng: longitude };
    if (!refs.current.marker) {
      const marker = new maps.Marker({
        map,
        position,
        draggable: Boolean(pickRef.current),
        cursor: pickRef.current ? "grab" : undefined,
      });
      if (pickRef.current) {
        refs.current.listeners.push(
          marker.addListener("dragend", () => {
            const point = marker.getPosition();
            if (point) pickRef.current?.(round(point.lat()), round(point.lng()));
          }),
        );
      }
      refs.current.marker = marker;
    } else {
      refs.current.marker.setPosition(position);
    }
    map.setCenter(position);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasPoint, latitude, longitude]);

  // With no pin, follow the country/city the form is pointing at.
  useEffect(() => {
    const map = refs.current.map;
    if (!map || hasPoint) return;
    map.setCenter({ lat: center.lat, lng: center.lng });
    map.setZoom(center.zoom);
  }, [hasPoint, center.lat, center.lng, center.zoom]);

  return <div ref={container} className={className} style={style} dir="ltr" role="application" aria-label="خريطة تحديد الموقع" />;
}
