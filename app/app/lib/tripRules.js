/*
|--------------------------------------------------------------------------
| VOYNU — Trip Rules
|--------------------------------------------------------------------------
|
| Business rules for determining whether a trip can be booked.
|
| IMPORTANT:
| - This file does NOT communicate with Google Maps.
| - This file does NOT call any API.
| - This file only works with coordinates and trip information.
|
| Google Maps / LocationPicker provides:
|   {
|     name,
|     lat,
|     lon
|   }
|
|--------------------------------------------------------------------------
*/

/*
|--------------------------------------------------------------------------
| Default VOYNU configuration
|--------------------------------------------------------------------------
|
| These values are intentionally kept in one place.
|
| Later these can be replaced by configuration coming from the
| Admin Panel / backend without changing the booking UI.
|
*/

export const VOYNU_TRIP_CONFIG = {
  maxOneWayDistanceKm: 200,

  /*
   * Current service cities.
   *
   * More cities can be added as VOYNU expands.
   */
  serviceCities: [
    {
      id: "kanpur",
      name: "Kanpur",
      maxDropDistanceKm: 200,
    },
  ],

  /*
   * Charging rule.
   *
   * This is deliberately configurable.
   *
   * We should NOT assume that every round trip requires charging.
   * The actual threshold can be finalized based on the vehicle/
   * operational rules.
   */
  roundTripCharging: {
    enabled: true,

    /*
     * Temporary operational threshold.
     *
     * Change this when the final EV operating rule is decided.
     */
    distanceThresholdKm: 180,

    chargingBreakMinutes: 60,
  },
};

/*
|--------------------------------------------------------------------------
| Distance calculation
|--------------------------------------------------------------------------
|
| Calculates straight-line distance between two coordinates using
| the Haversine formula.
|
| NOTE:
| This is NOT road distance.
|
| For final booking eligibility, Google Maps road distance should
| ideally be used. This function is useful as a safe fallback and
| for frontend validation.
|
|--------------------------------------------------------------------------
*/

export function calculateStraightLineDistanceKm(
  locationA,
  locationB
) {
  if (!isValidCoordinates(locationA)) {
    return null;
  }

  if (!isValidCoordinates(locationB)) {
    return null;
  }

  const earthRadiusKm = 6371;

  const lat1 =
    toRadians(locationA.lat);

  const lat2 =
    toRadians(locationB.lat);

  const deltaLat =
    toRadians(
      locationB.lat -
        locationA.lat
    );

  const deltaLon =
    toRadians(
      locationB.lon -
        locationA.lon
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

  return earthRadiusKm * c;
}

/*
|--------------------------------------------------------------------------
| Coordinate validation
|--------------------------------------------------------------------------
*/

export function isValidCoordinates(
  location
) {
  if (!location) {
    return false;
  }

  const lat =
    Number(location.lat);

  const lon =
    Number(location.lon);

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
| Service city check
|--------------------------------------------------------------------------
|
| For the current launch:
|
| Pickup must be within an active service city.
|
| IMPORTANT:
| City membership should eventually be determined using proper
| geographic boundaries / service polygons rather than the city
| name returned by Google.
|
| This function currently provides the basic structure.
|
|--------------------------------------------------------------------------
*/

export function findServiceCity(
  pickupLocation
) {
  if (
    !isValidCoordinates(
      pickupLocation
    )
  ) {
    return null;
  }

  /*
   * TODO:
   *
   * Replace this with backend/service-area validation.
   *
   * For now, Kanpur is the active service city.
   */
  return VOYNU_TRIP_CONFIG.serviceCities.find(
    (city) =>
      city.id === "kanpur"
  ) || null;
}

/*
|--------------------------------------------------------------------------
| Calculate trip information
|--------------------------------------------------------------------------
|
| Returns a normalized object that the booking page can use.
|
|--------------------------------------------------------------------------
*/

export function calculateTripDetails({
  pickup,
  drop,
  tripType = "one_way",
}) {
  const result = {
    valid: false,

    pickupValid: false,
    dropValid: false,

    serviceCity: null,

    oneWayDistanceKm: null,
    roundTripDistanceKm: null,

    tripType,

    chargingRequired: false,
    chargingBreakMinutes: 0,

    reason: null,
  };

  /*
   * Validate pickup.
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
   * Validate that pickup is inside
   * an active VOYNU service area.
   */
  const serviceCity =
    findServiceCity(
      pickup
    );

  if (!serviceCity) {
    result.reason =
      "Pickup location is outside VOYNU's current service area.";

    return result;
  }

  result.serviceCity =
    serviceCity;

  /*
   * Validate destination.
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
   * Calculate distance.
   */
  const oneWayDistanceKm =
    calculateStraightLineDistanceKm(
      pickup,
      drop
    );

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
   * Maximum distance is based on
   * the actual pickup location.
   */
  const maxDistance =
    serviceCity.maxDropDistanceKm ??
    VOYNU_TRIP_CONFIG
      .maxOneWayDistanceKm;

  /*
   * Destination beyond the allowed
   * one-way distance.
   */
  if (
    oneWayDistanceKm >
    maxDistance
  ) {
    result.reason =
      `Your destination is approximately ${formatDistance(
        oneWayDistanceKm
      )} away. VOYNU currently supports trips up to ${maxDistance} km from the pickup location.`;

    return result;
  }

  /*
   * Round trip.
   */
  if (
    tripType ===
    "round_trip"
  ) {
    result.roundTripDistanceKm =
      oneWayDistanceKm * 2;

    const chargingRule =
      VOYNU_TRIP_CONFIG
        .roundTripCharging;

    if (
      chargingRule.enabled &&
      oneWayDistanceKm >=
        chargingRule.distanceThresholdKm
    ) {
      result.chargingRequired =
        true;

      result.chargingBreakMinutes =
        chargingRule.chargingBreakMinutes;
    }
  }

  result.valid = true;

  return result;
}

/*
|--------------------------------------------------------------------------
| Format distance
|--------------------------------------------------------------------------
*/

export function formatDistance(
  distanceKm
) {
  if (
    !Number.isFinite(
      Number(distanceKm)
    )
  ) {
    return "";
  }

  return `${Number(
    distanceKm
  ).toFixed(1)} km`;
}

/*
|--------------------------------------------------------------------------
| Charging message
|--------------------------------------------------------------------------
|
| Customer-facing message.
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

  const distance =
    formatDistance(
      tripDetails.oneWayDistanceKm
    );

  return (
    `Your destination is approximately ${distance} away. ` +
    `For the return journey, a ${minutes}-minute charging break ` +
    `will be required at the destination before departure.`
  );
}

/*
|--------------------------------------------------------------------------
| Internal helper
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
