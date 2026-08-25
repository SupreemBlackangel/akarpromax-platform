"use client";

import { useEffect } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { MapContainer, Marker, TileLayer, useMap, useMapEvents } from "react-leaflet";

type Coordinates = { latitude: number; longitude: number };

const markerIcon = L.divIcon({
  className: "ak-service-location-marker",
  html: '<span style="display:grid;place-items:center;width:34px;height:34px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);background:#2563eb;border:3px solid white;box-shadow:0 5px 14px rgba(15,23,42,.3)"><span style="width:8px;height:8px;border-radius:50%;background:white"></span></span>',
  iconSize: [34, 34],
  iconAnchor: [17, 34],
});

function MapInteraction({ position, selected, onChange }: { position: Coordinates; selected: boolean; onChange: (value: Coordinates) => void }) {
  const map = useMap();
  useEffect(() => {
    map.setView([position.latitude, position.longitude], map.getZoom(), { animate: true });
  }, [map, position.latitude, position.longitude]);
  useMapEvents({
    click(event) {
      onChange({ latitude: event.latlng.lat, longitude: event.latlng.lng });
    },
  });
  return selected ? <Marker position={[position.latitude, position.longitude]} icon={markerIcon} draggable eventHandlers={{ dragend(event) { const point = event.target.getLatLng(); onChange({ latitude: point.lat, longitude: point.lng }); } }} /> : null;
}

export default function ServiceLocationPicker({ latitude, longitude, selected = true, onChange }: { latitude: number; longitude: number; selected?: boolean; onChange: (value: Coordinates) => void }) {
  const position = { latitude, longitude };
  return (
    <div className="h-[320px] overflow-hidden rounded-2xl border border-[var(--color-border)] dark:border-[var(--color-border)]" dir="ltr">
      <MapContainer center={[latitude, longitude]} zoom={13} scrollWheelZoom style={{ height: "100%", width: "100%" }}>
        <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        <MapInteraction position={position} selected={selected} onChange={onChange} />
      </MapContainer>
    </div>
  );
}
