'use client';

import dynamic from 'next/dynamic';
import GoogleLocationMap from '@/src/components/maps/GoogleLocationMap';
import { useGoogleMaps } from '@/src/components/maps/useGoogleMaps';

const PropertyLocationMapLeaflet = dynamic(() => import('./PropertyLocationMapLeaflet'), { ssr: false });

type Props = {
  latitude: number | null;
  longitude: number | null;
  center: { lat: number; lng: number; zoom: number };
  onPick: (lat: number, lng: number) => void;
};

const FRAME = 'w-full overflow-hidden rounded-xl border border-[color:var(--color-border)]';

/**
 * The property location picker: Google Maps where a key is configured,
 * OpenStreetMap where it is not.
 *
 * The fallback is the point. The key is a runtime setting that can be missing,
 * revoked, or over quota, and an office in the middle of listing a property
 * must still be able to drop a pin — so an unavailable Google API returns the
 * map the platform has always had rather than an empty rectangle.
 *
 * Must be loaded with next/dynamic({ ssr: false }).
 */
export default function PropertyLocationMap({ latitude, longitude, center, onPick }: Props) {
  const maps = useGoogleMaps();

  if (maps.status === 'loading') {
    return <div className={`${FRAME} h-[280px] animate-pulse bg-[color:var(--color-surface-muted)]`} aria-busy="true" aria-label="جارٍ تحميل الخريطة" />;
  }

  if (maps.status === 'ready') {
    return (
      <GoogleLocationMap
        latitude={latitude}
        longitude={longitude}
        center={center}
        onPick={onPick}
        className={FRAME}
        style={{ height: 280 }}
      />
    );
  }

  return <PropertyLocationMapLeaflet latitude={latitude} longitude={longitude} center={center} onPick={onPick} />;
}
