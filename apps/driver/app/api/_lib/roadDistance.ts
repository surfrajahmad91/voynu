const ROUTES_TIMEOUT_MS = 10000;
const MAX_COORDINATE_DECIMALS = 6;
const CACHE_TTL_MS = 60000;

type Point = { lat: unknown; lon: unknown };
export type RoadDistanceResult = {
  distanceMeters: number;
  distanceKm: number;
  distanceText: string;
  durationSeconds: number | null;
  durationText: string;
};

const cache = new Map<string, { expiresAt: number; payload: RoadDistanceResult }>();

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

function key(originLat: number, originLon: number, destinationLat: number, destinationLon: number) {
  return [originLat, originLon, destinationLat, destinationLon].map((v) => Number(v.toFixed(4))).join(":");
}

export async function getRoadDistance(origin: Point, destination: Point): Promise<RoadDistanceResult> {
  const originLat = normalizeCoordinate(origin?.lat, -90, 90);
  const originLon = normalizeCoordinate(origin?.lon, -180, 180);
  const destinationLat = normalizeCoordinate(destination?.lat, -90, 90);
  const destinationLon = normalizeCoordinate(destination?.lon, -180, 180);
  if (originLat === null || originLon === null || destinationLat === null || destinationLon === null) {
    throw new Error("Valid pickup and destination coordinates are required.");
  }
  if (originLat === destinationLat && originLon === destinationLon) {
    return { distanceMeters: 0, distanceKm: 0, distanceText: "0.0 km", durationSeconds: 0, durationText: "0 min" };
  }

  const cacheKey = key(originLat, originLon, destinationLat, destinationLon);
  const cached = cache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) return cached.payload;
  if (cached) cache.delete(cacheKey);

  const apiKey = process.env.GOOGLE_MAPS_SERVER_API_KEY;
  if (!apiKey) throw new Error("Road-distance service is not configured.");

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), ROUTES_TIMEOUT_MS);
  let response: Response;
  let data: any = null;
  try {
    response = await fetch("https://routes.googleapis.com/directions/v2:computeRoutes", {
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
    try { data = await response.json(); } catch { data = null; }
  } finally {
    clearTimeout(timeout);
  }

  if (!response.ok) {
    console.error("VOYNU Google Routes API error:", response.status, data);
    throw new Error("Road-distance service could not calculate this route.");
  }
  const route = data?.routes?.[0];
  if (!route) throw new Error("No drivable route could be found between these locations.");
  const distanceMeters = Number(route.distanceMeters);
  if (!Number.isFinite(distanceMeters) || distanceMeters < 0) throw new Error("Google Maps returned an invalid road distance.");
  const distanceKm = distanceMeters / 1000;
  const durationSeconds = parseDurationSeconds(route.duration);
  const payload: RoadDistanceResult = {
    distanceMeters,
    distanceKm: Number(distanceKm.toFixed(2)),
    distanceText: `${distanceKm.toFixed(1)} km`,
    durationSeconds,
    durationText: Number.isFinite(durationSeconds) ? formatDuration(durationSeconds as number) : "",
  };
  cache.set(cacheKey, { expiresAt: Date.now() + CACHE_TTL_MS, payload });
  if (cache.size > 500) {
    const now = Date.now();
    for (const [entryKey, value] of cache) if (value.expiresAt <= now) cache.delete(entryKey);
  }
  return payload;
}
