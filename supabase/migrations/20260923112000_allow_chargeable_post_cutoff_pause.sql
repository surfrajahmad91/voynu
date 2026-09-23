-- Preserve the VOYNU commute rule:
-- * pause at least 4 hours before morning pickup => the whole round-trip day is non-chargeable
-- * pause after the 4-hour cutoff => that whole round-trip day remains chargeable
-- The post-cutoff pause is recorded for audit purposes but does not remove the service day
-- or extend the subscription schedule.

create or replace function public.pause_commute_subscription_dates_internal(
  p_subscription_id uuid,
  p_dates date[],
  p_reason text,
  p_actor uuid,
  p_actor_role text
)
returns public.commute_subscriptions
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $function$
declare
  s public.commute_subscriptions%rowtype;
  d date;
  v_trip public.subscription_trips%rowtype;
  v_scheduled timestamptz;
  v_cutoff interval;
  v_chargeable boolean;
  v_had_nonchargeable_pause boolean := false;
begin
  if p_actor is null then
    raise exception 'Authentication required';
  end if;

  if coalesce(length(trim(p_reason)),0) < 3 then
    raise exception 'A pause reason is required';
  end if;

  if p_dates is null or cardinality(p_dates) < 1 then
    raise exception 'Select at least one service day';
  end if;

  select *
  into s
  from public.commute_subscriptions
  where id = p_subscription_id
  for update;

  if not found then
    raise exception 'Subscription not found';
  end if;

  if s.payment_status <> 'paid' or s.status not in ('active','paused') then
    raise exception 'Only paid active subscriptions can be paused';
  end if;

  if s.user_id is distinct from p_actor and p_actor_role <> 'admin' then
    raise exception 'Subscription access denied';
  end if;

  v_cutoff := make_interval(hours => coalesce(s.off_day_cutoff_hours,4));

  foreach d in array p_dates loop
    if d < (now() at time zone 'Asia/Kolkata')::date then
      raise exception 'Pause dates must be today or in the future';
    end if;

    if extract(isodow from d)::smallint <> all(s.weekdays) then
      raise exception 'Selected date % is not one of the subscription travel days', d;
    end if;

    if exists(
      select 1
      from public.subscription_holidays h
      where h.holiday_date = d
        and h.active
    ) then
      raise exception 'Selected date % is already a company holiday', d;
    end if;

    if d > s.end_date then
      raise exception 'Selected date % is outside the current subscription schedule', d;
    end if;

    if exists(
      select 1
      from public.subscription_exceptions e
      where e.subscription_id = s.id
        and e.exception_date = d
    ) then
      raise exception 'Selected date % already has a subscription exception', d;
    end if;

    select *
    into v_trip
    from public.subscription_trips
    where subscription_id = s.id
      and trip_date = d
    for update;

    if v_trip.id is not null
       and v_trip.status in ('completed','cancelled') then
      raise exception 'Selected date % has already been completed or cancelled', d;
    end if;

    v_scheduled := (d::timestamp + s.morning_pickup_time) at time zone 'Asia/Kolkata';

    if now() > v_scheduled - v_cutoff then
      -- The cutoff has passed. Record the request, but keep this full
      -- round-trip service day chargeable and do not extend the schedule.
      v_chargeable := true;
    else
      -- At or before the cutoff, the entire round-trip day is non-chargeable.
      v_chargeable := false;
      v_had_nonchargeable_pause := true;
    end if;

    insert into public.subscription_exceptions(
      subscription_id,
      exception_date,
      reason,
      kind,
      chargeable,
      created_by,
      created_by_role
    )
    values(
      s.id,
      d,
      trim(p_reason),
      case
        when p_actor_role = 'admin' then 'admin_pause'
        else 'customer_pause'
      end,
      v_chargeable,
      p_actor,
      p_actor_role
    );
  end loop;

  if v_had_nonchargeable_pause then
    perform public.extend_commute_subscription_schedule(s.id);
  end if;

  -- This is intentionally run for both cases so a chargeable post-cutoff
  -- pause still leaves/creates the normal round-trip booking for that date.
  perform public.sync_commute_subscription_trips(s.id);

  select *
  into s
  from public.commute_subscriptions
  where id = p_subscription_id;

  return s;
end;
$function$;
