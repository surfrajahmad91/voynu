/* VOYNU — Fare Rules. Database-backed pricing is authoritative on the server. */

import { normalizeTripType } from "./tripRules";

const CATEGORY_CACHE_KEY = "voynu_vehicle_categories_v1";
const PRICING_CACHE_KEY = "voynu_pricing_v1";

function getVehicleCategories() {
  if (typeof window === "undefined") return [];
  try {
    const parsed = JSON.parse(window.localStorage.getItem(CATEGORY_CACHE_KEY) || "null");
    return Array.isArray(parsed) ? parsed : [];
  } catch { return []; }
}

function getPricing(categoryId, tripType) {
  if (typeof window === "undefined") return null;
  try {
    const cached = JSON.parse(window.localStorage.getItem(PRICING_CACHE_KEY) || "null");
    const rule = cached?.rules?.find(r => r.vehicle_category_id === categoryId && r.trip_type === tripType);
    if (!rule) return null;
    return {
      baseFare: Number(rule.base_fare),
      perKmRate: Number(rule.per_km_rate),
      driverAllowancePerDay: Number(rule.driver_allowance_per_day),
      minimumFare: Number(rule.minimum_fare),
      roundingUnit: Number(rule.rounding_unit) || 1,
    };
  } catch { return null; }
}

export function calculateFare({ vehicleTypeId, oneWayDistanceKm, tripType = "oneway" }) {
  const vehicle = getVehicleCategories().find(category => category.id === vehicleTypeId);
  const normalizedTripType = normalizeTripType(tripType);
  const pricing = vehicle ? getPricing(vehicle.id, normalizedTripType) : null;
  if (!vehicle || !pricing || !Number.isFinite(Number(oneWayDistanceKm))) return null;

  const billedDistanceKm = normalizedTripType === "roundtrip" ? Number(oneWayDistanceKm) * 2 : Number(oneWayDistanceKm);
  const distanceFare = billedDistanceKm * pricing.perKmRate;
  const driverAllowance = normalizedTripType === "roundtrip" ? pricing.driverAllowancePerDay : 0;
  let totalFare = Math.max(pricing.baseFare + distanceFare + driverAllowance, pricing.minimumFare);
  totalFare = Math.round(totalFare / pricing.roundingUnit) * pricing.roundingUnit;

  return {
    vehicleTypeId: vehicle.id,
    vehicleCategoryId: vehicle.id,
    vehicleCategorySlug: vehicle.slug,
    vehicleName: vehicle.name,
    description: vehicle.description,
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

export function calculateAllFares({ oneWayDistanceKm, tripType = "oneway" }) {
  return getVehicleCategories()
    .filter(category => category.active !== false && category.bookable !== false)
    .map(vehicle => calculateFare({ vehicleTypeId: vehicle.id, oneWayDistanceKm, tripType }))
    .filter(Boolean)
    .sort((a, b) => {
      const categories = getVehicleCategories();
      return (categories.find(c => c.id === a.vehicleTypeId)?.sort_order ?? 0) - (categories.find(c => c.id === b.vehicleTypeId)?.sort_order ?? 0);
    });
}
