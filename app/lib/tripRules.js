/*
|--------------------------------------------------------------------------
| VOYNU — Trip Rules
|--------------------------------------------------------------------------
|
| Central business rules for determining whether a trip can be booked.
|
| IMPORTANT:
| - This file does NOT communicate with Google Maps.
| - This file does NOT call any API.
| - This file does NOT know how LocationPicker works.
| - This file works only with normalized location/trip data.
|
| LocationPicker / Google Maps can provide:
|
| {
|   name,
|   lat,
|   lon
| }
|
|--------------------------------------------------------------------------
*/


/*
|--------------------------------------------------------------------------
| VOYNU TRIP CONFIGURATION
|--------------------------------------------------------------------------
|
| Keep operational rules here.
|
| Later, these values can come from the backend/Admin Panel without
| requiring changes to the booking UI.
|
|--------------------------------------------------------------------------
*/

export const VOYNU_TRIP_CONFIG = {
  /*
   * Maximum ONE-WAY road distance from the selected pickup
   * to the selected destination.
   *
   * Example:
   *
   * Pickup → Drop = 195 km
   *              = ALLOWED
   *
   * Pickup → Drop = 201 km
   *              = NOT ALLOWED
   */
  maxOneWayDistanceKm: 200,


  /*
   * Current VOYNU service areas.
   *
   * At launch, pickup service is available in Kanpur.
   *
   * More service areas can be added later.
   *
   * IMPORTANT:
   *
   * We do NOT fake a geographic Kanpur boundary here.
   *
   * Actual pickup-area verification should eventually be performed
   * using backend/service-area data.
   */
  serviceCities: [
    {
      id: "kanpur",
      name: "Kanpur",

      /*
       * Whether this city is currently active.
       */
      active: true,

      /*
       * Pickup availability.
       */
      pickupAllowed: true,

      /*
       * Maximum destination distance for trips starting here.
       */
      maxDropDistanceKm: 200,
    },
  ],


  /*
   * EV ROUND-TRIP CHARGING RULE
   *
   * The distance below represents the ONE-WAY distance.
   *
   * Example:
   *
   * 195 km one way
   * 390 km round trip
   *
   * Charging break is required.
   */
  roundTripCharging: {
    enabled: true,

    /*
     * Current operational threshold.
     *
     * A trip of 180 km or more one way requires a charging break
     * when booked as a round trip.
     *
     * This can be changed later without modifying page.js.
     */
    distanceThresholdKm: 180,

    /*
     * Required charging break at destination.
     */
    chargingBreakMinutes: 60,
  },
};


/*
|--------------------------------------------------------------------------
| TRIP TYPE NORMALIZATION
|--------------------------------------------------------------------------
|
| page.js currently uses:
|
|   "oneway"
|   "roundtrip"
|
| Older trip rules used:
|
|   "one_way"
|   "round_trip"
|
| Support both formats so existing code does not break.
|
|--------------------------------------------------------------------------
*/

export function normalizeTripType(
  tripType
) {
  if (
    tripType === "roundtrip" ||
    tripType === "round_trip" ||
    tripType === "round-trip"
  ) {
    return "roundtrip";
  }

  return "oneway";
}


/*
|--------------------------------------------------------------------------
| COORDINATE VALIDATION
|--------------------------------------------------------------------------
*/

export function isValidCoordinates(
  location
) {
  if (!location) {
    return false;
  }

  const lat = Number(
    location.lat
  );

  const lon = Number(
    location.lon
  );

  if (
    !Number.isFinite(lat) ||
    !Number.isFinite(lon)
  ) {
    return false;
  }

  if (
    lat < -90 ||
    lat > 90
  ) {
    return false;
  }

  if (
    lon < -180 ||
    lon > 180
  ) {
    return false;
  }

  return true;
}


/*
|--------------------------------------------------------------------------
| STRAIGHT-LINE DISTANCE
|--------------------------------------------------------------------------
|
| Calculates distance between two coordinates using Haversine.
|
| IMPORTANT:
|
| This is NOT road distance.
|
| It is useful as a fallback and for preliminary UI feedback.
|
| Final booking eligibility should preferably use the road distance
| supplied by the Google Maps routing/distance calculation.
|
|--------------------------------------------------------------------------
*/

export function calculateStraightLineDistanceKm(
  locationA,
  locationB
) {
  if (
    !isValidCoordinates(
      locationA
    )
  ) {
    return null;
  }

  if (
    !isValidCoordinates(
      locationB
    )
  ) {
    return null;
  }

  const earthRadiusKm = 6371;

  const lat1 = toRadians(
    Number(locationA.lat)
  );

  const lat2 = toRadians(
    Number(locationB.lat)
  );

  const deltaLat = toRadians(
    Number(locationB.lat) -
      Number(locationA.lat)
  );

  const deltaLon = toRadians(
    Number(locationB.lon) -
      Number(locationA.lon)
  );

  const a =
    Math.sin(deltaLat / 2) ** 2 +
    Math.cos(lat1) *
      Math.cos(lat2) *
      Math.sin(deltaLon / 2) ** 2;

  const c =
    2 *
    Math.atan2(
      Math.sqrt(a),
      Math.sqrt(1 - a)
    );

  return (
    earthRadiusKm * c
  );
}


