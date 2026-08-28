import { describe, expect, it } from 'vitest';
import { validateCapacity, categorySupportsRequest } from './capacityValidation';

describe('vehicle capacity validation', () => {
  const capacity = { passengerCapacity: 6, luggageCapacity: 4 };

  it('accepts a request within capacity', () => {
    expect(validateCapacity({ passengerCount: 5, luggageCount: 3, ...capacity }).valid).toBe(true);
  });

  it('rejects passengers above capacity', () => {
    expect(validateCapacity({ passengerCount: 7, luggageCount: 1, ...capacity }).valid).toBe(false);
  });

  it('rejects luggage above capacity', () => {
    expect(validateCapacity({ passengerCount: 2, luggageCount: 5, ...capacity }).valid).toBe(false);
  });

  it('rejects zero passengers', () => {
    expect(validateCapacity({ passengerCount: 0, luggageCount: 0, ...capacity }).valid).toBe(false);
  });

  it('uses database category capacity values', () => {
    expect(categorySupportsRequest({ passenger_capacity: 4, luggage_capacity: 2 }, 4, 2)).toBe(true);
    expect(categorySupportsRequest({ passenger_capacity: 4, luggage_capacity: 2 }, 5, 2)).toBe(false);
  });
});
