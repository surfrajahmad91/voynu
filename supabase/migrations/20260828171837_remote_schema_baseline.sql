-- VOYNU production baseline
-- Reconstructed from the live production schema on 2026-09-03.
-- This is intentionally schema-only: user/driver/booking rows and push secrets are not committed.
-- The remaining migration files are historical placeholders so local and remote migration versions remain identical.

create extension if not exists pgcrypto with schema extensions;
create extension if not exists pg_net with schema public;

create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to authenticated;

create table public.profiles (
  id uuid primary key,
  full_name text,
  phone text,
  whatsapp text,
  role text not null default 'customer'::text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_role_check check (role = any (array['customer'::text,'driver'::text,'admin'::text])),
  constraint profiles_id_fkey foreign key (id) references auth.users(id) on delete cascade
);

create table public.vehicle_categories (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  name text not null,
  slug text not null unique,
  description text,
  passenger_capacity integer not null default 4,
  luggage_capacity integer not null default 0,
  active boolean not null default true,
  bookable boolean not null default true,
  sort_order integer not null default 0,
  image_url text,
  constraint vehicle_categories_passenger_capacity_check check (passenger_capacity > 0),
  constraint vehicle_categories_luggage_capacity_check check (luggage_capacity >= 0)
);

create table public.pricing_versions (
  id uuid primary key default gen_random_uuid(),
  version integer not null unique,
  name text not null default 'Pricing'::text,
  status text not null default 'draft'::text,
  effective_from timestamptz,
  created_at timestamptz not null default now(),
  created_by uuid,
  waiting_fee_per_interval numeric not null default 50,
  waiting_interval_minutes integer not null default 15,
  max_roundtrip_wait_minutes integer not null default 180,
  constraint pricing_versions_status_check check (status = any (array['draft'::text,'active'::text,'archived'::text])),
  constraint pricing_versions_waiting_fee_per_interval_check check (waiting_fee_per_interval >= 0),
  constraint pricing_versions_waiting_interval_minutes_check check (waiting_interval_minutes > 0 and waiting_interval_minutes <= 1440),
  constraint pricing_versions_max_roundtrip_wait_minutes_check check (max_roundtrip_wait_minutes >= 0 and max_roundtrip_wait_minutes <= 1440),
  constraint pricing_versions_created_by_fkey foreign key (created_by) references auth.users(id)
);

create table public.vehicles (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  registration_number text not null unique,
  make text,
  model text,
  category text not null,
  seating_capacity integer not null default 4,
  fuel_type text,
  active boolean not null default true,
  vehicle_category_id uuid not null,
  luggage_capacity integer,
  status text not null default 'active'::text,
  constraint vehicles_status_check check (status = any (array['active'::text,'inactive'::text,'maintenance'::text,'retired'::text])),
  constraint vehicles_luggage_capacity_check check (luggage_capacity is null or luggage_capacity >= 0),
  constraint vehicles_active_status_consistency_check check (status = 'active'::text or active = false),
  constraint vehicles_vehicle_category_id_fkey foreign key (vehicle_category_id) references public.vehicle_categories(id) on delete restrict
);

create table public.drivers (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  full_name text not null,
  phone text not null,
  user_id uuid,
  vehicle_id uuid,
  availability_status text not null default 'offline'::text,
  active boolean not null default true,
  email text,
  constraint drivers_user_id_fkey foreign key (user_id) references auth.users(id),
  constraint drivers_vehicle_id_fkey foreign key (vehicle_id) references public.vehicles(id)
);

create table public.bookings (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  user_id uuid,
  trip_type text not null,
  pickup_name text not null,
  pickup_lat double precision,
  pickup_lon double precision,
  drop_name text not null,
  drop_lat double precision,
  drop_lon double precision,
  one_way_distance_km numeric,
  total_distance_km numeric,
  travel_date date,
  pickup_time time,
  return_date date,
  return_time time,
  passenger_name text,
  phone text,
  whatsapp text,
  vehicle_type text,
  fare numeric,
  payment_method text,
  status text not null default 'pending'::text,
  confirmed_at timestamptz,
  payment_status text not null default 'pending'::text,
  booking_status text not null default 'pending'::text,
  driver_id uuid,
  vehicle_id uuid,
  updated_at timestamptz not null default now(),
  completed_at timestamptz,
  cancelled_at timestamptz,
  passenger_count integer,
  luggage_count integer,
  vehicle_category_id uuid,
  passenger_capacity_snapshot integer,
  luggage_capacity_snapshot integer,
  idempotency_key text,
  quoted_fare numeric,
  pricing_version_id uuid,
  fare_breakdown jsonb,
  constraint bookings_payment_status_check check (payment_status = any (array['due_on_pickup'::text,'pending'::text,'paid'::text])),
  constraint bookings_booking_status_check check (booking_status = any (array['pending_payment'::text,'confirmed'::text,'driver_assigned'::text,'on_the_way'::text,'arrived'::text,'trip_started'::text,'trip_completed'::text,'cancelled'::text])),
  constraint bookings_passenger_count_positive check (passenger_count is null or passenger_count >= 1),
  constraint bookings_luggage_count_nonnegative check (luggage_count is null or luggage_count >= 0),
  constraint bookings_passenger_priority_capacity_check check (passenger_count is null or luggage_count is null or passenger_capacity_snapshot is null or luggage_capacity_snapshot is null or (passenger_count >= 1 and luggage_count >= 0 and passenger_count <= passenger_capacity_snapshot and luggage_count <= passenger_count * 3 and passenger_count + luggage_count <= passenger_capacity_snapshot + luggage_capacity_snapshot)),
  constraint bookings_user_id_fkey foreign key (user_id) references auth.users(id),
  constraint bookings_vehicle_category_id_fkey foreign key (vehicle_category_id) references public.vehicle_categories(id)
);

create table public.driver_assignments (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  booking_id uuid not null,
  driver_id uuid not null,
  vehicle_id uuid,
  assigned_by uuid,
  status text not null default 'assigned'::text,
  constraint driver_assignments_booking_id_fkey foreign key (booking_id) references public.bookings(id),
  constraint driver_assignments_driver_id_fkey foreign key (driver_id) references public.drivers(id),
  constraint driver_assignments_vehicle_id_fkey foreign key (vehicle_id) references public.vehicles(id),
  constraint driver_assignments_assigned_by_fkey foreign key (assigned_by) references auth.users(id)
);

create table public.driver_current_location (
  driver_id uuid primary key,
  lat double precision not null,
  lon double precision not null,
  updated_at timestamptz not null default now(),
  constraint driver_current_location_driver_id_fkey foreign key (driver_id) references public.drivers(id)
);

create table public.driver_location_history (
  id uuid primary key default gen_random_uuid(),
  driver_id uuid not null,
  booking_id uuid,
  lat double precision not null,
  lon double precision not null,
  recorded_at timestamptz not null default now(),
  constraint driver_location_history_booking_id_fkey foreign key (booking_id) references public.bookings(id),
  constraint driver_location_history_driver_id_fkey foreign key (driver_id) references public.drivers(id)
);

