"use client";

import { useEffect, useMemo, useRef, useState } from "react";

const TILE_SIZE = 256;
const OSM = "https://tile.openstreetmap.org";
const ROUTE_REFRESH_MS = 15000;
const ROUTE_MOVE_THRESHOLD_KM = 0.05;

function validPoint(point) {
  const lat = Number(point?.lat);
  const lon = Number(point?.lon);
  return Number.isFinite(lat) && Number.isFinite(lon) && lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180;
}

function project(lat, lon, zoom) {
  const scale = TILE_SIZE * 2 ** zoom;
  const safeLat = Math.max(-85.05112878, Math.min(85.05112878, Number(lat)));
  const sin = Math.sin((safeLat * Math.PI) / 180);
  return { x: ((Number(lon) + 180) / 360) * scale, y: (0.5 - Math.log((1 + sin) / (1 - sin)) / (4 * Math.PI)) * scale };
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
  coordinates.forEach((coordinate, index) => {
    const [lon, lat] = coordinate || [];
    if (!Number.isFinite(Number(lat)) || !Number.isFinite(Number(lon))) return;
    const distance = haversineKm(point, { lat, lon });
    if (distance < bestDistance) { bestDistance = distance; bestIndex = index; }
  });
  return bestIndex;
}

function routeDistanceBetween(coordinates, startIndex, endIndex) {
  if (!Array.isArray(coordinates) || coordinates.length < 2) return 0;
  const start = Math.max(0, Math.min(Math.min(startIndex, endIndex), coordinates.length - 1));
  const end = Math.max(0, Math.min(Math.max(startIndex, endIndex), coordinates.length - 1));
  let total = 0;
  for (let i = start; i < end; i += 1) {
    const a = coordinates[i]; const b = coordinates[i + 1];
    if (a && b) total += haversineKm({ lat: a[1], lon: a[0] }, { lat: b[1], lon: b[0] }) * 1000;
  }
  return total;
}

function formatDistance(meters) {
  const value = Number(meters);
  if (!Number.isFinite(value)) return "—";
  if (value < 1000) return `${Math.max(10, Math.round(value / 10) * 10)} m`;
  return `${(value / 1000).toFixed(value >= 10000 ? 0 : 1)} km`;
}

function formatDuration(seconds) {
  const value = Number(seconds);
  if (!Number.isFinite(value)) return "—";
  const minutes = Math.max(0, Math.round(value / 60));
  const hours = Math.floor(minutes / 60);
  return hours ? `${hours} hr ${minutes % 60} min` : `${minutes} min`;
}

function arrowFor(type, modifier) {
  const m = String(modifier || "").toLowerCase();
  if (type === "roundabout" || type === "rotary") return "↻";
  if (type === "uturn") return "↶";
  if (m.includes("sharp left")) return "↙";
  if (m.includes("left")) return "↰";
  if (m.includes("sharp right")) return "↘";
  if (m.includes("right")) return "↱";
  return "↑";
}

