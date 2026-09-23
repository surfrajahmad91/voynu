-- Driver future commute unavailability and date-level replacement workflow.

create table if not exists public.driver_subscription_unavailability (
  id uuid primary key default gen_random_uuid(),
  driver_id uuid not null references public.drivers(id) on delete cascade,
  start_date date not null,
  end_date date not null,
  reason text not null,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  resolved_at timestamptz,
  resolved_by uuid references auth.users(id),
  constraint driver_subscription_unavailability_dates_check check (end_date >= start_date),
  constraint driver_subscription_unavailability_reason_check check (length(trim(reason)) >= 3),
  constraint driver_subscription_unavailability_status_check check (status in ('active','cancelled','completed'))
);

create table if not exists public.subscription_trip_driver_overrides (
  id uuid primary key default gen_random_uuid(),
  subscription_trip_id uuid not null references public.subscription_trips(id) on delete cascade,
  unavailability_id uuid references public.driver_subscription_unavailability(id) on delete set null,
  original_driver_id uuid not null references public.drivers(id),
  replacement_driver_id uuid references public.drivers(id),
  replacement_vehicle_id uuid references public.vehicles(id),
  reason text not null,
  status text not null default 'replacement_required',
  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  resolved_by uuid references auth.users(id),
  constraint subscription_trip_driver_override_status_check check (status in ('replacement_required','reassigned','cancelled')),
  constraint subscription_trip_driver_override_reason_check check (length(trim(reason)) >= 3),
  unique(subscription_trip_id)
);

create index if not exists driver_subscription_unavailability_driver_dates_idx
  on public.driver_subscription_unavailability(driver_id,start_date,end_date);
create index if not exists driver_subscription_unavailability_status_idx
  on public.driver_subscription_unavailability(status);
create index if not exists subscription_trip_driver_overrides_status_idx
  on public.subscription_trip_driver_overrides(status);
create index if not exists subscription_trip_driver_overrides_driver_idx
  on public.subscription_trip_driver_overrides(original_driver_id,replacement_driver_id);

alter table public.driver_subscription_unavailability enable row level security;
alter table public.subscription_trip_driver_overrides enable row level security;

drop policy if exists driver_subscription_unavailability_select_own on public.driver_subscription_unavailability;
create policy driver_subscription_unavailability_select_own
on public.driver_subscription_unavailability for select to authenticated
using (driver_id in (
  select d.id from public.drivers d
  where d.user_id=auth.uid()
     or (d.user_id is null and lower(d.email)=lower((select email from auth.users where id=auth.uid())))
) or public.is_admin());

drop policy if exists subscription_trip_driver_overrides_select_driver_admin on public.subscription_trip_driver_overrides;
create policy subscription_trip_driver_overrides_select_driver_admin
on public.subscription_trip_driver_overrides for select to authenticated
using (
  original_driver_id in (
    select d.id from public.drivers d
    where d.user_id=auth.uid()
       or (d.user_id is null and lower(d.email)=lower((select email from auth.users where id=auth.uid())))
  )
  or public.is_admin()
);

revoke all on public.driver_subscription_unavailability from anon,authenticated;
revoke all on public.subscription_trip_driver_overrides from anon,authenticated;
grant select on public.driver_subscription_unavailability to authenticated;
grant select on public.subscription_trip_driver_overrides to authenticated;

create or replace function public.request_driver_subscription_unavailability(
  p_start_date date,p_end_date date,p_reason text
)
returns public.driver_subscription_unavailability
language plpgsql security definer set search_path='public','pg_temp'
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
    where u.driver_id=v_driver.id and u.status='active' and u.start_date<=p_end_date and u.end_date>=p_start_date)
  then raise exception 'An active unavailability already overlaps these dates'; end if;

  insert into public.driver_subscription_unavailability(driver_id,start_date,end_date,reason,created_by)
  values(v_driver.id,p_start_date,p_end_date,trim(p_reason),auth.uid()) returning * into v_request;

  for v_subscription in
    select s.* from public.commute_subscriptions s
    where s.assigned_driver_id=v_driver.id and s.payment_status='paid' and s.status in ('active','paused')
      and s.end_date>=p_start_date and s.start_date<=p_end_date
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
      update public.bookings set driver_id=null,vehicle_id=null,booking_status='confirmed',updated_at=now()
      where id=v_booking.id and booking_status in ('confirmed','driver_assigned');
    end loop;
  end loop;

  if v_driver.availability_status='available' then
    update public.drivers set availability_status='offline' where id=v_driver.id;
  end if;
  return v_request;
end;
$function$;

revoke all on function public.request_driver_subscription_unavailability(date,date,text) from public,anon;
grant execute on function public.request_driver_subscription_unavailability(date,date,text) to authenticated;

