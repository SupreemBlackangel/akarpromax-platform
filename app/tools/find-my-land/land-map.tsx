"use client";

import { useEffect, useMemo } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { MapContainer, TileLayer, Marker, Polyline, Polygon } from "react-leaflet";

type Coordinate = { lat: number; lng: number };

type LandMapProps = {
  coordinates: Coordinate[];
  center?: Coordinate | null;
  detectedColor?: string;
  manualColor?: string;
};

function makeMarkerIcon(color: string) {
  return L.divIcon({
    className: "custom-div-icon",
    html: `<div style="background-color:${color};width:14px;height:14px;border-radius:50%;border:2px solid #fff;box-shadow:0 0 4px rgba(0,0,0,.4);"></div>`,
    iconSize: [14, 14],
    iconAnchor: [7, 7],
  });
}

export function LandMap({
  coordinates,
  center,
  detectedColor = "#2563eb",
  manualColor = "#f97316",
}: LandMapProps) {
  useEffect(() => {
    delete (L.Icon.Default.prototype as unknown as { _getIconUrl?: unknown })._getIconUrl;
  }, []);

  const detectedIcon = useMemo(() => makeMarkerIcon(detectedColor), [detectedColor]);
  const manualIcon = useMemo(() => makeMarkerIcon(manualColor), [manualColor]);

  const mapCenter: [number, number] = useMemo(() => {
    if (coordinates.length > 0) return [coordinates[0].lat, coordinates[0].lng];
    if (center) return [center.lat, center.lng];
    return [0, 0];
  }, [coordinates, center]);

  const closedCoordinates = coordinates.length > 2 ? [...coordinates, coordinates[0]] : coordinates;

  return (
    <MapContainer center={mapCenter} zoom={16} style={{ height: "100%", width: "100%" }}>
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {closedCoordinates.length > 2 && (
        <Polygon
          positions={closedCoordinates.map((c) => [c.lat, c.lng])}
          pathOptions={{ color: detectedColor, fillColor: detectedColor, fillOpacity: 0.2 }}
        />
      )}
      {coordinates.length === 2 && (
        <Polyline positions={coordinates.map((c) => [c.lat, c.lng])} pathOptions={{ color: detectedColor }} />
      )}
      {coordinates.map((c, i) => (
        <Marker key={`${c.lat}-${c.lng}-${i}`} position={[c.lat, c.lng]} icon={manualIcon} />
      ))}
      {center && <Marker position={[center.lat, center.lng]} icon={detectedIcon} />}
    </MapContainer>
  );
}
