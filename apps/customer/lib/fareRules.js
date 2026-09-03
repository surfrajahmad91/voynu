/* VOYNU — Fare Rules. Database-backed pricing is authoritative. */

import { normalizeTripType } from "./tripRules";

function normalizePricingRule(rule) {
  return {
    baseFare: Number(rule.base_fare),
    perKmRate: Number(rule.per_km_rate),
    driverAllowancePerDay: Number(rule.driver_allowance_per_day || 0),
    minimumFare: Number(rule.minimum_fare || 0),
    roundingUnit: Number(rule.rounding_unit) || 1,
  };
}

function calculateFareFromData({ vehicle, pricing, oneWayDistanceKm, tripType }) {
  const normalizedTripType = normalizeTripType(tripType);
  const distance = Number(oneWayDistanceKm);
  if (!vehicle || !pricing || !Number.isFinite(distance) || distance < 0) return null;

  const billedDistanceKm = normalizedTripType === "roundtrip" ? distance * 2 : distance;
  const distanceFare = billedDistanceKm * pricing.perKmRate;
  const driverAllowance = normalizedTripType === "roundtrip" ? pricing.driverAllowancePerDay : 0;
  const rawFare = pricing.baseFare + distanceFare + driverAllowance;
  const fareBeforeRounding = Math.max(rawFare, pricing.minimumFare);
  const totalFare = Math.round(fareBeforeRounding / pricing.roundingUnit) * pricing.roundingUnit;
  const minimumFareApplies = rawFare < pricing.minimumFare;
  const minimumFareAdjustment = minimumFareApplies ? Math.max(0, totalFare - rawFare) : 0;

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
    distanceFare: Math.round(distanceFare * 100) / 100,
    driverAllowance,
    rawFare: Math.round(rawFare * 100) / 100,
    minimumFare: pricing.minimumFare,
    minimumFareApplies,
    minimumFareAdjustment: Math.round(minimumFareAdjustment * 100) / 100,
    itemizedSubtotal: Math.round((pricing.baseFare + distanceFare + driverAllowance) * 100) / 100,
    totalFare,
  };
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
    .filter((category) => category.active !== false && category.bookable !== false)
    .map((vehicle) => calculateFareFromData({
      vehicle,
      pricing: pricingByCategoryId.get(vehicle.id) || null,
      oneWayDistanceKm,
      tripType: normalizedTripType,
    }))
    .filter(Boolean)
    .sort((a, b) => {
      const aOrder = Number(vehicleCategories.find((c) => c.id === a.vehicleTypeId)?.sort_order) || 0;
      const bOrder = Number(vehicleCategories.find((c) => c.id === b.vehicleTypeId)?.sort_order) || 0;
      return aOrder - bOrder;
    });
}