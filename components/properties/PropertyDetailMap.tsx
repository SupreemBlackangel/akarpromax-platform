'use client';

import dynamic from 'next/dynamic';
import GoogleLocationMap from '@/src/components/maps/GoogleLocationMap';
import { useGoogleMaps } from '@/src/components/maps/useGoogleMaps';

const PropertyDetailMapLeaflet = dynamic(() => import('./PropertyDetailMapLeaflet'), { ssr: false });

const FRAME = 'w-full overflow-hidden rounded-2xl border border-[color:var(--color-border)]';

/**
 * The property's location on the public detail page — read-only: no click to
 * pick, no draggable pin. Google Maps where a key is configured, OpenStreetMap
 * otherwise (see PropertyLocationMap for why the fallback exists).
 *
 * Must be loaded with next/dynamic({ ssr: false }).
 */
export default function PropertyDetailMap({ latitude, longitude }: { latitude: number; longitude: number }) {
  const maps = useGoogleMaps();

  if (maps.status === 'loading') {
    return <div className={`${FRAME} h-[300px] animate-pulse bg-[color:var(--color-surface-muted)]`} aria-busy="true" aria-label="جارٍ تحميل الخريطة" />;
  }

  if (maps.status === 'ready') {
    return (
      <GoogleLocationMap
        latitude={latitude}
        longitude={longitude}
        center={{ lat: latitude, lng: longitude, zoom: 15 }}
        className={FRAME}
        style={{ height: 300 }}
      />
    );
  }

  return <PropertyDetailMapLeaflet latitude={latitude} longitude={longitude} />;
}