create or replace function public.admin_reassign_commute_subscription_trip(
  p_subscription_trip_id uuid,p_driver_id uuid,p_vehicle_id uuid
)
returns public.subscription_trip_driver_overrides
language plpgsql security definer set search_path='public','pg_temp'
as $function$
declare
  o public.subscription_trip_driver_overrides; st public.subscription_trips; s public.commute_subscriptions;
  b public.bookings; d public.drivers; veh public.vehicles; conflict_count integer;
begin
  if not public.is_admin() then raise exception 'Admin access required'; end if;
  select * into o from public.subscription_trip_driver_overrides where subscription_trip_id=p_subscription_trip_id and status='replacement_required' for update;
  if not found then raise exception 'No active replacement request exists for this subscription trip'; end if;
  select * into st from public.subscription_trips where id=p_subscription_trip_id for update;
  if not found then raise exception 'Subscription trip not found'; end if;
  select * into s from public.commute_subscriptions where id=st.subscription_id for update;
  if not found then raise exception 'Subscription not found'; end if;
  select * into b from public.bookings where subscription_trip_id=st.id limit 1 for update;
  if not found then raise exception 'Subscription booking not found'; end if;
  if b.booking_status in ('on_the_way','arrived','trip_started','waiting_for_return','return_trip_started','trip_completed','cancelled') then raise exception 'This trip can no longer be reassigned'; end if;

  select * into d from public.drivers where id=p_driver_id and active=true for update;
  if not found then raise exception 'Replacement driver is not active'; end if;
  select * into veh from public.vehicles where id=p_vehicle_id and active=true and status='active' for update;
  if not found then raise exception 'Replacement vehicle is not active'; end if;
  if d.vehicle_id is distinct from p_vehicle_id then raise exception 'Selected vehicle is not assigned to this driver'; end if;

  select count(*) into conflict_count from public.bookings x
  where x.driver_id=d.id and x.id is distinct from b.id and x.travel_date=b.travel_date
    and x.booking_status not in ('cancelled','trip_completed')
    and x.pickup_time is not null and b.pickup_time is not null
    and x.pickup_time < coalesce(b.return_time,b.pickup_time)
    and coalesce(x.return_time,x.pickup_time) > b.pickup_time;
  if conflict_count>0 then raise exception 'Replacement driver has a conflicting trip on this date'; end if;

  update public.subscription_trip_driver_overrides
  set replacement_driver_id=d.id,replacement_vehicle_id=veh.id,status='reassigned',resolved_at=now(),resolved_by=auth.uid()
  where id=o.id returning * into o;

  delete from public.driver_assignments where booking_id=b.id and status='assigned';
  insert into public.driver_assignments(booking_id,driver_id,vehicle_id,assigned_by,status)
  values(b.id,d.id,veh.id,auth.uid(),'assigned');
  update public.bookings set driver_id=d.id,vehicle_id=veh.id,booking_status='driver_assigned',payment_status='paid',payment_method='subscription',updated_at=now()
  where id=b.id;
  update public.drivers set availability_status='busy' where id=d.id;

  if o.original_driver_id is not null and o.original_driver_id is distinct from d.id
     and not exists (select 1 from public.bookings x where x.driver_id=o.original_driver_id and x.booking_status in ('driver_assigned','on_the_way','arrived','trip_started','waiting_for_return','return_trip_started'))
  then update public.drivers set availability_status='available' where id=o.original_driver_id; end if;

  if d.user_id is not null then
    insert into public.notifications(user_id,booking_id,type,title,message,data)
    values(d.user_id,b.id,'driver_commute_assigned','Commute trip assigned','A commute subscription trip has been assigned to you for a future service date.',
      jsonb_build_object('subscriptionId',s.id,'subscriptionTripId',st.id,'bookingId',b.id,'tripDate',st.trip_date));
  end if;
  return o;
end;
$function$;

revoke all on function public.admin_reassign_commute_subscription_trip(uuid,uuid,uuid) from public,anon;
grant execute on function public.admin_reassign_commute_subscription_trip(uuid,uuid,uuid) to authenticated;

create or replace function public.admin_resolve_driver_subscription_unavailability(p_unavailability_id uuid)
returns public.driver_subscription_unavailability
language plpgsql security definer set search_path='public','pg_temp'
as $function$
declare v public.driver_subscription_unavailability; v_open integer;
begin
  if not public.is_admin() then raise exception 'Admin access required'; end if;
  select count(*) into v_open from public.subscription_trip_driver_overrides o
  where o.unavailability_id=p_unavailability_id and o.status='replacement_required';
  if v_open>0 then raise exception 'Replacement is still required for % subscription trip(s)',v_open; end if;
  update public.driver_subscription_unavailability set status='completed',resolved_at=now(),resolved_by=auth.uid()
  where id=p_unavailability_id and status='active' returning * into v;
  if not found then raise exception 'Unavailability request not found or already closed'; end if;
  return v;
end;
$function$;

revoke all on function public.admin_resolve_driver_subscription_unavailability(uuid) from public,anon;
grant execute on function public.admin_resolve_driver_subscription_unavailability(uuid) to authenticated;

