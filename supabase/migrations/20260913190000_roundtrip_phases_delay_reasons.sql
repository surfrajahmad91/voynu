-- VOYNU: explicit round-trip phases, return timing and operational delay reasons.
-- Existing one-way status flow remains compatible.

alter table public.bookings
  add column if not exists scheduled_return_start_at timestamptz,
  add column if not exists return_wait_started_at timestamptz,
  add column if not exists outbound_arrived_at timestamptz,
  add column if not exists return_trip_started_at timestamptz,
  add column if not exists return_trip_start_on_time boolean,
  add column if not exists return_trip_start_delay_minutes integer,
  add column if not exists trip_start_delay_reason text,
  add column if not exists return_trip_start_delay_reason text,
  add column if not exists trip_completion_delay_reason text;

alter table public.bookings drop constraint if exists bookings_booking_status_check;
alter table public.bookings add constraint bookings_booking_status_check check (
  booking_status = any (array[
    'pending_payment','confirmed','driver_assigned','on_the_way','arrived',
    'trip_started','waiting_for_return','return_trip_started','trip_completed','cancelled'
  ])
);

create index if not exists bookings_scheduled_return_start_idx
  on public.bookings(scheduled_return_start_at)
  where booking_status = 'waiting_for_return';

-- Keep the round-trip timeline correct: return_time is the RETURN DEPARTURE,
-- while final completion is return departure + authoritative road duration.
create or replace function public.set_booking_trip_schedule()
returns trigger language plpgsql security definer set search_path='public','pg_temp' as $$
declare
  v_duration integer;
  v_pickup timestamptz;
  v_return_start timestamptz;
begin
  if new.scheduled_pickup_at is null and new.travel_date is not null and new.pickup_time is not null then
    new.scheduled_pickup_at := (new.travel_date + new.pickup_time) at time zone 'Asia/Kolkata';
  end if;

  if new.expected_duration_seconds is null and new.fare_breakdown is not null then
    begin
      v_duration := nullif((new.fare_breakdown->>'authoritativeDurationSeconds')::integer, 0);
    exception when others then
      v_duration := null;
    end;
    if v_duration is not null and v_duration >= 0 then new.expected_duration_seconds := v_duration; end if;
  end if;

  v_pickup := new.scheduled_pickup_at;

  if new.trip_type = 'roundtrip' and new.return_date is not null and new.return_time is not null then
    new.scheduled_return_start_at := (new.return_date + new.return_time) at time zone 'Asia/Kolkata';
    v_return_start := new.scheduled_return_start_at;
    if new.expected_duration_seconds is not null then
      new.scheduled_completion_at := v_return_start + make_interval(secs=>new.expected_duration_seconds);
    end if;
  elsif new.scheduled_pickup_at is not null and new.expected_duration_seconds is not null then
    new.scheduled_return_start_at := null;
    new.scheduled_completion_at := new.scheduled_pickup_at + make_interval(secs=>new.expected_duration_seconds);
  end if;

  return new;
end; $$;

-- Recalculate schedule fields for existing bookings.
update public.bookings
set scheduled_pickup_at = case
    when travel_date is not null and pickup_time is not null
      then (travel_date + pickup_time) at time zone 'Asia/Kolkata'
    else scheduled_pickup_at end,
    scheduled_return_start_at = case
      when trip_type='roundtrip' and return_date is not null and return_time is not null
        then (return_date + return_time) at time zone 'Asia/Kolkata'
      else null end;

update public.bookings
set scheduled_completion_at = case
  when trip_type='roundtrip' and scheduled_return_start_at is not null and expected_duration_seconds is not null
    then scheduled_return_start_at + make_interval(secs=>expected_duration_seconds)
  when trip_type<>'roundtrip' and scheduled_pickup_at is not null and expected_duration_seconds is not null
    then scheduled_pickup_at + make_interval(secs=>expected_duration_seconds)
  else scheduled_completion_at
end;

