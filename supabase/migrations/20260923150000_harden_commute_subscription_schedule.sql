-- Harden commute subscription schedule validation at the database boundary.
-- Customer UI validation remains helpful, but authenticated callers must not be able
-- to bypass it by calling the RPC directly.

create or replace function public.create_commute_subscription(
  p_plan_code text,
  p_vehicle_category_id uuid,
  p_pickup_name text,
  p_pickup_lat double precision,
  p_pickup_lon double precision,
  p_drop_name text,
  p_drop_lat double precision,
  p_drop_lon double precision,
  p_one_way_distance_km numeric,
  p_passenger_count integer,
  p_morning_pickup_time time,
  p_evening_return_time time,
  p_start_date date,
  p_weekdays smallint[] default array[1,2,3,4,5],
  p_passengers jsonb default '[]'::jsonb,
  p_wallet_requested_amount numeric default 0
) returns public.commute_subscriptions
language plpgsql
security definer
set search_path='public','pg_temp'
as $$
declare
  v_quote jsonb;
  v_subscription public.commute_subscriptions;
  v_plan_id uuid;
  v_end date;
  v_passengers jsonb;
  v_weekday_count integer;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  if p_start_date is null
     or p_start_date <= (now() at time zone 'Asia/Kolkata')::date then
    raise exception 'Commute subscription start date must be tomorrow or later';
  end if;

  if p_morning_pickup_time is null
     or p_evening_return_time is null
     or p_morning_pickup_time >= p_evening_return_time then
    raise exception 'Evening return time must be later than morning pickup time';
  end if;

  if p_weekdays is null
     or cardinality(p_weekdays) < 1
     or cardinality(p_weekdays) > 7 then
    raise exception 'Select at least one and at most seven travel days';
  end if;

  select count(distinct x)
    into v_weekday_count
  from unnest(p_weekdays) as x;

  if v_weekday_count <> cardinality(p_weekdays)
     or exists(select 1 from unnest(p_weekdays) as x where x < 1 or x > 7) then
    raise exception 'Travel days must contain unique weekday values from 1 to 7';
  end if;

  if jsonb_typeof(coalesce(p_passengers,'[]'::jsonb)) <> 'array' then
    raise exception 'Passenger details must be a list';
  end if;

  if jsonb_array_length(coalesce(p_passengers,'[]'::jsonb)) <> p_passenger_count then
    raise exception 'Passenger details must be provided for every passenger';
  end if;

  if p_wallet_requested_amount < 0 then
    raise exception 'Wallet amount cannot be negative';
  end if;

  select jsonb_agg(
    jsonb_build_object(
      'name', trim(coalesce(x->>'name','')),
      'age', case when (x->>'age') ~ '^[0-9]+$' then (x->>'age')::integer else null end,
      'gender', trim(coalesce(x->>'gender',''))
    )
  )
  into v_passengers
  from jsonb_array_elements(coalesce(p_passengers,'[]'::jsonb)) x;

  if exists(
    select 1
    from jsonb_array_elements(v_passengers) x
    where length(x->>'name') < 2
       or (x->>'age') is null
       or ((x->>'age')::integer < 1 or (x->>'age')::integer > 120)
       or (x->>'gender') not in ('Male','Female','Other','Prefer not to say')
  ) then
    raise exception 'Each passenger needs a valid name, age and gender';
  end if;

  v_quote := public.quote_commute_subscription(
    p_plan_code,
    p_vehicle_category_id,
    p_one_way_distance_km,
    p_start_date,
    p_passenger_count,
    p_weekdays
  );

  select id
    into v_plan_id
  from public.subscription_plans
  where code = p_plan_code
    and active;

  v_end := (v_quote->>'endDate')::date;

  insert into public.commute_subscriptions(
    user_id,
    plan_id,
    pickup_name,
    pickup_lat,
    pickup_lon,
    drop_name,
    drop_lat,
    drop_lon,
    one_way_distance_km,
    passenger_count,
    passengers,
    vehicle_category_id,
    morning_pickup_time,
    evening_return_time,
    start_date,
    end_date,
    weekdays,
    daily_roundtrip_fare,
    base_amount,
    discount_percent,
    discount_amount,
    total_amount,
    billable_days,
    payment_status,
    status,
    wallet_requested_amount
  )
  values(
    auth.uid(),
    v_plan_id,
    p_pickup_name,
    p_pickup_lat,
    p_pickup_lon,
    p_drop_name,
    p_drop_lat,
    p_drop_lon,
    p_one_way_distance_km,
    p_passenger_count,
    v_passengers,
    p_vehicle_category_id,
    p_morning_pickup_time,
    p_evening_return_time,
    p_start_date,
    v_end,
    p_weekdays,
    (v_quote->>'dailyRoundTripFare')::numeric,
    (v_quote->>'baseAmount')::numeric,
    (v_quote->>'discountPercent')::numeric,
    (v_quote->>'discountAmount')::numeric,
    (v_quote->>'totalAmount')::numeric,
    (v_quote->>'billableDays')::integer,
    'pending',
    'pending_payment',
    round(p_wallet_requested_amount,2)
  )
  returning * into v_subscription;

  return v_subscription;
end;
$$;

revoke all on function public.create_commute_subscription(
  text,uuid,text,double precision,double precision,text,double precision,double precision,
  numeric,integer,time,time,date,smallint[],jsonb,numeric
) from public;

grant execute on function public.create_commute_subscription(
  text,uuid,text,double precision,double precision,text,double precision,double precision,
  numeric,integer,time,time,date,smallint[],jsonb,numeric
) to authenticated;
