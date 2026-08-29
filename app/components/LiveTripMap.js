"use client";

import { useEffect, useMemo, useRef, useState } from "react";

const TILE_SIZE = 256;
const MAP_HEIGHT = 320;
const OSM = "https://tile.openstreetmap.org";
const ETA_REFRESH_MS = 60000;
const ROUTE_REFRESH_MS = 15000;

function validPoint(point) {
  const lat = Number(point?.lat);
  const lon = Number(point?.lon);
  return Number.isFinite(lat) && Number.isFinite(lon) && lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180;
}

function project(lat, lon, zoom) {
  const scale = TILE_SIZE * 2 ** zoom;
  const sin = Math.sin((Number(lat) * Math.PI) / 180);
  return {
    x: ((Number(lon) + 180) / 360) * scale,
    y: (0.5 - Math.log((1 + Math.max(-0.9999, Math.min(0.9999, sin))) / (1 - Math.max(-0.9999, Math.min(0.9999, sin)))) / (4 * Math.PI)) * scale,
  };
}

function clamp(value, min, max) { return Math.max(min, Math.min(max, value)); }

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
  if (!step) return { title: `Continue to ${targetLabel}`, detail: "Follow the route shown on the map", arrow: "↑" };
  const type = String(step.maneuver || "").toLowerCase();
  const modifier = String(step.modifier || "").toLowerCase();
  const road = step.name || "the road";
  const arrow = maneuverArrow(type, modifier);
  if (type === "arrive") return { title: `Arrive at ${targetLabel}`, detail: "You are approaching your destination", arrow: "✓" };
  if (type === "depart") return { title: `Head toward ${road}`, detail: "Follow the highlighted route", arrow };
  if (type === "roundabout" || type === "rotary") {
    const exitText = step.exit ? `, take exit ${step.exit}` : "";
    return { title: `Take the roundabout${exitText}`, detail: road ? `Continue on ${road}` : "Follow the highlighted route", arrow };
  }
  if (type === "merge") return { title: `Merge ${modifier || "ahead"}`, detail: `Continue on ${road}`, arrow };
  if (type === "fork") return { title: `Keep ${modifier || "ahead"}`, detail: road ? `Continue on ${road}` : "Follow the highlighted route", arrow };
  if (type === "on ramp" || type === "on_ramp") return { title: `Take the ramp ${modifier || "ahead"}`, detail: road ? `Continue on ${road}` : "Follow the highlighted route", arrow };
  if (type === "off ramp" || type === "off_ramp") return { title: `Take the exit ${modifier || "ahead"}`, detail: road ? `Continue on ${road}` : "Follow the highlighted route", arrow };
  if (type === "end of road" || type === "end_of_road") return { title: `Turn ${modifier || "ahead"} at the end of the road`, detail: road ? `Continue on ${road}` : "Follow the highlighted route", arrow };
  if (type === "new name" || type === "new_name" || type === "continue") return { title: road ? `Continue on ${road}` : "Continue straight", detail: "Stay on the highlighted route", arrow };
  if (modifier.includes("left")) return { title: `Turn left${road && road !== "the road" ? ` onto ${road}` : ""}`, detail: "Follow the highlighted route", arrow };
  if (modifier.includes("right")) return { title: `Turn right${road && road !== "the road" ? ` onto ${road}` : ""}`, detail: "Follow the highlighted route", arrow };
  return { title: road ? `Continue on ${road}` : "Continue ahead", detail: "Follow the highlighted route", arrow };
}

