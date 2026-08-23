/*
|--------------------------------------------------------------------------
| VOYNU — Trip Rules
|--------------------------------------------------------------------------
|
| Central business rules for determining whether a trip can be booked.
|
| BUSINESS RULE:
| Pickup validity is determined by actual coordinates checked
| against a geographic service area (circle or polygon), never
| by matching text like "Kanpur" from a geocoded address string.
| See app/lib/geofence.js and app/lib/serviceAreas.js.
|
| IMPORTANT:
| - This file does NOT communicate with Google Maps.
| - This file does NOT call any API directly (service areas are
|   fetched separately and passed in, keeping this module pure
|   and easy to reuse/test).
|
|--------------------------------------------------------------------------
*/

import { isPointInServiceArea } from "./geofence";

/*
|--------------------------------------------------------------------------
| VOYNU TRIP CONFIGURATION
|--------------------------------------------------------------------------
|
| Non-geographic trip rules. Geographic service-area config now
| lives in the `service_areas` table (see serviceAreas.js),
| since that needs to be configurable without a redeploy.
|
|--------------------------------------------------------------------------
*/

export const VOYNU_TRIP_CONFIG = {
  /*
   * Fallback maximum one-way distance if a matched service
   * area doesn't specify its own max_drop_distance_km.
   *
   * BUSINESS RULE: this is a PER-LEG limit, not a round-trip
   * total. See calculateTripDetails() below for how round
   * trips are validated leg-by-leg.
   */
  maxOneWayDistanceKm: 200,

  /*
   * EV ROUND-TRIP CHARGING RULE
   *
   * A trip of this one-way distance or more requires a
   * charging break when booked as a round trip.
   */
  roundTripCharging: {
    enabled: true,
    distanceThresholdKm: 180,
    chargingBreakMinutes: 60,
  },
};


/*
|--------------------------------------------------------------------------
| TRIP TYPE NORMALIZATION
|--------------------------------------------------------------------------
*/

export function normalizeTripType(tripType) {
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

export function isValidCoordinates(location) {
  if (!location) {
    return false;
  }

  const lat = Number(location.lat);
  const lon = Number(location.lon);

  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    return false;
  }

  if (lat < -90 || lat > 90) {
    return false;
  }

  if (lon < -180 || lon > 180) {
    return false;
  }

  return true;
}


/*
|--------------------------------------------------------------------------
| STRAIGHT-LINE DISTANCE (fallback only)
|--------------------------------------------------------------------------
|
| NOT road distance. Used only as a frontend fallback if the
| Google road-distance API is unavailable. Final booking
| eligibility should always prefer the road distance.
|
|--------------------------------------------------------------------------
*/

export function calculateStraightLineDistanceKm(
  locationA,
  locationB
) {
  if (!isValidCoordinates(locationA)) return null;
  if (!isValidCoordinates(locationB)) return null;

  const earthRadiusKm = 6371;

  const lat1 = toRadians(Number(locationA.lat));
  const lat2 = toRadians(Number(locationB.lat));

  const deltaLat = toRadians(
    Number(locationB.lat) - Number(locationA.lat)
  );

  const deltaLon = toRadians(
    Number(locationB.lon) - Number(locationA.lon)
  );

  const a =
    Math.sin(deltaLat / 2) ** 2 +
    Math.cos(lat1) *
      Math.cos(lat2) *
      Math.sin(deltaLon / 2) ** 2;

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return earthRadiusKm * c;
}


/*
|--------------------------------------------------------------------------
| FIND SERVICE AREA (geofence-based)
|--------------------------------------------------------------------------
|
| BUSINESS RULE:
| Determines whether the pickup point falls inside any
| currently active VOYNU service area, using actual coordinate
| geometry (circle or polygon) — not text matching.
|
| serviceAreas: array of rows from the `service_areas` table
| (fetched via serviceAreas.js). Passed in rather than fetched
| here, so this function stays a pure, synchronous, easily
| testable business-rule check.
|
|--------------------------------------------------------------------------
*/