function instructionFor(step, targetLabel) {
  if (!step) return { title: `Continue to ${targetLabel}`, detail: "Follow the highlighted route", arrow: "↑", key: "continue" };
  const type = String(step.maneuver || "").toLowerCase();
  const modifier = String(step.modifier || "").toLowerCase();
  const road = step.name || "";
  const arrow = arrowFor(type, modifier);
  if (type === "arrive") return { title: `Arrive at ${targetLabel}`, detail: "You are approaching your destination", arrow: "✓", key: "arrive" };
  if (type === "depart") return { title: road ? `Head toward ${road}` : `Head toward ${targetLabel}`, detail: "Follow the highlighted route", arrow, key: "depart" };
  if (type === "roundabout" || type === "rotary") return { title: `Take the roundabout${step.exit ? ` — exit ${step.exit}` : ""}`, detail: road ? `Continue on ${road}` : "Follow the highlighted route", arrow, key: `roundabout-${step.exit || ""}` };
  if (type === "merge") return { title: `Merge ${modifier || "ahead"}`, detail: road ? `Continue on ${road}` : "Follow the highlighted route", arrow, key: `merge-${modifier}` };
  if (type === "fork") return { title: `Keep ${modifier || "ahead"}`, detail: road ? `Continue on ${road}` : "Follow the highlighted route", arrow, key: `fork-${modifier}` };
  if (type === "on ramp" || type === "on_ramp") return { title: `Take the ramp ${modifier || "ahead"}`, detail: road ? `Continue on ${road}` : "Follow the highlighted route", arrow, key: `onramp-${modifier}` };
  if (type === "off ramp" || type === "off_ramp") return { title: `Take the exit ${modifier || "ahead"}`, detail: road ? `Continue on ${road}` : "Follow the highlighted route", arrow, key: `offramp-${modifier}` };
  if (type === "end of road" || type === "end_of_road") return { title: `Turn ${modifier || "ahead"} at the end of the road`, detail: road ? `Continue on ${road}` : "Follow the highlighted route", arrow, key: `end-${modifier}` };
  if (type === "new name" || type === "new_name" || type === "continue") return { title: road ? `Continue on ${road}` : "Continue straight", detail: "Stay on the highlighted route", arrow, key: `continue-${road}` };
  if (modifier.includes("left")) return { title: `Turn left${road ? ` onto ${road}` : ""}`, detail: "Follow the highlighted route", arrow, key: `left-${road}` };
  if (modifier.includes("right")) return { title: `Turn right${road ? ` onto ${road}` : ""}`, detail: "Follow the highlighted route", arrow, key: `right-${road}` };
  return { title: road ? `Continue on ${road}` : "Continue ahead", detail: "Follow the highlighted route", arrow, key: `ahead-${road}` };
}

