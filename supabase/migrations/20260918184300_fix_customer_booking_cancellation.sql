-- Allow the customer cancellation RPC to pass the driver-update trigger guard
-- after it has independently verified booking ownership and cancellation eligibility.

create or replace function public.cancel_booking(p_booking_id uuid, p_reason text default null)
returns public.bookings
language plpgsql
security definer
set search_path='public'
as $function$
declare
  v_booking public.bookings;
  v_pickup_ts timestamptz;
  v_minutes_to_pickup numeric;
  v_fee numeric := 0;
  v_dispatch_token text;
begin
  if auth.uid() is null then
    raise exception 'VOYNU: authentication required';
  end if;

  select * into v_booking
  from public.bookings
  where id=p_booking_id and user_id=auth.uid()
  for update;

  if not found then
    raise exception 'VOYNU: booking not found';
  end if;

  if v_booking.booking_status in ('cancelled','trip_completed','trip_started') then
    raise exception 'VOYNU: this booking can no longer be cancelled online. Please contact support.';
  end if;

  if v_booking.travel_date is not null and v_booking.pickup_time is not null then
    v_pickup_ts := (v_booking.travel_date + v_booking.pickup_time) at time zone 'Asia/Kolkata';
    v_minutes_to_pickup := extract(epoch from (v_pickup_ts - now())) / 60.0;
  else
    v_minutes_to_pickup := null;
  end if;

  if v_booking.booking_status in ('on_the_way','arrived') then
    v_fee := 150;
  elsif v_minutes_to_pickup is not null and v_minutes_to_pickup <= 60 then
    v_fee := 75;
  else
    v_fee := 0;
  end if;

  select token into v_dispatch_token
  from private.dispatch_security_config
  where id=true;

  if v_dispatch_token is null then
    raise exception 'VOYNU: cancellation security configuration is unavailable';
  end if;

  perform set_config('voynu.auto_dispatch_token',v_dispatch_token,true);

  update public.bookings
  set booking_status='cancelled',
      cancelled_by='customer',
      cancellation_fee=v_fee,
      cancellation_reason=p_reason
  where id=p_booking_id
  returning * into v_booking;

  return v_booking;
end;
$function$;
