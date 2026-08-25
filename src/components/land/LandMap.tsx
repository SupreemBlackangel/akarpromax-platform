'use client';

import { useEffect, useRef } from 'react';
import type { Map as LeafletMap, Marker as LeafletMarker } from 'leaflet';

export type LandMapParcel = {
  id: string;
  title: string;
  type: string;
  status: string;
  price: string | number | null;
  latitude: string | number | null;
  longitude: string | number | null;
};

type LandMapProps = {
  parcels: LandMapParcel[];
  selectedParcel: LandMapParcel | null;
  onSelectParcel: (parcel: LandMapParcel) => void;
};

export function LandMap({ parcels, onSelectParcel }: LandMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!mapRef.current) return;

    let map: LeafletMap | null = null;

    import('leaflet').then(async (leafletMod) => {
      const L = leafletMod.default;
      delete (L.Icon.Default.prototype as { _getIconUrl?: unknown })._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      });

      map = L.map(mapRef.current!).setView([23.5880, 58.3829], 10);

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors',
        maxZoom: 18,
      }).addTo(map);

      const validParcels = parcels.filter((p) => p.latitude && p.longitude);
      const markers: LeafletMarker[] = [];

      for (const parcel of validParcels) {
        const lat = parseFloat(String(parcel.latitude));
        const lng = parseFloat(String(parcel.longitude));
        if (isNaN(lat) || isNaN(lng)) continue;

        const color = parcel.status === 'available' ? 'green' : parcel.status === 'sold' ? 'red' : 'blue';
        const icon = L.divIcon({
          className: 'land-marker',
          html: `<div style="width:12px;height:12px;border-radius:50%;background:${color};border:2px solid white;box-shadow:0 1px 3px rgba(0,0,0,0.3);"></div>`,
          iconSize: [12, 12],
          iconAnchor: [6, 6],
        });

        const marker = L.marker([lat, lng], { icon }).addTo(map);
        marker.bindPopup(`
          <div style="font-family:sans-serif;">
            <strong>${parcel.title}</strong><br/>
            <span style="text-transform:capitalize;">${parcel.type}</span> · ${parcel.status}<br/>
            ${parcel.price ? `${Number(parcel.price).toLocaleString()} OMR` : ''}
          </div>
        `);
        marker.on('click', () => onSelectParcel(parcel));
        markers.push(marker);
      }

      if (markers.length > 0) {
        const group = L.featureGroup(markers);
        map.fitBounds(group.getBounds().pad(0.1));
      }
    }).catch(() => {
      if (mapRef.current) {
        mapRef.current.innerHTML = '<div class="flex items-center justify-center h-full text-sm text-gray-400">Map unavailable</div>';
      }
    });

    return () => {
      if (map) {
        map.remove();
        map = null;
      }
    };
  }, [parcels]);

  return (
    <div ref={mapRef} className="w-full h-full rounded-xl" />
  );
}
