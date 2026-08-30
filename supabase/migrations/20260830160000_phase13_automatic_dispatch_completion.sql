-- Phase 13 completion: automatic dispatch is triggered for eligible confirmed bookings.
-- The trigger is database-owned and therefore does not depend on a browser/admin session.
-- Manual assignment and the explicit admin RPC remain available as overrides.

create or replace function public.auto_assign_booking_driver_internal(p_booking_id uuid)
returns public.bookings
language plpgsql
security definer
set search_path = public, pg_temp
as $function$
declare
  v_booking public.bookings;
  v_driver public.drivers;
  v_pickup_ts timestamptz;
  v_end_ts timestamptz;
begin
  select * into v_booking from public.bookings where id=p_booking_id for update;
  if not found then return null; end if;
  if v_booking.booking_status <> 'confirmed' or v_booking.driver_id is not null then return v_booking; end if;
  if v_booking.travel_date is null or v_booking.pickup_time is null then return v_booking; end if;

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
      where b.driver_id=d.id and b.id<>v_booking.id
        and b.booking_status not in ('cancelled','trip_completed')
        and (b.travel_date+b.pickup_time) AT TIME ZONE 'Asia/Kolkata' < v_end_ts
        and coalesce(((b.return_date+b.return_time) AT TIME ZONE 'Asia/Kolkata'),((b.travel_date+b.pickup_time) AT TIME ZONE 'Asia/Kolkata')+interval '4 hours') > v_pickup_ts
    )
  order by d.created_at asc
  limit 1
  for update;

  if not found then return v_booking; end if;

  update public.driver_assignments
    set status='cancelled'
    where booking_id=v_booking.id and status='assigned';

  insert into public.driver_assignments(booking_id,driver_id,vehicle_id,assigned_by,status)
  values(v_booking.id,v_driver.id,v_driver.vehicle_id,null,'assigned');

  update public.bookings
    set driver_id=v_driver.id,
        vehicle_id=v_driver.vehicle_id,
        booking_status='driver_assigned'
    where id=v_booking.id
    returning * into v_booking;

  update public.drivers set availability_status='busy' where id=v_driver.id;
  return v_booking;
end;
$function$;

revoke all on function public.auto_assign_booking_driver_internal(uuid) from public, anon, authenticated;

create or replace function public.auto_assign_booking_driver(p_booking_id uuid)
returns public.bookings
language plpgsql
security definer
set search_path = public, pg_temp
as $function$
declare
  v_actor uuid := auth.uid();
begin
  if v_actor is null or not public.is_admin() then raise exception 'VOYNU: admin access required'; end if;
  if not exists (select 1 from public.dispatch_settings where id=true and mode='automatic') then raise exception 'VOYNU: automatic dispatch is disabled'; end if;
  return public.auto_assign_booking_driver_internal(p_booking_id);
end;
$function$;

revoke execute on function public.auto_assign_booking_driver(uuid) from public, anon;
grant execute on function public.auto_assign_booking_driver(uuid) to authenticated;

create or replace function public.auto_dispatch_confirmed_booking()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $function$
begin
  if new.booking_status = 'confirmed'
     and new.driver_id is null
     and exists (select 1 from public.dispatch_settings where id=true and mode='automatic') then
    perform public.auto_assign_booking_driver_internal(new.id);
  end if;
  return new;
exception when others then
  -- Dispatch must never make booking confirmation fail. The booking remains confirmed
  -- and can be dispatched later from the Admin Dispatch queue.
  return new;
end;
$function$;

revoke all on function public.auto_dispatch_confirmed_booking() from public, anon, authenticated;

drop trigger if exists trg_auto_dispatch_confirmed_booking on public.bookings;
create trigger trg_auto_dispatch_confirmed_booking
after insert or update of booking_status, payment_status on public.bookings
for each row
when (new.booking_status = 'confirmed' and new.driver_id is null)
execute function public.auto_dispatch_confirmed_booking();

create or replace function public.admin_confirm_payment_and_dispatch(p_booking_id uuid)
returns public.bookings
language plpgsql
security definer
set search_path = public, pg_temp
as $function$
declare
  v_actor uuid := auth.uid();
  v_booking public.bookings;
begin
  if v_actor is null or not public.is_admin() then raise exception 'VOYNU: admin access required'; end if;
  update public.bookings
    set payment_status='paid', booking_status='confirmed'
    where id=p_booking_id
      and booking_status not in ('cancelled','trip_completed')
    returning * into v_booking;
  if not found then raise exception 'VOYNU: booking cannot be confirmed'; end if;

  if exists (select 1 from public.dispatch_settings where id=true and mode='automatic') then
    select * into v_booking from public.auto_assign_booking_driver_internal(p_booking_id);
  end if;
  return v_booking;
end;
$function$;

revoke all on function public.admin_confirm_payment_and_dispatch(uuid) from public, anon;
grant execute on function public.admin_confirm_payment_and_dispatch(uuid) to authenticated;
