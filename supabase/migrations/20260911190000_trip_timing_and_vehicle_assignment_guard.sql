-- VOYNU trip timing, timeliness alerts, and mandatory driver-vehicle pairing.
-- Additive: existing booking statuses remain unchanged.

alter table public.bookings
  add column if not exists scheduled_pickup_at timestamptz,
  add column if not exists scheduled_completion_at timestamptz,
  add column if not exists expected_duration_seconds integer,
  add column if not exists trip_started_at timestamptz,
  add column if not exists trip_start_on_time boolean,
  add column if not exists trip_start_delay_minutes integer,
  add column if not exists trip_completion_on_time boolean,
  add column if not exists trip_completion_delay_minutes integer;

create table if not exists public.trip_timing_alerts (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings(id) on delete cascade,
  alert_type text not null check (alert_type in ('start_overdue','completion_overdue')),
  threshold_minutes integer not null check (threshold_minutes >= 0),
  created_at timestamptz not null default now(),
  acknowledged_at timestamptz,
  unique (booking_id, alert_type)
);

alter table public.trip_timing_alerts enable row level security;

drop policy if exists "Admins can read trip timing alerts" on public.trip_timing_alerts;
create policy "Admins can read trip timing alerts"
  on public.trip_timing_alerts for select to authenticated
  using (public.is_admin());

create index if not exists trip_timing_alerts_booking_id_idx on public.trip_timing_alerts(booking_id);
create index if not exists bookings_scheduled_pickup_idx on public.bookings(scheduled_pickup_at) where booking_status not in ('trip_completed','cancelled');
create index if not exists bookings_scheduled_completion_idx on public.bookings(scheduled_completion_at) where booking_status not in ('trip_completed','cancelled');

create or replace function public.set_booking_trip_schedule()
returns trigger
language plpgsql
security definer
set search_path='public','pg_temp'
as $$
declare
  v_duration integer;
begin
  if new.scheduled_pickup_at is null and new.travel_date is not null and new.pickup_time is not null then
    new.scheduled_pickup_at := (new.travel_date + new.pickup_time) at time zone 'Asia/Kolkata';
  end if;

  if new.expected_duration_seconds is null then
    v_duration := nullif((new.fare_breakdown->>'authoritativeDurationSeconds')::integer, 0);
    if v_duration is not null and v_duration >= 0 then
      new.expected_duration_seconds := v_duration;
    end if;
  end if;

  if new.scheduled_completion_at is null then
    if new.trip_type = 'roundtrip' and new.return_date is not null and new.return_time is not null then
      new.scheduled_completion_at := (new.return_date + new.return_time) at time zone 'Asia/Kolkata';
    elsif new.scheduled_pickup_at is not null and new.expected_duration_seconds is not null then
      new.scheduled_completion_at := new.scheduled_pickup_at + make_interval(secs => new.expected_duration_seconds);
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_set_booking_trip_schedule on public.bookings;
create trigger trg_set_booking_trip_schedule
before insert or update of travel_date,pickup_time,return_date,return_time,trip_type,fare_breakdown,scheduled_pickup_at,scheduled_completion_at,expected_duration_seconds
on public.bookings
for each row execute function public.set_booking_trip_schedule();

create or replace function public.record_booking_trip_timing()
returns trigger
language plpgsql
security definer
set search_path='public','pg_temp'
as $$
declare
  v_delay integer;
