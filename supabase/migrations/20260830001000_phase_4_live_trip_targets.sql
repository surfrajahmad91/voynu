-- Phase 4: live trip target hardening.
-- Driver assignment is not a tracking state. GPS writes are accepted only
-- while the driver is operationally moving/serving an active journey.

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
  if (select auth.uid()) is null then raise exception 'VOYNU: authentication required'; end if;
  if p_lat is null or p_lon is null or p_lat < -90 or p_lat > 90 or p_lon < -180 or p_lon > 180 then raise exception 'VOYNU: invalid driver coordinates'; end if;

  select d.* into v_driver from public.drivers d
  where d.active = true
    and (d.user_id = (select auth.uid()) or (d.user_id is null and lower(d.email) = lower((select u.email from auth.users u where u.id = (select auth.uid())))))
  limit 1;
  if not found then raise exception 'VOYNU: active driver profile not found'; end if;

  select b.* into v_booking from public.bookings b
  where b.id = p_booking_id and b.driver_id = v_driver.id
    and b.booking_status in ('on_the_way','arrived','trip_started')
  for update;
  if not found then raise exception 'VOYNU: booking is not an active journey'; end if;

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

-- Return the exact navigation target for the current operational state.
create or replace function public.get_driver_navigation_target(p_booking_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare v_booking public.bookings; v_driver public.drivers;
begin
  select d.* into v_driver from public.drivers d
  where d.active = true and (d.user_id = (select auth.uid()) or (d.user_id is null and lower(d.email) = lower((select u.email from auth.users u where u.id = (select auth.uid()))))) limit 1;
  if not found then raise exception 'VOYNU: active driver profile not found'; end if;
  select b.* into v_booking from public.bookings b where b.id = p_booking_id and b.driver_id = v_driver.id limit 1;
  if not found then raise exception 'VOYNU: booking is not assigned to this driver'; end if;
  if v_booking.booking_status in ('on_the_way','arrived') then
    return jsonb_build_object('bookingId',v_booking.id,'targetType','pickup','lat',v_booking.pickup_lat,'lon',v_booking.pickup_lon,'label',v_booking.pickup_name,'status',v_booking.booking_status);
  elsif v_booking.booking_status = 'trip_started' then
    return jsonb_build_object('bookingId',v_booking.id,'targetType','destination','lat',v_booking.drop_lat,'lon',v_booking.drop_lon,'label',v_booking.drop_name,'status',v_booking.booking_status);
  end if;
  return jsonb_build_object('bookingId',v_booking.id,'targetType',null,'lat',null,'lon',null,'label',null,'status',v_booking.booking_status);
end;
$$;
revoke execute on function public.get_driver_navigation_target(uuid) from public, anon;
grant execute on function public.get_driver_navigation_target(uuid) to authenticated;