-- Driver status transitions are explicit for round trips:
-- outbound start -> waiting at destination -> return start -> final completion.
drop function if exists public.advance_driver_booking_status(uuid,text);
create or replace function public.advance_driver_booking_status(
  p_booking_id uuid,
  p_next_status text,
  p_delay_reason text default null
)
returns public.bookings
language plpgsql security definer set search_path='public','pg_temp' as $$
declare
  v_booking public.bookings;
  v_driver public.drivers;
  v_reason text;
begin
  select * into v_booking from public.bookings where id=p_booking_id for update;
  if not found then raise exception 'VOYNU: booking not found'; end if;

  select * into v_driver from public.drivers d
  where d.id=v_booking.driver_id and d.active=true
    and (d.user_id=auth.uid() or (d.user_id is null and lower(d.email)=lower((select email from auth.users where id=auth.uid()))))
  for update;
  if not found then raise exception 'VOYNU: driver access denied'; end if;

  v_reason := nullif(trim(coalesce(p_delay_reason,'')), '');

  if not (
    (v_booking.booking_status='driver_assigned' and p_next_status='on_the_way') or
    (v_booking.booking_status='on_the_way' and p_next_status='arrived') or
    (v_booking.booking_status='arrived' and p_next_status='trip_started') or
    (v_booking.booking_status='trip_started' and p_next_status=case when v_booking.trip_type='roundtrip' then 'waiting_for_return' else 'trip_completed' end) or
    (v_booking.booking_status='waiting_for_return' and p_next_status='return_trip_started') or
    (v_booking.booking_status='return_trip_started' and p_next_status='trip_completed')
  ) then
    raise exception 'VOYNU: invalid driver status transition from % to %',v_booking.booking_status,p_next_status;
  end if;

  if p_next_status='trip_started' and v_booking.scheduled_pickup_at is not null
     and now() > v_booking.scheduled_pickup_at and v_reason is null then
    raise exception 'VOYNU: a late trip start requires a delay reason';
  end if;

  if p_next_status='return_trip_started' then
    if v_booking.scheduled_return_start_at is null then
      raise exception 'VOYNU: return journey schedule is missing';
    end if;
    if now() < v_booking.scheduled_return_start_at then
      raise exception 'VOYNU: return journey cannot start before the scheduled return time';
    end if;
    if now() > v_booking.scheduled_return_start_at and v_reason is null then
      raise exception 'VOYNU: a late return start requires a delay reason';
    end if;
  end if;

  if p_next_status='waiting_for_return' then
    update public.bookings
      set booking_status='waiting_for_return',
          outbound_arrived_at=coalesce(outbound_arrived_at,now()),
          return_wait_started_at=coalesce(return_wait_started_at,now())
      where id=p_booking_id
      returning * into v_booking;
  elsif p_next_status='return_trip_started' then
    update public.bookings
      set booking_status='return_trip_started',
          return_trip_started_at=coalesce(return_trip_started_at,now()),
          return_trip_start_delay_reason=v_reason
      where id=p_booking_id
      returning * into v_booking;
  elsif p_next_status='trip_completed' then
    update public.bookings
      set booking_status='trip_completed',
          completed_at=coalesce(completed_at,now()),
          trip_completion_delay_reason=case
            when scheduled_completion_at is not null and now() > scheduled_completion_at then v_reason
            else trip_completion_delay_reason end
      where id=p_booking_id
      returning * into v_booking;
  elsif p_next_status='trip_started' then
    update public.bookings
      set booking_status='trip_started',
          trip_start_delay_reason=v_reason
      where id=p_booking_id
      returning * into v_booking;
  else
    update public.bookings set booking_status=p_next_status where id=p_booking_id returning * into v_booking;
  end if;

  if p_next_status='trip_completed' then
    update public.driver_assignments set status='completed'
      where booking_id=p_booking_id and driver_id=v_driver.id and status='assigned';
    update public.drivers set availability_status='available' where id=v_driver.id;
  end if;

  return v_booking;
end; $$;

grant execute on function public.advance_driver_booking_status(uuid,text,text) to authenticated;
revoke execute on function public.advance_driver_booking_status(uuid,text,text) from anon;