export function findServiceArea(pickupLocation, serviceAreas) {
  if (!isValidCoordinates(pickupLocation)) {
    return null;
  }

  if (!Array.isArray(serviceAreas) || serviceAreas.length === 0) {
    return null;
  }

  const lat = Number(pickupLocation.lat);
  const lon = Number(pickupLocation.lon);

  return (
    serviceAreas.find((area) =>
      isPointInServiceArea(lat, lon, area)
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
| serviceAreas: active service areas from the database, used
| for the geofence check (required — no default areas are
| hardcoded here anymore).
|
| distanceKm: road distance from Google, if available. Falls
| back to straight-line distance only if omitted.
|
|--------------------------------------------------------------------------
*/

export function calculateTripDetails({
  pickup,
  drop,
  tripType = "oneway",
  distanceKm = null,
  serviceAreas = [],
}) {
  const normalizedTripType = normalizeTripType(tripType);

  const result = {
    valid: false,

    pickupValid: false,
    dropValid: false,

    serviceArea: null,

    oneWayDistanceKm: null,
    roundTripDistanceKm: null,
    maxOneWayDistanceKm: null,

    distanceSource: null,

    tripType: normalizedTripType,

    chargingRequired: false,
    chargingBreakMinutes: 0,

    reason: null,
  };

  /*
   * --------------------------------------------------------------
   * PICKUP
   * --------------------------------------------------------------
   */

  if (!isValidCoordinates(pickup)) {
    result.reason = "Please select a valid pickup location.";
    return result;
  }

  result.pickupValid = true;

  /*
   * --------------------------------------------------------------
   * SERVICE AREA (geofence check)
   * --------------------------------------------------------------
   *
   * BUSINESS RULE: pickup must fall inside VOYNU's current
   * service area, determined geographically. The destination
   * is NOT restricted to being inside this area — only pickup.
   */

  const serviceArea = findServiceArea(pickup, serviceAreas);

  if (!serviceArea) {
    result.reason =
      "VOYNU pickup is currently available only within Kanpur.";
    return result;
  }

  result.serviceArea = serviceArea;

  /*
   * --------------------------------------------------------------
   * DROP
   * --------------------------------------------------------------
   */

  if (!isValidCoordinates(drop)) {
    result.reason = "Please select a valid drop location.";
    return result;
  }

  result.dropValid = true;

  /*
   * --------------------------------------------------------------
   * DISTANCE
   * --------------------------------------------------------------
   *
   * Prefer Google Maps road distance. Fall back to Haversine
   * only if no road distance was supplied.
   */

  let oneWayDistanceKm;

  if (
    distanceKm !== null &&
    distanceKm !== undefined &&
    Number.isFinite(Number(distanceKm)) &&
    Number(distanceKm) >= 0
  ) {
    oneWayDistanceKm = Number(distanceKm);
    result.distanceSource = "google";
  } else {
    oneWayDistanceKm = calculateStraightLineDistanceKm(
      pickup,
      drop
    );
    result.distanceSource = "straight_line";
  }

  if (oneWayDistanceKm === null) {
    result.reason = "Unable to calculate trip distance.";
    return result;
  }

  result.oneWayDistanceKm = oneWayDistanceKm;

  /*
   * --------------------------------------------------------------
   * MAXIMUM DISTANCE
   * --------------------------------------------------------------
   *
   * BUSINESS RULE: this is a PER-LEG limit (200km by default,
   * configurable per service area), not a round-trip total.
   * A round trip of 180km one-way (360km total) is allowed;
   * a one-way trip of 205km is not, even though it's under
   * the "400km total" some might assume as the round-trip cap.
   */

  const maxDistance = Number(
    serviceArea.max_drop_distance_km ??
      VOYNU_TRIP_CONFIG.maxOneWayDistanceKm
  );

  result.maxOneWayDistanceKm = maxDistance;

  if (oneWayDistanceKm > maxDistance) {
    result.reason = `Your destination is approximately ${formatDistance(
      oneWayDistanceKm
    )} away. VOYNU currently supports trips up to ${maxDistance} km from your pickup location.`;
    return result;
  }

  /*
   * --------------------------------------------------------------
   * ROUND TRIP
   * --------------------------------------------------------------
   *
   * BUSINESS RULE: each leg is validated independently against
   * maxDistance above (already done). Round trip total is
   * informational only — it is NOT re-validated against a
   * separate "400km total" limit, since that would be
   * redundant with (and could conflict with) the per-leg rule.
   */

  if (normalizedTripType === "roundtrip") {
    result.roundTripDistanceKm = oneWayDistanceKm * 2;

    const chargingRule = VOYNU_TRIP_CONFIG.roundTripCharging;

    if (
      chargingRule.enabled &&
      oneWayDistanceKm >= chargingRule.distanceThresholdKm
    ) {
      result.chargingRequired = true;
      result.chargingBreakMinutes =
        chargingRule.chargingBreakMinutes;
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
| FORMAT HELPERS
|--------------------------------------------------------------------------
*/

export function formatDistance(distanceKm) {
  const numericDistance = Number(distanceKm);

  if (!Number.isFinite(numericDistance)) {
    return "";
  }

  return `${numericDistance.toFixed(1)} km`;
}

export function formatRoundTripDistance(distanceKm) {
  const numericDistance = Number(distanceKm);

  if (!Number.isFinite(numericDistance)) {
    return "";
  }

  return `${numericDistance.toFixed(1)} km total`;
}

export function getChargingMessage(tripDetails) {
  if (!tripDetails?.chargingRequired) {
    return null;
  }

  const minutes = tripDetails.chargingBreakMinutes;

  const oneWayDistance = formatDistance(
    tripDetails.oneWayDistanceKm
  );

  const roundTripDistance = formatRoundTripDistance(
    tripDetails.roundTripDistanceKm
  );

  return (
    `Your destination is approximately ${oneWayDistance} away (${roundTripDistance}). ` +
    `Because this is a round trip, a ${minutes}-minute charging break ` +
    `will be required at the destination before the return journey.`
  );
}

export function getDistanceStatus(
  distanceKm,
  maxDistanceKm = VOYNU_TRIP_CONFIG.maxOneWayDistanceKm
) {
  const distance = Number(distanceKm);
  const maxDistance = Number(maxDistanceKm);

  if (
    !Number.isFinite(distance) ||
    !Number.isFinite(maxDistance)
  ) {
    return { allowed: false, remainingKm: null, nearLimit: false };
  }

  const remainingKm = maxDistance - distance;

  return {
    allowed: distance <= maxDistance,
    remainingKm,
    nearLimit: distance >= maxDistance * 0.9,
  };
}

/*
|--------------------------------------------------------------------------
| INTERNAL HELPER
|--------------------------------------------------------------------------
*/

function toRadians(degrees) {
  return degrees * (Math.PI / 180);
}
