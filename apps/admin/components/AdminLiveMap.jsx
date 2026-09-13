"use client";

import { useMemo } from "react";

const TILE = 256;
const ZOOM = 14;
const HEIGHT = 330;

function valid(p) {
  const lat = Number(p?.lat), lon = Number(p?.lon);
  return Number.isFinite(lat) && Number.isFinite(lon) && lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180;
}
function project(lat, lon) {
  const scale = TILE * 2 ** ZOOM;
  const safeLat = Math.max(-85.05112878, Math.min(85.05112878, Number(lat)));
  const sin = Math.sin((safeLat * Math.PI) / 180);
  return { x: ((Number(lon) + 180) / 360) * scale, y: (0.5 - Math.log((1 + sin) / (1 - sin)) / (4 * Math.PI)) * scale };
}
function Marker({ point, center, label, kind }) {
  if (!valid(point) || !valid(center)) return null;
  const p = project(point.lat, point.lon), c = project(center.lat, center.lon);
  const x = p.x - c.x, y = p.y - c.y;
  return <div style={{ position: "absolute", left: `calc(50% + ${x}px)`, top: `calc(50% + ${y}px)`, transform: "translate(-50%,-50%)", zIndex: kind === "driver" ? 5 : 3, pointerEvents: "none" }}><div style={{ width: kind === "driver" ? 40 : 18, height: kind === "driver" ? 40 : 18, borderRadius: "50%", background: kind === "driver" ? "#6D28D9" : kind === "pickup" ? "#0A7FA6" : "#EF4444", border: "3px solid #fff", boxShadow: "0 3px 14px rgba(13,27,42,.3)", display: "grid", placeItems: "center", color: "#fff", fontSize: kind === "driver" ? 18 : 9 }}>{kind === "driver" ? "🚗" : kind === "pickup" ? "P" : "D"}</div><span style={{ position: "absolute", left: "50%", top: "calc(100% + 4px)", transform: "translateX(-50%)", whiteSpace: "nowrap", padding: "3px 6px", borderRadius: 6, background: "rgba(13,27,42,.86)", color: "#fff", fontSize: 9, fontWeight: 800 }}>{label}</span></div>;
}

export default function AdminLiveMap({ pickup, destination, driverLocation, driverName, status }) {
  const center = useMemo(() => valid(driverLocation) ? driverLocation : valid(pickup) ? pickup : destination, [driverLocation, pickup, destination]);
  const centerPx = valid(center) ? project(center.lat, center.lon) : { x: 0, y: 0 };
  const tileX = Math.floor(centerPx.x / TILE), tileY = Math.floor(centerPx.y / TILE);
  const offsetX = TILE / 2 - (centerPx.x - tileX * TILE), offsetY = HEIGHT / 2 - (centerPx.y - tileY * TILE);
  const tiles = [];
  for (let dx = -2; dx <= 2; dx += 1) for (let dy = -2; dy <= 2; dy += 1) {
    const x = tileX + dx, y = tileY + dy, max = 2 ** ZOOM;
    if (y < 0 || y >= max) continue;
    const wrapped = ((x % max) + max) % max;
    tiles.push(<img key={`${x}:${y}`} src={`https://tile.openstreetmap.org/${ZOOM}/${wrapped}/${y}.png`} alt="" draggable="false" style={{ position: "absolute", width: TILE, height: TILE, left: offsetX + dx * TILE, top: offsetY + dy * TILE, maxWidth: "none", userSelect: "none" }} />);
  }
  return <div style={{ position: "relative", width: "100%", height: HEIGHT, overflow: "hidden", borderRadius: 14, background: "#e9eef2", border: "1px solid #D8DEE8" }}><div style={{ position: "absolute", inset: 0 }}>{tiles}</div><Marker point={pickup} center={center} label="Pickup" kind="pickup" /><Marker point={destination} center={center} label="Destination" kind="destination" />{valid(driverLocation) && <Marker point={driverLocation} center={center} label={driverName || "Driver"} kind="driver" />}<div style={{ position: "absolute", left: 10, top: 10, padding: "7px 9px", borderRadius: 9, background: "rgba(255,255,255,.94)", border: "1px solid rgba(255,255,255,.8)", boxShadow: "0 4px 14px rgba(13,27,42,.12)", fontSize: 10, fontWeight: 900, textTransform: "uppercase" }}>{valid(driverLocation) ? `LIVE · ${String(status || "").replace(/_/g, " ")}` : "Waiting for driver location"}</div></div>;
}