-- Record timing for outbound start, return start and final completion.
create or replace function public.record_booking_trip_timing()
returns trigger language plpgsql security definer set search_path='public','pg_temp' as $$
declare v_delay integer;
begin
  if old.booking_status is distinct from new.booking_status and new.booking_status='trip_started' then
    if new.trip_started_at is null then new.trip_started_at:=now(); end if;
    if new.scheduled_pickup_at is not null then
      v_delay:=greatest(0,floor(extract(epoch from (new.trip_started_at-new.scheduled_pickup_at))/60)::integer);
      new.trip_start_delay_minutes:=v_delay;
      new.trip_start_on_time:=(v_delay=0);
    end if;
  end if;

  if old.booking_status is distinct from new.booking_status and new.booking_status='return_trip_started' then
    if new.return_trip_started_at is null then new.return_trip_started_at:=now(); end if;
    if new.scheduled_return_start_at is not null then
      v_delay:=greatest(0,floor(extract(epoch from (new.return_trip_started_at-new.scheduled_return_start_at))/60)::integer);
      new.return_trip_start_delay_minutes:=v_delay;
      new.return_trip_start_on_time:=(v_delay=0);
    end if;
  end if;

  if old.booking_status is distinct from new.booking_status and new.booking_status='trip_completed' then
    if new.completed_at is null then new.completed_at:=now(); end if;
    if new.scheduled_completion_at is not null then
      v_delay:=greatest(0,floor(extract(epoch from (new.completed_at-new.scheduled_completion_at))/60)::integer);
      new.trip_completion_delay_minutes:=v_delay;
      new.trip_completion_on_time:=(v_delay=0);
    end if;
  end if;
  return new;
end; $$;

-- Keep the driver-only guard aligned with the expanded status flow.
create or replace function public.guard_driver_booking_update()
returns trigger language plpgsql security definer set search_path='public' as $$
begin
  if current_setting('voynu.auto_dispatch_token', true) is not null
     and current_setting('voynu.auto_dispatch_token', true) = (select token from private.dispatch_security_config where id=true) then
    return new;
  end if;
  if public.is_admin() then return new; end if;
  if old.driver_id is null or not exists (
    select 1 from public.drivers d
    where d.id=old.driver_id and d.active=true
      and (d.user_id=auth.uid() or (d.user_id is null and lower(d.email)=lower((select email from auth.users where id=auth.uid()))))
  ) then raise exception 'VOYNU: driver access denied'; end if;
  if new.id is distinct from old.id or new.user_id is distinct from old.user_id or new.driver_id is distinct from old.driver_id
     or new.vehicle_id is distinct from old.vehicle_id or new.passenger_name is distinct from old.passenger_name or new.phone is distinct from old.phone
     or new.whatsapp is distinct from old.whatsapp or new.pickup_name is distinct from old.pickup_name or new.drop_name is distinct from old.drop_name
     or new.pickup_lat is distinct from old.pickup_lat or new.pickup_lon is distinct from old.pickup_lon or new.drop_lat is distinct from old.drop_lat
     or new.drop_lon is distinct from old.drop_lon or new.travel_date is distinct from old.travel_date or new.pickup_time is distinct from old.pickup_time
     or new.return_date is distinct from old.return_date or new.return_time is distinct from old.return_time or new.trip_type is distinct from old.trip_type
     or new.vehicle_type is distinct from old.vehicle_type or new.fare is distinct from old.fare or new.payment_method is distinct from old.payment_method
     or new.payment_status is distinct from old.payment_status or new.fare_breakdown is distinct from old.fare_breakdown then
    raise exception 'VOYNU: drivers may update booking status and trip timing fields only';
  end if;
  if not (
    (old.booking_status='driver_assigned' and new.booking_status='on_the_way') or
    (old.booking_status='on_the_way' and new.booking_status='arrived') or
    (old.booking_status='arrived' and new.booking_status='trip_started') or
    (old.booking_status='trip_started' and new.booking_status in ('waiting_for_return','trip_completed')) or
    (old.booking_status='waiting_for_return' and new.booking_status='return_trip_started') or
    (old.booking_status='return_trip_started' and new.booking_status='trip_completed') or
    (new.booking_status is not distinct from old.booking_status)
  ) then raise exception 'VOYNU: invalid driver booking status transition'; end if;
  return new;
