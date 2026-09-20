-- VOYNU: driver ride workflow hardening.
--
-- 1. Round-trip statuses (waiting_for_return / return_trip_started) were rejected by the
--    bookings_sync_state trigger, so a round trip could never leave "trip_started".
-- 2. A trip must be accepted before the driver heads out for pickup.
-- 3. Time-and-motion checks with tolerances: the driver is only asked "why" when a step is late
--    beyond the grace period or is not at the expected place. Every step is logged.
-- 4. Cash collection record at the end of pay-on-completion trips.
-- 5. Customers are notified when the driver reaches the destination / starts the return leg.

-- ---------------------------------------------------------------------------------------------
-- Tunable thresholds (single row)
-- ---------------------------------------------------------------------------------------------
create table if not exists public.driver_workflow_settings (
  id boolean primary key default true check (id),
  early_departure_minutes integer not null default 240,
  start_grace_minutes integer not null default 10,
  completion_tolerance_minutes integer not null default 15,
  completion_tolerance_percent integer not null default 20,
  return_start_grace_minutes integer not null default 10,
  return_early_minutes integer not null default 10,
  pickup_radius_m integer not null default 400,
  start_radius_m integer not null default 1000,
  destination_radius_m integer not null default 500,
  max_location_age_seconds integer not null default 180,
  updated_at timestamptz not null default now()
);
insert into public.driver_workflow_settings(id) values (true) on conflict (id) do nothing;
alter table public.driver_workflow_settings enable row level security;
drop policy if exists "Authenticated can read driver workflow settings" on public.driver_workflow_settings;
create policy "Authenticated can read driver workflow settings" on public.driver_workflow_settings for select to authenticated using (true);
drop policy if exists "Admins manage driver workflow settings" on public.driver_workflow_settings;
create policy "Admins manage driver workflow settings" on public.driver_workflow_settings for all to authenticated using (public.is_admin()) with check (public.is_admin());
revoke all on public.driver_workflow_settings from anon;
grant select on public.driver_workflow_settings to authenticated;
grant insert, update on public.driver_workflow_settings to authenticated;

-- ---------------------------------------------------------------------------------------------
-- Booking columns
-- ---------------------------------------------------------------------------------------------
alter table public.bookings
  add column if not exists outbound_arrival_delay_reason text,
  add column if not exists cash_collection_status text,
  add column if not exists cash_collected_amount numeric,
  add column if not exists cash_collection_note text,
  add column if not exists cash_collected_at timestamptz;
alter table public.bookings drop constraint if exists bookings_cash_collection_status_check;
alter table public.bookings add constraint bookings_cash_collection_status_check
  check (cash_collection_status is null or cash_collection_status = any (array['collected','partial','not_collected','unreported']));

-- ---------------------------------------------------------------------------------------------
-- Step-by-step audit trail
-- ---------------------------------------------------------------------------------------------
create table if not exists public.booking_status_events (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings(id) on delete cascade,
  driver_id uuid references public.drivers(id),
  from_status text,
  to_status text not null,
  occurred_at timestamptz not null default now(),
  target text,
  distance_to_target_m integer,
  location_age_seconds integer,
  scheduled_at timestamptz,
  delay_minutes integer,
  flags text[] not null default '{}'::text[],
  reason text,
  cash_status text,
  cash_amount numeric
);
create index if not exists booking_status_events_booking_idx on public.booking_status_events(booking_id, occurred_at);
alter table public.booking_status_events enable row level security;
drop policy if exists "Admins read booking status events" on public.booking_status_events;
create policy "Admins read booking status events" on public.booking_status_events for select to authenticated using (public.is_admin());
drop policy if exists "Drivers read own booking status events" on public.booking_status_events;
create policy "Drivers read own booking status events" on public.booking_status_events for select to authenticated
  using (exists (select 1 from public.drivers d where d.id = booking_status_events.driver_id and d.user_id = (select auth.uid())));
revoke all on public.booking_status_events from anon;
revoke insert, update, delete on public.booking_status_events from authenticated;
grant select on public.booking_status_events to authenticated;

