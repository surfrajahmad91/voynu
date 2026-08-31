import { NextResponse } from "next/server";

const ROUTER_URL = "https://router.project-osrm.org/route/v1/driving";
const TIMEOUT_MS = 8000;

function coordinate(value: unknown, min: number, max: number): number | null {
  const n = Number(value);
  return Number.isFinite(n) && n >= min && n <= max ? n : null;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const originLat = coordinate(body?.origin?.lat, -90, 90);
    const originLon = coordinate(body?.origin?.lon, -180, 180);
    const destinationLat = coordinate(body?.destination?.lat, -90, 90);
    const destinationLon = coordinate(body?.destination?.lon, -180, 180);

    if ([originLat, originLon, destinationLat, destinationLon].some((v) => v === null)) {
      return NextResponse.json({ error: "Valid origin and destination coordinates are required." }, { status: 400 });
    }

    if (originLat === destinationLat && originLon === destinationLon) {
      return NextResponse.json({ coordinates: [[originLon, originLat]], distanceMeters: 0, durationSeconds: 0, steps: [] });
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
    let response: Response;
    let data: any;

    try {
      response = await fetch(
        `${ROUTER_URL}/${originLon},${originLat};${destinationLon},${destinationLat}?overview=full&geometries=geojson&steps=true`,
        { signal: controller.signal, headers: { Accept: "application/json" } }
      );
      data = await response.json();
    } finally {
      clearTimeout(timeout);
    }

    if (!response.ok) {
      console.error("VOYNU Saarthi routing service error:", response.status, data);
      return NextResponse.json({ error: "Route service could not calculate this route." }, { status: 502 });
    }

    const route = data?.routes?.[0];
    const coordinates = route?.geometry?.coordinates;
    if (!Array.isArray(coordinates) || coordinates.length < 2) {
      return NextResponse.json({ error: "No drivable route could be found." }, { status: 422 });
    }

    return NextResponse.json({
      coordinates,
      distanceMeters: Number(route.distance) || 0,
      durationSeconds: Number(route.duration) || 0,
      steps: Array.isArray(route.legs?.[0]?.steps)
        ? route.legs[0].steps.map((step: any) => ({
            distanceMeters: Number(step.distance) || 0,
            durationSeconds: Number(step.duration) || 0,
            name: typeof step.name === "string" ? step.name : "",
            maneuver: step.maneuver?.type || "",
            modifier: step.maneuver?.modifier || "",
            location: Array.isArray(step.maneuver?.location) ? step.maneuver.location : null,
            exit: Number.isFinite(Number(step.maneuver?.exit)) ? Number(step.maneuver.exit) : null,
            mode: typeof step.mode === "string" ? step.mode : "driving",
          }))
        : [],
    });
  } catch (error) {
    console.error("VOYNU Saarthi route-map error:", error);
    return NextResponse.json({ error: "Unable to calculate the route right now." }, { status: 500 });
  }
}
