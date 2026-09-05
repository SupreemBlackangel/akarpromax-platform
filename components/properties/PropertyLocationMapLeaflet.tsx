'use client';

import { useEffect, useMemo } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';

type Props = {
  latitude: number | null;
  longitude: number | null;
  center: { lat: number; lng: number; zoom: number };
  onPick: (lat: number, lng: number) => void;
};

const markerIcon = L.divIcon({
  className: 'custom-div-icon',
  html: `<div style="background-color:#2563eb;width:16px;height:16px;border-radius:50%;border:3px solid #fff;box-shadow:0 0 6px rgba(0,0,0,.45);"></div>`,
  iconSize: [16, 16],
  iconAnchor: [8, 8],
});

function ClickCatcher({ onPick }: { onPick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(event) {
      onPick(Number(event.latlng.lat.toFixed(6)), Number(event.latlng.lng.toFixed(6)));
    },
  });
  return null;
}

function Recenter({ center }: { center: { lat: number; lng: number; zoom: number } }) {
  const map = useMapEvents({});
  useEffect(() => {
    map.setView([center.lat, center.lng], center.zoom);
  }, [center.lat, center.lng, center.zoom, map]);
  return null;
}

/**
 * Property location picker map (leaflet, same stack as the rest of the app).
 * Click to set coordinates; the marker is draggable for fine adjustment.
 * Must be loaded with next/dynamic({ ssr: false }).
 */
export default function PropertyLocationMapLeaflet({ latitude, longitude, center, onPick }: Props) {
  useEffect(() => {
    delete (L.Icon.Default.prototype as unknown as { _getIconUrl?: unknown })._getIconUrl;
  }, []);

  const hasPoint = latitude != null && longitude != null;
  const view = useMemo(
    () => (hasPoint ? { lat: latitude as number, lng: longitude as number, zoom: 14 } : center),
    [hasPoint, latitude, longitude, center],
  );

  return (
    <MapContainer
      center={[view.lat, view.lng]}
      zoom={view.zoom}
      style={{ height: 280, width: '100%', borderRadius: 12, zIndex: 0 }}
      scrollWheelZoom={false}
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
      />
      <ClickCatcher onPick={onPick} />
      <Recenter center={view} />
      {hasPoint && (
        <Marker
          position={[latitude as number, longitude as number]}
          icon={markerIcon}
          draggable
          eventHandlers={{
            dragend: (event) => {
              const pos = (event.target as L.Marker).getLatLng();
              onPick(Number(pos.lat.toFixed(6)), Number(pos.lng.toFixed(6)));
            },
          }}
        />
      )}
    </MapContainer>
  );
}
