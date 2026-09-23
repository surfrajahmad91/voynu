create or replace function public.sync_booking_state()
returns trigger
language plpgsql
set search_path to 'public'
as $function$
declare allowed text[]; v_driver uuid; v_allow_driver_unassignment boolean;
begin
  v_allow_driver_unassignment := coalesce(current_setting('voynu.allow_driver_unassignment', true), 'off') = 'on';
  if TG_OP = 'UPDATE' and NEW.booking_status is distinct from OLD.booking_status then
    allowed := case OLD.booking_status
      when 'pending_payment' then array['confirmed', 'cancelled']
      when 'confirmed' then array['driver_assigned', 'cancelled']
      when 'driver_assigned' then case when v_allow_driver_unassignment then array['on_the_way', 'confirmed', 'cancelled'] else array['on_the_way', 'cancelled'] end
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
$function$;

create or replace function public.request_driver_subscription_unavailability(p_start_date date,p_end_date date,p_reason text)
returns public.driver_subscription_unavailability
language plpgsql
security definer
set search_path to 'public','pg_temp'
as $function$
declare
  v_driver public.drivers;
  v_request public.driver_subscription_unavailability;
  v_subscription public.commute_subscriptions;
  v_trip public.subscription_trips;
  v_booking public.bookings;
  v_today date := (now() at time zone 'Asia/Kolkata')::date;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  if p_start_date is null or p_end_date is null or p_end_date < p_start_date then raise exception 'Invalid unavailability date range'; end if;
  if p_start_date <= v_today then raise exception 'Unavailability must start from tomorrow or later'; end if;
  if coalesce(length(trim(p_reason)),0) < 3 then raise exception 'A reason is required'; end if;

  select d.* into v_driver from public.drivers d
  where d.active=true and (d.user_id=auth.uid() or (d.user_id is null and lower(d.email)=lower((select email from auth.users where id=auth.uid()))))
  limit 1 for update;
  if not found then raise exception 'VOYNU: driver access denied'; end if;

  if exists (select 1 from public.driver_subscription_unavailability u where u.driver_id=v_driver.id and u.status='active' and u.start_date <= p_end_date and u.end_date >= p_start_date) then
    raise exception 'An active unavailability already overlaps these dates';
  end if;

  insert into public.driver_subscription_unavailability(driver_id,start_date,end_date,reason,created_by)
  values(v_driver.id,p_start_date,p_end_date,trim(p_reason),auth.uid()) returning * into v_request;

  perform set_config('voynu.allow_driver_unassignment','on',true);

  for v_subscription in
    select s.* from public.commute_subscriptions s
    where s.assigned_driver_id=v_driver.id and s.payment_status='paid' and s.status in ('active','paused')
      and s.end_date >= p_start_date and s.start_date <= p_end_date
  loop
    for v_trip in
      select st.* from public.subscription_trips st
      where st.subscription_id=v_subscription.id
        and st.trip_date between greatest(v_subscription.start_date,p_start_date) and least(v_subscription.end_date,p_end_date)
        and st.status='scheduled'
        and not exists (select 1 from public.subscription_exceptions e where e.subscription_id=st.subscription_id and e.exception_date=st.trip_date and e.chargeable=false)
        and not exists (select 1 from public.subscription_trip_driver_overrides o where o.subscription_trip_id=st.id and o.status in ('replacement_required','reassigned'))
      order by st.trip_date
    loop
      select * into v_booking from public.bookings b where b.subscription_trip_id=v_trip.id limit 1 for update;
      if v_booking.id is null then continue; end if;
      if v_booking.booking_status in ('on_the_way','arrived','trip_started','waiting_for_return','return_trip_started','trip_completed','cancelled') then continue; end if;

      insert into public.subscription_trip_driver_overrides(subscription_trip_id,unavailability_id,original_driver_id,reason)
      values(v_trip.id,v_request.id,v_driver.id,trim(p_reason))
      on conflict (subscription_trip_id) do nothing;

      delete from public.driver_assignments where booking_id=v_booking.id and status='assigned';

      update public.bookings
      set driver_id=null,vehicle_id=null,booking_status='confirmed',updated_at=now()
      where id=v_booking.id and booking_status in ('confirmed','driver_assigned');
    end loop;
  end loop;

  if v_driver.availability_status='available' then
    update public.drivers set availability_status='offline' where id=v_driver.id;
  end if;
  return v_request;
end;
$function$;

create or replace function public.sync_commute_subscription_trips(p_subscription_id uuid)
returns integer
language plpgsql
security definer
set search_path to 'public','pg_temp'
as $function$
declare
  s public.commute_subscriptions%rowtype;
  vc public.vehicle_categories%rowtype;
  d date;
  trip public.subscription_trips%rowtype;
  b public.bookings%rowtype;
  o public.subscription_trip_driver_overrides%rowtype;
  v_count integer:=0;
  v_passenger_name text;
  v_dispatch_token text;
  v_effective_driver uuid;
  v_effective_vehicle uuid;
