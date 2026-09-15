-- VOYNU Commute Subscription: weekly/monthly/quarterly/half-yearly recurring home<->destination service.
-- Billing is based on the existing round-trip pricing rule, then a plan discount is applied.
-- Daily passenger attendance never changes the subscribed charge; approved off-days do.

create table if not exists public.subscription_plans (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  duration_months integer not null,
  discount_percent numeric(5,2) not null default 0,
  active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint subscription_plans_duration_check check (duration_months in (0,1,3,6)),
  constraint subscription_plans_discount_check check (discount_percent >= 0 and discount_percent < 100)
);
insert into public.subscription_plans(code,name,duration_months,discount_percent,sort_order)
values ('weekly','Weekly',0,0,1),('monthly','Monthly',1,5,2),('quarterly','Quarterly',3,10,3),('half_yearly','Half-Yearly',6,15,4)
on conflict (code) do nothing;

create table if not exists public.subscription_holidays (
  id uuid primary key default gen_random_uuid(), holiday_date date not null unique, name text not null,
  active boolean not null default true, created_at timestamptz not null default now(), created_by uuid references auth.users(id)
);
create table if not exists public.commute_subscriptions (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  plan_id uuid not null references public.subscription_plans(id), pickup_name text not null, pickup_lat double precision, pickup_lon double precision,
  drop_name text not null, drop_lat double precision, drop_lon double precision, one_way_distance_km numeric(10,2) not null,
  passenger_count integer not null, vehicle_category_id uuid not null references public.vehicle_categories(id), morning_pickup_time time not null,
  evening_return_time time not null, start_date date not null, end_date date not null, weekdays smallint[] not null default array[1,2,3,4,5],
  daily_roundtrip_fare numeric(12,2) not null, base_amount numeric(12,2) not null, discount_percent numeric(5,2) not null,
  discount_amount numeric(12,2) not null, total_amount numeric(12,2) not null, billable_days integer not null,
  payment_status text not null default 'pending', status text not null default 'pending_payment', off_day_cutoff_hours integer not null default 12,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  constraint commute_subscriptions_passengers_check check (passenger_count between 1 and 7),
  constraint commute_subscriptions_dates_check check (end_date >= start_date), constraint commute_subscriptions_distance_check check (one_way_distance_km >= 0),
  constraint commute_subscriptions_weekdays_check check (cardinality(weekdays) between 1 and 7),
  constraint commute_subscriptions_payment_check check (payment_status in ('pending','paid','failed','refunded')),
  constraint commute_subscriptions_status_check check (status in ('pending_payment','active','paused','completed','cancelled'))
);
create table if not exists public.subscription_exceptions (
  id uuid primary key default gen_random_uuid(), subscription_id uuid not null references public.commute_subscriptions(id) on delete cascade,
  exception_date date not null, reason text, kind text not null default 'customer_off', chargeable boolean not null default false,
  created_at timestamptz not null default now(), unique(subscription_id, exception_date),
  constraint subscription_exceptions_kind_check check (kind in ('customer_off','company_holiday','school_holiday','voynu_closure','other'))
);
create table if not exists public.subscription_trips (
  id uuid primary key default gen_random_uuid(), subscription_id uuid not null references public.commute_subscriptions(id) on delete cascade,
  trip_date date not null, morning_booking_id uuid references public.bookings(id), return_booking_id uuid references public.bookings(id),
  status text not null default 'scheduled', created_at timestamptz not null default now(), unique(subscription_id, trip_date),
  constraint subscription_trips_status_check check (status in ('scheduled','off','cancelled','completed'))
);
alter table public.bookings add column if not exists subscription_id uuid references public.commute_subscriptions(id) on delete set null;
alter table public.bookings add column if not exists subscription_trip_id uuid references public.subscription_trips(id) on delete set null;
create index if not exists commute_subscriptions_user_idx on public.commute_subscriptions(user_id,status,start_date);
create index if not exists commute_subscriptions_vehicle_category_idx on public.commute_subscriptions(vehicle_category_id);
create index if not exists subscription_exceptions_subscription_date_idx on public.subscription_exceptions(subscription_id,exception_date);
create index if not exists subscription_trips_date_idx on public.subscription_trips(trip_date,status);
create index if not exists bookings_subscription_id_idx on public.bookings(subscription_id);

