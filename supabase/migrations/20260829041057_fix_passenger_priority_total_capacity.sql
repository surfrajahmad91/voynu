-- Correct the passenger-priority capacity rule so luggage uses the vehicle's
-- TOTAL capacity (passenger capacity + configured luggage capacity).
-- Passengers are always checked first; luggage is then limited by remaining
-- total capacity and by 3 items per passenger.

alter table public.bookings
  drop constraint if exists bookings_passenger_priority_capacity_check;

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
      and passenger_count + luggage_count <= (
        passenger_capacity_snapshot + luggage_capacity_snapshot
      )
    )
  );
