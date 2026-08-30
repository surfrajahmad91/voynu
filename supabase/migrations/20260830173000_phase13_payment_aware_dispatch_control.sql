-- Phase 13: payment-aware automatic dispatch and safe control.
-- This migration repairs the final dispatch architecture without reviving the
-- removed auto_dispatch_context table.

-- Driver-update guard: automatic dispatch uses a transaction-local, internal
-- dispatch token instead of a database context table. The token is only set by
-- the SECURITY DEFINER dispatch function below.
create or replace function public.guard_driver_booking_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $function$
begin
  if current_setting('voynu.auto_dispatch_token', true) = 'voynu-internal-dispatch-v1-7f4b9d2a' then
    return new;
  end if;

  if public.is_admin() then
    return new;
  end if;

  if old.driver_id is null or not exists (
    select 1
    from public.drivers d
    where d.id = old.driver_id
      and d.active = true
      and (
        d.user_id = auth.uid()
        or (d.user_id is null and lower(d.email) = lower((select email from auth.users where id = auth.uid())))
      )
  ) then
    raise exception 'VOYNU: driver access denied';
  end if;

  if new.id is distinct from old.id
     or new.user_id is distinct from old.user_id
     or new.driver_id is distinct from old.driver_id
     or new.vehicle_id is distinct from old.vehicle_id
     or new.passenger_name is distinct from old.passenger_name
     or new.phone is distinct from old.phone
     or new.whatsapp is distinct from old.whatsapp
     or new.pickup_name is distinct from old.pickup_name
     or new.drop_name is distinct from old.drop_name
     or new.pickup_lat is distinct from old.pickup_lat
     or new.pickup_lon is distinct from old.pickup_lon
     or new.drop_lat is distinct from old.drop_lat
     or new.drop_lon is distinct from old.drop_lon
     or new.travel_date is distinct from old.travel_date
     or new.pickup_time is distinct from old.pickup_time
     or new.trip_type is distinct from old.trip_type
     or new.vehicle_type is distinct from old.vehicle_type
     or new.fare is distinct from old.fare
     or new.payment_method is distinct from old.payment_method
     or new.payment_status is distinct from old.payment_status
     or new.created_at is distinct from old.created_at then
    raise exception 'VOYNU: drivers may update booking status only';
  end if;

  if not (
    (old.booking_status='driver_assigned' and new.booking_status='on_the_way')
    or (old.booking_status='on_the_way' and new.booking_status='arrived')
    or (old.booking_status='arrived' and new.booking_status='trip_started')
    or (old.booking_status='trip_started' and new.booking_status='trip_completed')
    or (new.booking_status is not distinct from old.booking_status)
  ) then
    raise exception 'VOYNU: invalid driver booking status transition';
  end if;

  return new;
end;
$function$;

