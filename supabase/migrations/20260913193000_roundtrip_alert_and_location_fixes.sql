-- Follow-up to the round-trip phase migration.

alter table public.trip_timing_alerts drop constraint if exists trip_timing_alerts_alert_type_check;
alter table public.trip_timing_alerts add constraint trip_timing_alerts_alert_type_check check (
  alert_type = any (array['start_overdue','return_start_overdue','completion_overdue'])
);

create or replace function public.get_trip_timing_alerts()
returns table(id uuid, booking_id uuid, alert_type text, threshold_minutes integer, created_at timestamptz, acknowledged_at timestamptz)
language plpgsql security definer set search_path='public','pg_temp' set row_security='off' as $$
begin
  if not public.is_admin() then raise exception 'Admin access required'; end if;
  return query
    select a.id,a.booking_id,a.alert_type,a.threshold_minutes,a.created_at,a.acknowledged_at
    from public.trip_timing_alerts a
    where a.acknowledged_at is null
    order by a.created_at desc;
end; $$;

grant execute on function public.get_trip_timing_alerts() to authenticated;
revoke execute on function public.get_trip_timing_alerts() from anon;

create or replace function public.update_driver_location(p_booking_id uuid, p_lat double precision, p_lon double precision)
returns public.driver_current_location
language plpgsql security definer set search_path='' as $$
declare
  v_driver public.drivers;
  v_booking public.bookings;
  v_location public.driver_current_location;
begin
  if (select auth.uid()) is null then raise exception 'VOYNU: authentication required'; end if;
  if p_lat is null or p_lon is null or p_lat < -90 or p_lat > 90 or p_lon < -180 or p_lon > 180 then raise exception 'VOYNU: invalid driver coordinates'; end if;
  select d.* into v_driver from public.drivers d
    where d.active=true and (d.user_id=(select auth.uid()) or (d.user_id is null and lower(d.email)=lower((select u.email from auth.users u where u.id=(select auth.uid()))))) limit 1;
  if not found then raise exception 'VOYNU: active driver profile not found'; end if;
  select b.* into v_booking from public.bookings b
    where b.id=p_booking_id and b.driver_id=v_driver.id
      and b.booking_status in ('on_the_way','arrived','trip_started','waiting_for_return','return_trip_started') for update;
  if not found then raise exception 'VOYNU: booking is not an active journey'; end if;
  insert into public.driver_current_location(driver_id,lat,lon,updated_at)
    values(v_driver.id,p_lat,p_lon,now())
    on conflict(driver_id) do update set lat=excluded.lat,lon=excluded.lon,updated_at=excluded.updated_at
    returning * into v_location;
  insert into public.driver_location_history(driver_id,booking_id,lat,lon,recorded_at)
    values(v_driver.id,v_booking.id,p_lat,p_lon,now());
  return v_location;
end; $$;

grant execute on function public.update_driver_location(uuid,double precision,double precision) to authenticated;
revoke execute on function public.update_driver_location(uuid,double precision,double precision) from anon;
