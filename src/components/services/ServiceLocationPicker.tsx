"use client";

import dynamic from "next/dynamic";
import GoogleLocationMap from "@/src/components/maps/GoogleLocationMap";
import { useGoogleMaps } from "@/src/components/maps/useGoogleMaps";

const ServiceLocationPickerLeaflet = dynamic(() => import("./ServiceLocationPickerLeaflet"), { ssr: false });

type Coordinates = { latitude: number; longitude: number };

type Props = {
  latitude: number;
  longitude: number;
  /** false while the requester has not pinned the service point yet — no marker is drawn. */
  selected?: boolean;
  onChange: (value: Coordinates) => void;
};

const FRAME = "h-[320px] w-full overflow-hidden rounded-2xl border border-[var(--color-border)]";

/**
 * Where the service is needed. Google Maps where a key is configured,
 * OpenStreetMap otherwise (see PropertyLocationMap for why the fallback
 * exists).
 */
export default function ServiceLocationPicker({ latitude, longitude, selected = true, onChange }: Props) {
  const maps = useGoogleMaps();

  if (maps.status === "loading") {
    return <div className={`${FRAME} animate-pulse bg-[var(--color-surface-muted)]`} aria-busy="true" aria-label="جارٍ تحميل الخريطة" />;
  }

  if (maps.status === "ready") {
    return (
      <GoogleLocationMap
        latitude={selected ? latitude : null}
        longitude={selected ? longitude : null}
        center={{ lat: latitude, lng: longitude, zoom: 13 }}
        onPick={(lat, lng) => onChange({ latitude: lat, longitude: lng })}
        precision={7}
        className={FRAME}
        style={{ height: 320 }}
      />
    );
  }

  return <ServiceLocationPickerLeaflet latitude={latitude} longitude={longitude} selected={selected} onChange={onChange} />;
}