begin
  if old.booking_status is distinct from new.booking_status and new.booking_status = 'trip_started' then
    if new.trip_started_at is null then
      new.trip_started_at := now();
    end if;
    if new.scheduled_pickup_at is not null then
      v_delay := greatest(0, floor(extract(epoch from (new.trip_started_at - new.scheduled_pickup_at)) / 60)::integer);
      new.trip_start_delay_minutes := v_delay;
      new.trip_start_on_time := v_delay = 0;
    else
      new.trip_start_delay_minutes := null;
      new.trip_start_on_time := null;
    end if;
  end if;

  if old.booking_status is distinct from new.booking_status and new.booking_status = 'trip_completed' then
    if new.completed_at is null then
      new.completed_at := now();
    end if;
    if new.scheduled_completion_at is not null then
      v_delay := greatest(0, floor(extract(epoch from (new.completed_at - new.scheduled_completion_at)) / 60)::integer);
      new.trip_completion_delay_minutes := v_delay;
      new.trip_completion_on_time := v_delay = 0;
    else
      new.trip_completion_delay_minutes := null;
      new.trip_completion_on_time := null;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_record_booking_trip_timing on public.bookings;
create trigger trg_record_booking_trip_timing
before update of booking_status,trip_started_at,completed_at on public.bookings
for each row execute function public.record_booking_trip_timing();

-- Existing bookings get best-effort schedule snapshots from their stored route data.
update public.bookings
set scheduled_pickup_at = case when travel_date is not null and pickup_time is not null then (travel_date + pickup_time) at time zone 'Asia/Kolkata' end,
    expected_duration_seconds = coalesce(expected_duration_seconds, nullif((fare_breakdown->>'authoritativeDurationSeconds')::integer, 0)),
    scheduled_completion_at = case
      when trip_type = 'roundtrip' and return_date is not null and return_time is not null then (return_date + return_time) at time zone 'Asia/Kolkata'
      when travel_date is not null and pickup_time is not null and nullif((fare_breakdown->>'authoritativeDurationSeconds')::integer, 0) is not null then
        ((travel_date + pickup_time) at time zone 'Asia/Kolkata') + make_interval(secs => nullif((fare_breakdown->>'authoritativeDurationSeconds')::integer, 0))
      else scheduled_completion_at
    end
where scheduled_pickup_at is null or scheduled_completion_at is null or expected_duration_seconds is null;

create or replace function public.enforce_driver_vehicle_pair()
returns trigger
language plpgsql
security definer
set search_path='public','pg_temp'
as $$
declare
  v_driver_vehicle uuid;
  v_vehicle_active boolean;
  v_vehicle_status text;
begin
  if new.driver_id is null then
    if new.vehicle_id is not null then
      raise exception 'A vehicle cannot be assigned without a driver';
    end if;
    return new;
  end if;

  select d.vehicle_id into v_driver_vehicle
  from public.drivers d
  where d.id = new.driver_id and d.active = true;

  if v_driver_vehicle is null then
    raise exception 'Driver must have an assigned vehicle before taking a booking';
  end if;
  if new.vehicle_id is null then
    new.vehicle_id := v_driver_vehicle;
  elsif new.vehicle_id <> v_driver_vehicle then
    raise exception 'Selected vehicle does not belong to the assigned driver';
  end if;

  select v.active, v.status into v_vehicle_active, v_vehicle_status
  from public.vehicles v where v.id = new.vehicle_id;
  if coalesce(v_vehicle_active,false) = false or v_vehicle_status <> 'active' then
    raise exception 'Driver vehicle is not active and available for booking';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_enforce_driver_vehicle_pair on public.bookings;
create trigger trg_enforce_driver_vehicle_pair
before insert or update of driver_id,vehicle_id on public.bookings
for each row execute function public.enforce_driver_vehicle_pair();

create or replace function public.enforce_assignment_vehicle_pair()
returns trigger
language plpgsql
security definer
set search_path='public','pg_temp'
as $$
declare
  v_driver_vehicle uuid;
  v_active boolean;
  v_status text;
begin
  select d.vehicle_id into v_driver_vehicle from public.drivers d where d.id = new.driver_id and d.active = true;
  if v_driver_vehicle is null then raise exception 'Driver must have an assigned vehicle before taking a booking'; end if;
  if new.vehicle_id is null then new.vehicle_id := v_driver_vehicle; end if;
  if new.vehicle_id <> v_driver_vehicle then raise exception 'Assignment vehicle must match the driver assigned vehicle'; end if;
  select active,status into v_active,v_status from public.vehicles where id=new.vehicle_id;
  if coalesce(v_active,false)=false or v_status <> 'active' then raise exception 'Assigned vehicle is not active'; end if;
  return new;
