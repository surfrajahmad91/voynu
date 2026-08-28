/*
|--------------------------------------------------------------------------
| VOYNU — Trip Rules
|--------------------------------------------------------------------------
|
| Central business rules for determining whether a trip can be booked.
|
| Geographic pickup eligibility is determined by actual coordinates checked
| against active service-area geometry. Service-area configuration lives in
| Supabase so the operating area can be changed without a code deployment.
|
|--------------------------------------------------------------------------
*/

import { isPointInServiceArea } from "./geofence";

export const VOYNU_TRIP_CONFIG = {
  maxOneWayDistanceKm: 200,
  roundTripCharging: {
    enabled: true,
    distanceThresholdKm: 180,
    chargingBreakMinutes: 60,
  },
};

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

export function isValidCoordinates(location) {
  if (!location) return false;

  const lat = Number(location.lat);
  const lon = Number(location.lon);

  return (
    Number.isFinite(lat) &&
    Number.isFinite(lon) &&
    lat >= -90 &&
    lat <= 90 &&
    lon >= -180 &&
    lon <= 180
  );
}

export function calculateStraightLineDistanceKm(locationA, locationB) {
  if (!isValidCoordinates(locationA) || !isValidCoordinates(locationB)) {
    return null;
  }

  const earthRadiusKm = 6371;
  const lat1 = toRadians(Number(locationA.lat));
  const lat2 = toRadians(Number(locationB.lat));
  const deltaLat = toRadians(Number(locationB.lat) - Number(locationA.lat));
  const deltaLon = toRadians(Number(locationB.lon) - Number(locationA.lon));

  const a =
    Math.sin(deltaLat / 2) ** 2 +
    Math.cos(lat1) *
      Math.cos(lat2) *
      Math.sin(deltaLon / 2) ** 2;

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return earthRadiusKm * c;
}

export function findServiceArea(pickupLocation, serviceAreas) {
  if (!isValidCoordinates(pickupLocation)) return null;
  if (!Array.isArray(serviceAreas) || serviceAreas.length === 0) return null;

  const lat = Number(pickupLocation.lat);
  const lon = Number(pickupLocation.lon);

  return (
    serviceAreas.find((area) => isPointInServiceArea(lat, lon, area)) || null
  );
}

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

  if (!isValidCoordinates(pickup)) {
    result.reason = "Please select a valid pickup location.";
    return result;
  }

  result.pickupValid = true;

  const serviceArea = findServiceArea(pickup, serviceAreas);
  if (!serviceArea) {
    result.reason = "This pickup location is currently outside VOYNU's service area.";
    return result;
  }

  result.serviceArea = serviceArea;

  if (!isValidCoordinates(drop)) {
    result.reason = "Please select a valid drop location.";
    return result;
  }

  result.dropValid = true;

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
    oneWayDistanceKm = calculateStraightLineDistanceKm(pickup, drop);
    result.distanceSource = "straight_line";
  }

  if (oneWayDistanceKm === null) {
    result.reason = "Unable to calculate trip distance.";
    return result;
  }

  result.oneWayDistanceKm = oneWayDistanceKm;

  const maxDistance = Number(
    serviceArea.max_drop_distance_km ?? VOYNU_TRIP_CONFIG.maxOneWayDistanceKm
  );
  result.maxOneWayDistanceKm = maxDistance;

  if (!Number.isFinite(maxDistance) || maxDistance < 0) {
    result.reason = "VOYNU service-area configuration is invalid.";
    return result;
  }

  if (oneWayDistanceKm > maxDistance) {
    result.reason = `Your destination is approximately ${formatDistance(
      oneWayDistanceKm
    )} away. VOYNU currently supports trips up to ${maxDistance} km from your pickup location.`;
    return result;
  }

  if (normalizedTripType === "roundtrip") {
    result.roundTripDistanceKm = oneWayDistanceKm * 2;

    const chargingRule = VOYNU_TRIP_CONFIG.roundTripCharging;
    if (
      chargingRule.enabled &&
      oneWayDistanceKm >= chargingRule.distanceThresholdKm
    ) {
      result.chargingRequired = true;
      result.chargingBreakMinutes = chargingRule.chargingBreakMinutes;
    }
  }

  result.valid = true;
  return result;
}

export function formatDistance(distanceKm) {
  const numericDistance = Number(distanceKm);
  if (!Number.isFinite(numericDistance)) return "";
  return `${numericDistance.toFixed(1)} km`;
}

export function formatRoundTripDistance(distanceKm) {
  const numericDistance = Number(distanceKm);
  if (!Number.isFinite(numericDistance)) return "";
  return `${numericDistance.toFixed(1)} km total`;
}

export function getChargingMessage(tripDetails) {
  if (!tripDetails?.chargingRequired) return null;

  const minutes = tripDetails.chargingBreakMinutes;
  const oneWayDistance = formatDistance(tripDetails.oneWayDistanceKm);
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

  if (!Number.isFinite(distance) || !Number.isFinite(maxDistance)) {
    return { allowed: false, remainingKm: null, nearLimit: false };
  }

  const remainingKm = maxDistance - distance;
  return {
    allowed: distance <= maxDistance,
    remainingKm,
    nearLimit: distance >= maxDistance * 0.9,
  };
}

function toRadians(degrees) {
  return degrees * (Math.PI / 180);
}
