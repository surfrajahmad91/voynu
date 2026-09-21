-- VOYNU: admin tracking + hardening.
-- 1. admin_audit_log: every change an admin makes to operational tables is recorded (who, what, before/after).
-- 2. admin_cancel_booking: cancellation with a mandatory reason (was a raw table update with no reason).
-- 3. admin_search / admin_dashboard_counts: fast global search and exact dashboard totals (was capped at 200 rows).
-- 4. admin_publish_pricing: atomic pricing publish (was five separate browser writes).
-- 5. Security/performance hygiene from the Supabase advisors.

-- ------------------------------------------------------------------------------------------------
-- 1. Audit log
-- ------------------------------------------------------------------------------------------------
create table if not exists public.admin_audit_log (
  id bigint generated always as identity primary key,
  occurred_at timestamptz not null default now(),
  actor_id uuid,
  actor_email text,
  table_name text not null,
  record_id text,
  action text not null,
  changes jsonb not null default '{}'::jsonb
);
create index if not exists admin_audit_log_time_idx on public.admin_audit_log(occurred_at desc);
create index if not exists admin_audit_log_record_idx on public.admin_audit_log(table_name, record_id);
alter table public.admin_audit_log enable row level security;
drop policy if exists "Admins read audit log" on public.admin_audit_log;
create policy "Admins read audit log" on public.admin_audit_log for select to authenticated using (public.is_admin());
revoke all on public.admin_audit_log from anon, authenticated;
grant select on public.admin_audit_log to authenticated;

create or replace function public.log_admin_change() returns trigger
language plpgsql security definer set search_path='public','pg_temp' as $$
declare
  v_uid uuid := auth.uid();
  v_email text; v_old jsonb; v_new jsonb; v_diff jsonb := '{}'::jsonb; v_id text; k text;
begin
  if v_uid is null or not public.is_admin() then return coalesce(NEW, OLD); end if;
  begin
    select email into v_email from auth.users where id = v_uid;
    if TG_OP = 'INSERT' then
      v_new := to_jsonb(NEW); v_id := v_new->>'id'; v_diff := v_new - 'updated_at';
    elsif TG_OP = 'DELETE' then
      v_old := to_jsonb(OLD); v_id := v_old->>'id'; v_diff := v_old;
    else
      v_old := to_jsonb(OLD); v_new := to_jsonb(NEW); v_id := v_new->>'id';
      for k in select jsonb_object_keys(v_new) loop
        if k <> 'updated_at' and (v_old->k) is distinct from (v_new->k) then
          v_diff := v_diff || jsonb_build_object(k, jsonb_build_object('old', v_old->k, 'new', v_new->k));
        end if;
      end loop;
      if v_diff = '{}'::jsonb then return NEW; end if;
    end if;
    insert into public.admin_audit_log(actor_id, actor_email, table_name, record_id, action, changes)
    values (v_uid, v_email, TG_TABLE_NAME, v_id, TG_OP, v_diff);
  exception when others then
    raise warning 'VOYNU admin audit failed: %', sqlerrm;
  end;
  return coalesce(NEW, OLD);
end;
$$;

do $$
declare t text;
begin
  foreach t in array array['bookings','drivers','vehicles','vehicle_categories','pricing_versions','pricing_rules','dispatch_settings',
    'driver_workflow_settings','subscription_plans','commute_subscriptions','subscription_holidays','rental_settings','rental_vehicle_listings',
    'rental_bookings','rental_payouts','rental_owner_profiles','trip_timing_alerts','driver_assignments'] loop
    if to_regclass('public.' || t) is not null then
      execute format('drop trigger if exists zz_admin_audit on public.%I', t);
      execute format('create trigger zz_admin_audit after insert or update or delete on public.%I for each row execute function public.log_admin_change()', t);
    end if;
  end loop;
end $$;

