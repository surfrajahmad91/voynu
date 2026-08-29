-- Enforce the same passenger-priority capacity rule used by the cab-selection UI and booking API.
-- Passenger count has priority. Unused passenger capacity may be used by luggage,
-- while the vehicle's configured luggage capacity remains available. Luggage is
-- always capped at 3 items per passenger.

alter table public.bookings
  drop constraint if exists bookings_luggage_per_passenger_check;

alter table public.bookings
  add constraint bookings_passenger_priority_capacity_check
  check (
    passenger_count is null
    or luggage_count is null
    or passenger_capacity_snapshot is null
    or luggage_capacity_snapshot is null
    or (
      passenger_count >= 1
      and luggage_count >= 0
      and passenger_count <= passenger_capacity_snapshot
      and luggage_count <= passenger_count * 3
      and luggage_count <= greatest(
        luggage_capacity_snapshot,
        passenger_capacity_snapshot - passenger_count
      )
    )
  );
