-- Phase 3: secure driver location writes, expose only relevant location reads,
-- and enable Realtime for trip state/location streams.

create or replace function public.update_driver_location(
  p_booking_id uuid,
  p_lat double precision,
  p_lon double precision
)
returns public.driver_current_location
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_driver public.drivers;
  v_booking public.bookings;
  v_location public.driver_current_location;
begin
  if (select auth.uid()) is null then
    raise exception 'VOYNU: authentication required';
  end if;
  if p_lat is null or p_lon is null or p_lat < -90 or p_lat > 90 or p_lon < -180 or p_lon > 180 then
    raise exception 'VOYNU: invalid driver coordinates';
  end if;
  select d.* into v_driver from public.drivers d
  where d.active = true
    and (d.user_id = (select auth.uid())
      or (d.user_id is null and lower(d.email) = lower((select u.email from auth.users u where u.id = (select auth.uid())))))
  limit 1;
  if not found then raise exception 'VOYNU: active driver profile not found'; end if;
  select b.* into v_booking from public.bookings b
  where b.id = p_booking_id and b.driver_id = v_driver.id
    and b.booking_status in ('driver_assigned','on_the_way','arrived','trip_started') for update;
  if not found then raise exception 'VOYNU: booking is not actively assigned to this driver'; end if;

  insert into public.driver_current_location (driver_id, lat, lon, updated_at)
  values (v_driver.id, p_lat, p_lon, now())
  on conflict (driver_id) do update set lat = excluded.lat, lon = excluded.lon, updated_at = excluded.updated_at
  returning * into v_location;

  insert into public.driver_location_history (driver_id, booking_id, lat, lon, recorded_at)
  values (v_driver.id, v_booking.id, p_lat, p_lon, now());
  return v_location;
end;
$$;

revoke execute on function public.update_driver_location(uuid,double precision,double precision) from public, anon;
grant execute on function public.update_driver_location(uuid,double precision,double precision) to authenticated;

drop policy if exists "Drivers can manage own current location" on public.driver_current_location;
create policy "Drivers can view own current location" on public.driver_current_location
for select to authenticated using (
  exists (select 1 from public.drivers d where d.id = driver_current_location.driver_id and d.active = true
    and (d.user_id = (select auth.uid())
      or (d.user_id is null and lower(d.email) = lower(coalesce((select auth.jwt()->>'email'), '')))))
);

drop policy if exists "Customers can view assigned driver location" on public.driver_current_location;
create policy "Customers can view assigned driver location" on public.driver_current_location
for select to authenticated using (
  exists (select 1 from public.bookings b where b.driver_id = driver_current_location.driver_id
    and b.user_id = (select auth.uid())
    and b.booking_status in ('driver_assigned','on_the_way','arrived','trip_started'))
);

revoke insert, update, delete on public.driver_current_location from authenticated;
revoke insert, update, delete on public.driver_location_history from authenticated;

drop policy if exists "Drivers can insert own location history" on public.driver_location_history;
create policy "Drivers cannot directly insert location history" on public.driver_location_history
for insert to authenticated with check (false);

drop policy if exists "Customers can view assigned driver location history" on public.driver_location_history;
create policy "Customers can view assigned driver location history" on public.driver_location_history
for select to authenticated using (
  exists (select 1 from public.bookings b where b.id = driver_location_history.booking_id
    and b.user_id = (select auth.uid()) and b.driver_id = driver_location_history.driver_id)
);

create or replace function public.notify_driver_assignment()
returns trigger language plpgsql security definer set search_path = '' as $$
declare v_driver_user_id uuid; v_reference text;
begin
  if new.status <> 'assigned' then return new; end if;
  select coalesce(d.user_id, u.id) into v_driver_user_id
  from public.drivers d left join auth.users u on lower(u.email) = lower(d.email)
  where d.id = new.driver_id and d.active = true;
  if v_driver_user_id is null then return new; end if;
  v_reference := 'VOY-' || upper(left(new.booking_id::text, 8));
  insert into public.notifications (user_id, booking_id, type, title, message, data)
  values (v_driver_user_id, new.booking_id, 'driver_trip_assigned', 'New trip assigned',
    format('Booking %s has been assigned to you. Open your driver dashboard for trip details.', v_reference),
    jsonb_build_object('bookingId', new.booking_id, 'reference', v_reference, 'driverAssignmentId', new.id, 'vehicleId', new.vehicle_id));
  return new;
end; $$;
revoke execute on function public.notify_driver_assignment() from public, anon, authenticated;

do $$
begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'bookings') then
    alter publication supabase_realtime add table public.bookings;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'driver_current_location') then
    alter publication supabase_realtime add table public.driver_current_location;
  end if;
end $$;