-- Keep subscription sync authoritative while preserving date-level replacement overrides.
create or replace function public.sync_commute_subscription_trips(p_subscription_id uuid)
returns integer
language plpgsql security definer set search_path='public','pg_temp'
as $function$
declare
  s public.commute_subscriptions%rowtype; vc public.vehicle_categories%rowtype; d date;
  trip public.subscription_trips%rowtype; b public.bookings%rowtype; o public.subscription_trip_driver_overrides%rowtype;
  v_count integer:=0; v_passenger_name text; v_dispatch_token text;
  v_effective_driver uuid; v_effective_vehicle uuid;
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

  d:=s.start_date;
  while d<=s.end_date loop
    if exists(select 1 from public.subscription_exceptions e where e.subscription_id=s.id and e.exception_date=d and e.chargeable=false) then
      insert into public.subscription_trips(subscription_id,trip_date,status) values(s.id,d,'off')
      on conflict(subscription_id,trip_date) do update set status='off';
      d:=d+1; continue;
    end if;

    insert into public.subscription_trips(subscription_id,trip_date,status) values(s.id,d,'scheduled')
    on conflict(subscription_id,trip_date) do update set status=case when public.subscription_trips.status='off' then 'scheduled' else public.subscription_trips.status end
    returning * into trip;

    v_effective_driver:=s.assigned_driver_id; v_effective_vehicle:=s.assigned_vehicle_id;
    select * into o from public.subscription_trip_driver_overrides
    where subscription_trip_id=trip.id and status in ('replacement_required','reassigned') limit 1;
    if o.id is not null then
      if o.status='replacement_required' then v_effective_driver:=null; v_effective_vehicle:=null;
      else v_effective_driver:=o.replacement_driver_id; v_effective_vehicle:=o.replacement_vehicle_id; end if;
    end if;

    select * into b from public.bookings where subscription_trip_id=trip.id limit 1;
    if not found then
      insert into public.bookings(
        user_id,trip_type,pickup_name,pickup_lat,pickup_lon,drop_name,drop_lat,drop_lon,one_way_distance_km,total_distance_km,
        travel_date,pickup_time,return_date,return_time,passenger_name,vehicle_type,fare,payment_method,status,confirmed_at,
        payment_status,booking_status,driver_id,vehicle_id,passenger_count,luggage_count,vehicle_category_id,
        passenger_capacity_snapshot,luggage_capacity_snapshot,quoted_fare,fare_breakdown,subscription_id,subscription_trip_id,idempotency_key
      )
      values(
        s.user_id,'roundtrip',s.pickup_name,s.pickup_lat,s.pickup_lon,s.drop_name,s.drop_lat,s.drop_lon,s.one_way_distance_km,s.one_way_distance_km*2,
        d,s.morning_pickup_time,d,s.evening_return_time,coalesce(v_passenger_name,'Commute passengers'),coalesce(vc.name,'Commute'),
        s.daily_roundtrip_fare,'subscription','confirmed',now(),'paid',case when v_effective_driver is null then 'confirmed' else 'driver_assigned' end,
        v_effective_driver,v_effective_vehicle,s.passenger_count,0,s.vehicle_category_id,vc.passenger_capacity,vc.luggage_capacity,
        s.daily_roundtrip_fare,jsonb_build_object('subscriptionId',s.id,'subscriptionTripId',trip.id),s.id,trip.id,'commute:'||s.id::text||':'||d::text
      )
      on conflict (idempotency_key) where idempotency_key is not null do nothing returning * into b;
      if b.id is null then select * into b from public.bookings where idempotency_key='commute:'||s.id::text||':'||d::text; end if;
      if b.id is not null then
        v_count:=v_count+1;
        update public.subscription_trips set morning_booking_id=b.id,return_booking_id=b.id where id=trip.id;
      end if;
    else
      if b.booking_status in ('pending_payment','confirmed','driver_assigned') then
        update public.bookings set driver_id=v_effective_driver,vehicle_id=v_effective_vehicle,
          booking_status=case when v_effective_driver is null then 'confirmed' else 'driver_assigned' end,
          payment_status='paid',payment_method='subscription',updated_at=now()
        where id=b.id returning * into b;
      end if;
      update public.subscription_trips set morning_booking_id=b.id,return_booking_id=b.id where id=trip.id;
    end if;

    if v_effective_driver is not null and v_effective_vehicle is not null and b.id is not null then
      delete from public.driver_assignments where booking_id=b.id and status='assigned';
      insert into public.driver_assignments(booking_id,driver_id,vehicle_id,assigned_by,status)
      values(b.id,v_effective_driver,v_effective_vehicle,case when auth.uid() is null then null else auth.uid() end,'assigned');
    elsif b.id is not null then
      delete from public.driver_assignments where booking_id=b.id and status='assigned';
    end if;
    d:=d+1;
  end loop;
  return v_count;
end;
$function$;