end;
$$;

drop trigger if exists trg_enforce_assignment_vehicle_pair on public.driver_assignments;
create trigger trg_enforce_assignment_vehicle_pair
before insert or update of driver_id,vehicle_id on public.driver_assignments
for each row execute function public.enforce_assignment_vehicle_pair();

-- One-minute watchdog. It records each alert once and creates admin notifications;
-- the existing notification push trigger delivers the push notification.
create or replace function public.check_trip_timing_alerts()
returns integer
language plpgsql
security definer
set search_path='public','pg_temp'
as $$
declare
  r record;
  v_count integer := 0;
  v_minutes integer;
  v_reference text;
begin
  for r in
    select b.* from public.bookings b
    where b.booking_status not in ('trip_completed','cancelled')
      and b.scheduled_pickup_at is not null
      and b.scheduled_pickup_at < now() - interval '10 minutes'
      and b.trip_started_at is null
  loop
    insert into public.trip_timing_alerts(booking_id,alert_type,threshold_minutes)
    values(r.id,'start_overdue',10)
    on conflict (booking_id,alert_type) do nothing;
    if found then
      v_minutes := greatest(0,floor(extract(epoch from (now()-r.scheduled_pickup_at))/60)::integer);
      v_reference := 'VOY-'||upper(left(r.id::text,8));
      insert into public.notifications(user_id,booking_id,type,title,message,data)
      select p.id,r.id,'admin_trip_start_overdue','Trip start overdue',
             format('Booking %s was scheduled to start at %s and has not started (%s min overdue).',v_reference,to_char(r.scheduled_pickup_at at time zone 'Asia/Kolkata','DD Mon YYYY HH24:MI'),v_minutes),
             jsonb_build_object('bookingId',r.id,'reference',v_reference,'scheduledPickupAt',r.scheduled_pickup_at,'overdueMinutes',v_minutes)
      from public.profiles p where p.role='admin';
      v_count := v_count + 1;
    end if;
  end loop;

  for r in
    select b.* from public.bookings b
    where b.booking_status = 'trip_started'
      and b.scheduled_completion_at is not null
      and b.scheduled_completion_at < now() - interval '15 minutes'
  loop
    insert into public.trip_timing_alerts(booking_id,alert_type,threshold_minutes)
    values(r.id,'completion_overdue',15)
    on conflict (booking_id,alert_type) do nothing;
    if found then
      v_minutes := greatest(0,floor(extract(epoch from (now()-r.scheduled_completion_at))/60)::integer);
      v_reference := 'VOY-'||upper(left(r.id::text,8));
      insert into public.notifications(user_id,booking_id,type,title,message,data)
      select p.id,r.id,'admin_trip_completion_overdue','Trip completion overdue',
             format('Booking %s passed its expected completion time by %s min and is still in progress.',v_reference,v_minutes),
             jsonb_build_object('bookingId',r.id,'reference',v_reference,'scheduledCompletionAt',r.scheduled_completion_at,'overdueMinutes',v_minutes)
      from public.profiles p where p.role='admin';
      v_count := v_count + 1;
    end if;
  end loop;
  return v_count;
end;
$$;

revoke all on function public.check_trip_timing_alerts() from public,anon,authenticated;

-- Schedule the watchdog once per minute. Remove a prior copy if this migration is re-run.
do $$ begin
  perform cron.unschedule(jobid) from cron.job where jobname='voynu-trip-timing-watchdog';
exception when undefined_table then null;
end $$;
select cron.schedule('voynu-trip-timing-watchdog','* * * * *','select public.check_trip_timing_alerts();');

