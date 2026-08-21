import { NextResponse } from "next/server";

/*
 * ============================================================
 * VOYNU - ROAD DISTANCE API
 * ============================================================
 *
 * Endpoint:
 *
 * POST /api/route-distance
 *
 * This endpoint keeps the Google Maps API key on the server.
 *
 * The browser sends:
 *
 * {
 *   origin: {
 *     lat: number,
 *     lon: number
 *   },
 *   destination: {
 *     lat: number,
 *     lon: number
 *   }
 * }
 *
 * The API returns:
 *
 * {
 *   distanceMeters: number,
 *   distanceKm: number,
 *   distanceText: string,
 *   durationSeconds: number,
 *   durationText: string
 * }
 *
 * ============================================================
 */

export async function POST(request: Request) {
  try {
    /*
     * --------------------------------------------------------
     * READ REQUEST
     * --------------------------------------------------------
     */

    const body = await request.json();

    const origin = body?.origin;
    const destination = body?.destination;

    /*
     * --------------------------------------------------------
     * VALIDATE ORIGIN
     * --------------------------------------------------------
     */

    const originLat = Number(origin?.lat);
    const originLon = Number(origin?.lon);

    /*
     * --------------------------------------------------------
     * VALIDATE DESTINATION
     * --------------------------------------------------------
     */

    const destinationLat =
      Number(destination?.lat);

    const destinationLon =
      Number(destination?.lon);

    if (
      !Number.isFinite(originLat) ||
      !Number.isFinite(originLon) ||
      !Number.isFinite(destinationLat) ||
      !Number.isFinite(destinationLon)
    ) {
      return NextResponse.json(
        {
          error:
            "Valid pickup and drop coordinates are required.",
        },
        {
          status: 400,
        }
      );
    }

    /*
     * --------------------------------------------------------
     * GOOGLE MAPS SERVER API KEY
     * --------------------------------------------------------
     *
     * IMPORTANT:
     *
     * This MUST be a server-side environment variable.
     *
     * Do NOT use:
     *
     * NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
     *
     * here.
     * --------------------------------------------------------
     */

    const apiKey =
      process.env.GOOGLE_MAPS_SERVER_API_KEY;

    if (!apiKey) {
      console.error(
        "VOYNU: GOOGLE_MAPS_SERVER_API_KEY is missing."
      );

      return NextResponse.json(
        {
          error:
            "Road-distance service is not configured.",
        },
        {
          status: 500,
        }
      );
    }

    /*
     * --------------------------------------------------------
     * GOOGLE ROUTES API
     * --------------------------------------------------------
     */

    const googleResponse = await fetch(
      "https://routes.googleapis.com/directions/v2:computeRoutes",
      {
        method: "POST",

        headers: {
          "Content-Type": "application/json",

          "X-Goog-Api-Key": apiKey,

          "X-Goog-FieldMask":
            "routes.distanceMeters,routes.duration",
        },

        body: JSON.stringify({
          origin: {
            location: {
              latLng: {
                latitude: originLat,
                longitude: originLon,
              },
            },
          },

          destination: {
            location: {
              latLng: {
                latitude: destinationLat,
                longitude: destinationLon,
              },
            },
          },

          /*
           * Driving route.
           */
          travelMode: "DRIVE",

          /*
           * Use traffic-aware routing.
           */
          routingPreference: "TRAFFIC_AWARE",

          /*
           * We are not forcing avoidance
           * of tolls/highways/ferries.
           */
          routeModifiers: {
            avoidTolls: false,
            avoidHighways: false,
            avoidFerries: false,
          },

          languageCode: "en",

          units: "METRIC",
        }),
      }
    );

    /*
     * --------------------------------------------------------
     * READ GOOGLE RESPONSE
     * --------------------------------------------------------
     */

    let googleData: any = null;

    try {
      googleData =
        await googleResponse.json();
    } catch {
      googleData = null;
    }

    /*
     * --------------------------------------------------------
     * GOOGLE API ERROR
     * --------------------------------------------------------
     */

    if (!googleResponse.ok) {
      console.error(
        "VOYNU Google Routes API error:",
        googleResponse.status,
        googleData
      );

      return NextResponse.json(
        {
          error:
            googleData?.error?.message ||
            "Google Maps could not calculate the road distance.",
        },
        {
          status: googleResponse.status,
        }
      );
    }

    /*
     * --------------------------------------------------------
     * GET FIRST ROUTE
     * --------------------------------------------------------
     */

    const route =
      googleData?.routes?.[0];

    if (!route) {
      return NextResponse.json(
        {
          error:
            "No drivable route could be found between these locations.",
        },
        {
          status: 422,
        }
      );
    }

    /*
     * --------------------------------------------------------
     * DISTANCE
     * --------------------------------------------------------
     */

    const distanceMeters =
      Number(route.distanceMeters);

    if (
      !Number.isFinite(
        distanceMeters
      )
    ) {
      return NextResponse.json(
        {
          error:
            "Google Maps returned an invalid road distance.",
        },
        {
          status: 502,
        }
      );
    }

    const distanceKm =
      distanceMeters / 1000;

    /*
     * --------------------------------------------------------
     * DURATION
     * --------------------------------------------------------
     */

    const durationSeconds =
      parseDurationSeconds(
        route.duration
      );

    const durationText =
      Number.isFinite(
        durationSeconds
      )
        ? formatDuration(
            durationSeconds
          )
        : "";

    /*
     * --------------------------------------------------------
     * RETURN RESPONSE
     * --------------------------------------------------------
     */

    return NextResponse.json({
      distanceMeters,

      distanceKm: Number(
        distanceKm.toFixed(2)
      ),

      distanceText:
        `${distanceKm.toFixed(1)} km`,

      durationSeconds,

      durationText,
    });
  } catch (error) {
    /*
     * --------------------------------------------------------
     * UNEXPECTED ERROR
     * --------------------------------------------------------
     */

    console.error(
      "VOYNU route-distance error:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Unable to calculate the road distance right now.",
      },
      {
        status: 500,
      }
    );
  }
}

/*
 * ============================================================
 * GOOGLE DURATION PARSER
 * ============================================================
 *
 * Google can return duration like:
 *
 * "5234s"
 *
 * This converts it into:
 *
 * 5234
 * ============================================================
 */

function parseDurationSeconds(
  duration: unknown
): number | null {
  if (
    typeof duration !== "string"
  ) {
    return null;
  }

  const match =
    duration.match(
      /^([\d.]+)s$/
    );

  if (!match) {
    return null;
  }

  const seconds =
    Number(match[1]);

  if (
    !Number.isFinite(seconds)
  ) {
    return null;
  }

  return seconds;
}

/*
 * ============================================================
 * FORMAT DURATION
 * ============================================================
 *
 * Examples:
 *
 * 45 minutes
 * 1 hr 20 min
 * 3 hr
 * ============================================================
 */

function formatDuration(
  seconds: number
): string {
  const totalMinutes =
    Math.round(
      seconds / 60
    );

  const hours =
    Math.floor(
      totalMinutes / 60
    );

  const minutes =
    totalMinutes % 60;

  if (hours > 0) {
    if (minutes > 0) {
      return `${hours} hr ${minutes} min`;
    }

    return `${hours} hr`;
  }

  return `${minutes} min`;
  }