-- ---------------------------------------------------------------------------------------------
-- Allow the round-trip phases in the booking state machine
-- ---------------------------------------------------------------------------------------------
create or replace function public.sync_booking_state() returns trigger language plpgsql set search_path='public' as $$
declare allowed text[]; v_driver uuid;
begin
  if TG_OP = 'UPDATE' and NEW.booking_status is distinct from OLD.booking_status then
    allowed := case OLD.booking_status
      when 'pending_payment' then array['confirmed', 'cancelled']
      when 'confirmed' then array['driver_assigned', 'cancelled']
      when 'driver_assigned' then array['on_the_way', 'cancelled']
      when 'on_the_way' then array['arrived', 'cancelled']
      when 'arrived' then array['trip_started', 'cancelled']
      when 'trip_started' then array['waiting_for_return', 'trip_completed', 'cancelled']
      when 'waiting_for_return' then array['return_trip_started', 'cancelled']
      when 'return_trip_started' then array['trip_completed', 'cancelled']
      else array[]::text[]
    end;
    if not (NEW.booking_status = any(allowed)) then
      raise exception 'VOYNU: invalid booking_status transition % -> %', OLD.booking_status, NEW.booking_status;
    end if;
  end if;

  NEW.status := case NEW.booking_status
    when 'pending_payment' then 'pending'
    when 'confirmed' then 'confirmed'
    when 'driver_assigned' then 'confirmed'
    when 'on_the_way' then 'confirmed'
    when 'arrived' then 'confirmed'
    when 'trip_started' then 'confirmed'
    when 'waiting_for_return' then 'confirmed'
    when 'return_trip_started' then 'confirmed'
    when 'trip_completed' then 'completed'
    when 'cancelled' then 'cancelled'
    else NEW.status
  end;
  NEW.updated_at := now();
  if NEW.booking_status = 'confirmed' and NEW.confirmed_at is null then NEW.confirmed_at := now(); end if;
  if NEW.booking_status = 'trip_completed' and (TG_OP = 'INSERT' or OLD.booking_status is distinct from 'trip_completed') then NEW.completed_at := now(); end if;
  if NEW.booking_status = 'cancelled' and (TG_OP = 'INSERT' or OLD.booking_status is distinct from 'cancelled') then
    NEW.cancelled_at := now();
    if TG_OP = 'UPDATE' then
      v_driver := OLD.driver_id;
      if v_driver is not null then
        update public.drivers set availability_status='available' where id=v_driver;
        update public.driver_assignments set status='cancelled' where booking_id=NEW.id and status in ('assigned','accepted');
      end if;
    end if;
  end if;
  return NEW;
end;
$$;

-- ---------------------------------------------------------------------------------------------
-- Distance helper (metres)
-- ---------------------------------------------------------------------------------------------
create or replace function public.voynu_distance_m(lat1 double precision, lon1 double precision, lat2 double precision, lon2 double precision)
returns double precision language sql immutable parallel safe as $$
  select 2 * 6371000 * asin(least(1, sqrt(power(sin(radians(lat2 - lat1) / 2), 2) + cos(radians(lat1)) * cos(radians(lat2)) * power(sin(radians(lon2 - lon1) / 2), 2))));
$$;

-- ---------------------------------------------------------------------------------------------
-- Driver status advance with workflow rules
-- ---------------------------------------------------------------------------------------------
drop function if exists public.advance_driver_booking_status(uuid, text, text);
create or replace function public.advance_driver_booking_status(
  p_booking_id uuid,
  p_next_status text,
  p_delay_reason text default null,
  p_collection_status text default null,
  p_collected_amount numeric default null,
  p_collection_note text default null
) returns public.bookings
language plpgsql security definer set search_path='public','pg_temp' as $$
declare
  v_booking public.bookings; v_driver public.drivers; v_set public.driver_workflow_settings;
  v_loc public.driver_current_location;
  v_now timestamptz := clock_timestamp();
  v_from text; v_reason text;
  v_target text; v_tlat double precision; v_tlon double precision; v_radius integer;
  v_dist integer; v_loc_age integer;
  v_dur integer; v_tol interval; v_leg_start timestamptz; v_sched_arrival timestamptz; v_expected_at timestamptz;
  v_sched timestamptz; v_late_min integer := 0; v_needs_late boolean := false; v_needs_loc boolean := false;
  v_flags text[] := '{}'::text[]; v_return_valid boolean;
  v_needs_collection boolean := false; v_cstatus text; v_camount numeric; v_cnote text;
  v_reference text;