export default function DriverNavigationMode({ booking, driverLocation, targetType = "destination", onExit, onComplete }) {
  const [driverPoint, setDriverPoint] = useState(driverLocation || null);
  const [route, setRoute] = useState(null);
  const [routeStatus, setRouteStatus] = useState("waiting");
  const [width, setWidth] = useState(390);
  const [viewportHeight, setViewportHeight] = useState(700);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [wakeLockActive, setWakeLockActive] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const driverRef = useRef(driverLocation || null);
  const lastRouteRef = useRef({ point: null, target: null, at: 0 });
  const lastSpokenRef = useRef("");
  const wakeLockRef = useRef(null);

  useEffect(() => { driverRef.current = driverLocation || null; setDriverPoint(driverLocation || null); }, [driverLocation?.lat, driverLocation?.lon]);

  const target = targetType === "pickup" ? { lat: booking.pickup_lat, lon: booking.pickup_lon } : { lat: booking.drop_lat, lon: booking.drop_lon };
  const targetLabel = targetType === "pickup" ? "Pickup" : "Destination";

  useEffect(() => {
    const measure = () => { setWidth(Math.max(300, window.innerWidth)); setViewportHeight(Math.max(420, window.innerHeight)); };
    measure();
    window.addEventListener("resize", measure);
    const fullscreenChanged = () => setIsFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", fullscreenChanged);
    return () => { window.removeEventListener("resize", measure); document.removeEventListener("fullscreenchange", fullscreenChanged); };
  }, []);

  useEffect(() => {
    const requestWakeLock = async () => {
      try {
        if ("wakeLock" in navigator) {
          wakeLockRef.current = await navigator.wakeLock.request("screen");
          setWakeLockActive(true);
          wakeLockRef.current.addEventListener?.("release", () => setWakeLockActive(false));
        }
      } catch {}
    };
    requestWakeLock();
    return () => { wakeLockRef.current?.release?.().catch?.(() => {}); wakeLockRef.current = null; };
  }, []);

  useEffect(() => {
    const retryWakeLock = () => {
      if (document.visibilityState === "visible" && "wakeLock" in navigator && !wakeLockRef.current) {
        navigator.wakeLock.request("screen").then((lock) => { wakeLockRef.current = lock; setWakeLockActive(true); }).catch(() => {});
      }
    };
    document.addEventListener("visibilitychange", retryWakeLock);
    return () => document.removeEventListener("visibilitychange", retryWakeLock);
  }, []);

  useEffect(() => {
    if (!validPoint(driverPoint) || !validPoint(target)) { setRoute(null); setRouteStatus("waiting"); return; }
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
        const response = await fetch("/api/route-map", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ origin: driverPoint, destination: target }) });
        const data = await response.json();
        if (cancelled) return;
        if (!response.ok || !Array.isArray(data.coordinates)) throw new Error(data.error || "Route unavailable");
        setRoute(data); setRouteStatus("ready");
      } catch { if (!cancelled) setRouteStatus("error"); }
    };
    loadRoute();
    return () => { cancelled = true; };
  }, [driverPoint?.lat, driverPoint?.lon, target?.lat, target?.lon]);

  const navigation = useMemo(() => {
    if (!driverPoint || !route?.coordinates?.length) return null;
    const currentIndex = nearestRouteIndex(route.coordinates, driverPoint);
    const steps = Array.isArray(route.steps) ? route.steps : [];
    if (currentIndex < 0 || !steps.length) return null;
    const stepInfo = steps.map((step) => ({ step, index: nearestRouteIndex(route.coordinates, Array.isArray(step.location) ? { lat: step.location[1], lon: step.location[0] } : null) })).filter((item) => item.index >= 0);
    let next = stepInfo.find((item) => item.index > currentIndex + 2 && String(item.step.maneuver || "").toLowerCase() !== "depart");
    if (!next) next = stepInfo.find((item) => item.index > currentIndex + 1);
    if (!next) next = stepInfo[stepInfo.length - 1] || null;
    const nextIndex = next?.index ?? route.coordinates.length - 1;
    const distanceToNext = routeDistanceBetween(route.coordinates, currentIndex, nextIndex);
    const remainingDistance = routeDistanceBetween(route.coordinates, currentIndex, route.coordinates.length - 1);
    const instruction = instructionFor(next?.step, targetLabel);
    const arrived = String(next?.step?.maneuver || "").toLowerCase() === "arrive" || remainingDistance < 35;
    return { instruction, distanceToNext, remainingDistance, arrived, currentIndex };
  }, [driverPoint, route, targetLabel]);

  const zoom = useMemo(() => {
    const d = navigation?.distanceToNext ?? Infinity;
    if (d <= 250) return 18;
    if (d <= 900) return 17;
    if (d <= 4000) return 16;
    return 15;
  }, [navigation?.distanceToNext]);

  const center = validPoint(driverPoint) ? driverPoint : target;
  const mapHeight = viewportHeight;
  const centerPx = project(center.lat, center.lon, zoom);
  const tileX = Math.floor(centerPx.x / TILE_SIZE);
  const tileY = Math.floor(centerPx.y / TILE_SIZE);
  const offsetX = width / 2 - (centerPx.x - tileX * TILE_SIZE);
  const offsetY = mapHeight / 2 - (centerPx.y - tileY * TILE_SIZE);
  const tiles = [];
  for (let dx = -2; dx <= 2; dx += 1) {
    for (let dy = -3; dy <= 3; dy += 1) {
      const x = tileX + dx; const y = tileY + dy; const max = 2 ** zoom;
      if (y < 0 || y >= max) continue;
      const wrappedX = ((x % max) + max) % max;
      tiles.push(<img key={`${zoom}-${x}-${y}`} src={`${OSM}/${zoom}/${wrappedX}/${y}.png`} alt="" draggable="false" style={{ position: "absolute", width: TILE_SIZE, height: TILE_SIZE, left: offsetX + dx * TILE_SIZE, top: offsetY + dy * TILE_SIZE, maxWidth: "none", userSelect: "none" }} />);
    }
  }

  const routePoints = useMemo(() => {
    if (!route?.coordinates?.length) return "";
    return route.coordinates.map(([lon, lat]) => { const p = project(lat, lon, zoom); return `${width / 2 + (p.x - centerPx.x)},${mapHeight / 2 + (p.y - centerPx.y)}`; }).join(" ");
  }, [route, zoom, width, mapHeight, centerPx.x, centerPx.y]);

  useEffect(() => {
    if (!voiceEnabled || !navigation?.instruction || typeof window === "undefined" || !window.speechSynthesis) return;
    const distance = navigation.distanceToNext;
    const bucket = distance > 1000 ? "far" : distance > 300 ? "near" : "now";
    const key = `${navigation.instruction.key}:${bucket}`;
    if (key === lastSpokenRef.current) return;
    lastSpokenRef.current = key;
    const title = navigation.instruction.title.replace(/ — .*/, "");
    let text = title;
    if (bucket === "far" && distance < 5000) text = `${title} in ${formatDistance(distance)}.`;
    if (bucket === "near") text = `${title} in ${formatDistance(distance)}.`;
    if (bucket === "now") text = `${title} now.`;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(new SpeechSynthesisUtterance(text));
  }, [voiceEnabled, navigation?.instruction?.key, navigation?.distanceToNext]);

  const enterFullscreen = async () => { try { await document.documentElement.requestFullscreen?.(); setIsFullscreen(Boolean(document.fullscreenElement)); } catch {} };
  const exitFullscreen = async () => { try { if (document.fullscreenElement) await document.exitFullscreen(); } catch {} };
  const handleExit = async () => { window.speechSynthesis?.cancel?.(); await exitFullscreen(); onExit?.(); };
  const complete = async () => { window.speechSynthesis?.cancel?.(); await exitFullscreen(); onComplete?.(); };

  const eta = route?.durationSeconds != null ? formatDuration(route.durationSeconds) : "—";
  const remaining = navigation ? formatDistance(navigation.remainingDistance) : "—";
  const nextDistance = navigation ? formatDistance(navigation.distanceToNext) : "—";

  return <div style={{ position: "fixed", inset: 0, zIndex: 9999, width: "100vw", height: "100dvh", minHeight: "100vh", background: "#eef5f0", fontFamily: "Arial, sans-serif", overflow: "hidden" }}>
    <div style={{ position: "absolute", inset: 0, background: "#e9eee9" }}>
      {tiles}
      {routePoints ? <svg width={width} height={mapHeight} style={{ position: "absolute", inset: 0, pointerEvents: "none", overflow: "visible" }}><polyline points={routePoints} fill="none" stroke="rgba(255,255,255,.92)" strokeWidth="13" strokeLinecap="round" strokeLinejoin="round" /><polyline points={routePoints} fill="none" stroke="#18a46a" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" /></svg> : null}
      {validPoint(target) && validPoint(center) && (() => { const p = project(target.lat, target.lon, zoom); const c = project(center.lat, center.lon, zoom); return <div style={{ position: "absolute", left: "50%", top: "50%", width: 22, height: 22, borderRadius: "50%", background: "#c96a2b", border: "3px solid #fff", boxShadow: "0 2px 8px rgba(0,0,0,.3)", transform: `translate(calc(-50% + ${p.x - c.x}px),calc(-50% + ${p.y - c.y}px))` }} />; })()}
      {validPoint(driverPoint) ? <div style={{ position: "absolute", left: "50%", top: "50%", width: 54, height: 54, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", background: "#0b8750", border: "4px solid #fff", boxShadow: "0 4px 18px rgba(0,0,0,.32)", transform: "translate(-50%,-50%)", zIndex: 5, fontSize: 27 }}>🚗</div> : null}
    </div>

    <div style={{ position: "absolute", top: "max(12px, env(safe-area-inset-top))", left: 12, right: 12, display: "flex", justifyContent: "space-between", gap: 8, zIndex: 10, pointerEvents: "none" }}>
      <button onClick={handleExit} style={{ pointerEvents: "auto", border: 0, borderRadius: 18, background: "rgba(255,255,255,.96)", color: "#173126", padding: "10px 14px", fontWeight: 800, boxShadow: "0 3px 14px rgba(0,0,0,.16)", cursor: "pointer" }}>← Exit</button>
      <div style={{ borderRadius: 18, background: "rgba(11,135,80,.96)", color: "#fff", padding: "10px 14px", fontWeight: 850, boxShadow: "0 3px 14px rgba(0,0,0,.16)" }}>{targetType === "pickup" ? "Driver → Pickup" : "Driver → Destination"}</div>
      <div style={{ borderRadius: 18, background: "rgba(255,255,255,.96)", color: "#205d42", padding: "10px 14px", fontWeight: 850, boxShadow: "0 3px 14px rgba(0,0,0,.16)" }}>ETA ~{eta}</div>
    </div>

    <div style={{ position: "absolute", top: "calc(max(12px, env(safe-area-inset-top)) + 58px)", left: 12, right: 12, zIndex: 10, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
      <div style={{ background: "rgba(255,255,255,.92)", borderRadius: 14, padding: "7px 10px", color: "#5e6963", fontSize: 11, fontWeight: 800 }}>Zoom {zoom} · GPS navigation</div>
      <div style={{ background: "rgba(255,255,255,.92)", borderRadius: 14, padding: "7px 10px", color: wakeLockActive ? "#0b8750" : "#7b847f", fontSize: 11, fontWeight: 800 }}>{wakeLockActive ? "Screen awake" : "Screen wake unavailable"}</div>
    </div>

    {navigation ? <div style={{ position: "absolute", left: 12, right: 12, bottom: "calc(126px + env(safe-area-inset-bottom))", zIndex: 12, background: "rgba(255,255,255,.98)", borderRadius: 24, padding: "14px 15px", display: "flex", alignItems: "center", gap: 12, boxShadow: "0 7px 28px rgba(0,0,0,.2)" }}>
      <div style={{ width: 58, height: 58, flex: "0 0 58px", borderRadius: 17, background: "#0b8750", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 34, fontWeight: 900 }}>{navigation.instruction.arrow}</div>
      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{ fontSize: 11, letterSpacing: ".07em", color: "#87938c", fontWeight: 850 }}>NEXT INSTRUCTION · {nextDistance}</div>
        <div style={{ fontSize: "clamp(20px,5vw,27px)", lineHeight: 1.1, color: "#173126", fontWeight: 900, marginTop: 3 }}>{navigation.instruction.title}</div>
        <div style={{ fontSize: 13, color: "#66716b", marginTop: 5, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{navigation.instruction.detail}</div>
      </div>
      <div style={{ minWidth: 60, textAlign: "right" }}><div style={{ fontSize: 10, color: "#87938c", fontWeight: 800 }}>REMAINING</div><div style={{ fontSize: 16, color: "#205d42", fontWeight: 900, marginTop: 3 }}>{remaining}</div></div>
    </div> : <div style={{ position: "absolute", left: 12, right: 12, bottom: "calc(126px + env(safe-area-inset-bottom))", zIndex: 12, background: "rgba(255,255,255,.96)", borderRadius: 20, padding: 16, boxShadow: "0 6px 24px rgba(0,0,0,.18)", fontWeight: 800, color: "#46534c" }}>{routeStatus === "loading" ? "Calculating navigation route…" : routeStatus === "error" ? "Route temporarily unavailable. Continuing with GPS location." : `Waiting for GPS location to navigate to ${targetLabel}.`}</div>}

    <div style={{ position: "absolute", left: 12, right: 12, bottom: "max(12px, env(safe-area-inset-bottom))", zIndex: 14, display: "flex", gap: 8 }}>
      <button onClick={() => setVoiceEnabled((value) => !value)} style={{ flex: 1, minHeight: 48, borderRadius: 15, border: "1px solid #dce6df", background: "rgba(255,255,255,.97)", color: "#205d42", fontWeight: 850, fontSize: 13, cursor: "pointer" }}>{voiceEnabled ? "🔊 Voice on" : "🔇 Voice off"}</button>
      {!isFullscreen && <button onClick={enterFullscreen} style={{ flex: 1, minHeight: 48, borderRadius: 15, border: "1px solid #dce6df", background: "rgba(255,255,255,.97)", color: "#205d42", fontWeight: 850, fontSize: 13, cursor: "pointer" }}>⛶ Full screen</button>}
      <button onClick={complete} style={{ flex: 1.5, minHeight: 48, border: 0, borderRadius: 15, background: "#08783f", color: "#fff", fontWeight: 900, fontSize: 13.5, cursor: "pointer" }}>Complete Trip</button>
    </div>

    <div style={{ position: "absolute", left: 10, bottom: "calc(70px + env(safe-area-inset-bottom))", background: "rgba(255,255,255,.88)", borderRadius: 8, padding: "3px 6px", fontSize: 9.5, color: "#555", zIndex: 13 }}>© OpenStreetMap contributors</div>
  </div>;
}
