"use client";

import { useEffect, useRef, useState } from "react";

import { loadGoogleMaps } from "../lib/googleMaps";
import { theme } from "../../../shared/lib/theme";

const isPoint = (p) => p && Number.isFinite(Number(p.lat)) && Number.isFinite(Number(p.lon));

const MAP_STYLES = [
  { featureType: "poi", stylers: [{ visibility: "off" }] },
  { featureType: "transit", stylers: [{ visibility: "off" }] },
  { featureType: "road", elementType: "labels.icon", stylers: [{ visibility: "off" }] },
];

// Small static map of the pickup -> destination route. Hidden until both places are chosen, and silently
// hidden if Google Maps can't load. Falls back to a dashed straight line if road directions aren't available.
export default function RoutePreview({ pickup, drop, height = 124 }) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const layersRef = useRef([]);
  const [status, setStatus] = useState("idle"); // idle | loading | ready | failed
  const both = isPoint(pickup) && isPoint(drop);
  const key = both ? `${pickup.lat},${pickup.lon}|${drop.lat},${drop.lon}` : "";

  useEffect(() => {
    if (!both) { setStatus("idle"); return undefined; }
    let cancelled = false;
    setStatus("loading");

    loadGoogleMaps()
      .then((maps) => {
        if (cancelled || !containerRef.current) return;
        const a = { lat: Number(pickup.lat), lng: Number(pickup.lon) };
        const b = { lat: Number(drop.lat), lng: Number(drop.lon) };

        if (!mapRef.current) {
          mapRef.current = new maps.Map(containerRef.current, {
            center: a, zoom: 12, disableDefaultUI: true, gestureHandling: "none",
            clickableIcons: false, keyboardShortcuts: false, styles: MAP_STYLES,
          });
        }
        const map = mapRef.current;
        layersRef.current.forEach((layer) => layer.setMap(null));
        layersRef.current = [];

        const bounds = new maps.LatLngBounds();
        bounds.extend(a);
        bounds.extend(b);

        const marker = (position, fill) => new maps.Marker({
          map, position, clickable: false,
          icon: { path: maps.SymbolPath.CIRCLE, scale: 8, fillColor: fill, fillOpacity: 1, strokeColor: "#ffffff", strokeWeight: 3 },
        });

        const finish = (line) => {
          if (cancelled) return;
          layersRef.current = [line, marker(a, theme.colors.primary), marker(b, theme.colors.accent)];
          map.fitBounds(bounds, { top: 22, bottom: 22, left: 28, right: 28 });
          setStatus("ready");
        };

        new maps.DirectionsService().route(
          { origin: a, destination: b, travelMode: maps.TravelMode.DRIVING },
          (result, directionsStatus) => {
            if (cancelled) return;
            const route = directionsStatus === "OK" ? result?.routes?.[0] : null;
            if (route?.overview_path?.length) {
              route.overview_path.forEach((point) => bounds.extend(point));
              finish(new maps.Polyline({ map, path: route.overview_path, strokeColor: theme.colors.primary, strokeOpacity: 0.95, strokeWeight: 4 }));
            } else {
              finish(new maps.Polyline({
                map, path: [a, b], geodesic: true, strokeOpacity: 0,
                icons: [{ icon: { path: "M 0,-1 0,1", strokeOpacity: 1, strokeColor: theme.colors.primary, scale: 3 }, offset: "0", repeat: "12px" }],
              }));
            }
          }
        );
      })
      .catch(() => { if (!cancelled) setStatus("failed"); });

    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  if (!both || status === "failed") return null;

  return (
    <div className="routePreview" role="img" aria-label="Map preview of your route" style={{ height }}>
      <div ref={containerRef} className="routePreviewMap" />
      {status !== "ready" && <div className="routePreviewShimmer" aria-hidden="true" />}
      <style jsx>{`
        .routePreview { position:relative; margin:2px 0 10px; border-radius:14px; overflow:hidden; border:1px solid ${theme.colors.border}; background:${theme.colors.primaryTint}; }
        .routePreviewMap { position:absolute; inset:0; }
        .routePreviewShimmer { position:absolute; inset:0; background:linear-gradient(100deg, transparent 20%, rgba(255,255,255,.65) 50%, transparent 80%); background-size:220% 100%; animation:routeShimmer 1.3s ease-in-out infinite; pointer-events:none; }
        @keyframes routeShimmer { from { background-position:120% 0; } to { background-position:-120% 0; } }
      `}</style>
    </div>
  );
}
