-- Consolidate Phase 3 policies to avoid multiple permissive policies per action.
drop policy if exists "Drivers can view own current location" on public.driver_current_location;
drop policy if exists "Customers can view assigned driver location" on public.driver_current_location;
drop policy if exists "Drivers can insert own current location" on public.driver_current_location;
drop policy if exists "Drivers can update own current location" on public.driver_current_location;
create policy "Phase 3 current location select" on public.driver_current_location for select to authenticated using (
  public.is_admin() or exists (select 1 from public.bookings b where b.driver_id = driver_current_location.driver_id and b.user_id = (select auth.uid()) and b.booking_status in ('driver_assigned','on_the_way','arrived','trip_started')) or exists (select 1 from public.drivers d where d.id = driver_current_location.driver_id and d.active = true and (d.user_id = (select auth.uid()) or (d.user_id is null and lower(d.email) = lower(coalesce((select auth.jwt()->>'email'), '')))))
);
create policy "Phase 3 current location insert" on public.driver_current_location for insert to authenticated with check (
  public.is_admin() or exists (select 1 from public.drivers d where d.id = driver_current_location.driver_id and d.active = true and (d.user_id = (select auth.uid()) or (d.user_id is null and lower(d.email) = lower(coalesce((select auth.jwt()->>'email'), '')))))
);
create policy "Phase 3 current location update" on public.driver_current_location for update to authenticated using (
  public.is_admin() or exists (select 1 from public.drivers d where d.id = driver_current_location.driver_id and d.active = true and (d.user_id = (select auth.uid()) or (d.user_id is null and lower(d.email) = lower(coalesce((select auth.jwt()->>'email'), '')))))
) with check (
  public.is_admin() or exists (select 1 from public.drivers d where d.id = driver_current_location.driver_id and d.active = true and (d.user_id = (select auth.uid()) or (d.user_id is null and lower(d.email) = lower(coalesce((select auth.jwt()->>'email'), '')))))
);

drop policy if exists "Customers can view assigned driver location history" on public.driver_location_history;
drop policy if exists "Drivers can insert own location history" on public.driver_location_history;
create policy "Phase 3 location history select" on public.driver_location_history for select to authenticated using (
  public.is_admin() or exists (select 1 from public.bookings b where b.id = driver_location_history.booking_id and b.user_id = (select auth.uid()) and b.driver_id = driver_location_history.driver_id)
);
create policy "Phase 3 location history insert" on public.driver_location_history for insert to authenticated with check (
  public.is_admin() or (exists (select 1 from public.drivers d where d.id = driver_location_history.driver_id and d.active = true and (d.user_id = (select auth.uid()) or (d.user_id is null and lower(d.email) = lower(coalesce((select auth.jwt()->>'email'), ''))))) and exists (select 1 from public.bookings b where b.id = driver_location_history.booking_id and b.driver_id = driver_location_history.driver_id and b.booking_status in ('driver_assigned','on_the_way','arrived','trip_started')))
);

drop policy if exists "Customers can view assigned driver" on public.drivers;
create policy "Phase 3 driver select" on public.drivers for select to authenticated using (
  public.is_admin() or (user_id = (select auth.uid()) or (user_id is null and lower(email) = lower(coalesce((select auth.jwt()->>'email'), '')))) or exists (select 1 from public.bookings b where b.driver_id = drivers.id and b.user_id = (select auth.uid()) and b.booking_status in ('driver_assigned','on_the_way','arrived','trip_started'))
);

drop policy if exists "Customers can view assigned vehicle" on public.vehicles;
create policy "Phase 3 vehicle select" on public.vehicles for select to authenticated using (
  public.is_admin() or exists (select 1 from public.bookings b where b.vehicle_id = vehicles.id and b.user_id = (select auth.uid()) and b.booking_status in ('driver_assigned','on_the_way','arrived','trip_started'))
);

create index if not exists bookings_vehicle_category_id_idx on public.bookings(vehicle_category_id);
create index if not exists driver_assignments_assigned_by_idx on public.driver_assignments(assigned_by);
create index if not exists driver_assignments_booking_id_idx on public.driver_assignments(booking_id);
create index if not exists driver_assignments_driver_id_idx on public.driver_assignments(driver_id);
create index if not exists driver_assignments_vehicle_id_idx on public.driver_assignments(vehicle_id);
create index if not exists driver_location_history_booking_id_idx on public.driver_location_history(booking_id);
create index if not exists driver_location_history_driver_id_idx on public.driver_location_history(driver_id);
create index if not exists drivers_user_id_idx on public.drivers(user_id);
create index if not exists drivers_vehicle_id_idx on public.drivers(vehicle_id);