/*
|--------------------------------------------------------------------------
| SERVICE CITY
|--------------------------------------------------------------------------
|
| Find the currently configured service city.
|
| IMPORTANT:
|
| At this stage we do NOT pretend that coordinates alone can accurately
| determine whether a point is inside the actual Kanpur municipal/city
| boundary.
|
| The booking flow will eventually pass verified service-area information
| from the location/routing layer or backend.
|
|--------------------------------------------------------------------------
*/

export function findServiceCity(
  pickupLocation,
  detectedCityName = null
) {
  if (
    !isValidCoordinates(
      pickupLocation
    )
  ) {
    return null;
  }

  /*
   * We can only confirm a service city if we actually know
   * which city the pickup coordinates resolved to.
   *
   * No detected city name means we cannot safely assume
   * any particular city.
   */
  if (!detectedCityName) {
    return null;
  }

  const normalized = String(
    detectedCityName
  )
    .trim()
    .toLowerCase();

  return (
    VOYNU_TRIP_CONFIG.serviceCities.find(
      (city) => {
        if (
          !city.active ||
          !city.pickupAllowed
        ) {
          return false;
        }

        if (
          city.name.toLowerCase() ===
          normalized
        ) {
          return true;
        }

        const aliases =
          city.aliases || [];

        return aliases.some(
          (alias) =>
            alias.toLowerCase() ===
            normalized
        );
      }
    ) || null
  );
}




/*
|--------------------------------------------------------------------------
| CALCULATE TRIP DETAILS
|--------------------------------------------------------------------------
|
| Main business-rule function.
|
| distanceKm is optional.
|
| If Google Maps has already calculated the road distance, pass it here.
|
| Otherwise, we use straight-line distance as a frontend fallback.
|
|--------------------------------------------------------------------------
*/

export function calculateTripDetails({
  pickup,
  drop,
  tripType = "oneway",
  distanceKm = null,
  pickupCityName = null,
}) {
  const normalizedTripType =
    normalizeTripType(
      tripType
    );

  const result = {
    valid: false,

    pickupValid: false,
    dropValid: false,

    serviceCity: null,

    /*
     * Distance used for the booking rule.
     */
    oneWayDistanceKm: null,

    roundTripDistanceKm: null,

    /*
     * Lets the UI know whether the distance came from Google
     * road distance or our fallback calculation.
     */
    distanceSource: null,

    tripType:
      normalizedTripType,

    chargingRequired: false,
    chargingBreakMinutes: 0,

    reason: null,
  };


  /*
   * --------------------------------------------------------------
   * PICKUP
   * --------------------------------------------------------------
   */

  if (
    !isValidCoordinates(
      pickup
    )
  ) {
    result.reason =
      "Please select a valid pickup location.";

    return result;
  }

  result.pickupValid = true;


  /*
   * --------------------------------------------------------------
   * SERVICE AREA
   * --------------------------------------------------------------
   */

  const serviceCity =
    findServiceCity(
      pickup,
      pickupCityName
    );

  if (!serviceCity) {
    result.reason =
      "Pickup location is outside VOYNU's current service area.";

    return result;
  }

  result.serviceCity =
    serviceCity;

serviceCities: [
    {
      id: "kanpur",
      name: "Kanpur",
      aliases: ["Kanpur Nagar"],
      active: true,
      pickupAllowed: true,
      maxDropDistanceKm: 200,
    },
  ],
  
  /*
   * --------------------------------------------------------------
   * DROP
   * --------------------------------------------------------------
   */

  if (
    !isValidCoordinates(
      drop
    )
  ) {
    result.reason =
      "Please select a valid drop location.";

    return result;
  }

  result.dropValid = true;


  /*
   * --------------------------------------------------------------
   * DISTANCE
   * --------------------------------------------------------------
   *
   * Prefer Google Maps road distance.
   *
   * Otherwise use Haversine as a frontend fallback.
   */

  let oneWayDistanceKm;

  if (
    Number.isFinite(
      Number(distanceKm)
    ) &&
    Number(distanceKm) >= 0
  ) {
    oneWayDistanceKm =
      Number(distanceKm);

    result.distanceSource =
      "google";
  } else {
    oneWayDistanceKm =
      calculateStraightLineDistanceKm(
        pickup,
        drop
      );

    result.distanceSource =
      "straight_line";
  }

  if (
    oneWayDistanceKm === null
  ) {
    result.reason =
      "Unable to calculate trip distance.";

    return result;
  }

  result.oneWayDistanceKm =
    oneWayDistanceKm;


  /*
   * --------------------------------------------------------------
   * MAXIMUM DISTANCE
   * --------------------------------------------------------------
   *
   * The 200 km rule applies FROM THE PICKUP LOCATION.
   *
   * It is NOT:
   *
   *   Kanpur → destination = 200 km
   *
   * It IS:
   *
   *   selected pickup → destination = maximum 200 km
   */

  const maxDistance =
    Number(
      serviceCity.maxDropDistanceKm ??
        VOYNU_TRIP_CONFIG
          .maxOneWayDistanceKm
    );


  /*
   * Destination outside supported distance.
   */

  if (
    oneWayDistanceKm >
    maxDistance
  ) {
    result.reason =
      `Your destination is approximately ${formatDistance(
        oneWayDistanceKm
      )} away. VOYNU currently supports trips up to ${maxDistance} km from your pickup location.`;

    return result;
  }


  /*
   * --------------------------------------------------------------
   * ROUND TRIP
   * --------------------------------------------------------------
   */

  if (
    normalizedTripType ===
    "roundtrip"
  ) {
    result.roundTripDistanceKm =
      oneWayDistanceKm * 2;


    const chargingRule =
      VOYNU_TRIP_CONFIG
        .roundTripCharging;


    /*
     * Charging is based on the ONE-WAY distance.
     *
     * Example:
     *
     * 195 km × 2 = 390 km total
     *
     * → charging break required.
     */

    if (
      chargingRule.enabled &&
      oneWayDistanceKm >=
        chargingRule.distanceThresholdKm
    ) {
      result.chargingRequired =
        true;

      result.chargingBreakMinutes =
        chargingRule
          .chargingBreakMinutes;
    }
  }


  /*
   * --------------------------------------------------------------
   * SUCCESS
   * --------------------------------------------------------------
   */

  result.valid = true;

  return result;
}


