/*
|--------------------------------------------------------------------------
| VOYNU — Trip Rules
|--------------------------------------------------------------------------
*/

import { isPointInServiceArea } from "./geofence";

export const VOYNU_TRIP_CONFIG = {
  maxOneWayDistanceKm: 200,
  roundTripCharging: { enabled: true, distanceThresholdKm: 180, chargingBreakMinutes: 60 },
  roundTripWaiting: { maxWaitMinutes: 180, intervalMinutes: 15, feePerInterval: 50 },
};

export function normalizeTripType(tripType) {
  if (tripType === "roundtrip" || tripType === "round_trip" || tripType === "round-trip") return "roundtrip";
  return "oneway";
}

export function isValidCoordinates(location) {
  if (!location) return false;
  const lat = Number(location.lat), lon = Number(location.lon);
  return Number.isFinite(lat) && lat >= -90 && lat <= 90 && Number.isFinite(lon) && lon >= -180 && lon <= 180;
}

export function calculateStraightLineDistanceKm(locationA, locationB) {
  if (!isValidCoordinates(locationA) || !isValidCoordinates(locationB)) return null;
  const earthRadiusKm = 6371;
  const lat1 = toRadians(Number(locationA.lat)), lat2 = toRadians(Number(locationB.lat));
  const deltaLat = toRadians(Number(locationB.lat) - Number(locationA.lat));
  const deltaLon = toRadians(Number(locationB.lon) - Number(locationA.lon));
  const a = Math.sin(deltaLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLon / 2) ** 2;
  return earthRadiusKm * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

export function findServiceArea(pickupLocation, serviceAreas) {
  if (!isValidCoordinates(pickupLocation) || !Array.isArray(serviceAreas) || serviceAreas.length === 0) return null;
  return serviceAreas.find((area) => isPointInServiceArea(Number(pickupLocation.lat), Number(pickupLocation.lon), area)) || null;
}

export function calculateTripDetails({ pickup, drop, tripType = "oneway", distanceKm = null, serviceAreas = [] }) {
  const normalizedTripType = normalizeTripType(tripType);
  const result = { valid: false, pickupValid: false, dropValid: false, serviceArea: null, oneWayDistanceKm: null, roundTripDistanceKm: null, maxOneWayDistanceKm: null, distanceSource: null, tripType: normalizedTripType, chargingRequired: false, chargingBreakMinutes: 0, reason: null };
  if (!isValidCoordinates(pickup)) { result.reason = "Please select a valid pickup location."; return result; }
  result.pickupValid = true;
  const serviceArea = findServiceArea(pickup, serviceAreas);
  if (!serviceArea) { result.reason = "This pickup location is currently outside VOYNU's service area."; return result; }
  result.serviceArea = serviceArea;
  if (!isValidCoordinates(drop)) { result.reason = "Please select a valid drop location."; return result; }
  result.dropValid = true;
  let oneWayDistanceKm;
  if (distanceKm !== null && distanceKm !== undefined && Number.isFinite(Number(distanceKm)) && Number(distanceKm) >= 0) { oneWayDistanceKm = Number(distanceKm); result.distanceSource = "google"; }
  else { oneWayDistanceKm = calculateStraightLineDistanceKm(pickup, drop); result.distanceSource = "straight_line"; }
  if (oneWayDistanceKm === null) { result.reason = "Unable to calculate trip distance."; return result; }
  result.oneWayDistanceKm = oneWayDistanceKm;
  const maxDistance = Number(serviceArea.max_drop_distance_km ?? VOYNU_TRIP_CONFIG.maxOneWayDistanceKm);
  result.maxOneWayDistanceKm = maxDistance;
  if (!Number.isFinite(maxDistance) || maxDistance < 0) { result.reason = "VOYNU service-area configuration is invalid."; return result; }
  if (oneWayDistanceKm > maxDistance) { result.reason = `Your destination is approximately ${formatDistance(oneWayDistanceKm)} away. VOYNU currently supports trips up to ${maxDistance} km from your pickup location.`; return result; }
  if (normalizedTripType === "roundtrip") {
    result.roundTripDistanceKm = oneWayDistanceKm * 2;
    const chargingRule = VOYNU_TRIP_CONFIG.roundTripCharging;
    if (chargingRule.enabled && oneWayDistanceKm >= chargingRule.distanceThresholdKm) { result.chargingRequired = true; result.chargingBreakMinutes = chargingRule.chargingBreakMinutes; }
  }
  result.valid = true;
  return result;
}

export function formatDistance(distanceKm) { const numericDistance = Number(distanceKm); return Number.isFinite(numericDistance) ? `${numericDistance.toFixed(1)} km` : ""; }
export function formatRoundTripDistance(distanceKm) { const numericDistance = Number(distanceKm); return Number.isFinite(numericDistance) ? `${numericDistance.toFixed(1)} km total` : ""; }
export function getChargingMessage(tripDetails) {
  if (!tripDetails?.chargingRequired) return null;
  return `Your destination is approximately ${formatDistance(tripDetails.oneWayDistanceKm)} away (${formatRoundTripDistance(tripDetails.roundTripDistanceKm)}). Because this is a round trip, a ${tripDetails.chargingBreakMinutes}-minute charging break will be required at the destination before the return journey.`;
}
export function getDistanceStatus(distanceKm, maxDistanceKm = VOYNU_TRIP_CONFIG.maxOneWayDistanceKm) {
  const distance = Number(distanceKm), maxDistance = Number(maxDistanceKm);
  if (!Number.isFinite(distance) || !Number.isFinite(maxDistance)) return { allowed: false, remainingKm: null, nearLimit: false };
  return { allowed: distance <= maxDistance, remainingKm: maxDistance - distance, nearLimit: distance >= maxDistance * 0.9 };
}

export function calculateWaitingFee(waitMinutes, { rate = VOYNU_TRIP_CONFIG.roundTripWaiting.feePerInterval, intervalMinutes = VOYNU_TRIP_CONFIG.roundTripWaiting.intervalMinutes } = {}) {
  const minutes = Math.max(0, Number(waitMinutes) || 0);
  const interval = Math.max(1, Number(intervalMinutes) || 15);
  return Math.ceil(minutes / interval) * Math.max(0, Number(rate) || 0);
}

export function parseLocalDateTime(date, time) {
  if (!date || !time || !/^\d{4}-\d{2}-\d{2}$/.test(String(date)) || !/^\d{2}:\d{2}$/.test(String(time))) return null;
  const [h, m] = String(time).split(":").map(Number);
  const value = new Date(`${date}T${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:00`);
  return Number.isNaN(value.getTime()) ? null : value;
}

export function validateRoundTripSchedule({ travelDate, pickupTime, returnDate, returnTime, durationSeconds, maxWaitMinutes = 180 }) {
  const start = parseLocalDateTime(travelDate, pickupTime), ret = parseLocalDateTime(returnDate, returnTime);
  if (!start || !ret) return { valid: false, code: "ROUNDTRIP_DATETIME_REQUIRED", message: "Please select a valid pickup date/time and return date/time." };
  if (returnDate !== travelDate) return { valid: false, code: "ROUNDTRIP_SAME_DAY", message: "Round trips must return on the same day as pickup. Please choose a return time on the travel date." };
  if (ret <= start) return { valid: false, code: "ROUNDTRIP_RETURN_AFTER_PICKUP", message: "Return time must be later than pickup time." };
  const duration = Number(durationSeconds);
  if (!Number.isFinite(duration) || duration < 0) return { valid: false, code: "ROUNDTRIP_DURATION_REQUIRED", message: "Please wait for the road journey time to be calculated before choosing a return time." };
  const arrival = new Date(start.getTime() + duration * 1000);
  const maxReturn = new Date(arrival.getTime() + Math.max(0, Number(maxWaitMinutes) || 180) * 60000);
  if (ret > maxReturn) return { valid: false, code: "ROUNDTRIP_WAIT_LIMIT", message: `Return time must be within ${Math.max(0, Number(maxWaitMinutes) || 180) / 60} hours after the estimated arrival at your destination.` };
  const waitMinutes = Math.max(0, Math.round((ret.getTime() - arrival.getTime()) / 60000));
  return { valid: true, arrivalAt: arrival, maxReturnAt: maxReturn, waitMinutes };
}

function toRadians(degrees) { return degrees * (Math.PI / 180); }