create table public.fare_pricing_configs (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  vehicle_category_id uuid not null,
  trip_type text not null default 'oneway'::text,
  base_fare numeric(12,2) not null default 0,
  per_km_rate numeric(12,2) not null default 0,
  per_minute_rate numeric(12,2) not null default 0,
  minimum_fare numeric(12,2) not null default 0,
  driver_allowance_per_day numeric(12,2) not null default 0,
  waiting_charge_per_minute numeric(12,2) not null default 0,
  night_surcharge numeric(12,2) not null default 0,
  extra_stop_charge numeric(12,2) not null default 0,
  active boolean not null default true,
  valid_from timestamptz not null default now(),
  valid_until timestamptz,
  version integer not null default 1,
  constraint fare_pricing_configs_trip_type_check check (trip_type = any (array['oneway'::text,'roundtrip'::text])),
  constraint fare_pricing_configs_base_fare_check check (base_fare >= 0),
  constraint fare_pricing_configs_per_km_rate_check check (per_km_rate >= 0),
  constraint fare_pricing_configs_per_minute_rate_check check (per_minute_rate >= 0),
  constraint fare_pricing_configs_minimum_fare_check check (minimum_fare >= 0),
  constraint fare_pricing_configs_driver_allowance_per_day_check check (driver_allowance_per_day >= 0),
  constraint fare_pricing_configs_waiting_charge_per_minute_check check (waiting_charge_per_minute >= 0),
  constraint fare_pricing_configs_night_surcharge_check check (night_surcharge >= 0),
  constraint fare_pricing_configs_extra_stop_charge_check check (extra_stop_charge >= 0),
  constraint fare_pricing_configs_check check (valid_until is null or valid_until > valid_from),
  constraint fare_pricing_configs_vehicle_category_id_trip_type_version_key unique (vehicle_category_id,trip_type,version),
  constraint fare_pricing_configs_vehicle_category_id_fkey foreign key (vehicle_category_id) references public.vehicle_categories(id) on delete restrict
);

create table public.pricing_rules (
  id uuid primary key default gen_random_uuid(),
  pricing_version_id uuid not null,
  vehicle_category_id uuid not null,
  trip_type text not null,
  base_fare numeric(12,2) not null default 0,
  per_km_rate numeric(12,2) not null default 0,
  driver_allowance_per_day numeric(12,2) not null default 0,
  minimum_fare numeric(12,2) not null default 0,
  rounding_unit numeric(12,2) not null default 10,
  created_at timestamptz not null default now(),
  constraint pricing_rules_trip_type_check check (trip_type = any (array['oneway'::text,'roundtrip'::text])),
  constraint pricing_rules_base_fare_check check (base_fare >= 0),
  constraint pricing_rules_per_km_rate_check check (per_km_rate >= 0),
  constraint pricing_rules_driver_allowance_per_day_check check (driver_allowance_per_day >= 0),
  constraint pricing_rules_minimum_fare_check check (minimum_fare >= 0),
  constraint pricing_rules_rounding_unit_check check (rounding_unit > 0),
  constraint pricing_rules_pricing_version_id_vehicle_category_id_trip_t_key unique (pricing_version_id,vehicle_category_id,trip_type),
  constraint pricing_rules_pricing_version_id_fkey foreign key (pricing_version_id) references public.pricing_versions(id) on delete cascade,
  constraint pricing_rules_vehicle_category_id_fkey foreign key (vehicle_category_id) references public.vehicle_categories(id)
);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  booking_id uuid,
  type text not null,
  title text not null,
  message text not null,
  data jsonb not null default '{}'::jsonb,
  read_at timestamptz,
  created_at timestamptz not null default now(),
  constraint notifications_user_id_fkey foreign key (user_id) references public.profiles(id) on delete cascade,
  constraint notifications_booking_id_fkey foreign key (booking_id) references public.bookings(id) on delete cascade
);

create table public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  expiration_time bigint,
  user_agent text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  audience text,
  constraint push_subscriptions_audience_check check (audience = any (array['customer'::text,'driver'::text,'admin'::text]) or audience is null),
  constraint push_subscriptions_user_id_fkey foreign key (user_id) references public.profiles(id) on delete cascade
);

create table public.push_config (
  id text primary key,
  public_key text not null,
  private_key text not null,
  subject text not null,
  webhook_secret text not null,
  updated_at timestamptz not null default now()
);

create table public.service_areas (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  name text not null,
  active boolean not null default true,
  pickup_allowed boolean not null default true,
  center_lat double precision not null,
  center_lon double precision not null,
  radius_km double precision not null,
  polygon jsonb,
  max_drop_distance_km numeric not null default 200
);

create table public.dispatch_settings (
  id boolean primary key default true,
  mode text not null default 'manual'::text,
  updated_at timestamptz not null default now(),
  constraint dispatch_settings_id_check check (id = true),
  constraint dispatch_settings_mode_check check (mode = any (array['manual'::text,'automatic'::text]))
);

create index bookings_pricing_version_id_idx on public.bookings(pricing_version_id);
create index bookings_vehicle_category_id_idx on public.bookings(vehicle_category_id);
create index idx_bookings_booking_status on public.bookings(booking_status);
create index idx_bookings_driver_id on public.bookings(driver_id);
create index idx_bookings_user_id on public.bookings(user_id);
create unique index bookings_idempotency_key_uidx on public.bookings(idempotency_key) where idempotency_key is not null;
create index driver_assignments_assigned_by_idx on public.driver_assignments(assigned_by);
create index driver_assignments_booking_id_idx on public.driver_assignments(booking_id);
create index driver_assignments_driver_id_idx on public.driver_assignments(driver_id);
create index driver_assignments_vehicle_id_idx on public.driver_assignments(vehicle_id);
create index driver_location_history_booking_id_idx on public.driver_location_history(booking_id);
create index driver_location_history_driver_id_idx on public.driver_location_history(driver_id);
create index drivers_user_id_idx on public.drivers(user_id);
create index drivers_vehicle_id_idx on public.drivers(vehicle_id);
create index idx_fare_pricing_active_lookup on public.fare_pricing_configs(vehicle_category_id,trip_type,active,valid_from desc);
create index notifications_booking_idx on public.notifications(booking_id,created_at desc);
create index notifications_user_created_idx on public.notifications(user_id,created_at desc);
create index notifications_user_unread_idx on public.notifications(user_id,created_at desc) where read_at is null;
create index pricing_rules_category_idx on public.pricing_rules(vehicle_category_id);
create index pricing_rules_version_idx on public.pricing_rules(pricing_version_id);
create index pricing_versions_created_by_idx on public.pricing_versions(created_by);
create index push_subscriptions_user_idx on public.push_subscriptions(user_id);
create index push_subscriptions_user_audience_idx on public.push_subscriptions(user_id,audience);
create index idx_vehicle_categories_active_sort on public.vehicle_categories(active,bookable,sort_order);
create index idx_vehicles_category_active on public.vehicles(vehicle_category_id,active,status);

create or replace function public.is_admin() returns boolean language sql stable security definer set search_path='public','pg_temp' set row_security=off as $$ select exists(select 1 from public.profiles where id=auth.uid() and role='admin'); $$;
create or replace function public.is_current_driver(p_driver_id uuid) returns boolean language sql stable security definer set search_path='public','pg_temp' set row_security=off as $$ select exists(select 1 from public.drivers d where d.id=p_driver_id and d.active=true and (d.user_id=auth.uid() or (d.user_id is null and lower(d.email)=lower(coalesce(auth.jwt()->>'email',''))))); $$;
create or replace function public.customer_has_assigned_driver(p_driver_id uuid) returns boolean language sql stable security definer set search_path='public','pg_temp' set row_security=off as $$ select exists(select 1 from public.bookings b where b.driver_id=p_driver_id and b.user_id=auth.uid() and b.booking_status in ('driver_assigned','on_the_way','arrived','trip_started')); $$;
create or replace function private.is_current_driver(p_driver_id uuid) returns boolean language sql stable security definer set search_path='public','pg_temp' set row_security=off as $$ select public.is_current_driver(p_driver_id); $$;
create or replace function private.customer_has_assigned_driver(p_driver_id uuid) returns boolean language sql stable security definer set search_path='public','pg_temp' set row_security=off as $$ select public.customer_has_assigned_driver(p_driver_id); $$;