/*
|--------------------------------------------------------------------------
| FORMAT DISTANCE
|--------------------------------------------------------------------------
*/

export function formatDistance(
  distanceKm
) {
  const numericDistance =
    Number(distanceKm);

  if (
    !Number.isFinite(
      numericDistance
    )
  ) {
    return "";
  }

  return `${numericDistance.toFixed(
    1
  )} km`;
}


/*
|--------------------------------------------------------------------------
| FORMAT ROUND-TRIP DISTANCE
|--------------------------------------------------------------------------
*/

export function formatRoundTripDistance(
  distanceKm
) {
  const numericDistance =
    Number(distanceKm);

  if (
    !Number.isFinite(
      numericDistance
    )
  ) {
    return "";
  }

  return `${numericDistance.toFixed(
    1
  )} km total`;
}


/*
|--------------------------------------------------------------------------
| CHARGING MESSAGE
|--------------------------------------------------------------------------
|
| Customer-facing charging message.
|
|--------------------------------------------------------------------------
*/

export function getChargingMessage(
  tripDetails
) {
  if (
    !tripDetails?.chargingRequired
  ) {
    return null;
  }

  const minutes =
    tripDetails.chargingBreakMinutes;

  const oneWayDistance =
    formatDistance(
      tripDetails.oneWayDistanceKm
    );

  const roundTripDistance =
    formatRoundTripDistance(
      tripDetails.roundTripDistanceKm
    );

  return (
    `Your destination is approximately ${oneWayDistance} away (${roundTripDistance}). ` +
    `Because this is a round trip, a ${minutes}-minute charging break ` +
    `will be required at the destination before the return journey.`
  );
}


/*
|--------------------------------------------------------------------------
| DISTANCE STATUS
|--------------------------------------------------------------------------
|
| Useful for the booking UI.
|
| Returns:
|
| {
|   allowed,
|   remainingKm,
|   nearLimit
| }
|
|--------------------------------------------------------------------------
*/

export function getDistanceStatus(
  distanceKm,
  maxDistanceKm = VOYNU_TRIP_CONFIG.maxOneWayDistanceKm
) {
  const distance =
    Number(distanceKm);

  const maxDistance =
    Number(maxDistanceKm);

  if (
    !Number.isFinite(distance) ||
    !Number.isFinite(maxDistance)
  ) {
    return {
      allowed: false,
      remainingKm: null,
      nearLimit: false,
    };
  }

  const remainingKm =
    maxDistance - distance;

  return {
    allowed:
      distance <= maxDistance,

    remainingKm,

    /*
     * Useful for showing a subtle warning when the customer
     * is getting close to the service limit.
     */
    nearLimit:
      distance >=
      maxDistance * 0.9,
  };
}


/*
|--------------------------------------------------------------------------
| INTERNAL HELPER
|--------------------------------------------------------------------------
*/

function toRadians(
  degrees
) {
  return (
    degrees *
    (Math.PI / 180)
  );
}