begin
  select * into v_booking from public.bookings where id=p_booking_id for update;
  if not found then raise exception 'VOYNU: booking not found'; end if;
  select * into v_driver from public.drivers d where d.id=v_booking.driver_id and d.active=true
    and (d.user_id=auth.uid() or (d.user_id is null and lower(d.email)=lower((select email from auth.users where id=auth.uid())))) for update;
  if not found then raise exception 'VOYNU: driver access denied'; end if;
  select * into v_set from public.driver_workflow_settings where id=true;
  if not found then raise exception 'VOYNU: driver workflow settings are missing'; end if;

  v_from := v_booking.booking_status;
  v_reference := 'VOY-' || upper(left(p_booking_id::text, 8));
  v_reason := nullif(btrim(coalesce(p_delay_reason, '')), '');
  if v_reason is not null and char_length(v_reason) < 4 then raise exception 'VOYNU: Please give a clearer reason'; end if;

  if not ((v_from='driver_assigned' and p_next_status='on_the_way')
       or (v_from='on_the_way' and p_next_status='arrived')
       or (v_from='arrived' and p_next_status='trip_started')
       or (v_from='trip_started' and p_next_status=case when v_booking.trip_type='roundtrip' then 'waiting_for_return' else 'trip_completed' end)
       or (v_from='waiting_for_return' and p_next_status='return_trip_started')
       or (v_from='return_trip_started' and p_next_status='trip_completed')) then
    raise exception 'VOYNU: invalid driver status transition from % to %', v_from, p_next_status;
  end if;

  v_dur := v_booking.expected_duration_seconds;
  v_tol := make_interval(mins => v_set.completion_tolerance_minutes);
  if v_dur is not null then
    v_tol := greatest(v_tol, make_interval(secs => (v_dur * v_set.completion_tolerance_percent / 100.0)::double precision));
  end if;

  -- Accept gate + earliest departure
  if p_next_status='on_the_way' then
    if not exists (select 1 from public.driver_assignments a where a.booking_id=p_booking_id and a.driver_id=v_driver.id and a.status='accepted') then
      raise exception 'VOYNU: Accept this trip before heading out for pickup';
    end if;
    if v_booking.scheduled_pickup_at is not null
       and v_now < v_booking.scheduled_pickup_at - make_interval(mins => v_set.early_departure_minutes) then
      raise exception 'VOYNU: Too early to head out. Pickup is at %; this step opens at %',
        to_char(v_booking.scheduled_pickup_at at time zone 'Asia/Kolkata', 'DD Mon, HH12:MI AM'),
        to_char((v_booking.scheduled_pickup_at - make_interval(mins => v_set.early_departure_minutes)) at time zone 'Asia/Kolkata', 'DD Mon, HH12:MI AM');
    end if;
  end if;

  -- Motion: where should the vehicle be for this step?
  v_target := case p_next_status
    when 'arrived' then 'pickup'
    when 'trip_started' then 'pickup'
    when 'waiting_for_return' then 'destination'
    when 'return_trip_started' then 'destination'
    when 'trip_completed' then case when v_from='return_trip_started' then 'pickup' else 'destination' end
    else null end;
  if v_target='pickup' then v_tlat := v_booking.pickup_lat; v_tlon := v_booking.pickup_lon;
  elsif v_target='destination' then v_tlat := v_booking.drop_lat; v_tlon := v_booking.drop_lon; end if;
  v_radius := case p_next_status when 'arrived' then v_set.pickup_radius_m when 'trip_started' then v_set.start_radius_m else v_set.destination_radius_m end;
  if v_target is not null and v_tlat is not null and v_tlon is not null then
    select * into v_loc from public.driver_current_location where driver_id=v_driver.id;
    if not found or v_loc.updated_at is null or v_now - v_loc.updated_at > make_interval(secs => v_set.max_location_age_seconds) then
      v_flags := array_append(v_flags, 'no_gps');   -- logged, never blocks the driver
    else
      v_loc_age := floor(extract(epoch from (v_now - v_loc.updated_at)))::int;
      v_dist := round(public.voynu_distance_m(v_loc.lat, v_loc.lon, v_tlat, v_tlon))::int;
      if v_dist > v_radius then v_flags := array_append(v_flags, 'off_location'); v_needs_loc := true; end if;
    end if;
  end if;

  -- Time: is this step late beyond the tolerance?
  if p_next_status='trip_started' then
    v_sched := v_booking.scheduled_pickup_at;
    if v_sched is not null then
      v_late_min := greatest(0, floor(extract(epoch from (v_now - v_sched)) / 60))::int;
      v_needs_late := v_now > v_sched + make_interval(mins => v_set.start_grace_minutes);
    end if;
  elsif p_next_status='return_trip_started' then
    v_sched := v_booking.scheduled_return_start_at;
    v_return_valid := v_sched is not null and v_booking.scheduled_pickup_at is not null
      and v_sched > v_booking.scheduled_pickup_at + make_interval(secs => coalesce(v_dur, 0));
    if v_return_valid then
      if v_now < v_sched - make_interval(mins => v_set.return_early_minutes) then
        raise exception 'VOYNU: The return journey opens at %', to_char((v_sched - make_interval(mins => v_set.return_early_minutes)) at time zone 'Asia/Kolkata', 'DD Mon, HH12:MI AM');
      end if;
      v_late_min := greatest(0, floor(extract(epoch from (v_now - v_sched)) / 60))::int;
      v_needs_late := v_now > v_sched + make_interval(mins => v_set.return_start_grace_minutes);
    else
      v_flags := array_append(v_flags, 'schedule_invalid');
      v_sched := null;
    end if;
  elsif p_next_status in ('waiting_for_return', 'trip_completed') then
    if v_from='return_trip_started' then
      v_leg_start := v_booking.return_trip_started_at;
      v_sched_arrival := v_booking.scheduled_completion_at;
    else
      v_leg_start := v_booking.trip_started_at;
      v_sched_arrival := case when v_booking.trip_type='roundtrip' and v_dur is not null and v_booking.scheduled_pickup_at is not null
        then v_booking.scheduled_pickup_at + make_interval(secs => v_dur) else v_booking.scheduled_completion_at end;
    end if;
    v_expected_at := v_sched_arrival;
    -- do not punish a late start twice: measure from the actual start when it was later than planned
    if v_dur is not null and v_leg_start is not null then
      v_expected_at := greatest(coalesce(v_sched_arrival, v_leg_start + make_interval(secs => v_dur)), v_leg_start + make_interval(secs => v_dur));
    end if;
    if v_expected_at is not null then
      v_sched := v_expected_at;
      v_late_min := greatest(0, floor(extract(epoch from (v_now - v_expected_at)) / 60))::int;
      v_needs_late := v_now > v_expected_at + v_tol;
    end if;
  end if;
  if v_needs_late then v_flags := array_append(v_flags, 'late'); end if;

  -- Cash collection (pay at the end of the journey)
  if p_next_status='trip_completed' and v_booking.payment_method='cash' and v_booking.payment_status='due_on_pickup' then
    v_needs_collection := true;
    v_cnote := nullif(btrim(coalesce(p_collection_note, '')), '');
    if p_collection_status is null then
      v_cstatus := 'unreported';
    elsif p_collection_status = 'collected' then
      v_cstatus := 'collected';
      v_camount := coalesce(p_collected_amount, v_booking.fare);
      if v_camount < coalesce(v_booking.fare, 0) then raise exception 'VOYNU: The amount is less than the fare. Choose "Part payment" instead'; end if;
    elsif p_collection_status = 'partial' then
      v_cstatus := 'partial';
      v_camount := p_collected_amount;
      if v_camount is null or v_camount <= 0 or v_camount >= coalesce(v_booking.fare, 0) then raise exception 'VOYNU: Enter the amount actually collected (more than 0 and less than the fare)'; end if;
      if v_cnote is null or char_length(v_cnote) < 4 then raise exception 'VOYNU: Please say why the full fare was not collected'; end if;
    elsif p_collection_status = 'not_collected' then
      v_cstatus := 'not_collected';
      v_camount := 0;
      if v_cnote is null or char_length(v_cnote) < 4 then raise exception 'VOYNU: Please say why the fare was not collected'; end if;
    else
      raise exception 'VOYNU: invalid collection status';
    end if;
    if v_cstatus in ('partial', 'not_collected', 'unreported') then v_flags := array_append(v_flags, 'cash_issue'); end if;
  end if;

  -- Ask for a reason only when something is genuinely out of line
  if (v_needs_late or v_needs_loc) and v_reason is null then
    raise exception 'VOYNU_NEEDS_REASON|%|%|%|%',
      concat_ws(',', case when v_needs_late then 'late' end, case when v_needs_loc then 'location' end),
      v_late_min, coalesce(v_dist, 0), coalesce(v_target, '');
  end if;

  if p_next_status='waiting_for_return' then
    update public.bookings set booking_status='waiting_for_return',
      outbound_arrived_at=coalesce(outbound_arrived_at, now()), return_wait_started_at=coalesce(return_wait_started_at, now()),
      outbound_arrival_delay_reason=case when v_needs_late then v_reason else outbound_arrival_delay_reason end
      where id=p_booking_id returning * into v_booking;
  elsif p_next_status='return_trip_started' then
    update public.bookings set booking_status='return_trip_started', return_trip_started_at=coalesce(return_trip_started_at, now()),
      return_trip_start_delay_reason=case when v_needs_late then v_reason else null end
      where id=p_booking_id returning * into v_booking;
  elsif p_next_status='trip_completed' then
    update public.bookings set booking_status='trip_completed', completed_at=coalesce(completed_at, now()),
      trip_completion_delay_reason=case when v_needs_late then v_reason else trip_completion_delay_reason end,
      cash_collection_status=case when v_needs_collection then v_cstatus else cash_collection_status end,
      cash_collected_amount=case when v_needs_collection then v_camount else cash_collected_amount end,
      cash_collection_note=case when v_needs_collection then v_cnote else cash_collection_note end,
      cash_collected_at=case when v_needs_collection and v_cstatus in ('collected', 'partial') then now() else cash_collected_at end
      where id=p_booking_id returning * into v_booking;
  elsif p_next_status='trip_started' then
    update public.bookings set booking_status='trip_started', trip_start_delay_reason=case when v_needs_late then v_reason else null end
      where id=p_booking_id returning * into v_booking;
  else
    update public.bookings set booking_status=p_next_status where id=p_booking_id returning * into v_booking;
  end if;

  insert into public.booking_status_events(booking_id, driver_id, from_status, to_status, target, distance_to_target_m, location_age_seconds,
    scheduled_at, delay_minutes, flags, reason, cash_status, cash_amount)
  values (p_booking_id, v_driver.id, v_from, p_next_status, v_target, v_dist, v_loc_age, v_sched, nullif(v_late_min, 0), v_flags, v_reason,
    case when v_needs_collection then v_cstatus end, case when v_needs_collection then v_camount end);

  if p_next_status='trip_completed' then
    update public.driver_assignments set status='completed' where booking_id=p_booking_id and driver_id=v_driver.id and status in ('assigned', 'accepted');
    update public.drivers set availability_status='available' where id=v_driver.id;
    if v_needs_collection and v_cstatus in ('partial', 'not_collected', 'unreported') then
      insert into public.notifications(user_id, booking_id, type, title, message, data)
      select p.id, p_booking_id, 'admin_cash_collection_issue', 'Cash collection issue',
        format('Booking %s finished with cash %s%s.', v_reference,
          case v_cstatus when 'partial' then 'only partly collected' when 'not_collected' then 'not collected' else 'collection not reported' end,
          case when v_cnote is not null then ': ' || v_cnote else '' end),
        jsonb_build_object('bookingId', p_booking_id, 'reference', v_reference, 'cashStatus', v_cstatus, 'collectedAmount', v_camount, 'fare', v_booking.fare)
      from public.profiles p where p.role='admin';
    end if;
    if v_needs_loc then
      insert into public.notifications(user_id, booking_id, type, title, message, data)
      select p.id, p_booking_id, 'admin_trip_ended_off_location', 'Trip ended away from the expected point',
        format('Booking %s was completed about %s m from the expected %s. Driver note: %s', v_reference, v_dist, v_target, coalesce(v_reason, '—')),
        jsonb_build_object('bookingId', p_booking_id, 'reference', v_reference, 'distanceMeters', v_dist, 'target', v_target)
      from public.profiles p where p.role='admin';
    end if;
  end if;
  return v_booking;
