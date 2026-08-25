'use client';

import { useEffect } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { MapContainer, TileLayer, Marker } from 'react-leaflet';

const markerIcon = L.divIcon({
  className: 'custom-div-icon',
  html: `<div style="background-color:#2563eb;width:16px;height:16px;border-radius:50%;border:3px solid #fff;box-shadow:0 0 6px rgba(0,0,0,.45);"></div>`,
  iconSize: [16, 16],
  iconAnchor: [8, 8],
});

/**
 * Read-only property location map for the public detail page.
 * Must be loaded with next/dynamic({ ssr: false }).
 */
export default function PropertyDetailMap({ latitude, longitude }: { latitude: number; longitude: number }) {
  useEffect(() => {
    delete (L.Icon.Default.prototype as unknown as { _getIconUrl?: unknown })._getIconUrl;
  }, []);

  return (
    <MapContainer
      center={[latitude, longitude]}
      zoom={14}
      style={{ height: 300, width: '100%', borderRadius: 16, zIndex: 0 }}
      scrollWheelZoom={false}
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
      />
      <Marker position={[latitude, longitude]} icon={markerIcon} />
    </MapContainer>
  );
}
