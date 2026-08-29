import { NextResponse } from "next/server";

const ROUTES_TIMEOUT_MS = 10000;
const MAX_COORDINATE_DECIMALS = 6;
const ETA_CACHE_TTL_MS = 60000;
const etaCache = new Map<string, { expiresAt: number; payload: Record<string, unknown> }>();

function normalizeCoordinate(value: unknown, min: number, max: number): number | null {
  const number = Number(value);
  if (!Number.isFinite(number) || number < min || number > max) return null;
  return Number(number.toFixed(MAX_COORDINATE_DECIMALS));
}

function parseDurationSeconds(duration: unknown): number | null {
  if (typeof duration !== "string") return null;
  const match = duration.match(/^(\d[\d.]*)s$/);
  if (!match) return null;
  const seconds = Number(match[1]);
  return Number.isFinite(seconds) && seconds >= 0 ? seconds : null;
}

function formatDuration(seconds: number): string {
  const totalMinutes = Math.round(seconds / 60);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours > 0) return minutes > 0 ? `${hours} hr ${minutes} min` : `${hours} hr`;
  return `${minutes} min`;
}

function etaCacheKey(originLat: number, originLon: number, destinationLat: number, destinationLon: number) {
  // Four decimals is roughly 11 m of latitude; this lets simultaneous clients reuse an ETA without making the cache too coarse.
  return [originLat, originLon, destinationLat, destinationLon].map((v) => Number(v.toFixed(4))).join(":");
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const origin = body?.origin;
    const destination = body?.destination;
    const originLat = normalizeCoordinate(origin?.lat, -90, 90);
    const originLon = normalizeCoordinate(origin?.lon, -180, 180);
    const destinationLat = normalizeCoordinate(destination?.lat, -90, 90);
    const destinationLon = normalizeCoordinate(destination?.lon, -180, 180);

    if (originLat === null || originLon === null || destinationLat === null || destinationLon === null) {
      return NextResponse.json({ error: "Valid pickup and drop coordinates are required." }, { status: 400 });
    }

    if (originLat === destinationLat && originLon === destinationLon) {
      return NextResponse.json({ distanceMeters: 0, distanceKm: 0, distanceText: "0.0 km", durationSeconds: 0, durationText: "0 min" });
    }

    const cacheKey = etaCacheKey(originLat, originLon, destinationLat, destinationLon);
    const cached = etaCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) return NextResponse.json(cached.payload, { headers: { "X-VOYNU-ETA-Cache": "HIT" } });
    if (cached) etaCache.delete(cacheKey);

    const apiKey = process.env.GOOGLE_MAPS_SERVER_API_KEY;
    if (!apiKey) {
      console.error("VOYNU: GOOGLE_MAPS_SERVER_API_KEY is missing.");
      return NextResponse.json({ error: "Road-distance service is not configured." }, { status: 500 });
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), ROUTES_TIMEOUT_MS);
    let googleResponse: Response;
    let googleData: any = null;
    try {
      googleResponse = await fetch("https://routes.googleapis.com/directions/v2:computeRoutes", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Goog-Api-Key": apiKey, "X-Goog-FieldMask": "routes.distanceMeters,routes.duration" },
        body: JSON.stringify({
          origin: { location: { latLng: { latitude: originLat, longitude: originLon } } },
          destination: { location: { latLng: { latitude: destinationLat, longitude: destinationLon } } },
          travelMode: "DRIVE",
          routingPreference: "TRAFFIC_AWARE",
          routeModifiers: { avoidTolls: false, avoidHighways: false, avoidFerries: false },
          languageCode: "en",
          units: "METRIC",
        }),
        signal: controller.signal,
      });
      try { googleData = await googleResponse.json(); } catch { googleData = null; }
    } catch (error) {
      console.error("VOYNU Google Routes request error:", error);
      return NextResponse.json({ error: "Road-distance service is temporarily unavailable. Please try again." }, { status: 504 });
    } finally { clearTimeout(timeout); }

    if (!googleResponse.ok) {
      console.error("VOYNU Google Routes API error:", googleResponse.status, googleData);
      return NextResponse.json({ error: "Road-distance service could not calculate this route." }, { status: 502 });
    }

    const route = googleData?.routes?.[0];
    if (!route) return NextResponse.json({ error: "No drivable route could be found between these locations." }, { status: 422 });
    const distanceMeters = Number(route.distanceMeters);
    if (!Number.isFinite(distanceMeters) || distanceMeters < 0) return NextResponse.json({ error: "Google Maps returned an invalid road distance." }, { status: 502 });
    const distanceKm = distanceMeters / 1000;
    const durationSeconds = parseDurationSeconds(route.duration);
    const payload = { distanceMeters, distanceKm: Number(distanceKm.toFixed(2)), distanceText: `${distanceKm.toFixed(1)} km`, durationSeconds, durationText: Number.isFinite(durationSeconds) ? formatDuration(durationSeconds as number) : "" };

    etaCache.set(cacheKey, { expiresAt: Date.now() + ETA_CACHE_TTL_MS, payload });
    // Prevent an unusually long-lived server instance from retaining stale entries forever.
    if (etaCache.size > 500) {
      const now = Date.now();
      for (const [key, value] of etaCache) if (value.expiresAt <= now) etaCache.delete(key);
    }
    return NextResponse.json(payload, { headers: { "X-VOYNU-ETA-Cache": "MISS" } });
  } catch (error) {
    console.error("VOYNU route-distance error:", error);
    return NextResponse.json({ error: "Unable to calculate the road distance right now." }, { status: 500 });
  }
}
