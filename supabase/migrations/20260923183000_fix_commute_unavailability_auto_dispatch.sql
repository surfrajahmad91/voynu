create or replace function public.auto_dispatch_confirmed_booking()
returns trigger
language plpgsql
security definer
set search_path to 'public','pg_temp'
as $function$
begin
  if current_setting('voynu.suppress_auto_dispatch', true) = 'on' then
    return new;
  end if;
  if new.booking_status='confirmed' and new.driver_id is null
     and exists(select 1 from public.dispatch_settings where id=true and mode='automatic') then
    perform public.auto_assign_booking_driver_internal(new.id);
  end if;
  return new;
exception when others then
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

  if exists (select 1 from public.driver_subscription_unavailability u
             where u.driver_id=v_driver.id and u.status='active'
               and u.start_date <= p_end_date and u.end_date >= p_start_date) then
    raise exception 'An active unavailability already overlaps these dates';
  end if;

  insert into public.driver_subscription_unavailability(driver_id,start_date,end_date,reason,created_by)
  values(v_driver.id,p_start_date,p_end_date,trim(p_reason),auth.uid())
  returning * into v_request;

  perform set_config('voynu.allow_driver_unassignment','on',true);
  perform set_config('voynu.driver_subscription_unavailability','on',true);
  perform set_config('voynu.suppress_auto_dispatch','on',true);
  update public.drivers set availability_status='offline' where id=v_driver.id;

  for v_subscription in
    select s.* from public.commute_subscriptions s
    where s.assigned_driver_id=v_driver.id and s.payment_status='paid' and s.status in ('active','paused')
      and s.end_date >= p_start_date and s.start_date <= p_end_date
  loop
    for v_trip in
      select st.* from public.subscription_trips st
      where st.subscription_id=v_subscription.id
        and st.trip_date between greatest(v_subscription.start_date,p_start_date)
                             and least(v_subscription.end_date,p_end_date)
        and st.status='scheduled'
        and not exists (select 1 from public.subscription_exceptions e
                        where e.subscription_id=st.subscription_id
                          and e.exception_date=st.trip_date
                          and e.chargeable=false)
        and not exists (select 1 from public.subscription_trip_driver_overrides o
                        where o.subscription_trip_id=st.id
                          and o.status in ('replacement_required','reassigned'))
      order by st.trip_date
    loop
      select * into v_booking from public.bookings b
      where b.subscription_trip_id=v_trip.id
      limit 1 for update;
      if v_booking.id is null then continue; end if;
      if v_booking.booking_status in ('on_the_way','arrived','trip_started','waiting_for_return','return_trip_started','trip_completed','cancelled') then continue; end if;

      insert into public.subscription_trip_driver_overrides(subscription_trip_id,unavailability_id,original_driver_id,reason)
      values(v_trip.id,v_request.id,v_driver.id,trim(p_reason))
      on conflict (subscription_trip_id) do nothing;

      delete from public.driver_assignments
      where booking_id=v_booking.id and status='assigned';

      update public.bookings
      set driver_id=null,vehicle_id=null,booking_status='confirmed',updated_at=now()
      where id=v_booking.id and booking_status in ('confirmed','driver_assigned');
    end loop;
  end loop;
  return v_request;
end;
$function$;