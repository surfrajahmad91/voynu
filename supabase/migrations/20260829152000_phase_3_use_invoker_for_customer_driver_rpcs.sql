-- Keep client-callable functions as SECURITY INVOKER. Authorization is enforced by RLS.
create or replace function public.update_driver_location(
  p_booking_id uuid, p_lat double precision, p_lon double precision
)
returns public.driver_current_location
language plpgsql
security invoker
set search_path = ''
as $$
declare v_driver_id uuid; v_location public.driver_current_location;
begin
  if (select auth.uid()) is null then raise exception 'VOYNU: authentication required'; end if;
  if p_lat is null or p_lon is null or p_lat < -90 or p_lat > 90 or p_lon < -180 or p_lon > 180 then raise exception 'VOYNU: invalid driver coordinates'; end if;
  select d.id into v_driver_id from public.drivers d where d.active = true and (d.user_id = (select auth.uid()) or (d.user_id is null and lower(d.email) = lower(coalesce((select auth.jwt()->>'email'), '')))) limit 1;
  if v_driver_id is null then raise exception 'VOYNU: active driver profile not found'; end if;
  if not exists (select 1 from public.bookings b where b.id = p_booking_id and b.driver_id = v_driver_id and b.booking_status in ('driver_assigned','on_the_way','arrived','trip_started')) then raise exception 'VOYNU: booking is not actively assigned to this driver'; end if;
  insert into public.driver_current_location(driver_id, lat, lon, updated_at) values (v_driver_id, p_lat, p_lon, now())
  on conflict (driver_id) do update set lat=excluded.lat, lon=excluded.lon, updated_at=excluded.updated_at returning * into v_location;
  insert into public.driver_location_history(driver_id, booking_id, lat, lon, recorded_at) values (v_driver_id, p_booking_id, p_lat, p_lon, now());
  return v_location;
end;
$$;

create or replace function public.get_my_booking_driver(p_booking_id uuid)
returns jsonb language sql security invoker set search_path = '' as $$
  select jsonb_build_object('driverId', d.id, 'driverName', d.full_name, 'driverPhone', d.phone, 'vehicleId', v.id,
    'registrationNumber', v.registration_number, 'make', v.make, 'model', v.model, 'category', v.category,
    'location', case when l.driver_id is null then null else jsonb_build_object('lat', l.lat, 'lon', l.lon, 'updatedAt', l.updated_at) end)
  from public.bookings b join public.drivers d on d.id = b.driver_id and d.active = true
  left join public.vehicles v on v.id = b.vehicle_id left join public.driver_current_location l on l.driver_id = d.id
  where b.id = p_booking_id and b.user_id = (select auth.uid()) and b.booking_status in ('driver_assigned','on_the_way','arrived','trip_started')
$$;

drop policy if exists "Customers can view assigned driver" on public.drivers;
create policy "Customers can view assigned driver" on public.drivers for select to authenticated using (
  exists (select 1 from public.bookings b where b.driver_id = drivers.id and b.user_id = (select auth.uid()) and b.booking_status in ('driver_assigned','on_the_way','arrived','trip_started'))
);

drop policy if exists "Customers can view assigned vehicle" on public.vehicles;
create policy "Customers can view assigned vehicle" on public.vehicles for select to authenticated using (
  exists (select 1 from public.bookings b where b.vehicle_id = vehicles.id and b.user_id = (select auth.uid()) and b.booking_status in ('driver_assigned','on_the_way','arrived','trip_started'))
);

drop policy if exists "Drivers can insert own current location" on public.driver_current_location;
create policy "Drivers can insert own current location" on public.driver_current_location for insert to authenticated with check (
  exists (select 1 from public.drivers d where d.id = driver_current_location.driver_id and d.active = true and (d.user_id = (select auth.uid()) or (d.user_id is null and lower(d.email) = lower(coalesce((select auth.jwt()->>'email'), '')))))
);
drop policy if exists "Drivers can update own current location" on public.driver_current_location;
create policy "Drivers can update own current location" on public.driver_current_location for update to authenticated using (
  exists (select 1 from public.drivers d where d.id = driver_current_location.driver_id and d.active = true and (d.user_id = (select auth.uid()) or (d.user_id is null and lower(d.email) = lower(coalesce((select auth.jwt()->>'email'), '')))))
) with check (
  exists (select 1 from public.drivers d where d.id = driver_current_location.driver_id and d.active = true and (d.user_id = (select auth.uid()) or (d.user_id is null and lower(d.email) = lower(coalesce((select auth.jwt()->>'email'), '')))))
);

drop policy if exists "Drivers cannot directly insert location history" on public.driver_location_history;
drop policy if exists "Drivers can insert own location history" on public.driver_location_history;
create policy "Drivers can insert own location history" on public.driver_location_history for insert to authenticated with check (
  exists (select 1 from public.drivers d where d.id = driver_location_history.driver_id and d.active = true and (d.user_id = (select auth.uid()) or (d.user_id is null and lower(d.email) = lower(coalesce((select auth.jwt()->>'email'), '')))))
  and exists (select 1 from public.bookings b where b.id = driver_location_history.booking_id and b.driver_id = driver_location_history.driver_id and b.booking_status in ('driver_assigned','on_the_way','arrived','trip_started'))
);

grant select on public.drivers, public.vehicles to authenticated;
grant insert, update on public.driver_current_location to authenticated;
grant insert on public.driver_location_history to authenticated;
revoke execute on function public.update_driver_location(uuid,double precision,double precision) from public, anon;
grant execute on function public.update_driver_location(uuid,double precision,double precision) to authenticated;
revoke execute on function public.get_my_booking_driver(uuid) from public, anon;
grant execute on function public.get_my_booking_driver(uuid) to authenticated;
