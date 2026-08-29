"use client";

import { useEffect, useMemo, useRef, useState } from "react";

const TILE_SIZE = 256;
const MAP_HEIGHT = 420;
const OSM = "https://tile.openstreetmap.org";
const ETA_REFRESH_MS = 60000;
const ROUTE_REFRESH_MS = 15000;
const ROUTE_MOVE_THRESHOLD_KM = 0.05;
const NAV_ZOOM = 16;

function validPoint(point) {
  const lat = Number(point?.lat);
  const lon = Number(point?.lon);
  return Number.isFinite(lat) && Number.isFinite(lon) && lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180;
}

function project(lat, lon, zoom) {
  const scale = TILE_SIZE * 2 ** zoom;
  const safeLat = Math.max(-85.05112878, Math.min(85.05112878, Number(lat)));
  const sin = Math.sin((safeLat * Math.PI) / 180);
  return {
    x: ((Number(lon) + 180) / 360) * scale,
    y: (0.5 - Math.log((1 + sin) / (1 - sin)) / (4 * Math.PI)) * scale,
  };
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function formatDuration(seconds) {
  if (!Number.isFinite(Number(seconds))) return "";
  const totalMinutes = Math.max(0, Math.round(Number(seconds) / 60));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return hours > 0 ? (minutes ? `${hours} hr ${minutes} min` : `${hours} hr`) : `${minutes} min`;
}

function formatDistance(meters) {
  const value = Number(meters);
  if (!Number.isFinite(value)) return "";
  if (value < 1000) return `${Math.max(10, Math.round(value / 10) * 10)} m`;
  return `${(value / 1000).toFixed(value >= 10000 ? 0 : 1)} km`;
}

function haversineKm(a, b) {
  if (!validPoint(a) || !validPoint(b)) return Infinity;
  const r = Math.PI / 180;
  const p1 = Number(a.lat) * r;
  const p2 = Number(b.lat) * r;
  const dp = (Number(b.lat) - Number(a.lat)) * r;
  const dl = (Number(b.lon) - Number(a.lon)) * r;
  const q = Math.sin(dp / 2) ** 2 + Math.cos(p1) * Math.cos(p2) * Math.sin(dl / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(q), Math.sqrt(1 - q));
}

function nearestRouteIndex(coordinates, point) {
  if (!Array.isArray(coordinates) || !coordinates.length || !validPoint(point)) return -1;
  let bestIndex = 0;
  let bestDistance = Infinity;
  for (let i = 0; i < coordinates.length; i += 1) {
    const [lon, lat] = coordinates[i] || [];
    if (!Number.isFinite(Number(lat)) || !Number.isFinite(Number(lon))) continue;
    const distance = haversineKm(point, { lat, lon });
    if (distance < bestDistance) {
      bestDistance = distance;
      bestIndex = i;
    }
  }
  return bestIndex;
}

function routeDistanceBetween(coordinates, startIndex, endIndex) {
  if (!Array.isArray(coordinates) || coordinates.length < 2) return 0;
  const start = clamp(Math.min(startIndex, endIndex), 0, coordinates.length - 1);
  const end = clamp(Math.max(startIndex, endIndex), 0, coordinates.length - 1);
  let total = 0;
  for (let i = start; i < end; i += 1) {
    const a = coordinates[i];
    const b = coordinates[i + 1];
    if (!a || !b) continue;
    total += haversineKm({ lat: a[1], lon: a[0] }, { lat: b[1], lon: b[0] }) * 1000;
  }
  return total;
}

function maneuverArrow(type, modifier) {
  const m = String(modifier || "").toLowerCase();
  if (type === "roundabout" || type === "rotary") return "↻";
  if (type === "uturn") return "↶";
  if (m.includes("sharp left")) return "↙";
  if (m.includes("left")) return "↰";
  if (m.includes("sharp right")) return "↘";
  if (m.includes("right")) return "↱";
  return "↑";
}

function instructionForStep(step, targetLabel) {
  if (!step) return { title: `Continue to ${targetLabel}`, detail: "Follow the highlighted route", arrow: "↑" };
  const type = String(step.maneuver || "").toLowerCase();
  const modifier = String(step.modifier || "").toLowerCase();
  const road = step.name || "";
  const arrow = maneuverArrow(type, modifier);
  if (type === "arrive") return { title: `Arrive at ${targetLabel}`, detail: "You are approaching your destination", arrow: "✓" };
  if (type === "depart") return { title: road ? `Head toward ${road}` : `Head toward ${targetLabel}`, detail: "Follow the highlighted route", arrow };
  if (type === "roundabout" || type === "rotary") {
    const exitText = step.exit ? ` — take exit ${step.exit}` : "";
    return { title: `Take the roundabout${exitText}`, detail: road ? `Continue on ${road}` : "Follow the highlighted route", arrow };
  }
  if (type === "merge") return { title: `Merge ${modifier || "ahead"}`, detail: road ? `Continue on ${road}` : "Follow the highlighted route", arrow };
  if (type === "fork") return { title: `Keep ${modifier || "ahead"}`, detail: road ? `Continue on ${road}` : "Follow the highlighted route", arrow };
  if (type === "on ramp" || type === "on_ramp") return { title: `Take the ramp ${modifier || "ahead"}`, detail: road ? `Continue on ${road}` : "Follow the highlighted route", arrow };
  if (type === "off ramp" || type === "off_ramp") return { title: `Take the exit ${modifier || "ahead"}`, detail: road ? `Continue on ${road}` : "Follow the highlighted route", arrow };
  if (type === "end of road" || type === "end_of_road") return { title: `Turn ${modifier || "ahead"} at the end of the road`, detail: road ? `Continue on ${road}` : "Follow the highlighted route", arrow };
  if (type === "new name" || type === "new_name" || type === "continue") return { title: road ? `Continue on ${road}` : "Continue straight", detail: "Stay on the highlighted route", arrow };
  if (modifier.includes("left")) return { title: `Turn left${road ? ` onto ${road}` : ""}`, detail: "Follow the highlighted route", arrow };
  if (modifier.includes("right")) return { title: `Turn right${road ? ` onto ${road}` : ""}`, detail: "Follow the highlighted route", arrow };
  return { title: road ? `Continue on ${road}` : "Continue ahead", detail: "Follow the highlighted route", arrow };
}

function Marker({ point, center, zoom, type }) {
  if (!validPoint(point) || !validPoint(center)) return null;
  const p = project(point.lat, point.lon, zoom);
  const c = project(center.lat, center.lon, zoom);
  const x = p.x - c.x;
  const y = p.y - c.y;
  const size = type === "driver" ? 44 : 20;
  return (
    <div style={{ position: "absolute", left: "50%", top: "50%", width: size, height: size, transform: `translate(calc(-50% + ${x}px), calc(-50% + ${y}px))`, zIndex: type === "driver" ? 8 : 4, pointerEvents: "none" }}>
      {type === "driver" ? (
        <div style={{ width: 44, height: 44, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", background: "#0b8750", border: "3px solid #fff", boxShadow: "0 3px 14px rgba(0,0,0,.28)", fontSize: 22 }}>🚗</div>
      ) : (
        <div style={{ width: size, height: size, borderRadius: "50%", background: type === "destination" ? "#c96a2b" : "#0b8750", border: "3px solid #fff", boxShadow: "0 2px 8px rgba(0,0,0,.25)" }} />
      )}
    </div>
  );
}

export default function LiveTripMap({ pickup, destination, driverLocation, targetType = "pickup", compact = false, trafficEta = false }) {
  const [width, setWidth] = useState(360);
  const [driverPoint, setDriverPoint] = useState(driverLocation || null);
  const [route, setRoute] = useState(null);
  const [routeStatus, setRouteStatus] = useState("waiting");
  const [etaText, setEtaText] = useState("");
  const driverRef = useRef(driverLocation || null);
  const lastRouteRef = useRef({ point: null, target: null, at: 0 });

  useEffect(() => {
    driverRef.current = driverLocation || null;
    setDriverPoint(driverLocation || null);
  }, [driverLocation?.lat, driverLocation?.lon]);

  useEffect(() => {
    const measure = () => setWidth(Math.max(280, document.documentElement.clientWidth - 32));
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);

  const target = targetType === "destination" ? destination : pickup;
  const mapHeight = compact ? 360 : MAP_HEIGHT;

  // During active navigation the camera follows the driver instead of fitting the whole trip into one bird's-eye view.
  const center = useMemo(() => {
    if (validPoint(driverPoint)) return driverPoint;
    if (validPoint(target)) return target;
    if (validPoint(pickup)) return pickup;
    return { lat: 0, lon: 0 };
  }, [driverPoint, target, pickup]);

  useEffect(() => {
    if (!validPoint(driverPoint) || !validPoint(target)) {
      setRoute(null);
      setRouteStatus("waiting");
      return;
    }
    const previous = lastRouteRef.current;
    const now = Date.now();
    const movedKm = haversineKm(previous.point, driverPoint);
    const targetChanged = !previous.target || Number(previous.target.lat) !== Number(target.lat) || Number(previous.target.lon) !== Number(target.lon);
    if (!targetChanged && now - previous.at < ROUTE_REFRESH_MS && movedKm < ROUTE_MOVE_THRESHOLD_KM) return;
    lastRouteRef.current = { point: driverPoint, target, at: now };
    let cancelled = false;
    const loadRoute = async () => {
      setRouteStatus("loading");
      try {
        const response = await fetch("/api/route-map", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ origin: driverPoint, destination: target }),
        });
        const data = await response.json();
        if (cancelled) return;
        if (!response.ok || !Array.isArray(data.coordinates)) throw new Error(data.error || "Route unavailable");
        setRoute(data);
        setRouteStatus("ready");
        if (!trafficEta && Number.isFinite(Number(data.durationSeconds))) setEtaText(formatDuration(data.durationSeconds));
      } catch {
        if (!cancelled) {
          setRouteStatus("error");
          if (!route) setRoute(null);
          if (!trafficEta) setEtaText("");
        }
      }
    };
    loadRoute();
    return () => { cancelled = true; };
  }, [driverPoint?.lat, driverPoint?.lon, target?.lat, target?.lon, trafficEta]);

  // Google is intentionally isolated to traffic-aware ETA. GPS, map tiles, route geometry and turn instructions do not use Google APIs.
  useEffect(() => {
    if (!trafficEta || !validPoint(target)) {
      if (trafficEta) setEtaText("");
      return;
    }
    let cancelled = false;
    let timer = null;
    const loadEta = async () => {
      const point = driverRef.current;
      if (!validPoint(point)) {
        if (!cancelled) timer = window.setTimeout(loadEta, ETA_REFRESH_MS);
        return;
      }
      try {
        const response = await fetch("/api/route-distance", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ origin: point, destination: target, purpose: "eta" }),
          cache: "no-store",
        });
        const data = await response.json();
        if (!cancelled && response.ok && data?.durationText) setEtaText(data.durationText);
      } catch {}
      if (!cancelled) timer = window.setTimeout(loadEta, ETA_REFRESH_MS);
    };
    loadEta();
    return () => { cancelled = true; if (timer) window.clearTimeout(timer); };
  }, [trafficEta, target?.lat, target?.lon]);

  const zoom = NAV_ZOOM;
  const centerPx = project(center.lat, center.lon, zoom);
  const tileX = Math.floor(centerPx.x / TILE_SIZE);
  const tileY = Math.floor(centerPx.y / TILE_SIZE);
  const offsetX = width / 2 - (centerPx.x - tileX * TILE_SIZE);
  const offsetY = mapHeight / 2 - (centerPx.y - tileY * TILE_SIZE);
  const tiles = [];
  for (let dx = -2; dx <= 2; dx += 1) {
    for (let dy = -2; dy <= 2; dy += 1) {
      const x = tileX + dx;
      const y = tileY + dy;
      const max = 2 ** zoom;
      if (y < 0 || y >= max) continue;
      const wrappedX = ((x % max) + max) % max;
      tiles.push(
        <img key={`${zoom}-${x}-${y}`} src={`${OSM}/${zoom}/${wrappedX}/${y}.png`} alt="" draggable="false" style={{ position: "absolute", width: TILE_SIZE, height: TILE_SIZE, left: offsetX + dx * TILE_SIZE, top: offsetY + dy * TILE_SIZE, userSelect: "none", maxWidth: "none" }} />
      );
    }
  }

  const routePoints = useMemo(() => {
    if (!route?.coordinates?.length) return "";
    return route.coordinates.map(([lon, lat]) => {
      const p = project(lat, lon, zoom);
      return `${width / 2 + (p.x - centerPx.x)},${mapHeight / 2 + (p.y - centerPx.y)}`;
    }).join(" ");
  }, [route, zoom, width, mapHeight, centerPx.x, centerPx.y]);

  const navigation = useMemo(() => {
    if (!driverPoint || !route?.coordinates?.length) return null;
    const currentIndex = nearestRouteIndex(route.coordinates, driverPoint);
    const steps = Array.isArray(route.steps) ? route.steps : [];
    if (currentIndex < 0 || !steps.length) return null;

    const stepInfo = steps.map((step) => ({
      step,
      index: nearestRouteIndex(route.coordinates, Array.isArray(step.location) ? { lat: step.location[1], lon: step.location[0] } : null),
    })).filter((item) => item.index >= 0);

    let next = stepInfo.find((item) => item.index > currentIndex + 2 && String(item.step.maneuver || "").toLowerCase() !== "depart");
    if (!next) next = stepInfo.find((item) => item.index > currentIndex + 1);
    if (!next) next = stepInfo[stepInfo.length - 1] || null;

    const nextIndex = next?.index ?? route.coordinates.length - 1;
    const distanceToNext = routeDistanceBetween(route.coordinates, currentIndex, nextIndex);
    const remainingDistance = routeDistanceBetween(route.coordinates, currentIndex, route.coordinates.length - 1);
    const instruction = instructionForStep(next?.step, targetType === "destination" ? "Destination" : "Pickup");
    const nextType = String(next?.step?.maneuver || "").toLowerCase();
    const arrived = nextType === "arrive" || remainingDistance < 35;

    return { instruction, distanceToNext, remainingDistance, arrived, currentIndex };
  }, [driverPoint, route, targetType]);

  const targetLabel = targetType === "destination" ? "Destination" : "Pickup";
  const remainingText = navigation ? formatDistance(navigation.remainingDistance) : "";
  const nextDistanceText = navigation ? formatDistance(navigation.distanceToNext) : "";

  return (
    <div style={{ position: "relative", width: "100%", height: mapHeight, overflow: "hidden", borderRadius: 24, background: "#e9eee9", border: "1px solid #dfe7e1" }}>
      <div style={{ position: "absolute", inset: 0, overflow: "hidden" }}>
        {tiles}
        {routePoints ? (
          <svg width={width} height={mapHeight} style={{ position: "absolute", inset: 0, overflow: "visible", pointerEvents: "none" }}>
            <polyline points={routePoints} fill="none" stroke="rgba(255,255,255,.9)" strokeWidth="10" strokeLinecap="round" strokeLinejoin="round" />
            <polyline points={routePoints} fill="none" stroke="#18a46a" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        ) : null}
        <Marker point={pickup} center={center} zoom={zoom} type="pickup" />
        <Marker point={destination} center={center} zoom={zoom} type="destination" />
        <Marker point={driverPoint} center={center} zoom={zoom} type="driver" />
      </div>

      <div style={{ position: "absolute", top: 14, left: 14, right: 14, display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10, pointerEvents: "none" }}>
        <div style={{ background: "rgba(255,255,255,.94)", borderRadius: 18, padding: "10px 14px", boxShadow: "0 3px 14px rgba(0,0,0,.13)", fontWeight: 800, color: "#205d42", fontSize: 14 }}>
          Driver → {targetLabel}
        </div>
        <div style={{ background: "rgba(255,255,255,.94)", borderRadius: 18, padding: "10px 14px", boxShadow: "0 3px 14px rgba(0,0,0,.13)", fontWeight: 800, color: "#205d42", fontSize: 14 }}>
          {etaText ? `ETA ~${etaText}` : routeStatus === "loading" ? "Updating route…" : "Live navigation"}
        </div>
      </div>

      {navigation ? (
        <div style={{ position: "absolute", left: 14, right: 14, bottom: 14, background: "rgba(255,255,255,.97)", borderRadius: 20, padding: "12px 14px", display: "flex", alignItems: "center", gap: 12, boxShadow: "0 5px 20px rgba(0,0,0,.18)" }}>
          <div style={{ width: 48, height: 48, flex: "0 0 48px", borderRadius: 14, background: "#0b8750", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28, fontWeight: 800 }}>{navigation.instruction.arrow}</div>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ textTransform: "uppercase", letterSpacing: ".06em", fontSize: 11, fontWeight: 800, color: "#87938c" }}>NEXT INSTRUCTION {nextDistanceText ? `· ${nextDistanceText}` : ""}</div>
            <div style={{ fontSize: 18, lineHeight: 1.15, fontWeight: 850, color: "#173126", marginTop: 2 }}>{navigation.instruction.title}</div>
            <div style={{ fontSize: 13, color: "#6b756f", marginTop: 3, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{navigation.instruction.detail}</div>
          </div>
          <div style={{ textAlign: "right", minWidth: 66 }}>
            <div style={{ fontSize: 11, color: "#87938c", fontWeight: 700 }}>REMAINING</div>
            <div style={{ fontSize: 14, fontWeight: 850, color: "#205d42", marginTop: 3 }}>{remainingText || "—"}</div>
          </div>
        </div>
      ) : (
        <div style={{ position: "absolute", left: 14, right: 14, bottom: 14, background: "rgba(255,255,255,.94)", borderRadius: 18, padding: "12px 14px", boxShadow: "0 4px 16px rgba(0,0,0,.14)", color: "#56625b", fontSize: 14, fontWeight: 650 }}>
          {routeStatus === "loading" ? "Calculating navigation route…" : `Live navigation to ${targetLabel}`}
        </div>
      )}

      <div style={{ position: "absolute", left: 14, top: 68, background: "rgba(255,255,255,.92)", borderRadius: 16, padding: "7px 10px", color: "#5e6963", fontSize: 11, fontWeight: 700, boxShadow: "0 2px 10px rgba(0,0,0,.1)" }}>
        Zoom {zoom} · GPS navigation
      </div>

      <div style={{ position: "absolute", left: 18, bottom: navigation ? 92 : 18, background: "rgba(255,255,255,.9)", borderRadius: 8, padding: "3px 6px", fontSize: 10, color: "#555" }}>
        © OpenStreetMap contributors
      </div>
    </div>
  );
}