function Marker({ point, center, zoom, type, transition = true }) {
  if (!validPoint(point)) return null;
  const p = project(point.lat, point.lon, zoom);
  const c = project(center.lat, center.lon, zoom);
  const x = p.x - c.x;
  const y = p.y - c.y;
  const size = type === "driver" ? 38 : 18;
  return <div style={{ position: "absolute", left: "50%", top: "50%", width: size, height: size, transform: `translate(calc(-50% + ${x}px), calc(-50% + ${y}px))`, transition: transition ? "transform 4.4s linear" : "none", zIndex: type === "driver" ? 5 : 3, pointerEvents: "none" }}>{type === "driver" ? <div style={{ width: 38, height: 38, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", background: "#0b8750", border: "3px solid #ffffff", boxShadow: "0 3px 12px rgba(0,0,0,.25)", fontSize: 19 }}>🚗</div> : <div style={{ width: size, height: size, borderRadius: "50%", background: type === "destination" ? "#c96a2b" : "#0b8750", border: "3px solid #fff", boxShadow: "0 2px 8px rgba(0,0,0,.25)" }} />}</div>;
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
  const points = useMemo(() => [pickup, destination, driverPoint].filter(validPoint), [pickup, destination, driverPoint]);
  const zoom = chooseZoom(points, width);
  const center = useMemo(() => {
    const usable = points.length ? points : [pickup, destination].filter(validPoint);
    if (!usable.length) return { lat: 0, lon: 0 };
    return {
      lat: usable.reduce((sum, p) => sum + Number(p.lat), 0) / usable.length,
      lon: usable.reduce((sum, p) => sum + Number(p.lon), 0) / usable.length,
    };
  }, [points, pickup, destination]);

  // Routing stays independent from high-frequency GPS updates: a new route is requested only about every 15 seconds or after 50m of movement.
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
    if (!targetChanged && now - previous.at < ROUTE_REFRESH_MS && movedKm < 0.05) return;
    lastRouteRef.current = { point: driverPoint, target, at: now };
    let cancelled = false;
    const loadRoute = async () => {
      setRouteStatus("loading");
      try {
        const response = await fetch("/api/route-map", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ origin: driverPoint, destination: target }) });
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

  // Google is used only for traffic-aware ETA. GPS and map rendering never call Google, and this timer is independent of GPS changes.
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
        const response = await fetch("/api/route-distance", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ origin: point, destination: target, purpose: "eta" }), cache: "no-store" });
        const data = await response.json();
        if (!cancelled && response.ok && data?.durationText) setEtaText(data.durationText);
      } catch {}
      if (!cancelled) timer = window.setTimeout(loadEta, ETA_REFRESH_MS);
    };
    loadEta();
    return () => { cancelled = true; if (timer) window.clearTimeout(timer); };
  }, [trafficEta, target?.lat, target?.lon]);

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

  const routePoints = useMemo(() => {
    if (!route?.coordinates?.length) return "";
    return route.coordinates.map(([lon, lat]) => {
      const p = project(lat, lon, zoom);
      return `${width / 2 + (p.x - centerPx.x)},${MAP_HEIGHT / 2 + (p.y - centerPx.y)}`;
    }).join(" ");
  }, [route, zoom, width, centerPx.x, centerPx.y]);

  const targetLabel = targetType === "destination" ? "Destination" : "Pickup";
  const navigation = useMemo(() => {
    if (!driverPoint || !route?.coordinates?.length || !Array.isArray(route.steps) || !route.steps.length) return null;
    const driverIndex = nearestRouteIndex(route.coordinates, driverPoint);
    if (driverIndex < 0) return null;
    const enriched = route.steps.map((step, index) => {
      const location = Array.isArray(step.location) ? { lat: step.location[1], lon: step.location[0] } : null;
      const indexOnRoute = location ? nearestRouteIndex(route.coordinates, location) : -1;
      return { ...step, index, indexOnRoute };
    });
    const future = enriched.filter((step) => step.indexOnRoute >= driverIndex + 2 && step.maneuver !== "depart");
    const current = future[0] || enriched.find((step) => step.maneuver === "arrive") || enriched[enriched.length - 1];
    const maneuverIndex = current?.indexOnRoute >= 0 ? current.indexOnRoute : route.coordinates.length - 1;
    const distanceToManeuver = routeDistanceBetween(route.coordinates, driverIndex, maneuverIndex);
    return { ...instructionForStep(current, targetLabel), distanceToManeuver, stepIndex: current?.index || 0, totalSteps: enriched.length };
  }, [driverPoint, route, targetLabel]);

  return <div style={{ position: "relative", overflow: "hidden", height: compact ? 270 : MAP_HEIGHT, borderRadius: 16, border: "1px solid #dce6df", background: "#e7efe9", boxShadow: "0 8px 20px rgba(10,40,25,.06)" }}>
    <div style={{ position: "absolute", inset: 0 }}>{tiles}</div>
    <svg viewBox={`0 0 ${width} ${MAP_HEIGHT}`} preserveAspectRatio="none" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none", zIndex: 2 }}>{routePoints && <polyline points={routePoints} fill="none" stroke="#0b8750" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" opacity="0.82" />}</svg>
    <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, rgba(255,255,255,.12), rgba(255,255,255,.02))", pointerEvents: "none", zIndex: 2 }} />
    <Marker point={pickup} center={center} zoom={zoom} type="pickup" transition={false} />
    <Marker point={destination} center={center} zoom={zoom} type="destination" transition={false} />
    <Marker point={driverPoint} center={center} zoom={zoom} type="driver" />

    <div style={{ position: "absolute", left: 12, top: 12, padding: "7px 10px", borderRadius: 20, background: "rgba(255,255,255,.94)", color: "#173c2a", fontSize: 11, fontWeight: 800, boxShadow: "0 2px 8px rgba(0,0,0,.12)", zIndex: 7 }}>{driverPoint ? `Driver → ${targetLabel}` : "Waiting for driver's live location"}</div>
    {etaText && driverPoint && <div style={{ position: "absolute", right: 12, top: 12, padding: "7px 10px", borderRadius: 20, background: "rgba(255,255,255,.95)", color: "#0b8750", fontSize: 11, fontWeight: 800, boxShadow: "0 2px 8px rgba(0,0,0,.12)", zIndex: 7 }}>ETA ~{etaText}</div>}

    {navigation && driverPoint && <div style={{ position: "absolute", left: 10, right: 10, bottom: 32, minHeight: 62, display: "flex", alignItems: "center", gap: 10, padding: "9px 11px", borderRadius: 14, background: "rgba(255,255,255,.96)", color: "#173c2a", boxShadow: "0 5px 16px rgba(0,0,0,.16)", zIndex: 8 }}>
      <div style={{ width: 40, height: 40, flex: "0 0 40px", display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 12, background: "#0b8750", color: "#fff", fontSize: 25, fontWeight: 900 }}>{navigation.arrow}</div>
      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 2 }}><span style={{ color: "#0b8750", fontSize: 10, fontWeight: 900, textTransform: "uppercase" }}>Next instruction</span>{navigation.distanceToManeuver > 0 && <span style={{ color: "#66736c", fontSize: 10, fontWeight: 800 }}>· {formatDistance(navigation.distanceToManeuver)}</span>}</div>
        <div style={{ fontSize: 12.5, fontWeight: 900, lineHeight: 1.25, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{navigation.title}</div>
        <div style={{ marginTop: 2, color: "#68756e", fontSize: 9.5, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{navigation.detail}</div>
      </div>
    </div>}

    {driverPoint && routeStatus === "loading" && <div style={{ position: "absolute", left: 12, bottom: navigation ? 101 : 34, padding: "5px 8px", borderRadius: 8, background: "rgba(255,255,255,.9)", color: "#59665f", fontSize: 9.5, zIndex: 7 }}>Updating route…</div>}
    <div style={{ position: "absolute", left: 8, bottom: 8, padding: "3px 6px", borderRadius: 5, background: "rgba(255,255,255,.88)", color: "#59665f", fontSize: 8.5, zIndex: 7 }}>© OpenStreetMap contributors</div>
    <div style={{ position: "absolute", right: 10, bottom: 10, padding: "6px 9px", borderRadius: 10, background: "rgba(255,255,255,.94)", color: "#43544c", fontSize: 10, fontWeight: 700, zIndex: 7 }}>{targetLabel}</div>
  </div>;
}
