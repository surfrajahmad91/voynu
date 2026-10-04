-- Customer can cancel only the RETURN leg of a round trip while the driver is waiting at the destination.
-- The ride is then treated as a single completed ride (no refund). The driver completes the trip from the
-- destination (so cash collection and driver availability are handled by the normal completion path).

alter table public.bookings add column if not exists return_cancelled_at timestamptz;

create or replace function public.cancel_return_journey(p_booking_id uuid)
returns bookings
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_booking public.bookings;
  v_dispatch_token text;
begin
  if auth.uid() is null then
    raise exception 'VOYNU: authentication required';
  end if;

  select * into v_booking from public.bookings where id=p_booking_id and user_id=auth.uid() for update;
  if not found then
    raise exception 'VOYNU: booking not found';
  end if;

  if v_booking.trip_type is distinct from 'roundtrip' or v_booking.booking_status is distinct from 'waiting_for_return' then
    raise exception 'VOYNU: the return journey can only be cancelled while your driver is waiting at the destination';
  end if;

  if v_booking.return_cancelled_at is not null then
    return v_booking;
  end if;

  select token into v_dispatch_token from private.dispatch_security_config where id=true;
  if v_dispatch_token is null then
    raise exception 'VOYNU: cancellation security configuration is unavailable';
  end if;
  perform set_config('voynu.auto_dispatch_token', v_dispatch_token, true);

  update public.bookings set return_cancelled_at = now() where id=p_booking_id returning * into v_booking;
  return v_booking;
end;
$function$;

revoke all on function public.cancel_return_journey(uuid) from public, anon;
grant execute on function public.cancel_return_journey(uuid) to authenticated;

-- Patch the live workflow functions in place (exact-text replacements; each must match or the migration aborts).
do $patch$
declare
  d text; o text;
begin
  -- 1) booking state machine: from waiting_for_return allow trip_completed once the return is cancelled
  select pg_get_functiondef('public.sync_booking_state()'::regprocedure) into d; o := d;
  if position('return_cancelled_at' in d) = 0 then
    d := replace(d, $q$when 'waiting_for_return' then array['return_trip_started', 'cancelled']$q$,
      $q$when 'waiting_for_return' then (case when NEW.return_cancelled_at is not null then array['trip_completed', 'cancelled'] else array['return_trip_started', 'cancelled'] end)$q$);
    if d = o then raise exception 'patch failed: sync_booking_state'; end if;
    execute d;
  end if;

  -- 2) driver update guard
  select pg_get_functiondef('public.guard_driver_booking_update()'::regprocedure) into d; o := d;
  if position('return_cancelled_at' in d) = 0 then
    d := replace(d, $q$(old.booking_status='waiting_for_return' and new.booking_status='return_trip_started')$q$,
      $q$(old.booking_status='waiting_for_return' and new.booking_status='return_trip_started' and old.return_cancelled_at is null)
       or (old.booking_status='waiting_for_return' and new.booking_status='trip_completed' and old.return_cancelled_at is not null)$q$);
    if d = o then raise exception 'patch failed: guard_driver_booking_update'; end if;
    execute d;
  end if;

  -- 3) driver advance function: allow completing from the destination after a return cancellation, without a lateness reason
  select pg_get_functiondef('public.advance_driver_booking_status(uuid,text,text,text,numeric,text)'::regprocedure) into d; o := d;
  if position('return_cancelled_at' in d) = 0 then
    d := replace(d, $q$(v_from='waiting_for_return' and p_next_status='return_trip_started')$q$,
      $q$(v_from='waiting_for_return' and p_next_status='return_trip_started' and v_booking.return_cancelled_at is null)
       or (v_from='waiting_for_return' and p_next_status='trip_completed' and v_booking.return_cancelled_at is not null)$q$);
    if d = o then raise exception 'patch failed: advance_driver_booking_status (transition)'; end if;
    o := d;
    d := replace(d, $q$v_needs_late := v_now > v_expected_at + v_tol;$q$, $q$v_needs_late := v_from <> 'waiting_for_return' and v_now > v_expected_at + v_tol;$q$);
    if d = o then raise exception 'patch failed: advance_driver_booking_status (lateness)'; end if;
    execute d;
  end if;

  -- 4) once the journey is under way (outbound done / return running) customers can't cancel the whole booking
  select pg_get_functiondef('public.cancel_booking(uuid,text)'::regprocedure) into d; o := d;
  if position('waiting_for_return' in d) = 0 then
    d := replace(d, $q$in ('cancelled','trip_completed','trip_started')$q$, $q$in ('cancelled','trip_completed','trip_started','waiting_for_return','return_trip_started')$q$);
    if d = o then raise exception 'patch failed: cancel_booking'; end if;
    execute d;
  end if;
end
$patch$;
