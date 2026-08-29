-- Booking-level business rule: a customer may request at most 3 luggage items per passenger.
-- Keep this invariant in the database so API/UI changes cannot bypass it.

alter table public.bookings
  drop constraint if exists bookings_luggage_per_passenger_check;

alter table public.bookings
  add constraint bookings_luggage_per_passenger_check
  check (
    passenger_count is null
    or luggage_count is null
    or (
      passenger_count >= 1
      and luggage_count >= 0
      and luggage_count <= passenger_count * 3
    )
  );