create or replace function public.set_updated_at() returns trigger language plpgsql set search_path='public' as $$ begin new.updated_at=now(); return new; end; $$;
create or replace function public.touch_push_subscription_updated_at() returns trigger language plpgsql set search_path='public' as $$ begin new.updated_at=now(); return new; end; $$;
create or replace function public.handle_new_user() returns trigger language plpgsql security definer set search_path='public' as $$ begin insert into public.profiles(id,full_name,role) values(new.id,new.raw_user_meta_data->>'full_name','customer') on conflict(id) do nothing; return new; end; $$;
create or replace function public.validate_booking_capacity() returns trigger language plpgsql security definer set search_path='public' as $$ declare category record; max_luggage integer; begin if new.vehicle_category_id is null and new.vehicle_type is not null then select id into new.vehicle_category_id from public.vehicle_categories where slug=lower(new.vehicle_type) limit 1; end if; if new.vehicle_category_id is not null then select passenger_capacity,luggage_capacity into category from public.vehicle_categories where id=new.vehicle_category_id and active=true and bookable=true; if not found then raise exception 'Selected vehicle category is unavailable'; end if; if new.passenger_count is not null and new.passenger_count<1 then raise exception 'Passenger count must be at least 1'; end if; if new.passenger_count is not null and new.passenger_count>category.passenger_capacity then raise exception 'Passenger count exceeds vehicle category capacity'; end if; if new.luggage_count is not null and new.luggage_count<0 then raise exception 'Luggage count cannot be negative'; end if; max_luggage:=least(greatest(0,category.passenger_capacity+category.luggage_capacity-coalesce(new.passenger_count,0)),coalesce(new.passenger_count,0)*3); if new.luggage_count is not null and new.luggage_count>max_luggage then raise exception 'Luggage count exceeds the remaining total vehicle capacity'; end if; new.passenger_capacity_snapshot=category.passenger_capacity; new.luggage_capacity_snapshot=category.luggage_capacity; end if; return new; end; $$;
create or replace function public.sync_vehicle_category_reference() returns trigger language plpgsql security definer set search_path='' as $$ begin if new.vehicle_category_id is null and new.category is not null then select vc.id into new.vehicle_category_id from public.vehicle_categories vc where vc.slug=lower(trim(new.category)) limit 1; end if; if new.vehicle_category_id is not null then select vc.slug into new.category from public.vehicle_categories vc where vc.id=new.vehicle_category_id limit 1; end if; if new.vehicle_category_id is null then raise exception 'A valid vehicle category is required'; end if; return new; end; $$;
create or replace function public.sync_booking_state() returns trigger language plpgsql set search_path='public' as $$ declare allowed text[]; v_driver uuid; begin if tg_op='UPDATE' and new.booking_status is distinct from old.booking_status then allowed:=case old.booking_status when 'pending_payment' then array['confirmed','cancelled'] when 'confirmed' then array['driver_assigned','cancelled'] when 'driver_assigned' then array['on_the_way','cancelled'] when 'on_the_way' then array['arrived','cancelled'] when 'arrived' then array['trip_started','cancelled'] when 'trip_started' then array['trip_completed','cancelled'] else array[]::text[] end; if not(new.booking_status=any(allowed)) then raise exception 'VOYNU: invalid booking_status transition % -> %',old.booking_status,new.booking_status; end if; end if; new.status:=case new.booking_status when 'pending_payment' then 'pending' when 'confirmed' then 'confirmed' when 'driver_assigned' then 'confirmed' when 'on_the_way' then 'confirmed' when 'arrived' then 'confirmed' when 'trip_started' then 'confirmed' when 'trip_completed' then 'completed' when 'cancelled' then 'cancelled' else new.status end; new.updated_at:=now(); if new.booking_status='confirmed' and new.confirmed_at is null then new.confirmed_at:=now(); end if; if new.booking_status='trip_completed' and (tg_op='INSERT' or old.booking_status is distinct from 'trip_completed') then new.completed_at:=now(); end if; if new.booking_status='cancelled' and (tg_op='INSERT' or old.booking_status is distinct from 'cancelled') then new.cancelled_at:=now(); if tg_op='UPDATE' then v_driver:=old.driver_id; if v_driver is not null then update public.drivers set availability_status='available' where id=v_driver; update public.driver_assignments set status='cancelled' where booking_id=new.id and status='assigned'; end if; end if; end if; return new; end; $$;
create or replace function public.guard_booking_insert() returns trigger language plpgsql security definer set search_path='public' as $$ declare v_is_service_role boolean:=(auth.role()='service_role'); begin if v_is_service_role or public.is_admin() then return new; end if; if auth.uid() is not null then new.user_id:=auth.uid(); else new.user_id:=null; end if; new.driver_id:=null; new.vehicle_id:=null; new.booking_status:=case when new.payment_method='upi' then 'pending_payment' else 'confirmed' end; new.payment_status:=case when new.payment_method='upi' then 'pending' else 'due_on_pickup' end; new.confirmed_at:=case when new.payment_method='upi' then null else coalesce(new.confirmed_at,now()) end; return new; end; $$;
create or replace function public.guard_driver_booking_update() returns trigger language plpgsql security definer set search_path='public' as $$ begin if current_setting('voynu.auto_dispatch_token',true)='voynu-internal-dispatch-v1-7f4b9d2a' then return new; end if; if public.is_admin() then return new; end if; if old.driver_id is null or not exists(select 1 from public.drivers d where d.id=old.driver_id and d.active=true and (d.user_id=auth.uid() or (d.user_id is null and lower(d.email)=lower((select email from auth.users where id=auth.uid()))))) then raise exception 'VOYNU: driver access denied'; end if; if new.id is distinct from old.id or new.user_id is distinct from old.user_id or new.driver_id is distinct from old.driver_id or new.vehicle_id is distinct from old.vehicle_id or new.passenger_name is distinct from old.passenger_name or new.phone is distinct from old.phone or new.whatsapp is distinct from old.whatsapp or new.pickup_name is distinct from old.pickup_name or new.drop_name is distinct from old.drop_name or new.pickup_lat is distinct from old.pickup_lat or new.pickup_lon is distinct from old.pickup_lon or new.drop_lat is distinct from old.drop_lat or new.drop_lon is distinct from old.drop_lon or new.travel_date is distinct from old.travel_date or new.pickup_time is distinct from old.pickup_time or new.trip_type is distinct from old.trip_type or new.vehicle_type is distinct from old.vehicle_type or new.fare is distinct from old.fare or new.payment_method is distinct from old.payment_method or new.payment_status is distinct from old.payment_status or new.created_at is distinct from old.created_at then raise exception 'VOYNU: drivers may update booking status only'; end if; if not((old.booking_status='driver_assigned' and new.booking_status='on_the_way') or (old.booking_status='on_the_way' and new.booking_status='arrived') or (old.booking_status='arrived' and new.booking_status='trip_started') or (old.booking_status='trip_started' and new.booking_status='trip_completed') or (new.booking_status is not distinct from old.booking_status)) then raise exception 'VOYNU: invalid driver booking status transition'; end if; return new; end; $$;
create or replace function public.assign_booking_driver(p_booking_id uuid,p_driver_id uuid,p_vehicle_id uuid,p_assigned_by uuid default auth.uid()) returns public.bookings language plpgsql security definer set search_path='public' as $$ declare v_booking public.bookings; v_driver public.drivers; v_old_driver uuid; v_actor uuid:=auth.uid(); begin if v_actor is null or not public.is_admin() then raise exception 'VOYNU: admin access required'; end if; select * into v_booking from public.bookings where id=p_booking_id for update; if not found then raise exception 'VOYNU: booking not found'; end if; select * into v_driver from public.drivers where id=p_driver_id and active=true for update; if not found then raise exception 'VOYNU: active driver not found'; end if; if v_driver.vehicle_id is distinct from p_vehicle_id then raise exception 'VOYNU: driver vehicle mismatch'; end if; if v_booking.booking_status not in ('confirmed','driver_assigned') then raise exception 'VOYNU: booking cannot be assigned from status %',v_booking.booking_status; end if; if v_driver.availability_status is distinct from 'available' and v_booking.driver_id is distinct from p_driver_id then raise exception 'VOYNU: driver is not available'; end if; v_old_driver:=v_booking.driver_id; update public.driver_assignments set status='cancelled' where booking_id=p_booking_id and status='assigned'; if v_old_driver is not null and v_old_driver is distinct from p_driver_id then update public.drivers set availability_status='available' where id=v_old_driver; end if; insert into public.driver_assignments(booking_id,driver_id,vehicle_id,assigned_by,status) values(p_booking_id,p_driver_id,p_vehicle_id,v_actor,'assigned'); update public.bookings set driver_id=p_driver_id,vehicle_id=p_vehicle_id,booking_status='driver_assigned' where id=p_booking_id returning * into v_booking; update public.drivers set availability_status='busy' where id=p_driver_id; return v_booking; end; $$;
create or replace function public.advance_driver_booking_status(p_booking_id uuid,p_next_status text) returns public.bookings language plpgsql security definer set search_path='public' as $$ declare v_booking public.bookings; v_driver public.drivers; begin select * into v_booking from public.bookings where id=p_booking_id for update; if not found then raise exception 'VOYNU: booking not found'; end if; select * into v_driver from public.drivers d where d.id=v_booking.driver_id and d.active=true and (d.user_id=auth.uid() or (d.user_id is null and lower(d.email)=lower((select email from auth.users where id=auth.uid())))) for update; if not found then raise exception 'VOYNU: driver access denied'; end if; if not((v_booking.booking_status='driver_assigned' and p_next_status='on_the_way') or (v_booking.booking_status='on_the_way' and p_next_status='arrived') or (v_booking.booking_status='arrived' and p_next_status='trip_started') or (v_booking.booking_status='trip_started' and p_next_status='trip_completed')) then raise exception 'VOYNU: invalid driver status transition from % to %',v_booking.booking_status,p_next_status; end if; update public.bookings set booking_status=p_next_status,completed_at=case when p_next_status='trip_completed' then coalesce(completed_at,now()) else completed_at end where id=p_booking_id returning * into v_booking; if p_next_status='trip_completed' then update public.driver_assignments set status='completed' where booking_id=p_booking_id and driver_id=v_driver.id and status='assigned'; update public.drivers set availability_status='available' where id=v_driver.id; end if; return v_booking; end; $$;
create or replace function public.update_driver_location(p_booking_id uuid,p_lat double precision,p_lon double precision) returns public.driver_current_location language plpgsql security definer set search_path='' as $$ declare v_driver public.drivers; v_booking public.bookings; v_location public.driver_current_location; begin if auth.uid() is null then raise exception 'VOYNU: authentication required'; end if; if p_lat is null or p_lon is null or p_lat<-90 or p_lat>90 or p_lon<-180 or p_lon>180 then raise exception 'VOYNU: invalid driver coordinates'; end if; select d.* into v_driver from public.drivers d where d.active=true and (d.user_id=auth.uid() or (d.user_id is null and lower(d.email)=lower((select u.email from auth.users u where u.id=auth.uid())))) limit 1; if not found then raise exception 'VOYNU: active driver profile not found'; end if; select b.* into v_booking from public.bookings b where b.id=p_booking_id and b.driver_id=v_driver.id and b.booking_status in ('on_the_way','arrived','trip_started') for update; if not found then raise exception 'VOYNU: booking is not an active journey'; end if; insert into public.driver_current_location(driver_id,lat,lon,updated_at) values(v_driver.id,p_lat,p_lon,now()) on conflict(driver_id) do update set lat=excluded.lat,lon=excluded.lon,updated_at=excluded.updated_at returning * into v_location; insert into public.driver_location_history(driver_id,booking_id,lat,lon,recorded_at) values(v_driver.id,v_booking.id,p_lat,p_lon,now()); return v_location; end; $$;
create or replace function public.get_driver_navigation_target(p_booking_id uuid) returns jsonb language plpgsql security definer set search_path='' as $$ declare v_booking public.bookings; v_driver public.drivers; begin select d.* into v_driver from public.drivers d where d.active=true and (d.user_id=(select auth.uid()) or (d.user_id is null and lower(d.email)=lower((select u.email from auth.users u where u.id=(select auth.uid()))))) limit 1; if not found then raise exception 'VOYNU: active driver profile not found'; end if; select b.* into v_booking from public.bookings b where b.id=p_booking_id and b.driver_id=v_driver.id limit 1; if not found then raise exception 'VOYNU: booking is not assigned to this driver'; end if; if v_booking.booking_status in ('on_the_way','arrived') then return jsonb_build_object('bookingId',v_booking.id,'targetType','pickup','lat',v_booking.pickup_lat,'lon',v_booking.pickup_lon,'label',v_booking.pickup_name,'status',v_booking.booking_status); elsif v_booking.booking_status='trip_started' then return jsonb_build_object('bookingId',v_booking.id,'targetType','destination','lat',v_booking.drop_lat,'lon',v_booking.drop_lon,'label',v_booking.drop_name,'status',v_booking.booking_status); end if; return jsonb_build_object('bookingId',v_booking.id,'targetType',null,'lat',null,'lon',null,'label',null,'status',v_booking.booking_status); end; $$;
create or replace function public.get_my_booking_driver(p_booking_id uuid) returns jsonb language sql set search_path='' as $$ select jsonb_build_object('driverId',d.id,'driverName',d.full_name,'driverPhone',d.phone,'vehicleId',v.id,'registrationNumber',v.registration_number,'make',v.make,'model',v.model,'category',v.category,'location',case when l.driver_id is null then null else jsonb_build_object('lat',l.lat,'lon',l.lon,'updatedAt',l.updated_at) end) from public.bookings b join public.drivers d on d.id=b.driver_id and d.active=true left join public.vehicles v on v.id=b.vehicle_id left join public.driver_current_location l on l.driver_id=d.id where b.id=p_booking_id and b.user_id=(select auth.uid()) and b.booking_status in ('driver_assigned','on_the_way','arrived','trip_started'); $$;
create or replace function public.calculate_booking_fare(p_vehicle_category_id uuid,p_trip_type text,p_total_distance_km numeric,p_return_days integer default 0) returns table(fare numeric,pricing_version_id uuid,pricing_version integer,base_fare numeric,distance_fare numeric,driver_allowance numeric,minimum_fare numeric,rounding_unit numeric) language plpgsql security definer set search_path='public' as $$ declare v_version public.pricing_versions%rowtype; v_rule public.pricing_rules%rowtype; v_raw numeric; v_days integer:=greatest(coalesce(p_return_days,0),0); begin if p_vehicle_category_id is null or p_trip_type not in ('oneway','roundtrip') or coalesce(p_total_distance_km,0)<0 then raise exception 'Invalid fare calculation request'; end if; select pv.* into v_version from public.pricing_versions pv where pv.status='active' and pv.effective_from<=now() order by pv.effective_from desc,pv.version desc limit 1; if not found then raise exception 'No active pricing version'; end if; select pr.* into v_rule from public.pricing_rules pr where pr.pricing_version_id=v_version.id and pr.vehicle_category_id=p_vehicle_category_id and pr.trip_type=p_trip_type limit 1; if not found then raise exception 'No pricing rule for selected vehicle category'; end if; v_raw:=coalesce(v_rule.base_fare,0)+coalesce(p_total_distance_km,0)*coalesce(v_rule.per_km_rate,0)+case when p_trip_type='roundtrip' then coalesce(v_rule.driver_allowance_per_day,0)*greatest(v_days,1) else 0 end; v_raw:=greatest(v_raw,coalesce(v_rule.minimum_fare,0)); return query select case when coalesce(v_rule.rounding_unit,0)>0 then round(v_raw/v_rule.rounding_unit)*v_rule.rounding_unit else v_raw end,v_version.id,v_version.version,coalesce(v_rule.base_fare,0),coalesce(p_total_distance_km,0)*coalesce(v_rule.per_km_rate,0),case when p_trip_type='roundtrip' then coalesce(v_rule.driver_allowance_per_day,0)*greatest(v_days,1) else 0 end,coalesce(v_rule.minimum_fare,0),coalesce(v_rule.rounding_unit,0); end; $$;
create or replace function public.publish_fare_pricing_version(p_vehicle_category_id uuid,p_trip_type text,p_base_fare numeric,p_per_km_rate numeric,p_per_minute_rate numeric default 0,p_minimum_fare numeric default 0,p_driver_allowance_per_day numeric default 0,p_waiting_charge_per_minute numeric default 0,p_night_surcharge numeric default 0,p_extra_stop_charge numeric default 0) returns public.fare_pricing_configs language plpgsql set search_path='public' as $$ declare v_version integer; v_row public.fare_pricing_configs; begin if not public.is_admin() then raise exception 'admin access required'; end if; if p_trip_type not in ('oneway','roundtrip') then raise exception 'invalid trip type'; end if; if p_base_fare<0 or p_per_km_rate<0 or p_per_minute_rate<0 or p_minimum_fare<0 or p_driver_allowance_per_day<0 or p_waiting_charge_per_minute<0 or p_night_surcharge<0 or p_extra_stop_charge<0 then raise exception 'pricing values cannot be negative'; end if; if not exists(select 1 from public.vehicle_categories where id=p_vehicle_category_id and active=true) then raise exception 'vehicle category is not active'; end if; select coalesce(max(version),0)+1 into v_version from public.fare_pricing_configs where vehicle_category_id=p_vehicle_category_id and trip_type=p_trip_type; update public.fare_pricing_configs set active=false,valid_until=now() where vehicle_category_id=p_vehicle_category_id and trip_type=p_trip_type and active=true; insert into public.fare_pricing_configs(vehicle_category_id,trip_type,base_fare,per_km_rate,per_minute_rate,minimum_fare,driver_allowance_per_day,waiting_charge_per_minute,night_surcharge,extra_stop_charge,active,valid_from,version) values(p_vehicle_category_id,p_trip_type,p_base_fare,p_per_km_rate,p_per_minute_rate,p_minimum_fare,p_driver_allowance_per_day,p_waiting_charge_per_minute,p_night_surcharge,p_extra_stop_charge,true,now(),v_version) returning * into v_row; return v_row; end; $$;
create or replace function public.confirm_booking_payment(p_booking_id uuid) returns public.bookings language plpgsql security definer set search_path='public' as $$ declare v_booking public.bookings; begin if not public.is_admin() then raise exception 'VOYNU: admin access required'; end if; select * into v_booking from public.bookings where id=p_booking_id for update; if not found then raise exception 'VOYNU: booking not found'; end if; if v_booking.payment_status='paid' then return v_booking; end if; if v_booking.payment_status is distinct from 'pending' then raise exception 'VOYNU: payment is not pending'; end if; if v_booking.booking_status is distinct from 'pending_payment' then raise exception 'VOYNU: booking is not awaiting payment'; end if; update public.bookings set payment_status='paid',booking_status='confirmed' where id=p_booking_id returning * into v_booking; return v_booking; end; $$;
create or replace function public.admin_confirm_payment_and_dispatch(p_booking_id uuid) returns public.bookings language plpgsql security definer set search_path='public','pg_temp' as $$ declare v_actor uuid:=auth.uid(); v_booking public.bookings; begin if v_actor is null or not public.is_admin() then raise exception 'VOYNU: admin access required'; end if; update public.bookings set payment_status='paid',booking_status='confirmed' where id=p_booking_id and booking_status not in ('cancelled','trip_completed') returning * into v_booking; if not found then raise exception 'VOYNU: booking cannot be confirmed'; end if; if exists(select 1 from public.dispatch_settings where id=true and mode='automatic') then select * into v_booking from public.auto_assign_booking_driver_internal(p_booking_id); end if; return v_booking; end; $$;
create or replace function public.auto_assign_booking_driver_internal(p_booking_id uuid) returns public.bookings language plpgsql security definer set search_path='public','pg_temp' as $$ declare v_booking public.bookings; v_driver public.drivers; v_pickup_ts timestamptz; v_end_ts timestamptz; begin select * into v_booking from public.bookings where id=p_booking_id for update; if not found then return null; end if; if v_booking.booking_status<>'confirmed' or v_booking.driver_id is not null then return v_booking; end if; if not((v_booking.payment_method='cash' and v_booking.payment_status='due_on_pickup') or v_booking.payment_status='paid') then return v_booking; end if; if v_booking.travel_date is null or v_booking.pickup_time is null then return v_booking; end if; v_pickup_ts:=(v_booking.travel_date+v_booking.pickup_time) at time zone 'Asia/Kolkata'; v_end_ts:=coalesce(((v_booking.return_date+v_booking.return_time) at time zone 'Asia/Kolkata'),v_pickup_ts+interval '4 hours'); if v_end_ts<=v_pickup_ts then v_end_ts:=v_pickup_ts+interval '4 hours'; end if; select d.* into v_driver from public.drivers d join public.vehicles v on v.id=d.vehicle_id where d.active=true and d.availability_status='available' and v.active=true and coalesce(v.status,'active') not in ('maintenance','inactive','unavailable') and (v_booking.vehicle_category_id is null or v.vehicle_category_id=v_booking.vehicle_category_id) and coalesce(v.seating_capacity,0)>=coalesce(v_booking.passenger_count,0) and coalesce(v.luggage_capacity,0)>=coalesce(v_booking.luggage_count,0) and not exists(select 1 from public.bookings b where b.driver_id=d.id and b.id<>v_booking.id and b.booking_status not in ('cancelled','trip_completed') and (b.travel_date+b.pickup_time) at time zone 'Asia/Kolkata'<v_end_ts and coalesce(((b.return_date+b.return_time) at time zone 'Asia/Kolkata'),((b.travel_date+b.pickup_time) at time zone 'Asia/Kolkata')+interval '4 hours')>v_pickup_ts) order by d.created_at asc limit 1 for update; if not found then return v_booking; end if; perform set_config('voynu.auto_dispatch_token','voynu-internal-dispatch-v1-7f4b9d2a',true); update public.driver_assignments set status='cancelled' where booking_id=v_booking.id and status='assigned'; insert into public.driver_assignments(booking_id,driver_id,vehicle_id,assigned_by,status) values(v_booking.id,v_driver.id,v_driver.vehicle_id,null,'assigned'); update public.bookings set driver_id=v_driver.id,vehicle_id=v_driver.vehicle_id,booking_status='driver_assigned' where id=v_booking.id returning * into v_booking; update public.drivers set availability_status='busy' where id=v_driver.id; return v_booking; end; $$;
create or replace function public.auto_assign_booking_driver(p_booking_id uuid) returns public.bookings language plpgsql security definer set search_path='public','pg_temp' as $$ begin if auth.uid() is null or not public.is_admin() then raise exception 'VOYNU: admin access required'; end if; if not exists(select 1 from public.dispatch_settings where id=true and mode='automatic') then raise exception 'VOYNU: automatic dispatch is disabled'; end if; return public.auto_assign_booking_driver_internal(p_booking_id); end; $$;
create or replace function public.auto_dispatch_pending_confirmed() returns integer language plpgsql security definer set search_path='public','pg_temp' as $$ declare v_count integer:=0; v_booking record; v_result public.bookings; begin if not exists(select 1 from public.dispatch_settings where id=true and mode='automatic') then return 0; end if; for v_booking in select id from public.bookings where booking_status='confirmed' and driver_id is null order by travel_date,pickup_time,created_at loop v_result:=public.auto_assign_booking_driver_internal(v_booking.id); if v_result.driver_id is not null then v_count:=v_count+1; end if; end loop; return v_count; end; $$;
create or replace function public.set_dispatch_mode(p_mode text) returns integer language plpgsql security definer set search_path='public','pg_temp' as $$ declare v_actor uuid:=auth.uid(); v_booking public.bookings; v_before_driver uuid; v_assigned integer:=0; begin if v_actor is null or not public.is_admin() then raise exception 'VOYNU: admin access required'; end if; if p_mode not in ('manual','automatic') then raise exception 'VOYNU: invalid dispatch mode'; end if; update public.dispatch_settings set mode=p_mode,updated_at=now() where id=true; if p_mode<>'automatic' then return 0; end if; for v_booking in select * from public.bookings where booking_status='confirmed' and driver_id is null order by travel_date nulls last,pickup_time nulls last,created_at loop v_before_driver:=v_booking.driver_id; perform public.auto_assign_booking_driver_internal(v_booking.id); if exists(select 1 from public.bookings b where b.id=v_booking.id and b.driver_id is not null and v_before_driver is null) then v_assigned:=v_assigned+1; end if; end loop; return v_assigned; end; $$;
create or replace function public.admin_run_dispatch_queue() returns integer language plpgsql security definer set search_path='public','pg_temp' as $$ begin if auth.uid() is null or not public.is_admin() then raise exception 'VOYNU: admin access required'; end if; return public.auto_dispatch_pending_confirmed(); end; $$;
create or replace function public.auto_dispatch_confirmed_booking() returns trigger language plpgsql security definer set search_path='public','pg_temp' as $$ begin if new.booking_status='confirmed' and new.driver_id is null and exists(select 1 from public.dispatch_settings where id=true and mode='automatic') then perform public.auto_assign_booking_driver_internal(new.id); end if; return new; exception when others then return new; end; $$;
create or replace function public.retry_auto_dispatch_after_booking_cancelled() returns trigger language plpgsql security definer set search_path='public','pg_temp' as $$ begin if old.booking_status is distinct from new.booking_status and new.booking_status='cancelled' and old.driver_id is not null and exists(select 1 from public.dispatch_settings where id=true and mode='automatic') then perform public.auto_dispatch_pending_confirmed(); end if; return new; exception when others then raise warning 'VOYNU auto-dispatch retry after booking cancellation failed: %',sqlerrm; return new; end; $$;
create or replace function public.retry_auto_dispatch_after_driver_available() returns trigger language plpgsql security definer set search_path='public','pg_temp' as $$ begin if (old.availability_status is distinct from new.availability_status or old.active is distinct from new.active) and new.availability_status='available' and new.active=true then perform public.auto_dispatch_pending_confirmed(); end if; return new; exception when others then raise warning 'VOYNU auto-dispatch retry after driver availability failed: %',sqlerrm; return new; end; $$;
create or replace function public.notify_booking_created() returns trigger language plpgsql security definer set search_path='public','pg_temp' as $$ declare v_reference text:='VOY-'||upper(left(new.id::text,8)); v_title text; v_message text; begin if new.user_id is not null then if new.booking_status='pending_payment' then v_title:='Booking received'; v_message:=format('Your booking %s has been saved. UPI payment is awaiting verification.',v_reference); else v_title:='Booking confirmed'; v_message:=format('Your booking %s is confirmed. We will contact you before your journey.',v_reference); end if; insert into public.notifications(user_id,booking_id,type,title,message,data) values(new.user_id,new.id,'booking_created',v_title,v_message,jsonb_build_object('bookingId',new.id,'reference',v_reference,'bookingStatus',new.booking_status,'paymentStatus',new.payment_status)); end if; insert into public.notifications(user_id,booking_id,type,title,message,data) select p.id,new.id,'admin_booking_created','New booking received',format('Booking %s has been created and is ready for review.',v_reference),jsonb_build_object('bookingId',new.id,'reference',v_reference,'bookingStatus',new.booking_status,'paymentStatus',new.payment_status) from public.profiles p where p.role='admin'; return new; end; $$;
create or replace function public.notify_booking_status_changed() returns trigger language plpgsql security definer set search_path='public','pg_temp' as $$ declare v_reference text:='VOY-'||upper(left(new.id::text,8)); v_type text; v_title text; v_message text; begin if new.user_id is null then return new; end if; case new.booking_status when 'confirmed' then v_type:='booking_confirmed';v_title:='Booking confirmed';v_message:=format('Payment has been verified and booking %s is confirmed.',v_reference); when 'driver_assigned' then v_type:='driver_assigned';v_title:='Driver assigned';v_message:=format('A driver has been assigned to booking %s.',v_reference); when 'on_the_way' then v_type:='driver_on_the_way';v_title:='Driver is on the way';v_message:=format('Your driver is on the way for booking %s.',v_reference); when 'arrived' then v_type:='driver_arrived';v_title:='Driver has arrived';v_message:=format('Your driver has arrived for booking %s.',v_reference); when 'trip_started' then v_type:='trip_started';v_title:='Trip started';v_message:=format('Your journey for booking %s has started.',v_reference); when 'trip_completed' then v_type:='trip_completed';v_title:='Trip completed';v_message:=format('Your journey for booking %s has been completed. Thank you for riding with VOYNU.',v_reference); when 'cancelled' then v_type:='booking_cancelled';v_title:='Booking cancelled';v_message:=format('Booking %s has been cancelled.',v_reference); else return new; end case; insert into public.notifications(user_id,booking_id,type,title,message,data) values(new.user_id,new.id,v_type,v_title,v_message,jsonb_build_object('bookingId',new.id,'reference',v_reference,'bookingStatus',new.booking_status,'paymentStatus',new.payment_status)); return new; end; $$;
create or replace function public.notify_driver_assignment() returns trigger language plpgsql security definer set search_path='' as $$ declare v_driver_user_id uuid; v_reference text; begin if new.status<>'assigned' then return new; end if; select coalesce(d.user_id,u.id) into v_driver_user_id from public.drivers d left join auth.users u on lower(u.email)=lower(d.email) where d.id=new.driver_id and d.active=true; if v_driver_user_id is null then return new; end if; v_reference:='VOY-'||upper(left(new.booking_id::text,8)); insert into public.notifications(user_id,booking_id,type,title,message,data) values(v_driver_user_id,new.booking_id,'driver_trip_assigned','New trip assigned',format('Booking %s has been assigned to you. Open your driver dashboard for trip details.',v_reference),jsonb_build_object('bookingId',new.booking_id,'reference',v_reference,'driverAssignmentId',new.id,'vehicleId',new.vehicle_id)); return new; end; $$;
create or replace function public.mark_notification_read(p_notification_id uuid) returns boolean language plpgsql set search_path='public' as $$ begin update public.notifications set read_at=coalesce(read_at,now()) where id=p_notification_id and user_id=auth.uid(); return found; end; $$;
create or replace function public.mark_all_notifications_read() returns integer language plpgsql set search_path='public' as $$ declare changed_count integer; begin update public.notifications set read_at=now() where user_id=auth.uid() and read_at is null; get diagnostics changed_count=row_count; return changed_count; end; $$;
create or replace function public.queue_web_push_for_notification() returns trigger language plpgsql security definer set search_path='public','pg_temp' as $$ declare v_secret text; begin select webhook_secret into v_secret from public.push_config where id='default' limit 1; if v_secret is null then raise warning 'VOYNU web push queue skipped: push configuration unavailable'; return new; end if; perform net.http_post(url:='https://huibxdxwspjqsxsdfxfb.supabase.co/functions/v1/voynu-push',body:=jsonb_build_object('notificationId',new.id),headers:=jsonb_build_object('Content-Type','application/json','x-voynu-push-secret',v_secret)); return new; exception when others then raise warning 'VOYNU web push queue failed: %',sqlerrm; return new; end; $$;
create or replace function public.rls_auto_enable() returns event_trigger language plpgsql security definer set search_path='pg_catalog' as $$ declare cmd record; begin for cmd in select * from pg_event_trigger_ddl_commands() where command_tag in ('CREATE TABLE','CREATE TABLE AS','SELECT INTO') and object_type in ('table','partitioned table') loop if cmd.schema_name='public' then begin execute format('alter table if exists %s enable row level security',cmd.object_identity); exception when others then raise log 'rls_auto_enable: failed to enable RLS on %',cmd.object_identity; end; end if; end loop; end; $$;

