const MAX_LUGGAGE_PER_PASSENGER = 3;

export function normalizeCapacityValue(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? Math.floor(n) : fallback;
}

/**
 * Returns the maximum luggage that can be selected before a vehicle is known.
 * The current fleet tops out at 4 luggage spaces, while the booking rule also
 * limits luggage to 3 items per passenger.
 */
export function getMaxLuggageForPassengers(passengerCount, absoluteLimit = 4) {
  const passengers = Number(passengerCount);
  if (!Number.isInteger(passengers) || passengers < 1) return 0;
  return Math.min(passengers * MAX_LUGGAGE_PER_PASSENGER, absoluteLimit);
}

/**
 * Passenger count has priority over luggage capacity.
 *
 * A vehicle's normal luggage capacity can be supplemented by unused passenger
 * capacity because one luggage item is treated as one unit of occupancy for
 * this selection rule. Once passenger capacity is the limiting factor, the
 * configured luggage capacity remains available. In all cases, luggage is
 * capped at 3 items per passenger.
 *
 * Examples with the current fleet:
 * - Hatchback (4 pax / 2 bags): 1 pax + 3 bags is valid; 4 pax + 3 bags is not.
 * - Sedan/EV (4 pax / 3 bags): 1 pax + 3 bags and 4 pax + 3 bags are valid.
 * - SUV (6 pax / 4 bags): 4 pax + 4 bags is valid; 5 pax + 4 bags is also valid.
 */
export function getMaxLuggageForVehicle({ passengerCount, passengerCapacity, luggageCapacity }) {
  const passengers = Number(passengerCount);
  const maxPassengers = Number(passengerCapacity);
  const vehicleMaxLuggage = Number(luggageCapacity);

  if (!Number.isInteger(passengers) || passengers < 1) return 0;
  if (!Number.isInteger(maxPassengers) || maxPassengers < 1) return 0;
  if (!Number.isInteger(vehicleMaxLuggage) || vehicleMaxLuggage < 0) return 0;
  if (passengers > maxPassengers) return 0;

  const unusedPassengerCapacity = Math.max(0, maxPassengers - passengers);
  const capacityBasedLuggage = Math.max(vehicleMaxLuggage, unusedPassengerCapacity);

  return Math.min(
    capacityBasedLuggage,
    passengers * MAX_LUGGAGE_PER_PASSENGER
  );
}

export function validateCapacity({ passengerCount, luggageCount, passengerCapacity, luggageCapacity }) {
  const passengers = Number(passengerCount);
  const luggage = Number(luggageCount);
  const maxPassengers = Number(passengerCapacity);
  const vehicleMaxLuggage = Number(luggageCapacity);

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
  if (!Number.isInteger(vehicleMaxLuggage) || vehicleMaxLuggage < 0) {
    return { valid: false, reason: "This vehicle has an invalid luggage capacity configured.", code: "INVALID_VEHICLE_LUGGAGE_CAPACITY" };
  }

  const maxLuggage = getMaxLuggageForVehicle({
    passengerCount: passengers,
    passengerCapacity: maxPassengers,
    luggageCapacity: vehicleMaxLuggage,
  });

  if (luggage > maxLuggage) {
    return {
      valid: false,
      reason: `With ${passengers} passenger${passengers === 1 ? "" : "s"}, this vehicle allows up to ${maxLuggage} luggage item${maxLuggage === 1 ? "" : "s"}. Passenger capacity has priority, and luggage uses available space after passenger capacity is considered.`,
      code: "LUGGAGE_CAPACITY_EXCEEDED",
      maxLuggage,
      passengerCount: passengers,
      passengerCapacity: maxPassengers,
      configuredLuggageCapacity: vehicleMaxLuggage,
    };
  }

  return {
    valid: true,
    passengerCount: passengers,
    luggageCount: luggage,
    maxLuggage,
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