alter table public.subscription_plans enable row level security; alter table public.subscription_holidays enable row level security;
alter table public.commute_subscriptions enable row level security; alter table public.subscription_exceptions enable row level security; alter table public.subscription_trips enable row level security;
drop policy if exists subscription_plans_public_read on public.subscription_plans;
create policy subscription_plans_public_read on public.subscription_plans for select to anon,authenticated using (active = true or (select is_admin()));
drop policy if exists subscription_holidays_public_read on public.subscription_holidays;
create policy subscription_holidays_public_read on public.subscription_holidays for select to anon,authenticated using (active = true or (select is_admin()));
drop policy if exists commute_subscriptions_owner_read on public.commute_subscriptions;
create policy commute_subscriptions_owner_read on public.commute_subscriptions for select to authenticated using (user_id = auth.uid() or (select is_admin()));
drop policy if exists subscription_exceptions_owner_read on public.subscription_exceptions;
create policy subscription_exceptions_owner_read on public.subscription_exceptions for select to authenticated using (exists(select 1 from public.commute_subscriptions s where s.id=subscription_id and (s.user_id=auth.uid() or (select is_admin()))));
drop policy if exists subscription_trips_owner_read on public.subscription_trips;
create policy subscription_trips_owner_read on public.subscription_trips for select to authenticated using (exists(select 1 from public.commute_subscriptions s where s.id=subscription_id and (s.user_id=auth.uid() or (select is_admin()))));

create or replace function public.quote_commute_subscription(p_plan_code text,p_vehicle_category_id uuid,p_one_way_distance_km numeric,p_start_date date,p_passenger_count integer,p_weekdays smallint[] default array[1,2,3,4,5]) returns jsonb language plpgsql security definer set search_path='public','pg_temp' as $$
declare v_plan public.subscription_plans%rowtype; v_rule public.pricing_rules%rowtype; v_daily numeric(12,2); v_base numeric(12,2); v_discount numeric(12,2); v_total numeric(12,2); v_end date; v_days integer:=0; v_d date; v_is_holiday boolean;
begin
 if p_passenger_count<1 or p_passenger_count>7 then raise exception 'Passenger count must be between 1 and 7'; end if;
 if p_one_way_distance_km is null or p_one_way_distance_km<0 then raise exception 'Invalid road distance'; end if;
 if not exists(select 1 from public.vehicle_categories vc where vc.id=p_vehicle_category_id and vc.active and vc.bookable and vc.passenger_capacity>=p_passenger_count) then raise exception 'No suitable vehicle category is available for this passenger count'; end if;
 select * into v_plan from public.subscription_plans where code=p_plan_code and active=true; if not found then raise exception 'Subscription plan is unavailable'; end if;
 if v_plan.code='weekly' then v_end:=p_start_date+6; else v_end:=(p_start_date+(v_plan.duration_months||' months')::interval-interval '1 day')::date; end if;
 select pr.* into v_rule from public.pricing_rules pr join public.pricing_versions pv on pv.id=pr.pricing_version_id where pv.status='active' and pr.vehicle_category_id=p_vehicle_category_id and pr.trip_type='roundtrip' order by pv.effective_from desc nulls last,pv.version desc limit 1;
 if not found then raise exception 'Round-trip pricing is unavailable for this vehicle'; end if;
 v_daily:=round(greatest(v_rule.base_fare+(p_one_way_distance_km*2*v_rule.per_km_rate)+v_rule.driver_allowance_per_day,v_rule.minimum_fare)/v_rule.rounding_unit)*v_rule.rounding_unit;
 v_d:=p_start_date; while v_d<=v_end loop
   if extract(isodow from v_d)::smallint=any(p_weekdays) then select exists(select 1 from public.subscription_holidays h where h.holiday_date=v_d and h.active) into v_is_holiday; if not v_is_holiday then v_days:=v_days+1; end if; end if;
   v_d:=v_d+1;
 end loop;
 v_base:=v_daily*v_days; v_discount:=round(v_base*v_plan.discount_percent/100,2); v_total:=round(v_base-v_discount,2);
 return jsonb_build_object('planCode',v_plan.code,'planName',v_plan.name,'startDate',p_start_date,'endDate',v_end,'dailyRoundTripFare',v_daily,'billableDays',v_days,'baseAmount',v_base,'discountPercent',v_plan.discount_percent,'discountAmount',v_discount,'totalAmount',v_total);
end; $$;
revoke all on function public.quote_commute_subscription(text,uuid,numeric,date,integer,smallint[]) from public;
grant execute on function public.quote_commute_subscription(text,uuid,numeric,date,integer,smallint[]) to anon,authenticated;

create or replace function public.set_subscription_plan(p_id uuid,p_discount_percent numeric,p_active boolean) returns public.subscription_plans language plpgsql security definer set search_path='public','pg_temp' as $$ declare v public.subscription_plans; begin if not (select is_admin()) then raise exception 'Admin access required'; end if; if p_discount_percent<0 or p_discount_percent>=100 then raise exception 'Invalid discount'; end if; update public.subscription_plans set discount_percent=p_discount_percent,active=p_active,updated_at=now() where id=p_id returning * into v; if not found then raise exception 'Subscription plan not found'; end if; return v; end; $$;
revoke all on function public.set_subscription_plan(uuid,numeric,boolean) from public; grant execute on function public.set_subscription_plan(uuid,numeric,boolean) to authenticated;