create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();
create trigger profiles_set_updated_at before update on public.profiles for each row execute function public.set_updated_at();
create trigger vehicles_sync_category_reference before insert or update of vehicle_category_id,category on public.vehicles for each row execute function public.sync_vehicle_category_reference();
create trigger bookings_sync_state before insert or update on public.bookings for each row execute function public.sync_booking_state();
create trigger trg_guard_booking_insert before insert on public.bookings for each row execute function public.guard_booking_insert();
create trigger trg_guard_driver_booking_update before update on public.bookings for each row execute function public.guard_driver_booking_update();
create trigger trg_validate_booking_capacity before insert or update of vehicle_category_id,vehicle_type,passenger_count,luggage_count on public.bookings for each row execute function public.validate_booking_capacity();
create trigger trg_auto_dispatch_confirmed_booking after insert or update of booking_status,payment_status on public.bookings for each row when (new.booking_status='confirmed' and new.driver_id is null) execute function public.auto_dispatch_confirmed_booking();
create trigger trg_notify_booking_created after insert on public.bookings for each row execute function public.notify_booking_created();
create trigger trg_notify_booking_status_changed after update of booking_status on public.bookings for each row when (old.booking_status is distinct from new.booking_status) execute function public.notify_booking_status_changed();
create trigger trg_retry_auto_dispatch_after_booking_cancelled after update of booking_status on public.bookings for each row when (new.booking_status='cancelled' and old.booking_status is distinct from new.booking_status and old.driver_id is not null) execute function public.retry_auto_dispatch_after_booking_cancelled();
create trigger trg_notify_driver_assignment after insert on public.driver_assignments for each row execute function public.notify_driver_assignment();
create trigger trg_retry_auto_dispatch_after_driver_available after update of availability_status,active on public.drivers for each row when (new.availability_status='available' and new.active=true) execute function public.retry_auto_dispatch_after_driver_available();
create trigger trg_push_subscription_updated_at before update on public.push_subscriptions for each row execute function public.touch_push_subscription_updated_at();
create trigger trg_queue_web_push_for_notification after insert on public.notifications for each row execute function public.queue_web_push_for_notification();

