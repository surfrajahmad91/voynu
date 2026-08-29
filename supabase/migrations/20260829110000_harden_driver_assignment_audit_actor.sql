-- Harden driver assignment audit attribution.
-- The acting admin must always be recorded from the authenticated Supabase session;
-- a client-supplied p_assigned_by value must never be trusted for audit history.

create or replace function public.assign_booking_driver(
  p_booking_id uuid,
  p_driver_id uuid,
  p_vehicle_id uuid,
  p_assigned_by uuid default auth.uid()
)
returns public.bookings
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_booking public.bookings;
  v_driver public.drivers;
  v_old_driver uuid;
  v_actor uuid := auth.uid();
begin
  if v_actor is null then
    raise exception 'VOYNU: authenticated admin session required';
  end if;

  if not public.is_admin() then
    raise exception 'VOYNU: admin access required';
  end if;

  select * into v_booking
  from public.bookings
  where id = p_booking_id
  for update;
  if not found then
    raise exception 'VOYNU: booking not found';
  end if;

  select * into v_driver
  from public.drivers
  where id = p_driver_id and active = true
  for update;
  if not found then
    raise exception 'VOYNU: active driver not found';
  end if;

  if v_driver.vehicle_id is distinct from p_vehicle_id then
    raise exception 'VOYNU: driver vehicle mismatch';
  end if;

  if v_booking.booking_status not in ('confirmed','driver_assigned') then
    raise exception 'VOYNU: booking cannot be assigned from status %', v_booking.booking_status;
  end if;

  if v_driver.availability_status is distinct from 'available'
     and v_booking.driver_id is distinct from p_driver_id then
    raise exception 'VOYNU: driver is not available';
  end if;

  v_old_driver := v_booking.driver_id;

  update public.driver_assignments
  set status = 'cancelled'
  where booking_id = p_booking_id and status = 'assigned';

  if v_old_driver is not null and v_old_driver is distinct from p_driver_id then
    update public.drivers
    set availability_status = 'available'
    where id = v_old_driver;
  end if;

  insert into public.driver_assignments(
    booking_id, driver_id, vehicle_id, assigned_by, status
  )
  values (
    p_booking_id, p_driver_id, p_vehicle_id, v_actor, 'assigned'
  );

  update public.bookings
  set driver_id = p_driver_id,
      vehicle_id = p_vehicle_id,
      booking_status = 'driver_assigned'
  where id = p_booking_id
  returning * into v_booking;

  update public.drivers
  set availability_status = 'busy'
  where id = p_driver_id;

  return v_booking;
end;
$function$;

revoke execute on function public.assign_booking_driver(uuid, uuid, uuid, uuid) from anon;
grant execute on function public.assign_booking_driver(uuid, uuid, uuid, uuid) to authenticated;