end; $$;

-- Timing watchdog: round trips should be monitored against return departure and final arrival.
create or replace function public.check_trip_timing_alerts()
returns integer language plpgsql security definer set search_path='public','pg_temp' as $$
declare r record; v_count integer:=0; v_minutes integer; v_reference text;
begin
  if not public.is_admin() then raise exception 'Admin access required'; end if;

  for r in select b.* from public.bookings b
    where b.booking_status not in ('trip_completed','cancelled','waiting_for_return')
      and b.scheduled_pickup_at is not null
      and b.scheduled_pickup_at < now()-interval '10 minutes'
      and b.trip_started_at is null loop
    insert into public.trip_timing_alerts(booking_id,alert_type,threshold_minutes)
      values(r.id,'start_overdue',10) on conflict (booking_id,alert_type) do nothing;
    if found then
      v_minutes:=greatest(0,floor(extract(epoch from (now()-r.scheduled_pickup_at))/60)::integer); v_reference:='VOY-'||upper(left(r.id::text,8));
      insert into public.notifications(user_id,booking_id,type,title,message,data)
        select p.id,r.id,'admin_trip_start_overdue','Trip start overdue',format('Booking %s was scheduled to start at %s and has not started (%s min overdue).',v_reference,to_char(r.scheduled_pickup_at at time zone 'Asia/Kolkata','DD Mon YYYY HH24:MI'),v_minutes),jsonb_build_object('bookingId',r.id,'reference',v_reference,'scheduledPickupAt',r.scheduled_pickup_at,'overdueMinutes',v_minutes) from public.profiles p where p.role='admin';
      v_count:=v_count+1;
    end if;
  end loop;

  for r in select b.* from public.bookings b where b.booking_status='waiting_for_return' and b.scheduled_return_start_at is not null and b.scheduled_return_start_at < now()-interval '10 minutes' loop
    insert into public.trip_timing_alerts(booking_id,alert_type,threshold_minutes) values(r.id,'return_start_overdue',10) on conflict (booking_id,alert_type) do nothing;
    if found then
      v_minutes:=greatest(0,floor(extract(epoch from (now()-r.scheduled_return_start_at))/60)::integer); v_reference:='VOY-'||upper(left(r.id::text,8));
      insert into public.notifications(user_id,booking_id,type,title,message,data)
        select p.id,r.id,'admin_return_start_overdue','Return trip start overdue',format('Booking %s reached the destination but the return journey has not started (%s min overdue).',v_reference,v_minutes),jsonb_build_object('bookingId',r.id,'reference',v_reference,'scheduledReturnStartAt',r.scheduled_return_start_at,'overdueMinutes',v_minutes) from public.profiles p where p.role='admin';
      v_count:=v_count+1;
    end if;
  end loop;

  for r in select b.* from public.bookings b
    where b.booking_status in ('trip_started','return_trip_started')
      and b.scheduled_completion_at is not null
      and b.scheduled_completion_at < now()-interval '15 minutes' loop
    insert into public.trip_timing_alerts(booking_id,alert_type,threshold_minutes) values(r.id,'completion_overdue',15) on conflict (booking_id,alert_type) do nothing;
    if found then
      v_minutes:=greatest(0,floor(extract(epoch from (now()-r.scheduled_completion_at))/60)::integer); v_reference:='VOY-'||upper(left(r.id::text,8));
      insert into public.notifications(user_id,booking_id,type,title,message,data)
        select p.id,r.id,'admin_trip_completion_overdue','Trip completion overdue',format('Booking %s passed its expected final arrival by %s min and is still in progress.',v_reference,v_minutes),jsonb_build_object('bookingId',r.id,'reference',v_reference,'scheduledCompletionAt',r.scheduled_completion_at,'overdueMinutes',v_minutes) from public.profiles p where p.role='admin';
      v_count:=v_count+1;
    end if;
  end loop;
  return v_count;
end; $$;

drop policy if exists "Admins can read trip timing alerts" on public.trip_timing_alerts;
create policy "Admins can read trip timing alerts" on public.trip_timing_alerts for select to authenticated using (public.is_admin());