create event trigger ensure_rls on ddl_command_end execute function public.rls_auto_enable();

alter table public.profiles enable row level security;
alter table public.vehicle_categories enable row level security;
alter table public.pricing_versions enable row level security;
alter table public.vehicles enable row level security;
alter table public.drivers enable row level security;
alter table public.bookings enable row level security;
alter table public.driver_assignments enable row level security;
alter table public.driver_current_location enable row level security;
alter table public.driver_location_history enable row level security;
alter table public.fare_pricing_configs enable row level security;
alter table public.pricing_rules enable row level security;
alter table public.notifications enable row level security;
alter table public.push_subscriptions enable row level security;
alter table public.push_config enable row level security;
alter table public.service_areas enable row level security;
alter table public.dispatch_settings enable row level security;

create policy "Anyone can insert bookings" on public.bookings for insert to anon,authenticated with check (true);
create policy "Authenticated users can view permitted bookings" on public.bookings for select to authenticated using ((select is_admin()) or private.is_current_driver(driver_id) or ((select auth.uid())=user_id));
create policy "Authenticated users can update permitted bookings" on public.bookings for update to authenticated using ((select is_admin()) or private.is_current_driver(driver_id)) with check ((select is_admin()) or private.is_current_driver(driver_id));
create policy "Users can view permitted profiles" on public.profiles for select to authenticated using ((select is_admin()) or (id=(select auth.uid())));
create policy "Users can update permitted profiles" on public.profiles for update to authenticated using ((select is_admin()) or (id=(select auth.uid()))) with check ((select is_admin()) or ((id=(select auth.uid())) and (role=(select p.role from public.profiles p where p.id=(select auth.uid())))));
create policy "Anyone can read active bookable vehicle categories" on public.vehicle_categories for select to anon,authenticated using (active=true and bookable=true);
create policy "Admins can insert vehicle categories" on public.vehicle_categories for insert to authenticated with check (is_admin());
create policy "Admins can update vehicle categories" on public.vehicle_categories for update to authenticated using (is_admin()) with check (is_admin());
create policy "Admins can delete vehicle categories" on public.vehicle_categories for delete to authenticated using (is_admin());
create policy "Permitted users can view vehicles" on public.vehicles for select to authenticated using ((select is_admin()) or exists(select 1 from public.bookings b where b.vehicle_id=vehicles.id and b.user_id=(select auth.uid()) and b.booking_status in ('driver_assigned','on_the_way','arrived','trip_started')));
create policy "Admins can insert vehicles" on public.vehicles for insert to authenticated with check ((select is_admin()));
create policy "Admins can update vehicles" on public.vehicles for update to authenticated using ((select is_admin())) with check ((select is_admin()));
create policy "Admins can delete vehicles" on public.vehicles for delete to authenticated using ((select is_admin()));
create policy "Permitted users can view drivers" on public.drivers for select to authenticated using ((select is_admin()) or private.is_current_driver(id) or private.customer_has_assigned_driver(id));
create policy "Admins can insert drivers" on public.drivers for insert to authenticated with check ((select is_admin()));
create policy "Admins can update drivers" on public.drivers for update to authenticated using ((select is_admin())) with check ((select is_admin()));
create policy "Admins can delete drivers" on public.drivers for delete to authenticated using ((select is_admin()));
create policy "Admins can manage assignments" on public.driver_assignments for all to authenticated using (is_admin()) with check (is_admin());
create policy "Permitted users can view driver locations" on public.driver_current_location for select to authenticated using ((select is_admin()) or exists(select 1 from public.bookings b where b.driver_id=driver_current_location.driver_id and b.user_id=(select auth.uid()) and b.booking_status in ('driver_assigned','on_the_way','arrived','trip_started')) or private.is_current_driver(driver_id));
create policy "Permitted users can insert driver locations" on public.driver_current_location for insert to authenticated with check ((select is_admin()) or private.is_current_driver(driver_id));
create policy "Permitted users can update driver locations" on public.driver_current_location for update to authenticated using ((select is_admin()) or private.is_current_driver(driver_id)) with check ((select is_admin()) or private.is_current_driver(driver_id));
create policy "Admins can delete driver locations" on public.driver_current_location for delete to authenticated using ((select is_admin()));
create policy "Permitted users can view location history" on public.driver_location_history for select to authenticated using ((select is_admin()) or exists(select 1 from public.bookings b where b.id=driver_location_history.booking_id and b.user_id=(select auth.uid()) and b.driver_id=driver_location_history.driver_id));
create policy "Permitted users can insert location history" on public.driver_location_history for insert to authenticated with check ((select is_admin()) or (private.is_current_driver(driver_id) and exists(select 1 from public.bookings b where b.id=driver_location_history.booking_id and b.driver_id=driver_location_history.driver_id and b.booking_status in ('driver_assigned','on_the_way','arrived','trip_started'))));
create policy "Admins can update location history" on public.driver_location_history for update to authenticated using ((select is_admin())) with check ((select is_admin()));
create policy "Admins can delete location history" on public.driver_location_history for delete to authenticated using ((select is_admin()));
create policy "Permitted users can read fare pricing" on public.fare_pricing_configs for select to anon,authenticated using (((active=true) and (valid_from<=now()) and ((valid_until is null) or (valid_until>now()))) or (select is_admin()));
create policy "Admins can insert fare pricing" on public.fare_pricing_configs for insert to authenticated with check ((select is_admin()));
create policy "Admins can update fare pricing" on public.fare_pricing_configs for update to authenticated using ((select is_admin())) with check ((select is_admin()));
create policy "Admins can delete fare pricing" on public.fare_pricing_configs for delete to authenticated using ((select is_admin()));
create policy "pricing_versions_select_authenticated" on public.pricing_versions for select to authenticated using (true);
create policy "pricing_versions_admin_insert" on public.pricing_versions for insert to authenticated with check ((select is_admin()));
create policy "pricing_versions_admin_update" on public.pricing_versions for update to authenticated using ((select is_admin())) with check ((select is_admin()));
create policy "pricing_rules_select_authenticated" on public.pricing_rules for select to authenticated using (true);
create policy "pricing_rules_admin_insert" on public.pricing_rules for insert to authenticated with check ((select is_admin()));
create policy "pricing_rules_admin_update" on public.pricing_rules for update to authenticated using ((select is_admin())) with check ((select is_admin()));
create policy "Users can view own notifications" on public.notifications for select to authenticated using ((select auth.uid())=user_id);
create policy "Users can update own notification read state" on public.notifications for update to authenticated using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id);
create policy "Users manage own push subscriptions" on public.push_subscriptions for all to authenticated using (user_id=(select auth.uid())) with check (user_id=(select auth.uid()));
create policy "Anyone can read active service areas" on public.service_areas for select to anon,authenticated using (active=true);
create policy "dispatch_settings_admin_select" on public.dispatch_settings for select to authenticated using (is_admin());
create policy "dispatch_settings_admin_update" on public.dispatch_settings for update to authenticated using (is_admin()) with check (is_admin());

