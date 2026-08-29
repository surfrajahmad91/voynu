"use client";

import { useEffect, useMemo, useState } from "react";

const TILE_SIZE = 256;
const MAP_HEIGHT = 280;
const OSM = "https://tile.openstreetmap.org";

function validPoint(point) {
  const lat = Number(point?.lat);
  const lon = Number(point?.lon);
  return Number.isFinite(lat) && Number.isFinite(lon) && lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180;
}

function project(lat, lon, zoom) {
  const scale = TILE_SIZE * 2 ** zoom;
  const sin = Math.sin((Number(lat) * Math.PI) / 180);
  const x = ((Number(lon) + 180) / 360) * scale;
  const y = (0.5 - Math.log((1 + Math.max(-0.9999, Math.min(0.9999, sin))) / (1 - Math.max(-0.9999, Math.min(0.9999, sin)))) / (4 * Math.PI)) * scale;
  return { x, y };
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function chooseZoom(points, width) {
  const valid = points.filter(validPoint);
  if (valid.length < 2) return 13;
  const lats = valid.map((p) => Number(p.lat));
  const lons = valid.map((p) => Number(p.lon));
  const latSpan = Math.max(...lats) - Math.min(...lats);
  const lonSpan = Math.max(...lons) - Math.min(...lons);
  const span = Math.max(latSpan, lonSpan * Math.cos((Math.max(...lats) * Math.PI) / 180), 0.002);
  const usable = Math.max(220, Math.min(width - 40, 520));
  return clamp(Math.floor(Math.log2((usable * 360) / (span * 256 * 1.7))), 6, 16);
}

function Marker({ point, center, zoom, type, transition = true }) {
  if (!validPoint(point)) return null;
  const p = project(point.lat, point.lon, zoom);
  const c = project(center.lat, center.lon, zoom);
  const x = MAP_HEIGHT ? p.x - c.x : 0;
  const y = p.y - c.y;
  const icon = type === "driver" ? "🚗" : type === "destination" ? "●" : "●";
  const size = type === "driver" ? 38 : 18;
  return <div style={{ position: "absolute", left: "50%", top: "50%", width: size, height: size, transform: `translate(calc(-50% + ${x}px), calc(-50% + ${y}px))`, transition: transition ? "transform 4.4s linear" : "none", zIndex: type === "driver" ? 5 : 3, pointerEvents: "none" }}>
    {type === "driver" ? <div style={{ width: 38, height: 38, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", background: "#0b8750", border: "3px solid #ffffff", boxShadow: "0 3px 12px rgba(0,0,0,.25)", fontSize: 19 }}>{icon}</div> : <div style={{ width: size, height: size, borderRadius: "50%", background: type === "destination" ? "#c96a2b" : "#0b8750", border: "3px solid #fff", boxShadow: "0 2px 8px rgba(0,0,0,.25)" }} />}
  </div>;
}

export default function LiveTripMap({ pickup, destination, driverLocation, targetType = "pickup", compact = false }) {
  const [width, setWidth] = useState(360);
  const [driverPoint, setDriverPoint] = useState(driverLocation || null);

  useEffect(() => setDriverPoint(driverLocation || null), [driverLocation?.lat, driverLocation?.lon]);

  useEffect(() => {
    const measure = () => setWidth(Math.max(280, document.documentElement.clientWidth - 32));
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);

  const target = targetType === "destination" ? destination : pickup;
  const points = useMemo(() => [pickup, destination, driverPoint].filter(validPoint), [pickup, destination, driverPoint]);
  const zoom = chooseZoom(points, width);
  const center = useMemo(() => {
    const usable = points.length ? points : [pickup, destination];
    const lat = usable.reduce((sum, p) => sum + Number(p.lat), 0) / usable.length;
    const lon = usable.reduce((sum, p) => sum + Number(p.lon), 0) / usable.length;
    return { lat, lon };
  }, [points, pickup, destination]);

  const centerPx = project(center.lat, center.lon, zoom);
  const tileX = Math.floor(centerPx.x / TILE_SIZE);
  const tileY = Math.floor(centerPx.y / TILE_SIZE);
  const offsetX = width / 2 - (centerPx.x - tileX * TILE_SIZE);
  const offsetY = MAP_HEIGHT / 2 - (centerPx.y - tileY * TILE_SIZE);
  const tiles = [];
  for (let dx = -2; dx <= 2; dx += 1) {
    for (let dy = -2; dy <= 2; dy += 1) {
      const x = tileX + dx;
      const y = tileY + dy;
      const max = 2 ** zoom;
      if (y < 0 || y >= max) continue;
      const wrappedX = ((x % max) + max) % max;
      tiles.push(<img key={`${zoom}-${x}-${y}`} src={`${OSM}/${zoom}/${wrappedX}/${y}.png`} alt="" draggable="false" style={{ position: "absolute", width: TILE_SIZE, height: TILE_SIZE, left: offsetX + dx * TILE_SIZE, top: offsetY + dy * TILE_SIZE, userSelect: "none" }} />);
    }
  }

  const targetLabel = targetType === "destination" ? "Destination" : targetType === "pickup" ? "Pickup" : "Journey route";
  return <div style={{ position: "relative", overflow: "hidden", height: compact ? 240 : MAP_HEIGHT, borderRadius: 16, border: "1px solid #dce6df", background: "#e7efe9", boxShadow: "0 8px 20px rgba(10,40,25,.06)" }}>
    <div style={{ position: "absolute", inset: 0 }}>{tiles}</div>
    <div style={{ position: "absolute", left: 0, top: 0, right: 0, bottom: 0, background: "linear-gradient(180deg, rgba(255,255,255,.12), rgba(255,255,255,.02))", pointerEvents: "none" }} />
    <Marker point={pickup} center={center} zoom={zoom} type="pickup" transition={false} />
    <Marker point={destination} center={center} zoom={zoom} type="destination" transition={false} />
    <Marker point={driverPoint} center={center} zoom={zoom} type="driver" />
    <div style={{ position: "absolute", left: 12, top: 12, padding: "7px 10px", borderRadius: 20, background: "rgba(255,255,255,.94)", color: "#173c2a", fontSize: 11, fontWeight: 800, boxShadow: "0 2px 8px rgba(0,0,0,.12)" }}>{driverPoint ? `Driver → ${targetLabel}` : "Waiting for driver's live location"}</div>
    <div style={{ position: "absolute", left: 12, bottom: 9, padding: "3px 6px", borderRadius: 5, background: "rgba(255,255,255,.88)", color: "#59665f", fontSize: 8.5 }}>© OpenStreetMap contributors</div>
    <div style={{ position: "absolute", right: 10, bottom: 10, padding: "6px 9px", borderRadius: 10, background: "rgba(255,255,255,.94)", color: "#43544c", fontSize: 10, fontWeight: 700 }}>{targetLabel}</div>
  </div>;
}