-- ------------------------------------------------------------------------------------------------
-- 2. Admin cancellation with a reason
-- ------------------------------------------------------------------------------------------------
create or replace function public.admin_cancel_booking(p_booking_id uuid, p_reason text) returns public.bookings
language plpgsql security definer set search_path='public','pg_temp' as $$
declare v_b public.bookings; v_reason text := nullif(btrim(coalesce(p_reason, '')), '');
begin
  if not public.is_admin() then raise exception 'VOYNU: admin access required'; end if;
  if v_reason is null or char_length(v_reason) < 4 then raise exception 'VOYNU: Please give a cancellation reason'; end if;
  select * into v_b from public.bookings where id = p_booking_id for update;
  if not found then raise exception 'VOYNU: booking not found'; end if;
  if v_b.booking_status in ('cancelled', 'trip_completed') then raise exception 'VOYNU: this booking is already %', replace(v_b.booking_status, '_', ' '); end if;
  update public.bookings set booking_status = 'cancelled', cancelled_by = 'admin', cancellation_reason = v_reason, cancellation_fee = coalesce(cancellation_fee, 0)
    where id = p_booking_id returning * into v_b;
  return v_b;
end;
$$;

-- ------------------------------------------------------------------------------------------------
-- 3. Global search + exact dashboard counts
-- ------------------------------------------------------------------------------------------------
create or replace function public.admin_search(p_query text) returns jsonb
language plpgsql stable security definer set search_path='public','pg_temp' as $$
declare q text := btrim(coalesce(p_query, '')); pat text; code text;
begin
  if not public.is_admin() then raise exception 'VOYNU: admin access required'; end if;
  if char_length(q) < 2 then return jsonb_build_object('bookings', '[]'::jsonb, 'drivers', '[]'::jsonb, 'subscriptions', '[]'::jsonb); end if;
  pat := '%' || replace(replace(replace(q, '\', '\\'), '%', '\%'), '_', '\_') || '%';
  code := lower(regexp_replace(q, '^voy-?', '', 'i'));
  return jsonb_build_object(
    'bookings', coalesce((select jsonb_agg(x) from (
      select id, booking_status, passenger_name, phone, pickup_name, drop_name, travel_date, fare
      from public.bookings
      where id::text ilike (replace(replace(code, '%', ''), '_', '') || '%') or passenger_name ilike pat or phone ilike pat or pickup_name ilike pat or drop_name ilike pat
      order by created_at desc limit 8) x), '[]'::jsonb),
    'drivers', coalesce((select jsonb_agg(x) from (
      select d.id, d.full_name, d.phone, d.availability_status, v.registration_number
      from public.drivers d left join public.vehicles v on v.id = d.vehicle_id
      where d.full_name ilike pat or d.phone ilike pat or v.registration_number ilike pat
      order by d.full_name limit 6) x), '[]'::jsonb),
    'subscriptions', coalesce((select jsonb_agg(x) from (
      select id, status, pickup_name, drop_name, start_date, end_date
      from public.commute_subscriptions
      where id::text ilike (replace(replace(code, '%', ''), '_', '') || '%') or pickup_name ilike pat or drop_name ilike pat
      order by created_at desc limit 5) x), '[]'::jsonb));
end;
$$;

create or replace function public.admin_dashboard_counts() returns jsonb
language plpgsql stable security definer set search_path='public','pg_temp' as $$
declare r jsonb;
begin
  if not public.is_admin() then raise exception 'VOYNU: admin access required'; end if;
  select jsonb_build_object(
    'total', count(*),
    'today', count(*) filter (where created_at >= date_trunc('day', now() at time zone 'Asia/Kolkata') at time zone 'Asia/Kolkata'),
    'live', count(*) filter (where booking_status in ('driver_assigned', 'on_the_way', 'arrived', 'trip_started', 'waiting_for_return', 'return_trip_started')),
    'awaiting', count(*) filter (where booking_status = 'confirmed' and driver_id is null),
    'completed', count(*) filter (where booking_status = 'trip_completed'),
    'cancelled', count(*) filter (where booking_status = 'cancelled'),
    'pending_payment', count(*) filter (where payment_status = 'pending' and booking_status <> 'cancelled'),
    'cash_issues', count(*) filter (where payment_method = 'cash' and booking_status = 'trip_completed' and cash_collection_status in ('partial', 'not_collected', 'unreported'))
  ) into r from public.bookings;
  return r;
end;
$$;

create or replace function public.purge_driver_location_history(p_days integer default 90) returns integer
language plpgsql security definer set search_path='public','pg_temp' as $$
declare n integer;
begin
  if not public.is_admin() then raise exception 'VOYNU: admin access required'; end if;
  if p_days < 7 then raise exception 'VOYNU: keep at least 7 days of location history'; end if;
  delete from public.driver_location_history where recorded_at < now() - make_interval(days => p_days);
  get diagnostics n = row_count;
  return n;
end;
$$;

-- ------------------------------------------------------------------------------------------------
-- 4. Atomic pricing publish
-- ------------------------------------------------------------------------------------------------
create or replace function public.admin_publish_pricing(p_name text, p_waiting_fee numeric, p_interval integer, p_max_wait integer, p_rules jsonb)
returns public.pricing_versions
language plpgsql security definer set search_path='public','pg_temp' as $$
declare v public.pricing_versions; next_v integer; e jsonb;
begin
  if not public.is_admin() then raise exception 'VOYNU: admin access required'; end if;
  if p_waiting_fee is null or p_waiting_fee < 0 then raise exception 'VOYNU: Waiting fee must be zero or more'; end if;
  if p_interval is null or p_interval <= 0 or p_interval > 1440 then raise exception 'VOYNU: Waiting interval must be between 1 and 1440 minutes'; end if;
  if p_max_wait is null or p_max_wait < 0 or p_max_wait > 1440 then raise exception 'VOYNU: Maximum waiting must be between 0 and 1440 minutes'; end if;
  if p_max_wait % p_interval <> 0 then raise exception 'VOYNU: Maximum waiting time should be a multiple of the waiting interval'; end if;
  if p_rules is null or jsonb_typeof(p_rules) <> 'array' or jsonb_array_length(p_rules) = 0 then raise exception 'VOYNU: at least one pricing rule is required'; end if;
  for e in select * from jsonb_array_elements(p_rules) loop
    if e->>'trip_type' not in ('oneway', 'roundtrip') then raise exception 'VOYNU: invalid trip type in pricing rules'; end if;
    if (e->>'base_fare')::numeric < 0 or (e->>'per_km_rate')::numeric < 0 or (e->>'driver_allowance_per_day')::numeric < 0 or (e->>'minimum_fare')::numeric < 0 then
      raise exception 'VOYNU: pricing values cannot be negative'; end if;
    if (e->>'rounding_unit')::numeric <= 0 then raise exception 'VOYNU: rounding unit must be greater than zero'; end if;
  end loop;
  perform pg_advisory_xact_lock(hashtext('voynu_publish_pricing'));
  select coalesce(max(version), 0) + 1 into next_v from public.pricing_versions;
  insert into public.pricing_versions(version, name, status, effective_from, created_by, waiting_fee_per_interval, waiting_interval_minutes, max_roundtrip_wait_minutes)
    values (next_v, coalesce(nullif(btrim(p_name), ''), 'Pricing v' || next_v), 'archived', now(), auth.uid(), p_waiting_fee, p_interval, p_max_wait)
    returning * into v;
  insert into public.pricing_rules(pricing_version_id, vehicle_category_id, trip_type, base_fare, per_km_rate, driver_allowance_per_day, minimum_fare, rounding_unit)
    select v.id, (r->>'vehicle_category_id')::uuid, r->>'trip_type', (r->>'base_fare')::numeric, (r->>'per_km_rate')::numeric,
           (r->>'driver_allowance_per_day')::numeric, (r->>'minimum_fare')::numeric, (r->>'rounding_unit')::numeric
    from jsonb_array_elements(p_rules) r;
  update public.pricing_versions set status = 'archived' where status = 'active';
  update public.pricing_versions set status = 'active' where id = v.id returning * into v;
  return v;
end;
$$;

-- ------------------------------------------------------------------------------------------------
-- 5. Hygiene from the Supabase advisors
-- ------------------------------------------------------------------------------------------------
drop trigger if exists _debug_vc_before_update on public.vehicle_categories;
drop function if exists public._debug_vc_trigger();
alter function public.voynu_distance_m(double precision, double precision, double precision, double precision) set search_path = '';

-- RPCs that are not meant for signed-out visitors
do $$
declare f text;
begin
  foreach f in array array[
    'public.accept_driver_booking(uuid)', 'public.ack_trip_timing_alert(uuid)', 'public.check_trip_timing_alerts()',
    'public.create_rental_booking(uuid, timestamptz, timestamptz, text)', 'public.get_driver_assignment_statuses()',
    'public.get_trip_timing_alerts()', 'public.set_driver_availability(text)',
    'public.admin_cancel_booking(uuid, text)', 'public.admin_search(text)', 'public.admin_dashboard_counts()',
    'public.purge_driver_location_history(integer)', 'public.admin_publish_pricing(text, numeric, integer, integer, jsonb)'] loop
    execute format('revoke all on function %s from public, anon', f);
    execute format('grant execute on function %s to authenticated', f);
  end loop;
end $$;

-- Trigger functions never need to be callable through the API
do $$
declare r record;
begin
  for r in select p.oid::regprocedure as sig from pg_proc p join pg_namespace n on n.oid = p.pronamespace
           where n.nspname = 'public' and p.prorettype = 'trigger'::regtype loop
    execute format('revoke all on function %s from public, anon, authenticated', r.sig);
  end loop;
end $$;

-- Evaluate auth.uid() once per query instead of once per row
do $$
declare pol record; q text; wc text; stmt text;
begin
  for pol in
    select p.polname, c.relname, pg_get_expr(p.polqual, p.polrelid) as qual, pg_get_expr(p.polwithcheck, p.polrelid) as wcheck
    from pg_policy p join pg_class c on c.oid = p.polrelid join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relname in ('rental_owner_profiles','rental_vehicle_listings','rental_vehicle_documents','rental_vehicle_photos',
      'rental_availability_blocks','rental_bookings','rental_payouts','rental_reviews','commute_subscriptions','subscription_exceptions','subscription_trips')
  loop
    q := pol.qual; wc := pol.wcheck;
    if (coalesce(q, '') like '%auth.uid()%' and q not ilike '%select auth.uid()%') or (coalesce(wc, '') like '%auth.uid()%' and wc not ilike '%select auth.uid()%') then
      q := replace(q, 'auth.uid()', '(select auth.uid())');
      wc := replace(wc, 'auth.uid()', '(select auth.uid())');
      stmt := format('alter policy %I on public.%I', pol.polname, pol.relname);
      if q is not null then stmt := stmt || ' using (' || q || ')'; end if;
      if wc is not null then stmt := stmt || ' with check (' || wc || ')'; end if;
      execute stmt;
    end if;
  end loop;
end $$;

-- Indexes for foreign keys used in joins and cascades
create index if not exists bookings_subscription_trip_id_idx on public.bookings(subscription_trip_id);
create index if not exists subscription_trips_morning_booking_idx on public.subscription_trips(morning_booking_id);
create index if not exists subscription_trips_return_booking_idx on public.subscription_trips(return_booking_id);
create index if not exists commute_subscriptions_plan_idx on public.commute_subscriptions(plan_id);
create index if not exists commute_subscriptions_assigned_vehicle_idx on public.commute_subscriptions(assigned_vehicle_id);
create index if not exists booking_status_events_driver_idx on public.booking_status_events(driver_id);
create index if not exists rental_bookings_customer_idx on public.rental_bookings(customer_id);
