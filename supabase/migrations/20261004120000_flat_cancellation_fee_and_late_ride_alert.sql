-- 1) Single-ride cancellation fee: one flat rule.
--    * Free if cancelled with more than 60 minutes to pickup.
--    * Flat Rs 75 once there are 60 minutes or fewer left -- including when the driver is on the way / has arrived
--      (the old Rs 150 tier is removed).
--    * Waived when the ride still has not started 30+ minutes after its scheduled pickup (driver late / no-show).
create or replace function public.cancel_booking(p_booking_id uuid, p_reason text default null::text)
returns bookings
language plpgsql
security definer
set search_path to 'public'
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

  if v_minutes_to_pickup is not null
     and v_minutes_to_pickup <= -30
     and v_booking.booking_status in ('pending_payment','confirmed','driver_assigned','on_the_way') then
    v_fee := 0;  -- ride did not start 30+ minutes after scheduled time
  elsif v_booking.booking_status in ('on_the_way','arrived') then
    v_fee := 75;
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

-- 2) Alert customers whose ride has not started 30 minutes after its scheduled pickup.
--    Inserting into notifications also fires the existing web-push trigger. One alert per booking;
--    only looks back 12 hours so old stale bookings are not re-announced.
create or replace function public.notify_late_unstarted_rides()
returns integer
language plpgsql
security definer
set search_path to 'public','pg_temp'
as $function$
declare
  r record;
  v_count integer := 0;
begin
  for r in
    select b.id, b.user_id, b.pickup_time
    from public.bookings b
    where b.booking_status in ('confirmed','driver_assigned','on_the_way')
      and b.travel_date is not null and b.pickup_time is not null
      and ((b.travel_date + b.pickup_time) at time zone 'Asia/Kolkata') <= now() - interval '30 minutes'
      and ((b.travel_date + b.pickup_time) at time zone 'Asia/Kolkata') > now() - interval '12 hours'
      and not exists (select 1 from public.notifications n where n.booking_id=b.id and n.type='ride_not_started')
  loop
    insert into public.notifications(user_id, booking_id, type, title, message, data)
    values (
      r.user_id, r.id, 'ride_not_started',
      'Your ride hasn''t started',
      'Your ride scheduled for ' || to_char(r.pickup_time, 'FMHH12:MI AM') || ' hasn''t started after 30 minutes. Would you like to cancel it? Cancelling now is free.',
      jsonb_build_object('bookingId', r.id, 'reference', 'VOY-' || upper(left(r.id::text, 8)))
    );
    v_count := v_count + 1;
  end loop;
  return v_count;
end;
$function$;

revoke all on function public.notify_late_unstarted_rides() from public;
revoke execute on function public.notify_late_unstarted_rides() from anon, authenticated;

select cron.unschedule(jobid) from cron.job where jobname='voynu-notify-late-unstarted-rides';
select cron.schedule('voynu-notify-late-unstarted-rides', '*/5 * * * *', $$select public.notify_late_unstarted_rides();$$);
