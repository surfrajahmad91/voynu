-- VOYNU 2.0 / P0 security: stop anonymous direct inserts into public.bookings.
-- Found: anon had INSERT on bookings and policy "Anyone can insert bookings" (check = true).
-- With only the public anon key, a client could bypass the booking API and insert a
-- 'confirmed' booking with an arbitrary fare, which auto-dispatches to real drivers
-- (verified with a rolled-back probe: fare=1, status confirmed, user_id null).
-- The only legitimate insert path (apps/customer/app/api/bookings/create) uses the
-- customer's own bearer token, i.e. role `authenticated`, so it is unaffected.
-- Follow-up (separate decision): authenticated users can still insert directly with a
-- client-chosen fare; the fare must be made database-authoritative.

revoke insert on public.bookings from anon;

drop policy if exists "Anyone can insert bookings" on public.bookings;
create policy "Authenticated users can insert bookings"
  on public.bookings for insert to authenticated
  with check ((select auth.uid()) is not null);
