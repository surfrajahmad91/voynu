/* VOYNU — Fare Rules. Database-backed pricing is authoritative on the server. */

import { normalizeTripType } from "./tripRules";

const CATEGORY_CACHE_KEY = "voynu_vehicle_categories_v1";
const PRICING_CACHE_KEY = "voynu_pricing_v1";

function getVehicleCategories() {
  if (typeof window === "undefined") return [];
  try {
    const parsed = JSON.parse(window.localStorage.getItem(CATEGORY_CACHE_KEY) || "null");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function getPricing(categoryId, tripType) {
  if (typeof window === "undefined") return null;
  try {
    const cached = JSON.parse(window.localStorage.getItem(PRICING_CACHE_KEY) || "null");
    const rule = cached?.rules?.find(
      (r) => r.vehicle_category_id === categoryId && r.trip_type === tripType
    );
    if (!rule) return null;
    return normalizePricingRule(rule);
  } catch {
    return null;
  }
}

function normalizePricingRule(rule) {
  return {
    baseFare: Number(rule.base_fare),
    perKmRate: Number(rule.per_km_rate),
    driverAllowancePerDay: Number(rule.driver_allowance_per_day),
    minimumFare: Number(rule.minimum_fare),
    roundingUnit: Number(rule.rounding_unit) || 1,
  };
}

function calculateFareFromData({ vehicle, pricing, oneWayDistanceKm, tripType }) {
  const normalizedTripType = normalizeTripType(tripType);
  if (!vehicle || !pricing || !Number.isFinite(Number(oneWayDistanceKm))) return null;

  const billedDistanceKm =
    normalizedTripType === "roundtrip"
      ? Number(oneWayDistanceKm) * 2
      : Number(oneWayDistanceKm);

  const distanceFare = billedDistanceKm * pricing.perKmRate;
  const driverAllowance =
    normalizedTripType === "roundtrip" ? pricing.driverAllowancePerDay : 0;

  let totalFare = Math.max(
    pricing.baseFare + distanceFare + driverAllowance,
    pricing.minimumFare
  );
  totalFare =
    Math.round(totalFare / pricing.roundingUnit) * pricing.roundingUnit;

  return {
    vehicleTypeId: vehicle.id,
    vehicleCategoryId: vehicle.id,
    vehicleCategorySlug: vehicle.slug,
    vehicleName: vehicle.name,
    description: vehicle.description || "",
    capacity: Number(vehicle.passenger_capacity) || 0,
    luggageCapacity: Number(vehicle.luggage_capacity) || 0,
    imageUrl: vehicle.image_url || null,
    billedDistanceKm,
    baseFare: pricing.baseFare,
    distanceFare: Math.round(distanceFare),
    driverAllowance,
    totalFare,
  };
}

export function calculateFare({ vehicleTypeId, oneWayDistanceKm, tripType = "oneway" }) {
  const vehicle = getVehicleCategories().find(
    (category) => category.id === vehicleTypeId
  );
  const normalizedTripType = normalizeTripType(tripType);
  const pricing = vehicle ? getPricing(vehicle.id, normalizedTripType) : null;
  return calculateFareFromData({
    vehicle,
    pricing,
    oneWayDistanceKm,
    tripType: normalizedTripType,
  });
}

export function calculateAllFaresFromData({
  vehicleCategories = [],
  pricingRules = [],
  oneWayDistanceKm,
  tripType = "oneway",
}) {
  const normalizedTripType = normalizeTripType(tripType);
  const pricingByCategoryId = new Map(
    pricingRules
      .filter((rule) => rule.trip_type === normalizedTripType)
      .map((rule) => [rule.vehicle_category_id, normalizePricingRule(rule)])
  );

  return vehicleCategories
    .filter(
      (category) => category.active !== false && category.bookable !== false
    )
    .map((vehicle) =>
      calculateFareFromData({
        vehicle,
        pricing: pricingByCategoryId.get(vehicle.id) || null,
        oneWayDistanceKm,
        tripType: normalizedTripType,
      })
    )
    .filter(Boolean)
    .sort(
      (a, b) =>
        (Number(vehicleCategories.find((c) => c.id === a.vehicleTypeId)?.sort_order) || 0) -
        (Number(vehicleCategories.find((c) => c.id === b.vehicleTypeId)?.sort_order) || 0)
    );
}

export function calculateAllFares({ oneWayDistanceKm, tripType = "oneway" }) {
  return calculateAllFaresFromData({
    vehicleCategories: getVehicleCategories(),
    pricingRules: (() => {
      try {
        const cached = JSON.parse(
          window.localStorage.getItem(PRICING_CACHE_KEY) || "null"
        );
        return Array.isArray(cached?.rules) ? cached.rules : [];
      } catch {
        return [];
      }
    })(),
    oneWayDistanceKm,
    tripType,
  });
}