begin
  if not public.is_admin() and session_user <> 'postgres' then raise exception 'Admin access required'; end if;
  select token into v_dispatch_token from private.dispatch_security_config where id=true;
  perform set_config('voynu.auto_dispatch_token',coalesce(v_dispatch_token,''),true);
  select * into s from public.commute_subscriptions where id=p_subscription_id for update;
  if not found then raise exception 'Subscription not found'; end if;
  if s.status not in ('active','paused') or s.payment_status <> 'paid' then return 0; end if;
  select * into vc from public.vehicle_categories where id=s.vehicle_category_id;
  select string_agg(coalesce(x->>'name','Passenger'),' / ' order by ord) into v_passenger_name
  from jsonb_array_elements(coalesce(s.passengers,'[]'::jsonb)) with ordinality a(x,ord);

  perform set_config('voynu.allow_driver_unassignment','on',true);

  d:=s.start_date;
  while d<=s.end_date loop
    v_effective_driver:=s.assigned_driver_id;
    v_effective_vehicle:=s.assigned_vehicle_id;

    if exists (select 1 from public.subscription_exceptions e where e.subscription_id=s.id and e.exception_date=d and e.chargeable=false) then
      insert into public.subscription_trips(subscription_id,trip_date,status) values(s.id,d,'off')
      on conflict(subscription_id,trip_date) do update set status='off';
      d:=d+1; continue;
    end if;

    insert into public.subscription_trips(subscription_id,trip_date,status) values(s.id,d,'scheduled')
    on conflict(subscription_id,trip_date) do update set status=case when public.subscription_trips.status='off' then 'scheduled' else public.subscription_trips.status end
    returning * into trip;

    select * into o from public.subscription_trip_driver_overrides where subscription_trip_id=trip.id and status in ('replacement_required','reassigned') limit 1;
    if o.id is not null then
      if o.status='replacement_required' then v_effective_driver:=null; v_effective_vehicle:=null;
      else v_effective_driver:=o.replacement_driver_id; v_effective_vehicle:=o.replacement_vehicle_id;
      end if;
    end if;

    select * into b from public.bookings where subscription_trip_id=trip.id limit 1;

    if not found then
      insert into public.bookings(
        user_id,trip_type,pickup_name,pickup_lat,pickup_lon,drop_name,drop_lat,drop_lon,one_way_distance_km,total_distance_km,
        travel_date,pickup_time,return_date,return_time,passenger_name,vehicle_type,fare,payment_method,status,confirmed_at,
        payment_status,booking_status,driver_id,vehicle_id,passenger_count,luggage_count,vehicle_category_id,passenger_capacity_snapshot,
        luggage_capacity_snapshot,quoted_fare,fare_breakdown,subscription_id,subscription_trip_id,idempotency_key
      )
      values(
        s.user_id,'roundtrip',s.pickup_name,s.pickup_lat,s.pickup_lon,s.drop_name,s.drop_lat,s.drop_lon,s.one_way_distance_km,
        s.one_way_distance_km*2,d,s.morning_pickup_time,d,s.evening_return_time,coalesce(v_passenger_name,'Commute passengers'),
        coalesce(vc.name,'Commute'),s.daily_roundtrip_fare,'subscription','confirmed',now(),'paid',
        case when v_effective_driver is null then 'confirmed' else 'driver_assigned' end,v_effective_driver,v_effective_vehicle,
        s.passenger_count,0,s.vehicle_category_id,vc.passenger_capacity,vc.luggage_capacity,s.daily_roundtrip_fare,
        jsonb_build_object('subscriptionId',s.id,'subscriptionTripId',trip.id),s.id,trip.id,'commute:'||s.id::text||':'||d::text
      )
      on conflict (idempotency_key) where idempotency_key is not null do nothing
      returning * into b;
      if b.id is null then select * into b from public.bookings where idempotency_key='commute:'||s.id::text||':'||d::text; end if;
      if b.id is not null then
        v_count:=v_count+1;
        update public.subscription_trips set morning_booking_id=b.id,return_booking_id=b.id where id=trip.id;
      end if;
    else
      if b.booking_status in ('pending_payment','confirmed','driver_assigned') then
        update public.bookings set driver_id=v_effective_driver,vehicle_id=v_effective_vehicle,
          booking_status=case when v_effective_driver is null then 'confirmed' else 'driver_assigned' end,
          payment_status='paid',payment_method='subscription',updated_at=now() where id=b.id returning * into b;
      end if;
      update public.subscription_trips set morning_booking_id=b.id,return_booking_id=b.id where id=trip.id;
    end if;

    if v_effective_driver is not null and v_effective_vehicle is not null and b.id is not null then
      delete from public.driver_assignments where booking_id=b.id and status='assigned';
      insert into public.driver_assignments(booking_id,driver_id,vehicle_id,assigned_by,status)
      values(b.id,v_effective_driver,v_effective_vehicle,case when auth.uid() is null then null else auth.uid() end,'assigned');
    else
      delete from public.driver_assignments where booking_id=b.id and status='assigned';
    end if;
    d:=d+1;
  end loop;
  return v_count;
end;
$function$;