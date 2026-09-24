-- VOYNU 2.0: ride bookings are pay-at-pickup only (UPI removed from regular ride booking).
-- Enforced in the database so a modified client cannot re-introduce UPI (or any other
-- payment_method such as 'subscription') on customer-created bookings.
-- Apply AFTER the customer app change (cab-selection + bookings/create) is deployed,
-- otherwise customers still seeing the UPI option would get an error.
-- Admin/service inserts (e.g. commute trip generation uses payment_method='subscription') are unaffected.
-- Historical UPI bookings (all already paid/completed or cancelled) are untouched.

create or replace function public.guard_booking_insert()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
declare v_is_service_role boolean := (auth.role() = 'service_role');
begin
  if v_is_service_role or public.is_admin() then
    return new;
  end if;

  if new.payment_method is distinct from 'cash' then
    raise exception 'VOYNU: ride bookings are paid to the driver at pickup';
  end if;

  if auth.uid() is not null then
    new.user_id := auth.uid();
  else
    new.user_id := null;
  end if;

  new.driver_id := null;
  new.vehicle_id := null;
  new.booking_status := 'confirmed';
  new.payment_status := 'due_on_pickup';
  new.confirmed_at := coalesce(new.confirmed_at, now());

  return new;
end;
$function$;
