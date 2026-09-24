-- Harden subscription cancellation so cancelled subscriptions cannot leave
-- future assigned bookings visible to Saarthi.
create or replace function public.guard_driver_booking_update()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
begin
  if current_setting('voynu.admin_subscription_cancellation', true) = 'on'
     and old.booking_status in ('confirmed','driver_assigned')
     and new.booking_status = 'cancelled'
     and new.id is not distinct from old.id
     and new.user_id is not distinct from old.user_id
     and new.driver_id is not distinct from old.driver_id
     and new.vehicle_id is not distinct from old.vehicle_id
     and new.passenger_name is not distinct from old.passenger_name
     and new.phone is not distinct from old.phone
     and new.whatsapp is not distinct from old.whatsapp
     and new.pickup_name is not distinct from old.pickup_name
     and new.drop_name is not distinct from old.drop_name
     and new.pickup_lat is not distinct from old.pickup_lat
     and new.pickup_lon is not distinct from old.pickup_lon
     and new.drop_lat is not distinct from old.drop_lat
     and new.drop_lon is not distinct from old.drop_lon
     and new.travel_date is not distinct from old.travel_date
     and new.pickup_time is not distinct from old.pickup_time
     and new.return_date is not distinct from old.return_date
     and new.return_time is not distinct from old.return_time
     and new.trip_type is not distinct from old.trip_type
     and new.vehicle_type is not distinct from old.vehicle_type
     and new.fare is not distinct from old.fare
     and new.payment_method is not distinct from old.payment_method
     and new.payment_status is not distinct from old.payment_status
     and new.fare_breakdown is not distinct from old.fare_breakdown
     and new.wallet_used is not distinct from old.wallet_used
     and new.wallet_requested_amount is not distinct from old.wallet_requested_amount
     and new.vehicle_category_id is not distinct from old.vehicle_category_id
     and new.passenger_count is not distinct from old.passenger_count
     and new.luggage_count is not distinct from old.luggage_count then
    return new;
  end if;

  if current_setting('voynu.auto_dispatch_token', true) is not null
     and current_setting('voynu.auto_dispatch_token', true) = (select token from private.dispatch_security_config where id=true) then
    return new;
  end if;

  if current_setting('voynu.driver_subscription_unavailability', true) = 'on' then
    if new.id is not distinct from old.id
       and new.user_id is not distinct from old.user_id
       and new.driver_id is null
       and new.vehicle_id is null
       and new.subscription_trip_id is not distinct from old.subscription_trip_id
       and new.booking_status = 'confirmed'
       and old.booking_status = 'driver_assigned'
       and new.passenger_name is not distinct from old.passenger_name
       and new.phone is not distinct from old.phone
       and new.whatsapp is not distinct from old.whatsapp
       and new.pickup_name is not distinct from old.pickup_name
       and new.drop_name is not distinct from old.drop_name
       and new.pickup_lat is not distinct from old.pickup_lat
       and new.pickup_lon is not distinct from old.pickup_lon
       and new.drop_lat is not distinct from old.drop_lat
       and new.drop_lon is not distinct from old.drop_lon
       and new.travel_date is not distinct from old.travel_date
       and new.pickup_time is not distinct from old.pickup_time
       and new.return_date is not distinct from old.return_date
       and new.return_time is not distinct from old.return_time
       and new.trip_type is not distinct from old.trip_type
       and new.vehicle_type is not distinct from old.vehicle_type
       and new.fare is not distinct from old.fare
       and new.payment_method is not distinct from old.payment_method
       and new.payment_status is not distinct from old.payment_status
       and new.fare_breakdown is not distinct from old.fare_breakdown
       and new.wallet_used is not distinct from old.wallet_used
       and new.wallet_requested_amount is not distinct from old.wallet_requested_amount
       and new.vehicle_category_id is not distinct from old.vehicle_category_id
       and new.passenger_count is not distinct from old.passenger_count
       and new.luggage_count is not distinct from old.luggage_count then
      return new;
    end if;
  end if;

  if public.is_admin() then return new; end if;

  if new.share_token is distinct from old.share_token
     and new.id is not distinct from old.id
     and new.user_id is not distinct from old.user_id
     and new.driver_id is not distinct from old.driver_id
     and new.vehicle_id is not distinct from old.vehicle_id
     and new.passenger_name is not distinct from old.passenger_name
     and new.phone is not distinct from old.phone
     and new.whatsapp is not distinct from old.whatsapp
     and new.pickup_name is not distinct from old.pickup_name
     and new.drop_name is not distinct from old.drop_name
     and new.pickup_lat is not distinct from old.pickup_lat
     and new.pickup_lon is not distinct from old.pickup_lon
     and new.drop_lat is not distinct from old.drop_lat
     and new.drop_lon is not distinct from old.drop_lon
     and new.travel_date is not distinct from old.travel_date
     and new.pickup_time is not distinct from old.pickup_time
     and new.return_date is not distinct from old.return_date
     and new.return_time is not distinct from old.return_time
     and new.trip_type is not distinct from old.trip_type
     and new.vehicle_type is not distinct from old.vehicle_type
     and new.fare is not distinct from old.fare
     and new.payment_method is not distinct from old.payment_method
     and new.payment_status is not distinct from old.payment_status
     and new.fare_breakdown is not distinct from old.fare_breakdown
     and new.booking_status is not distinct from old.booking_status then
    return new;
  end if;

  if old.driver_id is null or not exists(
    select 1 from public.drivers d
    where d.id=old.driver_id and d.active=true
      and (d.user_id=auth.uid() or (d.user_id is null and lower(d.email)=lower((select email from auth.users where id=auth.uid()))))
  ) then raise exception 'VOYNU: driver access denied'; end if;

  if new.id is distinct from old.id or new.user_id is distinct from old.user_id
     or new.driver_id is distinct from old.driver_id or new.vehicle_id is distinct from old.vehicle_id
     or new.passenger_name is distinct from old.passenger_name or new.phone is distinct from old.phone
     or new.whatsapp is distinct from old.whatsapp or new.pickup_name is distinct from old.pickup_name
     or new.drop_name is distinct from old.drop_name or new.pickup_lat is distinct from old.pickup_lat
     or new.pickup_lon is distinct from old.pickup_lon or new.drop_lat is distinct from old.drop_lat
     or new.drop_lon is distinct from old.drop_lon or new.travel_date is distinct from old.travel_date
     or new.pickup_time is distinct from old.pickup_time or new.return_date is distinct from old.return_date
     or new.return_time is distinct from old.return_time or new.trip_type is distinct from old.trip_type
     or new.vehicle_type is distinct from old.vehicle_type or new.fare is distinct from old.fare
     or new.payment_method is distinct from old.payment_method or new.payment_status is distinct from old.payment_status
     or new.fare_breakdown is distinct from old.fare_breakdown then
    raise exception 'VOYNU: drivers may update status and trip timing fields only';
  end if;

  if not ((old.booking_status='driver_assigned' and new.booking_status='on_the_way')
       or (old.booking_status='on_the_way' and new.booking_status='arrived')
       or (old.booking_status='arrived' and new.booking_status='trip_started')
       or (old.booking_status='trip_started' and new.booking_status in ('waiting_for_return','trip_completed'))
       or (old.booking_status='waiting_for_return' and new.booking_status='return_trip_started')
       or (old.booking_status='return_trip_started' and new.booking_status='trip_completed')
       or (new.booking_status is not distinct from old.booking_status)) then
    raise exception 'VOYNU: invalid driver booking status transition';
  end if;
  return new;
