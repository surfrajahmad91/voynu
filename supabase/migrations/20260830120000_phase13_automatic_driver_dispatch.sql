create table if not exists public.dispatch_settings (
  id boolean primary key default true check (id = true),
  mode text not null default 'manual' check (mode in ('manual','automatic')),
  updated_at timestamptz not null default now()
);
insert into public.dispatch_settings(id, mode) values (true, 'manual') on conflict (id) do nothing;
alter table public.dispatch_settings enable row level security;
drop policy if exists dispatch_settings_admin_select on public.dispatch_settings;
drop policy if exists dispatch_settings_admin_update on public.dispatch_settings;
create policy dispatch_settings_admin_select on public.dispatch_settings for select to authenticated using (public.is_admin());
create policy dispatch_settings_admin_update on public.dispatch_settings for update to authenticated using (public.is_admin()) with check (public.is_admin());

create or replace function public.auto_assign_booking_driver(p_booking_id uuid)
returns public.bookings
language plpgsql
security definer
set search_path = public
as $function$
declare
  v_booking public.bookings;
  v_driver public.drivers;
  v_actor uuid := auth.uid();
  v_pickup_ts timestamptz;
  v_end_ts timestamptz;
begin
  if v_actor is null or not public.is_admin() then raise exception 'VOYNU: admin access required'; end if;
  select * into v_booking from public.bookings where id=p_booking_id for update;
  if not found then raise exception 'VOYNU: booking not found'; end if;
  if v_booking.booking_status <> 'confirmed' or v_booking.driver_id is not null then raise exception 'VOYNU: booking is not awaiting driver assignment'; end if;
  if v_booking.travel_date is null or v_booking.pickup_time is null then raise exception 'VOYNU: booking travel date and pickup time are required'; end if;
  v_pickup_ts := (v_booking.travel_date + v_booking.pickup_time) AT TIME ZONE 'Asia/Kolkata';
  v_end_ts := coalesce(((v_booking.return_date + v_booking.return_time) AT TIME ZONE 'Asia/Kolkata'), v_pickup_ts + interval '4 hours');
  if v_end_ts <= v_pickup_ts then v_end_ts := v_pickup_ts + interval '4 hours'; end if;

  select d.* into v_driver
  from public.drivers d
  join public.vehicles v on v.id=d.vehicle_id
  where d.active=true
    and d.availability_status='available'
    and v.active=true
    and coalesce(v.status,'active') not in ('maintenance','inactive','unavailable')
    and (v_booking.vehicle_category_id is null or v.vehicle_category_id=v_booking.vehicle_category_id)
    and coalesce(v.seating_capacity,0) >= coalesce(v_booking.passenger_count,0)
    and coalesce(v.luggage_capacity,0) >= coalesce(v_booking.luggage_count,0)
    and not exists (
      select 1 from public.bookings b
      where b.driver_id=d.id
        and b.id<>v_booking.id
        and b.booking_status not in ('cancelled','trip_completed')
        and (b.travel_date + b.pickup_time) AT TIME ZONE 'Asia/Kolkata' < v_end_ts
        and coalesce(((b.return_date + b.return_time) AT TIME ZONE 'Asia/Kolkata'), ((b.travel_date + b.pickup_time) AT TIME ZONE 'Asia/Kolkata') + interval '4 hours') > v_pickup_ts
    )
  order by d.created_at asc
  limit 1
  for update;
  if not found then raise exception 'VOYNU: no eligible driver is available for this booking'; end if;

  update public.driver_assignments set status='cancelled' where booking_id=v_booking.id and status='assigned';
  insert into public.driver_assignments(booking_id,driver_id,vehicle_id,assigned_by,status)
  values(v_booking.id,v_driver.id,v_driver.vehicle_id,v_actor,'assigned');
  update public.bookings set driver_id=v_driver.id, vehicle_id=v_driver.vehicle_id, booking_status='driver_assigned' where id=v_booking.id returning * into v_booking;
  return v_booking;
end;
$function$;

revoke execute on function public.auto_assign_booking_driver(uuid) from public;
revoke execute on function public.auto_assign_booking_driver(uuid) from anon;
grant execute on function public.auto_assign_booking_driver(uuid) to authenticated;
