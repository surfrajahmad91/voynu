const MAX_LUGGAGE_PER_PASSENGER = 3;
const CURRENT_FLEET_MAX_TOTAL_CAPACITY = 10;

export function normalizeCapacityValue(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? Math.floor(n) : fallback;
}

/**
 * Maximum luggage selectable before a specific vehicle is selected.
 * Passenger capacity has priority, then luggage shares the vehicle's total
 * capacity. The fleet-wide selector uses the largest configured total capacity.
 */
export function getMaxLuggageForPassengers(
  passengerCount,
  fleetMaxTotalCapacity = CURRENT_FLEET_MAX_TOTAL_CAPACITY
) {
  const passengers = Number(passengerCount);
  const totalCapacity = Number(fleetMaxTotalCapacity);
  if (!Number.isInteger(passengers) || passengers < 1) return 0;
  if (!Number.isInteger(totalCapacity) || totalCapacity < 1) return 0;

  return Math.min(
    passengers * MAX_LUGGAGE_PER_PASSENGER,
    Math.max(0, totalCapacity - passengers)
  );
}

/**
 * Passenger count has priority.
 *
 * Vehicle capacity is treated as:
 *   total capacity = passenger capacity + configured luggage capacity
 *
 * Passengers must never exceed passenger capacity. Once the passenger count
 * fits, luggage can use the remaining total capacity, while luggage remains
 * capped at 3 items per passenger.
 *
 * Examples with the current fleet:
 * - Hatchback (4 pax / 2 bags): 1+3 and 2+4 are valid; 3+3 and 4+2 are valid.
 * - Sedan/EV (4 pax / 3 bags): 2+5, 3+4 and 4+3 are valid.
 * - SUV (6 pax / 4 bags): 4+6, 5+5 and 6+4 fit the total capacity; passenger
 *   capacity still remains the first limit.
 */
export function getMaxLuggageForVehicle({ passengerCount, passengerCapacity, luggageCapacity }) {
  const passengers = Number(passengerCount);
  const maxPassengers = Number(passengerCapacity);
  const configuredLuggageCapacity = Number(luggageCapacity);

  if (!Number.isInteger(passengers) || passengers < 1) return 0;
  if (!Number.isInteger(maxPassengers) || maxPassengers < 1) return 0;
  if (!Number.isInteger(configuredLuggageCapacity) || configuredLuggageCapacity < 0) return 0;
  if (passengers > maxPassengers) return 0;

  const totalCapacity = maxPassengers + configuredLuggageCapacity;
  const remainingCapacityAfterPassengers = Math.max(0, totalCapacity - passengers);

  return Math.min(
    remainingCapacityAfterPassengers,
    passengers * MAX_LUGGAGE_PER_PASSENGER
  );
}

export function validateCapacity({ passengerCount, luggageCount, passengerCapacity, luggageCapacity }) {
  const passengers = Number(passengerCount);
  const luggage = Number(luggageCount);
  const maxPassengers = Number(passengerCapacity);
  const configuredLuggageCapacity = Number(luggageCapacity);

  if (!Number.isInteger(passengers) || passengers < 1) {
    return { valid: false, reason: "Please select at least 1 passenger.", code: "INVALID_PASSENGER_COUNT" };
  }
  if (!Number.isInteger(luggage) || luggage < 0) {
    return { valid: false, reason: "Luggage count cannot be negative.", code: "INVALID_LUGGAGE_COUNT" };
  }
  if (!Number.isInteger(maxPassengers) || maxPassengers < 1) {
    return { valid: false, reason: "This vehicle has an invalid passenger capacity configured.", code: "INVALID_VEHICLE_PASSENGER_CAPACITY" };
  }
  if (passengers > maxPassengers) {
    return {
      valid: false,
      reason: `This vehicle can accommodate up to ${maxPassengers} passengers, but ${passengers} were requested.`,
      code: "PASSENGER_CAPACITY_EXCEEDED",
    };
  }
  if (!Number.isInteger(configuredLuggageCapacity) || configuredLuggageCapacity < 0) {
    return { valid: false, reason: "This vehicle has an invalid luggage capacity configured.", code: "INVALID_VEHICLE_LUGGAGE_CAPACITY" };
  }

  const maxLuggage = getMaxLuggageForVehicle({
    passengerCount: passengers,
    passengerCapacity: maxPassengers,
    luggageCapacity: configuredLuggageCapacity,
  });

  if (luggage > maxLuggage) {
    return {
      valid: false,
      reason: `With ${passengers} passenger${passengers === 1 ? "" : "s"}, this vehicle allows up to ${maxLuggage} luggage item${maxLuggage === 1 ? "" : "s"}. Passenger capacity has priority; luggage uses the remaining total vehicle capacity.`,
      code: "LUGGAGE_CAPACITY_EXCEEDED",
      maxLuggage,
      passengerCount: passengers,
      passengerCapacity: maxPassengers,
      configuredLuggageCapacity,
      totalVehicleCapacity: maxPassengers + configuredLuggageCapacity,
    };
  }

  return {
    valid: true,
    passengerCount: passengers,
    luggageCount: luggage,
    maxLuggage,
    totalVehicleCapacity: maxPassengers + configuredLuggageCapacity,
  };
}

export function categorySupportsRequest(category, passengerCount, luggageCount) {
  return validateCapacity({
    passengerCount,
    luggageCount,
    passengerCapacity: category?.passenger_capacity,
    luggageCapacity: category?.luggage_capacity,
  }).valid;
}