end;
$function$;

create or replace function public.request_driver_subscription_unavailability(p_start_date date,p_end_date date,p_reason text)
returns public.driver_subscription_unavailability
language plpgsql
security definer
set search_path to 'public','pg_temp'
as $function$
declare
  v_driver public.drivers; v_request public.driver_subscription_unavailability;
  v_subscription public.commute_subscriptions; v_trip public.subscription_trips; v_booking public.bookings;
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
  perform set_config('voynu.driver_subscription_unavailability','on',true);

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
    update public.drivers set availability_status='offline' where id=v_driver.id; end if;
  return v_request;
end;
$function$;

-- Customer/admin cancellation is an application-owned lifecycle operation.
-- Set a transaction-local guard flag so the booking protection trigger permits
-- confirmed/driver_assigned -> cancelled without opening general driver writes.
create or replace function public.customer_cancel_commute_subscription(p_subscription_id uuid,p_reason text)
returns public.commute_subscriptions
language plpgsql
security definer
set search_path='public','pg_temp'
as $function$
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  perform set_config('voynu.admin_subscription_cancellation','on',true);
  return public.cancel_commute_subscription_internal(p_subscription_id,p_reason,auth.uid(),'customer');
end;
$function$;

create or replace function public.admin_cancel_commute_subscription(p_subscription_id uuid,p_reason text)
returns public.commute_subscriptions
language plpgsql
security definer
set search_path='public','pg_temp'
as $function$
begin
  if not public.is_admin() then raise exception 'Admin access required'; end if;
  perform set_config('voynu.admin_subscription_cancellation','on',true);
  return public.cancel_commute_subscription_internal(p_subscription_id,p_reason,auth.uid(),'admin');
end;
$function$;

create or replace function public.admin_refund_commute_subscription(p_subscription_id uuid)
returns public.commute_subscriptions
language plpgsql
security definer
set search_path='public','pg_temp'
as $function$
begin
  if not public.is_admin() then raise exception 'Admin access required'; end if;
  perform set_config('voynu.admin_subscription_cancellation','on',true);
  return public.cancel_commute_subscription_internal(p_subscription_id,'Admin refund and cancellation',auth.uid(),'admin');
end;
$function$;

revoke all on function public.customer_cancel_commute_subscription(uuid,text) from public;
revoke all on function public.admin_cancel_commute_subscription(uuid,text) from public;
revoke all on function public.admin_refund_commute_subscription(uuid) from public;
grant execute on function public.customer_cancel_commute_subscription(uuid,text) to authenticated;
grant execute on function public.admin_cancel_commute_subscription(uuid,text) to authenticated;
grant execute on function public.admin_refund_commute_subscription(uuid) to authenticated;