-- Replace the internal dispatcher with a payment-aware version.
-- Cash/Pay-on-Pickup bookings are dispatch-ready immediately. UPI bookings
-- become dispatch-ready only after payment_status='paid'.
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
  select * into v_booking
  from public.bookings
  where id = p_booking_id
  for update;

  if not found then return null; end if;
  if v_booking.booking_status <> 'confirmed' or v_booking.driver_id is not null then return v_booking; end if;

  -- Payment gate: cash is ready on booking confirmation; UPI is ready only
  -- after an admin has verified the payment.
  if not (
    (v_booking.payment_method = 'cash' and v_booking.payment_status = 'due_on_pickup')
    or v_booking.payment_status = 'paid'
  ) then
    return v_booking;
  end if;

  if v_booking.travel_date is null or v_booking.pickup_time is null then return v_booking; end if;

  v_pickup_ts := (v_booking.travel_date + v_booking.pickup_time) at time zone 'Asia/Kolkata';
  v_end_ts := coalesce(
    ((v_booking.return_date + v_booking.return_time) at time zone 'Asia/Kolkata'),
    v_pickup_ts + interval '4 hours'
  );
  if v_end_ts <= v_pickup_ts then v_end_ts := v_pickup_ts + interval '4 hours'; end if;

  select d.* into v_driver
  from public.drivers d
  join public.vehicles v on v.id = d.vehicle_id
  where d.active = true
    and d.availability_status = 'available'
    and v.active = true
    and coalesce(v.status, 'active') not in ('maintenance','inactive','unavailable')
    and (v_booking.vehicle_category_id is null or v.vehicle_category_id = v_booking.vehicle_category_id)
    and coalesce(v.seating_capacity, 0) >= coalesce(v_booking.passenger_count, 0)
    and coalesce(v.luggage_capacity, 0) >= coalesce(v_booking.luggage_count, 0)
    and not exists (
      select 1
      from public.bookings b
      where b.driver_id = d.id
        and b.id <> v_booking.id
        and b.booking_status not in ('cancelled','trip_completed')
        and (b.travel_date + b.pickup_time) at time zone 'Asia/Kolkata' < v_end_ts
        and coalesce(
          ((b.return_date + b.return_time) at time zone 'Asia/Kolkata'),
          ((b.travel_date + b.pickup_time) at time zone 'Asia/Kolkata') + interval '4 hours'
        ) > v_pickup_ts
    )
  order by d.created_at asc
  limit 1
  for update;

  if not found then return v_booking; end if;

  -- Transaction-local bypass for the driver-update guard. The setting is
  -- automatically cleared at transaction end.
  perform set_config('voynu.auto_dispatch_token', 'voynu-internal-dispatch-v1-7f4b9d2a', true);

  update public.driver_assignments
    set status = 'cancelled'
    where booking_id = v_booking.id
      and status = 'assigned';

  insert into public.driver_assignments(booking_id, driver_id, vehicle_id, assigned_by, status)
  values(v_booking.id, v_driver.id, v_driver.vehicle_id, null, 'assigned');

  update public.bookings
    set driver_id = v_driver.id,
        vehicle_id = v_driver.vehicle_id,
        booking_status = 'driver_assigned'
    where id = v_booking.id
    returning * into v_booking;

  update public.drivers
    set availability_status = 'busy'
    where id = v_driver.id;

  return v_booking;
end;
$function$;

-- Admin-controlled mode change. When switching automatic dispatch ON, process
-- already-confirmed, currently-unassigned, payment-ready bookings as well.
create or replace function public.set_dispatch_mode(p_mode text)
returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $function$
declare
  v_actor uuid := auth.uid();
  v_booking public.bookings;
  v_before_driver uuid;
  v_assigned integer := 0;
begin
  if v_actor is null or not public.is_admin() then
    raise exception 'VOYNU: admin access required';
  end if;

  if p_mode not in ('manual','automatic') then
    raise exception 'VOYNU: invalid dispatch mode';
  end if;

  update public.dispatch_settings
    set mode = p_mode,
        updated_at = now()
    where id = true;

  if p_mode <> 'automatic' then
    return 0;
  end if;

  for v_booking in
    select *
    from public.bookings
    where booking_status = 'confirmed'
      and driver_id is null
    order by travel_date nulls last, pickup_time nulls last, created_at
  loop
    v_before_driver := v_booking.driver_id;
    perform public.auto_assign_booking_driver_internal(v_booking.id);
    if exists (
      select 1 from public.bookings b
      where b.id = v_booking.id and b.driver_id is not null and v_before_driver is null
    ) then
      v_assigned := v_assigned + 1;
    end if;
  end loop;

  return v_assigned;
end;
$function$;

revoke all on function public.set_dispatch_mode(text) from public, anon;
grant execute on function public.set_dispatch_mode(text) to authenticated;

-- Keep the trigger database-owned. It fires on confirmation and payment changes,
-- so UPI verification naturally becomes the dispatch trigger when auto mode is ON.
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
  -- Never make booking/payment confirmation fail because a driver is unavailable
  -- or dispatch has a transient problem. The booking stays confirmed for retry.
  return new;
end;
$function$;

-- Keep the explicit UPI verification RPC aligned with the same dispatch rule.
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
  if v_actor is null or not public.is_admin() then
    raise exception 'VOYNU: admin access required';
  end if;

  update public.bookings
    set payment_status = 'paid',
        booking_status = 'confirmed'
    where id = p_booking_id
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
