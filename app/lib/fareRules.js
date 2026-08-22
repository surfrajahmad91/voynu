/*
|--------------------------------------------------------------------------
| VOYNU — Fare Rules
|--------------------------------------------------------------------------
|
| Config-driven fare calculation. No backend required — everything
| runs client-side from the values below.
|
| These starting rates are placeholders. Tune them to your actual
| per-km costs, local competitor pricing, and margins before
| launch — nothing here is a real-world benchmark.
|
|--------------------------------------------------------------------------
*/

import { normalizeTripType } from "./tripRules";

export const VOYNU_FARE_CONFIG = {
  vehicleTypes: [
    {
      id: "hatchback",
      name: "Hatchback",
      description: "Compact & economical",
      capacity: 4,
      baseFare: 60,
      perKmRate: 11,
      driverAllowancePerDay: 300,
      minimumFare: 250,
    },
    {
      id: "sedan",
      name: "Sedan",
      description: "Comfortable ride",
      capacity: 4,
      baseFare: 80,
      perKmRate: 13,
      driverAllowancePerDay: 350,
      minimumFare: 300,
    },
    {
      id: "suv",
      name: "SUV",
      description: "Spacious for groups",
      capacity: 6,
      baseFare: 100,
      perKmRate: 16,
      driverAllowancePerDay: 400,
      minimumFare: 400,
    },
    {
      id: "ev",
      name: "EV",
      description: "Eco-friendly electric",
      capacity: 4,
      baseFare: 70,
      perKmRate: 12,
      driverAllowancePerDay: 300,
      minimumFare: 280,
    },
  ],
};

/*
|--------------------------------------------------------------------------
| CALCULATE FARE (single vehicle type)
|--------------------------------------------------------------------------
*/

export function calculateFare({
  vehicleTypeId,
  oneWayDistanceKm,
  tripType = "oneway",
}) {
  const vehicle =
    VOYNU_FARE_CONFIG.vehicleTypes.find(
      (v) => v.id === vehicleTypeId
    );

  if (
    !vehicle ||
    !Number.isFinite(
      Number(oneWayDistanceKm)
    )
  ) {
    return null;
  }

  const normalizedTripType =
    normalizeTripType(tripType);

  const billedDistanceKm =
    normalizedTripType === "roundtrip"
      ? Number(oneWayDistanceKm) * 2
      : Number(oneWayDistanceKm);

  const distanceFare =
    billedDistanceKm *
    vehicle.perKmRate;

  const driverAllowance =
    normalizedTripType === "roundtrip"
      ? vehicle.driverAllowancePerDay
      : 0;

  let totalFare =
    vehicle.baseFare +
    distanceFare +
    driverAllowance;

  totalFare = Math.max(
    totalFare,
    vehicle.minimumFare
  );

  /*
   * Round to the nearest ₹10 for a cleaner customer-facing number.
   */
  totalFare =
    Math.round(totalFare / 10) * 10;

  return {
    vehicleTypeId: vehicle.id,
    vehicleName: vehicle.name,
    description: vehicle.description,
    capacity: vehicle.capacity,

    billedDistanceKm,

    baseFare: vehicle.baseFare,
    distanceFare: Math.round(distanceFare),
    driverAllowance,

    totalFare,
  };
}

/*
|--------------------------------------------------------------------------
| CALCULATE ALL FARES (every configured vehicle type)
|--------------------------------------------------------------------------
*/

export function calculateAllFares({
  oneWayDistanceKm,
  tripType = "oneway",
}) {
  return VOYNU_FARE_CONFIG.vehicleTypes
    .map((vehicle) =>
      calculateFare({
        vehicleTypeId: vehicle.id,
        oneWayDistanceKm,
        tripType,
      })
    )
    .filter(Boolean);
}
