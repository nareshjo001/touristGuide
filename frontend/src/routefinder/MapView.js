import React, { useEffect, useMemo } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Polyline,
  Popup,
  CircleMarker,
  useMap,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: require("leaflet/dist/images/marker-icon-2x.png"),
  iconUrl: require("leaflet/dist/images/marker-icon.png"),
  shadowUrl: require("leaflet/dist/images/marker-shadow.png"),
});

// ✅ Helper to auto-fit map to district bounds
function FitBounds({ districtData }) {
  const map = useMap();

  useEffect(() => {
    if (!districtData?.nodes?.length) return;

    const bounds = L.latLngBounds(
      districtData.nodes.map((n) => [n.lat, n.lon])
    );
    map.fitBounds(bounds, { padding: [50, 50] });
  }, [districtData, map]);

  return null;
}

export default function MapView({ district, districtData, planResult, pathResult }) {
  const center = useMemo(() => {
    if (districtData?.nodes?.length > 0) {
      const avgLat =
        districtData.nodes.reduce((sum, n) => sum + n.lat, 0) /
        districtData.nodes.length;
      const avgLon =
        districtData.nodes.reduce((sum, n) => sum + n.lon, 0) /
        districtData.nodes.length;
      return [avgLat, avgLon];
    }
    return [13.0827, 80.2707]; // fallback (Chennai)
  }, [districtData]);

  const markers = useMemo(() => {
    if (!districtData?.nodes) return [];
    return districtData.nodes.map((n) => ({ id: n.id, lat: n.lat, lon: n.lon }));
  }, [districtData]);

  const planCoords = useMemo(() => {
    if (!planResult || !districtData) return [];
    return planResult.order.map((name) => districtData.coords[name]);
  }, [planResult, districtData]);

  const pathCoords = useMemo(() => pathResult?.path_coords || [], [pathResult]);

  return (
    <div className="map-box">
      <MapContainer center={center} zoom={11} style={{ height: "100%", width: "100%" }}>
        <TileLayer
          attribution='&copy; OpenStreetMap contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* ✅ Auto-fit to district region */}
        <FitBounds districtData={districtData} />

        {markers.map((m) => (
          <Marker key={m.id} position={[m.lat, m.lon]}>
            <Popup>{m.id}</Popup>
          </Marker>
        ))}

        {planCoords.length > 1 && (
          <Polyline positions={planCoords} color="orange" weight={4} />
        )}

        {pathCoords.length > 1 && (
          <Polyline positions={pathCoords} color="red" weight={5} />
        )}

        {pathCoords.map((c, idx) => (
          <CircleMarker
            key={"p" + idx}
            center={c}
            radius={6}
            color={
              idx === 0
                ? "green"
                : idx === pathCoords.length - 1
                ? "darkred"
                : "blue"
            }
          />
        ))}
      </MapContainer>

      <div className="map-legend">
        {planResult && (
          <div>
            Planned route total: <strong>{planResult.total_distance_km} km</strong>
          </div>
        )}
        {pathResult && (
          <div>
            Path distance: <strong>{pathResult.total_distance_km} km</strong> — ETA:{" "}
            {pathResult.estimated_time_minutes} min
          </div>
        )}
      </div>
    </div>
  );
}