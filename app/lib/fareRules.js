/*
|--------------------------------------------------------------------------
| VOYNU — Fare Rules
|--------------------------------------------------------------------------
|
| Vehicle category identity/metadata is now database-driven.
| Pricing remains temporarily keyed by category slug until the
| dedicated database pricing-engine step is completed.
|
| The category cache is populated from Supabase by
| VehicleCategoryBootstrap before /cab-selection is used.
|
|--------------------------------------------------------------------------
*/

import { normalizeTripType } from "./tripRules";

const CACHE_KEY = "voynu_vehicle_categories_v1";

/* Transitional pricing map. Phase 5 will move these values fully into
 * the versioned database pricing engine. Do not add vehicle categories here. */
const PRICING_BY_SLUG = {
  hatchback: {
    baseFare: 60,
    perKmRate: 11,
    driverAllowancePerDay: 300,
    minimumFare: 250,
  },
  sedan: {
    baseFare: 80,
    perKmRate: 13,
    driverAllowancePerDay: 350,
    minimumFare: 300,
  },
  suv: {
    baseFare: 100,
    perKmRate: 16,
    driverAllowancePerDay: 400,
    minimumFare: 400,
  },
  ev: {
    baseFare: 70,
    perKmRate: 12,
    driverAllowancePerDay: 300,
    minimumFare: 280,
  },
};

const FALLBACK_CATEGORIES = [
  {
    id: "hatchback",
    name: "Hatchback",
    slug: "hatchback",
    description: "Compact & economical",
    passenger_capacity: 4,
    luggage_capacity: 2,
    sort_order: 10,
  },
  {
    id: "sedan",
    name: "Sedan",
    slug: "sedan",
    description: "Comfortable ride",
    passenger_capacity: 4,
    luggage_capacity: 3,
    sort_order: 20,
  },
  {
    id: "suv",
    name: "SUV",
    slug: "suv",
    description: "Spacious for groups",
    passenger_capacity: 6,
    luggage_capacity: 4,
    sort_order: 30,
  },
  {
    id: "ev",
    name: "EV",
    slug: "ev",
    description: "Electric vehicle",
    passenger_capacity: 4,
    luggage_capacity: 3,
    sort_order: 40,
  },
];

function getVehicleCategories() {
  if (typeof window === "undefined") {
    return FALLBACK_CATEGORIES;
  }

  try {
    const raw = window.localStorage.getItem(CACHE_KEY);
    if (!raw) return FALLBACK_CATEGORIES;

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return FALLBACK_CATEGORIES;

    return parsed;
  } catch {
    return FALLBACK_CATEGORIES;
  }
}

export function calculateFare({
  vehicleTypeId,
  oneWayDistanceKm,
  tripType = "oneway",
}) {
  const vehicle = getVehicleCategories().find(
    (category) => category.id === vehicleTypeId
  );

  const pricing = vehicle ? PRICING_BY_SLUG[vehicle.slug] : null;

  if (
    !vehicle ||
    !pricing ||
    !Number.isFinite(Number(oneWayDistanceKm))
  ) {
    return null;
  }

  const normalizedTripType = normalizeTripType(tripType);

  const billedDistanceKm =
    normalizedTripType === "roundtrip"
      ? Number(oneWayDistanceKm) * 2
      : Number(oneWayDistanceKm);

  const distanceFare = billedDistanceKm * pricing.perKmRate;

  const driverAllowance =
    normalizedTripType === "roundtrip"
      ? pricing.driverAllowancePerDay
      : 0;

  let totalFare =
    pricing.baseFare + distanceFare + driverAllowance;

  totalFare = Math.max(totalFare, pricing.minimumFare);
  totalFare = Math.round(totalFare / 10) * 10;

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

export function calculateAllFares({
  oneWayDistanceKm,
  tripType = "oneway",
}) {
  return getVehicleCategories()
    .map((vehicle) =>
      calculateFare({
        vehicleTypeId: vehicle.id,
        oneWayDistanceKm,
        tripType,
      })
    )
    .filter(Boolean)
    .sort((a, b) => {
      const categories = getVehicleCategories();
      const aOrder = categories.find((c) => c.id === a.vehicleTypeId)?.sort_order ?? 0;
      const bOrder = categories.find((c) => c.id === b.vehicleTypeId)?.sort_order ?? 0;
      return aOrder - bOrder;
    });
}
