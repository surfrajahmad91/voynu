const MAX_LUGGAGE_PER_PASSENGER = 3;

export function normalizeCapacityValue(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? Math.floor(n) : fallback;
}

export function getMaxLuggageForPassengers(passengerCount, absoluteLimit = Infinity) {
  const passengers = Number(passengerCount);
  if (!Number.isInteger(passengers) || passengers < 1) return 0;
  return Math.min(passengers * MAX_LUGGAGE_PER_PASSENGER, absoluteLimit);
}

export function validateCapacity({ passengerCount, luggageCount, passengerCapacity, luggageCapacity }) {
  const passengers = Number(passengerCount);
  const luggage = Number(luggageCount);
  const maxPassengers = Number(passengerCapacity);
  const vehicleMaxLuggage = Number(luggageCapacity);
  const requestMaxLuggage = getMaxLuggageForPassengers(passengers);

  if (!Number.isInteger(passengers) || passengers < 1) {
    return { valid: false, reason: 'Please select at least 1 passenger.' };
  }
  if (!Number.isInteger(luggage) || luggage < 0) {
    return { valid: false, reason: 'Luggage count cannot be negative.' };
  }
  if (!Number.isInteger(maxPassengers) || passengers > maxPassengers) {
    return { valid: false, reason: `This vehicle can accommodate up to ${maxPassengers} passengers.` };
  }
  if (luggage > requestMaxLuggage) {
    return {
      valid: false,
      reason: `You can select a maximum of ${MAX_LUGGAGE_PER_PASSENGER} luggage items per passenger. With ${passengers} passenger${passengers === 1 ? '' : 's'}, the maximum is ${requestMaxLuggage}.`,
    };
  }
  if (!Number.isInteger(vehicleMaxLuggage) || luggage > vehicleMaxLuggage) {
    return { valid: false, reason: `This vehicle can accommodate up to ${vehicleMaxLuggage} luggage items.` };
  }
  return { valid: true, passengerCount: passengers, luggageCount: luggage };
}

export function categorySupportsRequest(category, passengerCount, luggageCount) {
  return validateCapacity({
    passengerCount,
    luggageCount,
    passengerCapacity: category?.passenger_capacity,
    luggageCapacity: category?.luggage_capacity,
  }).valid;
}