revoke all on all tables in schema public from anon,authenticated;
revoke all on all functions in schema public from public;
revoke all on all functions in schema private from public;

grant select,insert on public.bookings to anon;
grant select,insert,update on public.bookings to authenticated;
grant select on public.service_areas,public.vehicle_categories,public.fare_pricing_configs to anon,authenticated;
grant select on public.profiles,public.drivers,public.vehicles,public.driver_assignments,public.driver_current_location,public.driver_location_history,public.notifications,public.pricing_versions,public.pricing_rules to authenticated;
grant insert,update on public.drivers,public.vehicles,public.driver_assignments,public.driver_current_location,public.driver_location_history,public.pricing_versions,public.pricing_rules to authenticated;
grant update on public.profiles,public.dispatch_settings to authenticated;
grant insert,update,delete on public.push_subscriptions to authenticated;
grant insert,select,update on public.notifications to service_role;
grant all on all tables in schema public to service_role;

grant execute on function public.is_admin() to authenticated;
grant execute on function public.is_current_driver(uuid) to authenticated;
grant execute on function public.customer_has_assigned_driver(uuid) to authenticated;
grant execute on function private.is_current_driver(uuid) to authenticated;
grant execute on function private.customer_has_assigned_driver(uuid) to authenticated;
grant execute on function public.confirm_booking_payment(uuid) to authenticated;
grant execute on function public.assign_booking_driver(uuid,uuid,uuid,uuid) to authenticated;
grant execute on function public.advance_driver_booking_status(uuid,text) to authenticated;
grant execute on function public.auto_assign_booking_driver(uuid) to authenticated;
grant execute on function public.get_driver_navigation_target(uuid) to authenticated;
grant execute on function public.get_my_booking_driver(uuid) to authenticated;
grant execute on function public.update_driver_location(uuid,double precision,double precision) to authenticated;
grant execute on function public.mark_notification_read(uuid) to authenticated;
grant execute on function public.mark_all_notifications_read() to authenticated;
grant execute on function public.publish_fare_pricing_version(uuid,text,numeric,numeric,numeric,numeric,numeric,numeric,numeric,numeric) to authenticated;
grant execute on function public.set_dispatch_mode(text) to authenticated;
grant execute on function public.admin_confirm_payment_and_dispatch(uuid) to authenticated;
grant execute on function public.admin_run_dispatch_queue() to authenticated;

do $$ begin
  if exists(select 1 from pg_publication where pubname='supabase_realtime') then
    execute 'alter publication supabase_realtime add table public.bookings';
    execute 'alter publication supabase_realtime add table public.dispatch_settings';
    execute 'alter publication supabase_realtime add table public.driver_current_location';
    execute 'alter publication supabase_realtime add table public.drivers';
    execute 'alter publication supabase_realtime add table public.notifications';
  end if;
exception when duplicate_object then null;
end $$;
