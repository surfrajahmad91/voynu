/* VOYNU — Fare Rules. Category and active pricing data are database-driven. */

import { normalizeTripType } from "./tripRules";

const CATEGORY_CACHE_KEY = "voynu_vehicle_categories_v1";
const PRICING_CACHE_KEY = "voynu_pricing_v1";

const FALLBACK_PRICING = {
  hatchback: { baseFare: 60, perKmRate: 11, driverAllowancePerDay: 300, minimumFare: 250, roundingUnit: 10 },
  sedan: { baseFare: 80, perKmRate: 13, driverAllowancePerDay: 350, minimumFare: 300, roundingUnit: 10 },
  suv: { baseFare: 100, perKmRate: 16, driverAllowancePerDay: 400, minimumFare: 400, roundingUnit: 10 },
  ev: { baseFare: 70, perKmRate: 12, driverAllowancePerDay: 300, minimumFare: 280, roundingUnit: 10 },
};

const FALLBACK_CATEGORIES = [
  { id: "hatchback", name: "Hatchback", slug: "hatchback", description: "Compact & economical", passenger_capacity: 4, luggage_capacity: 2, sort_order: 10 },
  { id: "sedan", name: "Sedan", slug: "sedan", description: "Comfortable ride", passenger_capacity: 4, luggage_capacity: 3, sort_order: 20 },
  { id: "suv", name: "SUV", slug: "suv", description: "Spacious for groups", passenger_capacity: 6, luggage_capacity: 4, sort_order: 30 },
  { id: "ev", name: "EV", slug: "ev", description: "Electric vehicle", passenger_capacity: 4, luggage_capacity: 3, sort_order: 40 },
];

function getVehicleCategories() {
  if (typeof window === "undefined") return FALLBACK_CATEGORIES;
  try {
    const parsed = JSON.parse(window.localStorage.getItem(CATEGORY_CACHE_KEY) || "null");
    return Array.isArray(parsed) && parsed.length ? parsed : FALLBACK_CATEGORIES;
  } catch { return FALLBACK_CATEGORIES; }
}

function getPricing(categoryId, tripType) {
  if (typeof window !== "undefined") {
    try {
      const cached = JSON.parse(window.localStorage.getItem(PRICING_CACHE_KEY) || "null");
      const rule = cached?.rules?.find(r => r.vehicle_category_id === categoryId && r.trip_type === tripType);
      if (rule) return {
        baseFare: Number(rule.base_fare), perKmRate: Number(rule.per_km_rate),
        driverAllowancePerDay: Number(rule.driver_allowance_per_day), minimumFare: Number(rule.minimum_fare),
        roundingUnit: Number(rule.rounding_unit) || 10,
      };
    } catch { /* use resilient fallback */ }
  }
  const category = getVehicleCategories().find(c => c.id === categoryId);
  return FALLBACK_PRICING[category?.slug] || null;
}

export function calculateFare({ vehicleTypeId, oneWayDistanceKm, tripType = "oneway" }) {
  const vehicle = getVehicleCategories().find(category => category.id === vehicleTypeId);
  const normalizedTripType = normalizeTripType(tripType);
  const pricing = vehicle ? getPricing(vehicle.id, normalizedTripType) : null;
  if (!vehicle || !pricing || !Number.isFinite(Number(oneWayDistanceKm))) return null;

  const billedDistanceKm = normalizedTripType === "roundtrip" ? Number(oneWayDistanceKm) * 2 : Number(oneWayDistanceKm);
  const distanceFare = billedDistanceKm * pricing.perKmRate;
  const driverAllowance = normalizedTripType === "roundtrip" ? pricing.driverAllowancePerDay : 0;
  let totalFare = pricing.baseFare + distanceFare + driverAllowance;
  totalFare = Math.max(totalFare, pricing.minimumFare);
  totalFare = Math.round(totalFare / pricing.roundingUnit) * pricing.roundingUnit;

  return {
    vehicleTypeId: vehicle.id, vehicleCategoryId: vehicle.id, vehicleCategorySlug: vehicle.slug,
    vehicleName: vehicle.name, description: vehicle.description,
    capacity: Number(vehicle.passenger_capacity) || 0, luggageCapacity: Number(vehicle.luggage_capacity) || 0,
    imageUrl: vehicle.image_url || null, billedDistanceKm,
    baseFare: pricing.baseFare, distanceFare: Math.round(distanceFare), driverAllowance,
    totalFare,
  };
}

export function calculateAllFares({ oneWayDistanceKm, tripType = "oneway" }) {
  return getVehicleCategories().map(vehicle => calculateFare({ vehicleTypeId: vehicle.id, oneWayDistanceKm, tripType })).filter(Boolean).sort((a,b) => {
    const categories = getVehicleCategories();
    return (categories.find(c => c.id === a.vehicleTypeId)?.sort_order ?? 0) - (categories.find(c => c.id === b.vehicleTypeId)?.sort_order ?? 0);
  });
}