end;
$$;
revoke all on function public.advance_driver_booking_status(uuid, text, text, text, numeric, text) from public, anon;
grant execute on function public.advance_driver_booking_status(uuid, text, text, text, numeric, text) to authenticated;

-- ---------------------------------------------------------------------------------------------
-- Tell the passenger about the round-trip milestones
-- ---------------------------------------------------------------------------------------------
create or replace function public.notify_booking_status_changed() returns trigger language plpgsql security definer set search_path='public','pg_temp' as $$
declare
  v_reference text := 'VOY-' || upper(left(NEW.id::text, 8));
  v_type text; v_title text; v_message text;
begin
  if NEW.user_id is null then return NEW; end if;
  case NEW.booking_status
    when 'confirmed' then
      v_type := 'booking_confirmed'; v_title := 'Booking confirmed';
      v_message := format('Payment has been verified and booking %s is confirmed.', v_reference);
    when 'driver_assigned' then
      v_type := 'driver_assigned'; v_title := 'Driver assigned';
      v_message := format('A driver has been assigned to booking %s.', v_reference);
    when 'on_the_way' then
      v_type := 'driver_on_the_way'; v_title := 'Driver is on the way';
      v_message := format('Your driver is on the way for booking %s.', v_reference);
    when 'arrived' then
      v_type := 'driver_arrived'; v_title := 'Driver has arrived';
      v_message := format('Your driver has arrived for booking %s.', v_reference);
    when 'trip_started' then
      v_type := 'trip_started'; v_title := 'Trip started';
      v_message := format('Your journey for booking %s has started.', v_reference);
    when 'waiting_for_return' then
      v_type := 'trip_waiting_for_return'; v_title := 'Reached your destination';
      v_message := format('You have reached your destination for booking %s. Your driver will wait for the return journey.', v_reference);
    when 'return_trip_started' then
      v_type := 'return_trip_started'; v_title := 'Return journey started';
      v_message := format('Your return journey for booking %s has started.', v_reference);
    when 'trip_completed' then
      v_type := 'trip_completed'; v_title := 'Trip completed';
      v_message := format('Your journey for booking %s has been completed. Thank you for riding with VOYNU.', v_reference);
    when 'cancelled' then
      v_type := 'booking_cancelled'; v_title := 'Booking cancelled';
      v_message := format('Booking %s has been cancelled.', v_reference);
    else
      return NEW;
  end case;
  insert into public.notifications (user_id, booking_id, type, title, message, data)
  values (NEW.user_id, NEW.id, v_type, v_title, v_message,
    jsonb_build_object('bookingId', NEW.id, 'reference', v_reference, 'bookingStatus', NEW.booking_status, 'paymentStatus', NEW.payment_status));
  return NEW;
end;
$$;
